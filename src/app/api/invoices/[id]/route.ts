import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      clients (
        name,
        email,
        phone,
        address
      ),
      invoice_line_items (
        id,
        description,
        quantity,
        unit,
        unit_price,
        total
      ),
      payments (
        id,
        amount,
        payment_method,
        payment_date,
        reference,
        notes
      )
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  return NextResponse.json(invoice)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, sent_at, paid_at } = body

  const updates: { [key: string]: any } = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (sent_at) updates.sent_at = sent_at
  if (paid_at) updates.paid_at = paid_at

  const { data: updatedInvoice, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select(`
      *,
      clients (
        name,
        email,
        phone,
        address
      ),
      invoice_line_items (
        id,
        description,
        quantity,
        unit,
        unit_price,
        total
      ),
      payments (
        id,
        amount,
        payment_method,
        payment_date,
        reference,
        notes
      )
    `)
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  return NextResponse.json(updatedInvoice)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  return NextResponse.json({ success: true })
}
