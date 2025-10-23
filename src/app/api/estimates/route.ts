import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: list estimates
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    .order('created_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// POST: create draft estimate (optionally send)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { client_id, lead_id, lineItems = [], send = false, schedule = false, complete = false } = body

  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  // Calculate totals
  const subtotal = lineItems.reduce((sum: number, li: any) => sum + Number(li.quantity || 0) * Number(li.unit_price || 0), 0)
  const tax = Math.round(subtotal * 0.07 * 100) / 100
  const total = subtotal + tax

  const { data: estimate, error } = await supabase
    .from('estimates')
    .insert([{ user_id: user.id, client_id, lead_id, subtotal, tax, total, status: 'Draft' }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (lineItems.length) {
    const items = lineItems.map((li: any) => ({
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
    await supabase.from('estimates').update({ status: 'Sent' }).eq('id', estimate.id)
    if (lead_id) await supabase.from('leads').update({ status: 'Estimate Sent' }).eq('id', lead_id)
    // bump client's total_value to latest estimate total for quick display
    await supabase.from('clients').update({ total_value: total }).eq('id', client_id)
  }
  if (schedule) {
    await supabase.from('estimates').update({ status: 'Scheduled' }).eq('id', estimate.id)
    if (lead_id) await supabase.from('leads').update({ status: 'Job Scheduled' }).eq('id', lead_id)
  }
  if (complete) {
    await supabase.from('estimates').update({ status: 'Completed' }).eq('id', estimate.id)
    if (lead_id) await supabase.from('leads').update({ status: 'Completed' }).eq('id', lead_id)
  }

  return NextResponse.json(estimate, { status: 201 })
}


