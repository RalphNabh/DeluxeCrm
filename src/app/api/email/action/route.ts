import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { parseJsonBody } from '@/lib/validation'
import { verifyEstimateActionToken } from '@/lib/estimate-action-token'
import { captureApiError } from '@/lib/api-error'
import { getAppUrl, isDevelopment } from '@/lib/env'
import { findMatchingLead } from '@/lib/leads'
import {
  getFromAddress,
  getResendClient,
  isEmailConfigured,
} from '@/lib/email/resend-client'

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
      .select('user_id, organization_id, lead_id, client_id, estimate_number, clients(email, name)')
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
    const orgId = estimate.organization_id as string | null

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
    const displayName = clientName || clientRecord.name || 'Client'
    const reference = (estimate.estimate_number as string | null) || estimateId.slice(0, 8)

    // Both outcomes notify the contractor, because the contractor is the one who
    // has to act. "Request changes" used to email the client back instead, so
    // the contractor never found out anything had been asked for. The client
    // already sees a confirmation on the /estimate-action page.
    const recipientEmail = contractorEmail

    if (action === 'approve') {
      newStatus = 'Approved'
      emailSubject = `Estimate approved by ${displayName} - ${reference}`
      emailMessage = `Great news! ${displayName} approved estimate ${reference}.`
    } else {
      newStatus = 'Changes Requested'
      emailSubject = `Changes requested by ${displayName} - ${reference}`
      emailMessage = `${displayName} asked for changes to estimate ${reference}. Review it and send an updated version.`
    }

    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId)

    if (updateError) {
      captureApiError(updateError, { route: 'email/action' })
      return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 })
    }

    if (action === 'approve') {
      let leadToUpdate = estimate.lead_id

      if (!leadToUpdate && orgId) {
        const matched = await findMatchingLead(supabase, orgId, {
          clientId: estimate.client_id as string | undefined,
          email: clientRecord.email,
          name: clientRecord.name,
        })
        if (matched) {
          leadToUpdate = matched.id
          await supabase
            .from('estimates')
            .update({ lead_id: leadToUpdate })
            .eq('id', estimateId)
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
      }

      try {
        await checkAndExecuteAutomations('estimate_approved', {
          event: 'estimate_approved',
          user_id: userId,
          organization_id: orgId ?? undefined,
          estimate_id: estimateId,
          client_name: displayName,
          client_email: clientEmail,
        })
      } catch (error) {
        captureApiError(error, { route: 'email/action', step: 'automations' })
      }
    }

    if (isEmailConfigured() && recipientEmail) {
      const resend = getResendClient()
      const fromEmail = getFromAddress()
      let emailToSend = recipientEmail

      if (isDevelopment() && process.env.RESEND_VERIFIED_EMAIL) {
        emailToSend = process.env.RESEND_VERIFIED_EMAIL
      }

      const appUrl = getAppUrl()
      const confirmationEmailHtml = `
        <html><body style="font-family: Arial, sans-serif;">
          <h2>${newStatus}</h2>
          <p>${emailMessage}</p>
          <p><a href="${appUrl}/estimates/${estimateId}">View estimate in dashboard</a></p>
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
