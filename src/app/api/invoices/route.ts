import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('invoices')
    .select(`
      *,
      clients (
        name,
        email,
        phone
      ),
      invoice_line_items (
        id,
        description,
        quantity,
        unit,
        unit_price,
        total
      )
    `)
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { client_id, estimate_id, lineItems = [], due_date, notes, send = false } = body

  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  // Calculate totals
  const subtotal = lineItems.reduce((sum: number, li: any) => sum + Number(li.quantity || 0) * Number(li.unit_price || 0), 0)
  const tax = Math.round(subtotal * 0.13 * 100) / 100
  const total = subtotal + tax

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert([{ 
      user_id: user.id, 
      client_id, 
      estimate_id,
      invoice_number: invoiceNumber,
      subtotal, 
      tax, 
      total, 
      due_date,
      notes,
      status: send ? 'Sent' : 'Draft',
      sent_at: send ? new Date().toISOString() : null
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Add line items
  if (lineItems.length) {
    const items = lineItems.map((li: any) => ({
      invoice_id: invoice.id,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit || 'unit',
      unit_price: li.unit_price,
      total: Number(li.quantity || 0) * Number(li.unit_price || 0)
    }))
    await supabase.from('invoice_line_items').insert(items)
  }

  return NextResponse.json(invoice, { status: 201 })
}
