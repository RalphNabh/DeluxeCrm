import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvoiceEmail } from '@/lib/email/send-invoice-email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { invoiceId, clientEmail, clientName } = body

  if (!invoiceId || !clientEmail || !clientName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await sendInvoiceEmail(invoiceId, clientEmail, clientName, user.id)

  if (!result.success) {
    console.error('Invoice email sending failed:', result.error)
    return NextResponse.json({ 
      error: result.error || 'Failed to send email',
      details: result.error 
    }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    messageId: result.messageId,
    message: 'Invoice sent successfully' 
  })
}


