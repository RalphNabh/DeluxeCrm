import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'

export async function POST(request: NextRequest) {
  try {
    const { estimateId, action, clientEmail, clientName } = await request.json()
    
    if (!estimateId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use service role client to bypass RLS since clients aren't authenticated
    const supabase = createServiceRoleClient()
    
    // First, get the estimate to find the user_id, lead_id and get contractor email (clients don't need to be authenticated)
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('user_id, lead_id, clients(email, name)')
      .eq('id', estimateId)
      .single()

    if (estimateError || !estimate) {
      console.error('Error fetching estimate:', estimateError)
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Verify client email matches if provided
    if (clientEmail && estimate.clients?.email && estimate.clients.email !== clientEmail) {
      return NextResponse.json({ error: 'Invalid client email' }, { status: 403 })
    }

    const userId = estimate.user_id

    // Get contractor's (user's) email from auth.users using admin API
    // Service role client allows access to auth.admin methods
    let contractorEmail = ''
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
      if (authError) {
        console.error('Error fetching contractor email:', authError)
      } else {
        contractorEmail = authUser?.user?.email || ''
      }
    } catch (error) {
      console.error('Failed to get contractor email:', error)
    }

    if (!contractorEmail && action === 'approve') {
      console.error('Contractor email not found for user:', userId)
      // Continue anyway, just log the error
    }

    // Update estimate status based on action
    let newStatus = ''
    let emailSubject = ''
    let emailMessage = ''
    let recipientEmail = ''
    let recipientName = ''

    if (action === 'approve') {
      newStatus = 'Approved'
      // When client approves, notify the contractor (not the client)
      emailSubject = `Estimate Approved by ${clientName || estimate.clients?.name || 'Client'} - ${estimateId.slice(0, 8)}`
      emailMessage = `Great news! Your estimate has been approved by ${clientName || estimate.clients?.name || 'your client'}.`
      recipientEmail = contractorEmail || ''
      recipientName = 'Contractor' // We don't have contractor name easily accessible here
    } else if (action === 'request_changes') {
      newStatus = 'Changes Requested'
      // When client requests changes, notify both contractor and send confirmation to client
      emailSubject = `Estimate Changes Requested - ${estimateId.slice(0, 8)}`
      emailMessage = `Thank you for your feedback. We'll review your requested changes and get back to you with an updated estimate.`
      recipientEmail = clientEmail || estimate.clients?.email || ''
      recipientName = clientName || estimate.clients?.name || 'Client'
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update the estimate status
    const { error: updateError } = await supabase
      .from('estimates')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', estimateId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating estimate:', updateError)
      return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 })
    }

    // If estimate is approved, update the lead status to "Approved"
    if (action === 'approve') {
      let leadToUpdate = estimate.lead_id

      // If no lead_id, try to find lead by matching client email/name
      if (!leadToUpdate && estimate.clients) {
        const clientEmail = estimate.clients.email
        const clientName = estimate.clients.name

        if (clientEmail || clientName) {
          const { data: matchingLeads } = await supabase
            .from('leads')
            .select('id')
            .eq('user_id', userId)
            .or(clientEmail && clientName 
              ? `email.eq.${clientEmail},name.eq.${clientName}` 
              : clientEmail 
                ? `email.eq.${clientEmail}` 
                : `name.eq.${clientName}`
            )
            .in('status', ['New Leads', 'Estimate Sent']) // Only update leads that haven't been approved yet
            .limit(1)

          if (matchingLeads && matchingLeads.length > 0) {
            leadToUpdate = matchingLeads[0].id
            console.log(`[ESTIMATE ACTION] Found lead by client match: ${leadToUpdate}`)
            
            // Update the estimate with the found lead_id
            await supabase
              .from('estimates')
              .update({ lead_id: leadToUpdate })
              .eq('id', estimateId)
          }
        }
      }

      if (leadToUpdate) {
        const { data: updatedLead, error: leadUpdateError } = await supabase
          .from('leads')
          .update({
            status: 'Approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', leadToUpdate)
          .eq('user_id', userId)
          .select()

        if (leadUpdateError) {
          console.error('[ESTIMATE ACTION] Error updating lead status to "Approved":', leadUpdateError)
          console.error('[ESTIMATE ACTION] Lead ID:', leadToUpdate, 'User ID:', userId)
          // Don't fail the request if lead update fails, just log it
        } else {
          console.log(`[ESTIMATE ACTION] Lead ${leadToUpdate} status updated to "Approved"`)
          console.log('[ESTIMATE ACTION] Updated lead:', updatedLead)
        }
      } else {
        console.log('[ESTIMATE ACTION] No lead found to update')
        console.log('[ESTIMATE ACTION] Estimate ID:', estimateId, 'Client ID:', estimate.client_id, 'Lead ID:', estimate.lead_id)
      }
    }

    // Send confirmation email to client
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const confirmationEmailHtml = `
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimate Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .status-badge { 
            display: inline-block; 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-weight: bold; 
            margin: 10px 0;
            ${action === 'approve' ? 'background: #10b981; color: white;' : 'background: #f59e0b; color: white;'}
          }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Estimate Update</h1>
            <p>From DyluxePro</p>
          </div>
          
          <div class="content">
            ${action === 'approve' 
              ? `<h2>Estimate Approved</h2>
                 <p><strong>Client:</strong> ${clientName || estimate.clients?.name || 'Client'}</p>
                 <p><strong>Client Email:</strong> ${clientEmail || estimate.clients?.email || 'N/A'}</p>
                 <p><strong>Estimate ID:</strong> ${estimateId.slice(0, 8)}</p>`
              : `<h2>Hello ${clientName},</h2>`
            }
            
            <div class="status-badge">
              ${newStatus}
            </div>
            
            <p>${emailMessage}</p>
            
            ${action === 'approve' 
              ? `<p>You can now proceed with scheduling the work and creating an invoice for this approved estimate.</p>
                 <p>Login to your DyluxePro dashboard to manage this estimate: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dyluxepro.com'}/estimates/${estimateId}" style="color: #2563eb;">View Estimate</a></p>`
              : `<p>If you have any questions, please don't hesitate to contact us.</p>`
            }
            
            <p>Best regards,<br>DyluxePro Team</p>
          </div>
          
          <div class="footer">
            <p>This update was sent from DyluxePro CRM</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send notification email
    // Use RESEND_FROM_EMAIL environment variable, fallback to test domain
    // Once dyluxepro.com is verified in Resend, set RESEND_FROM_EMAIL=noreply@dyluxepro.com
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'DyluxePro <onboarding@resend.dev>';
    
    // For approve: send to contractor. For request_changes: send confirmation to client
    let emailToSend = recipientEmail
    
    // For development/prototype: send to verified email instead of actual recipient
    if (process.env.NODE_ENV === 'development') {
      const verifiedEmail = process.env.RESEND_VERIFIED_EMAIL || 'nabhanralph@gmail.com';
      emailToSend = verifiedEmail
    }
    
    // Only send email if we have a recipient
    if (emailToSend) {
      // Update email template based on who's receiving it
      const updatedEmailHtml = action === 'approve' 
        ? confirmationEmailHtml.replace(`Hello ${clientName},`, `Hello,`)
            .replace(emailMessage, emailMessage)
        : confirmationEmailHtml
          
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: [emailToSend],
        subject: emailSubject,
        html: updatedEmailHtml,
      })

      if (emailError) {
        console.error('Error sending notification email:', emailError)
        // Don't fail the request if email fails
      }
    } else {
      console.warn('No recipient email available, skipping email notification')
    }

    // Trigger automations for estimate_approved event if approved
    if (action === 'approve') {
      // Get client info for automation context
      const { data: estimateData } = await supabase
        .from('estimates')
        .select('clients(name, email)')
        .eq('id', estimateId)
        .single()

      console.log(`[EMAIL ACTION] ========== TRIGGERING AUTOMATIONS ==========`)
      console.log(`[EMAIL ACTION] Event: estimate_approved`)
      console.log(`[EMAIL ACTION] user_id: ${userId}`)
      console.log(`[EMAIL ACTION] estimate_id: ${estimateId}`)
      console.log(`[EMAIL ACTION] client_name: ${clientName || estimateData?.clients?.name || 'Client'}`)
      console.log(`[EMAIL ACTION] client_email: ${clientEmail || estimateData?.clients?.email || 'N/A'}`)
      console.log(`[EMAIL ACTION] Service Role Key available: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`)
      
      try {
        const result = await checkAndExecuteAutomations('estimate_approved', {
          event: 'estimate_approved',
          user_id: userId,
          estimate_id: estimateId,
          client_name: clientName || estimateData?.clients?.name || 'Client',
          client_email: clientEmail || estimateData?.clients?.email || undefined
        })
        console.log(`[EMAIL ACTION] Automation execution completed successfully`)
      } catch (error) {
        console.error('[EMAIL ACTION] ========== AUTOMATION ERROR ==========')
        console.error('[EMAIL ACTION] Error triggering automations:', error)
        console.error('[EMAIL ACTION] Error type:', error instanceof Error ? error.constructor.name : typeof error)
        console.error('[EMAIL ACTION] Error message:', error instanceof Error ? error.message : String(error))
        console.error('[EMAIL ACTION] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        console.error('[EMAIL ACTION] =========================================')
        // Don't fail the request if automation fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      status: newStatus,
      message: 'Estimate updated successfully'
    })

  } catch (error) {
    console.error('Error processing email action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
