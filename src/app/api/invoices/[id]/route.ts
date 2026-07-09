import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMember } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

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
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()
  
  if (error) return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // Calculate total paid from payments
  const totalPaid = (invoice.payments || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
  
  // Calculate overdue status
    const invoiceWithStatus = { ...invoice }
  if (invoice.due_date && invoice.status !== 'Paid' && invoice.status !== 'Cancelled') {
    const dueDate = new Date(invoice.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    
    if (dueDate < today && invoice.status !== 'Overdue') {
      invoiceWithStatus.status = 'Overdue'
    }
  }
  
  // Try to fetch job if job_id column exists
  let invoiceWithJob = invoiceWithStatus
  if (invoice && (invoice as Record<string, unknown>).job_id) {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, title, status, start_time, end_time')
        .eq('id', (invoice as Record<string, unknown>).job_id)
        .single()
      invoiceWithJob = { ...invoiceWithStatus, jobs: job } as typeof invoiceWithStatus & { jobs: typeof job }
    } catch (e) {
      // Column doesn't exist or job not found, continue without job
    }
  }
  
  // Try to fetch estimate if estimate_id column exists
  let invoiceWithEstimate = invoiceWithJob
  if (invoice && (invoice as Record<string, unknown>).estimate_id) {
    try {
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('id, status, total, created_at')
        .eq('id', (invoice as Record<string, unknown>).estimate_id)
        .eq('organization_id', orgId) // Ensure estimate belongs to the same user
        .single()
      
      if (!estimateError && estimate) {
        invoiceWithEstimate = { ...invoiceWithJob, estimates: estimate }
      }
    } catch (e) {
      // Column doesn't exist or estimate not found, continue without estimate
      console.log('Error fetching estimate:', e)
    }
  }

  // Add calculated fields
  return NextResponse.json({
    ...invoiceWithEstimate,
    total_paid: totalPaid,
    remaining: invoiceWithStatus.total - totalPaid
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

  const body = await request.json()
  const { status, sent_at, paid_at, invoice_number } = body

  const updates: { [key: string]: string | undefined } = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (sent_at !== undefined) updates.sent_at = sent_at
  if (paid_at !== undefined) updates.paid_at = paid_at
  if (invoice_number) updates.invoice_number = invoice_number

  const { data: updatedInvoice, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
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
  
  // Calculate total paid from payments
  const totalPaid = ((updatedInvoice?.payments as Array<{ amount: number }>) || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
  
  // Check overdue status
    const invoiceWithStatus = { ...updatedInvoice }
  if (updatedInvoice && updatedInvoice.due_date && updatedInvoice.status !== 'Paid' && updatedInvoice.status !== 'Cancelled') {
    const dueDate = new Date(updatedInvoice.due_date as string)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    
    if (dueDate < today && updatedInvoice.status !== 'Overdue' && status !== 'Paid') {
      invoiceWithStatus.status = 'Overdue'
    }
  }
  
  // Try to fetch job if job_id column exists
  let updatedInvoiceWithJob = invoiceWithStatus
  if (updatedInvoice && (updatedInvoice as Record<string, unknown>).job_id) {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, title, status, start_time, end_time')
        .eq('id', (updatedInvoice as Record<string, unknown>).job_id)
        .single()
      updatedInvoiceWithJob = { ...invoiceWithStatus, jobs: job } as typeof invoiceWithStatus & { jobs: typeof job }
    } catch (e) {
      // Column doesn't exist or job not found, continue without job
    }
  }
  
  // Try to fetch estimate if estimate_id column exists
  let updatedInvoiceWithEstimate = updatedInvoiceWithJob
  if (updatedInvoice && (updatedInvoice as Record<string, unknown>).estimate_id) {
    try {
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('id, status, total, created_at')
        .eq('id', (updatedInvoice as Record<string, unknown>).estimate_id)
        .eq('organization_id', orgId) // Ensure estimate belongs to the same user
        .single()
      
      if (!estimateError && estimate) {
        updatedInvoiceWithEstimate = { ...updatedInvoiceWithJob, estimates: estimate }
      }
    } catch (e) {
      // Column doesn't exist or estimate not found, continue without estimate
      console.log('Error fetching estimate:', e)
    }
  }

  if (error) return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  return NextResponse.json({
    ...updatedInvoiceWithEstimate,
    total_paid: totalPaid,
    remaining: (updatedInvoice?.total as number) - totalPaid
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  return NextResponse.json({ success: true })
}
