import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEstimateEmail } from '@/lib/email/send-estimate-email'
import { requireUser } from '@/lib/api-auth'
import { parseJsonBody } from '@/lib/validation'
import { estimateCreateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'

// GET: list estimates
export async function GET(request: NextRequest) {
  try {
  const supabase = await createClient()
  const auth = await requireUser(supabase)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')

  let query = supabase
    .from('estimates')
    .select(`
      *,
      clients (
        name,
        email,
        phone,
        address
      ),
      estimate_line_items (
        id,
        description,
        quantity,
        unit,
        unit_price,
        total
      )
    `)
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
  } catch (error) {
    captureApiError(error, { route: 'estimates/GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: create draft estimate (optionally send)
export async function POST(request: Request) {
  try {
  const supabase = await createClient()
  const auth = await requireUser(supabase)
  if (!auth.ok) return auth.response
  const user = auth.user

  const parsed = await parseJsonBody(request, estimateCreateSchema)
  if (!parsed.ok) return parsed.response

  const { client_id, lead_id, lineItems, contract_message, send = false, schedule = false, complete = false } = parsed.data

  const subtotal = lineItems.reduce(
    (sum, li) => sum + Number(li.quantity || 0) * Number(li.unit_price || 0),
    0,
  )
  const tax = Math.round(subtotal * 0.13 * 100) / 100
  const total = subtotal + tax

  const { data: estimate, error } = await supabase
    .from('estimates')
    .insert([{ 
      user_id: user.id, 
      client_id, 
      lead_id, 
      subtotal, 
      tax, 
      total, 
      status: 'Draft',
      contract_message: contract_message || null
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (lineItems.length) {
    const items = lineItems.map((li) => ({
      estimate_id: estimate.id,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit || 'unit',
      unit_price: li.unit_price,
      total: Number(li.quantity || 0) * Number(li.unit_price || 0)
    }))
    await supabase.from('estimate_line_items').insert(items)
  }

  // Optionally send/schedule/complete with automatic lead stage updates
  if (send) {
    // Update lead status first
    if (lead_id) {
      await supabase
        .from('leads')
        .update({ status: 'Estimate Sent' })
        .eq('id', lead_id)
        .eq('user_id', user.id)
    }
    // bump client's total_value to latest estimate total for quick display
    await supabase.from('clients').update({ total_value: total }).eq('id', client_id)
    
    // Send email if client email exists
    const { data: client } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', client_id)
      .single()
    
    if (client?.email) {
      try {
        // Send email directly using the shared function
        const emailResult = await sendEstimateEmail(estimate.id, client.email, client.name, user.id)
        
        if (!emailResult.success) {
          console.error('Failed to send email:', emailResult.error)
          // Still update status even if email fails
          await supabase.from('estimates').update({ status: 'Sent', sent_at: new Date().toISOString() }).eq('id', estimate.id)
        }
        // If email succeeds, status is already updated by sendEstimateEmail
      } catch (error) {
        console.error('Error sending email:', error)
        // Still update status even if email fails
        await supabase.from('estimates').update({ status: 'Sent', sent_at: new Date().toISOString() }).eq('id', estimate.id)
      }
    } else {
      // No email, just update status
      await supabase.from('estimates').update({ status: 'Sent', sent_at: new Date().toISOString() }).eq('id', estimate.id)
    }
  }
  if (schedule) {
    await supabase.from('estimates').update({ status: 'Scheduled' }).eq('id', estimate.id)
    if (lead_id) {
      await supabase
        .from('leads')
        .update({ status: 'Job Scheduled' })
        .eq('id', lead_id)
        .eq('user_id', user.id)
    }
  }
  if (complete) {
    await supabase.from('estimates').update({ status: 'Completed' }).eq('id', estimate.id)
    if (lead_id) {
      await supabase
        .from('leads')
        .update({ status: 'Completed' })
        .eq('id', lead_id)
        .eq('user_id', user.id)
    }
  }

  return NextResponse.json(estimate, { status: 201 })
  } catch (error) {
    captureApiError(error, { route: 'estimates/POST' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


