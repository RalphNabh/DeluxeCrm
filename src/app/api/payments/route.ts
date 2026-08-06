import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJsonBody } from '@/lib/validation'
import { paymentCreateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'
import { buildPaymentInsert, sumPayments } from '@/lib/payments'
import { invoiceStatusAfterPayment } from '@/lib/route-access'

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, paymentCreateSchema)
    if (!parsed.ok) return parsed.response
    const { invoice_id, amount, payment_method, payment_date, reference, notes } =
      parsed.data

    const supabase = await createClient()
    
    // Get the current user
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    // Verify the invoice belongs to the user
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total, status')
      .eq('id', invoice_id)
      .eq('organization_id', orgId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const { data: existingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoice_id)

    const alreadyPaid = sumPayments(existingPayments)
    const remaining = invoice.total - alreadyPaid
    if (amount > remaining + 0.001) {
      return NextResponse.json(
        { error: 'Payment amount exceeds remaining invoice balance' },
        { status: 400 },
      )
    }

    // user_id is NOT NULL and is the RLS predicate on payments; organization_id
    // is what the read path filters on. Omitting either made every insert fail.
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(
        buildPaymentInsert(
          { invoice_id, amount, payment_method, payment_date, reference, notes },
          { userId: user.id, orgId },
        ),
      )
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

    const totalPaid = sumPayments(allPayments)
    const newStatus = invoiceStatusAfterPayment(
      invoice.total,
      totalPaid,
      invoice.status,
    )

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
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

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
      .eq('organization_id', orgId)
      .order('payment_date', { ascending: false })

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