import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEstimateEmail } from '@/lib/email/send-estimate-email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { estimateId, clientEmail, clientName } = body

  if (!estimateId || !clientEmail || !clientName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await sendEstimateEmail(estimateId, clientEmail, clientName, user.id)

  if (!result.success) {
    console.error('Estimate email sending failed:', result.error)
    return NextResponse.json({ 
      error: result.error || 'Failed to send email',
      details: result.error 
    }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    messageId: result.messageId,
    message: 'Estimate sent successfully' 
  })
}

