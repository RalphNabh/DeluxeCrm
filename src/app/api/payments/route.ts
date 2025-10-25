import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { invoice_id, amount, method, reference, notes } = await request.json()
    
    if (!invoice_id || !amount || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the invoice belongs to the user
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total, status')
      .eq('id', invoice_id)
      .eq('user_id', user.id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Create the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id,
        amount,
        method,
        reference,
        notes,
        paid_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    // Calculate total payments for this invoice
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoice_id)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0)
    
    // Update invoice status based on payment amount
    let newStatus = invoice.status
    if (totalPaid >= invoice.total) {
      newStatus = 'Paid'
    } else if (totalPaid > 0) {
      newStatus = 'Partially Paid'
    }

    // Update invoice status if it changed
    if (newStatus !== invoice.status) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: newStatus,
          paid_at: newStatus === 'Paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice_id)

      if (updateError) {
        console.error('Error updating invoice status:', updateError)
      }
    }

    return NextResponse.json(payment)

  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoice_id')

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('payments')
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          user_id
        )
      `)
      .eq('invoices.user_id', user.id)
      .order('paid_at', { ascending: false })

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId)
    }

    const { data: payments, error } = await query

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    return NextResponse.json(payments)

  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}