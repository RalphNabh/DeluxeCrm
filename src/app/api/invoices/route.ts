import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api-auth'
import { invoiceCreateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'
import { parseJsonBody } from '@/lib/validation'

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
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  if (status) query = query.eq('status', status)

        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        
        // Calculate total_paid for each invoice and check overdue status
        const invoicesWithCalculations = await Promise.all((data || []).map(async (invoice: Record<string, unknown>) => {
          // Calculate total paid from payments
          const payments = invoice.payments as Array<{ amount: number }> || []
          const totalPaid = payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
          
          // Check if overdue
          let status = invoice.status as string
          if (invoice.due_date && status !== 'Paid' && status !== 'Cancelled') {
            const dueDate = new Date(invoice.due_date as string)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            dueDate.setHours(0, 0, 0, 0)
            
            if (dueDate < today && status !== 'Overdue') {
              status = 'Overdue'
            }
          }
          
          // Try to fetch job if job_id column exists
          let invoiceWithJob = { ...invoice, total_paid: totalPaid, status }
          if (invoice.job_id) {
            try {
              const { data: job } = await supabase
                .from('jobs')
                .select('id, title, status, start_time, end_time')
                .eq('id', invoice.job_id)
                .single()
              invoiceWithJob = { ...invoiceWithJob, jobs: job } as typeof invoiceWithJob & {
                jobs: typeof job
              }
            } catch (e) {
              // Column doesn't exist or job not found, continue without job
            }
          }
          
          return invoiceWithJob
        }))
        
        return NextResponse.json(invoicesWithCalculations)
}

export async function POST(request: NextRequest) {
  try {
  const supabase = await createClient()
  const auth = await requireUser(supabase)
  if (!auth.ok) return auth.response
  const user = auth.user

  const parsed = await parseJsonBody(request, invoiceCreateSchema)
  if (!parsed.ok) return parsed.response

  const {
    client_id,
    estimate_id,
    job_id,
    lineItems = [],
    due_date,
    notes,
    send = false,
  } = parsed.data

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unit_price,
    0,
  )
  const tax = Math.round(subtotal * 0.13 * 100) / 100
  const total = subtotal + tax

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

  // Build insert object - try with estimate_id/job_id first, fall back if columns don't exist
  const baseInvoiceData: Record<string, unknown> = { 
    user_id: user.id, 
    client_id, 
    invoice_number: invoiceNumber,
    subtotal, 
    tax, 
    total, 
    due_date,
    notes,
    status: send ? 'Sent' : 'Draft',
    sent_at: send ? new Date().toISOString() : null
  };
  
  // Try with estimate_id and job_id first
  let insertData = baseInvoiceData
  if (estimate_id) {
    insertData = { ...insertData, estimate_id }
  }
  if (job_id) {
    insertData = { ...insertData, job_id }
  }

  let { data: invoice, error } = await supabase
    .from('invoices')
    .insert([insertData])
    .select()
    .single()
  
  // If error and we tried to include estimate_id/job_id, retry without them (columns may not exist)
  if (error && (estimate_id || job_id)) {
    const { data: retryInvoice, error: retryError } = await supabase
      .from('invoices')
      .insert([baseInvoiceData])
      .select()
      .single()
    
    if (!retryError) {
      invoice = retryInvoice
      error = null
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (lineItems.length) {
    const items = lineItems.map((li) => ({
      invoice_id: invoice.id,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit || 'unit',
      unit_price: li.unit_price,
      total: li.quantity * li.unit_price,
    }))
    await supabase.from('invoice_line_items').insert(items)
  }

  return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    captureApiError(error, { route: 'invoices/POST' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
