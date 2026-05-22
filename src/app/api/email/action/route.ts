import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { parseJsonBody } from '@/lib/validation'
import { verifyEstimateActionToken } from '@/lib/estimate-action-token'
import { captureApiError } from '@/lib/api-error'
import { getAppUrl, isDevelopment } from '@/lib/env'
import { escapePostgrestValue } from '@/lib/postgrest-escape'

const actionSchema = z.object({
  estimateId: z.string().uuid(),
  action: z.enum(['approve', 'request_changes']),
  clientEmail: z.string().email(),
  clientName: z.string().max(200).optional(),
  token: z.string().min(10),
})

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, 'email-action')
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rl) },
      )
    }

    const parsed = await parseJsonBody(request, actionSchema)
    if (!parsed.ok) return parsed.response

    const { estimateId, action, clientEmail, clientName, token } = parsed.data

    if (!verifyEstimateActionToken(token, estimateId, clientEmail, action)) {
      return NextResponse.json({ error: 'Invalid or expired action link' }, { status: 403 })
    }

    const supabase = createServiceRoleClient()

    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('user_id, lead_id, client_id, clients(email, name)')
      .eq('id', estimateId)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    const clientRecord = estimate.clients as { email?: string; name?: string } | null
    if (!clientRecord?.email) {
      return NextResponse.json({ error: 'Client email not on file' }, { status: 400 })
    }

    if (clientRecord.email.toLowerCase() !== clientEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid client email' }, { status: 403 })
    }

    const userId = estimate.user_id

    let contractorEmail = ''
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
      if (!authError) {
        contractorEmail = authUser?.user?.email || ''
      }
    } catch (error) {
      captureApiError(error, { route: 'email/action', step: 'getUserById' })
    }

    let newStatus = ''
    let emailSubject = ''
    let emailMessage = ''
    let recipientEmail = ''
    const displayName = clientName || clientRecord.name || 'Client'

    if (action === 'approve') {
      newStatus = 'Approved'
      emailSubject = `Estimate Approved by ${displayName} - ${estimateId.slice(0, 8)}`
      emailMessage = `Great news! Your estimate has been approved by ${displayName}.`
      recipientEmail = contractorEmail
    } else {
      newStatus = 'Changes Requested'
      emailSubject = `Estimate Changes Requested - ${estimateId.slice(0, 8)}`
      emailMessage = `Thank you for your feedback. We'll review your requested changes and get back to you with an updated estimate.`
      recipientEmail = clientEmail
    }

    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId)
      .eq('user_id', userId)

    if (updateError) {
      captureApiError(updateError, { route: 'email/action' })
      return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 })
    }

    if (action === 'approve') {
      let leadToUpdate = estimate.lead_id

      if (!leadToUpdate && clientRecord) {
        const safeEmail = clientRecord.email
          ? escapePostgrestValue(clientRecord.email)
          : ''
        const safeName = clientRecord.name
          ? escapePostgrestValue(clientRecord.name)
          : ''

        let orFilter = ''
        if (safeEmail && safeName) {
          orFilter = `email.eq.${safeEmail},name.eq.${safeName}`
        } else if (safeEmail) {
          orFilter = `email.eq.${safeEmail}`
        } else if (safeName) {
          orFilter = `name.eq.${safeName}`
        }

        if (orFilter) {
          const { data: matchingLeads } = await supabase
            .from('leads')
            .select('id')
            .eq('user_id', userId)
            .or(orFilter)
            .in('status', ['New Leads', 'Estimate Sent'])
            .limit(1)

          if (matchingLeads?.[0]) {
            leadToUpdate = matchingLeads[0].id
            await supabase
              .from('estimates')
              .update({ lead_id: leadToUpdate })
              .eq('id', estimateId)
          }
        }
      }

      if (leadToUpdate) {
        await supabase
          .from('leads')
          .update({
            status: 'Approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadToUpdate)
          .eq('user_id', userId)
      }

      try {
        await checkAndExecuteAutomations('estimate_approved', {
          event: 'estimate_approved',
          user_id: userId,
          estimate_id: estimateId,
          client_name: displayName,
          client_email: clientEmail,
        })
      } catch (error) {
        captureApiError(error, { route: 'email/action', step: 'automations' })
      }
    }

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && recipientEmail) {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || 'DyluxePro <onboarding@resend.dev>'
      let emailToSend = recipientEmail

      if (isDevelopment() && process.env.RESEND_VERIFIED_EMAIL) {
        emailToSend = process.env.RESEND_VERIFIED_EMAIL
      }

      const appUrl = getAppUrl()
      const confirmationEmailHtml = `
        <html><body style="font-family: Arial, sans-serif;">
          <h2>${newStatus}</h2>
          <p>${emailMessage}</p>
          ${
            action === 'approve'
              ? `<p><a href="${appUrl}/estimates/${estimateId}">View estimate in dashboard</a></p>`
              : ''
          }
        </body></html>
      `

      await resend.emails.send({
        from: fromEmail,
        to: [emailToSend],
        subject: emailSubject,
        html: confirmationEmailHtml,
      })
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: 'Estimate updated successfully',
    })
  } catch (error) {
    captureApiError(error, { route: 'email/action' })
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
