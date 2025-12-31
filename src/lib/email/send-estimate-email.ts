import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { checkAndExecuteAutomations } from '@/lib/automations/executor';

export async function sendEstimateEmail(
  estimateId: string,
  clientEmail: string,
  clientName: string,
  userId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Fetch estimate details (including lead_id for pipeline updates)
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        *,
        clients (
          name,
          email,
          phone,
          address
        ),
        estimate_line_items (
          description,
          quantity,
          unit,
          unit_price,
          total
        )
      `)
      .eq('id', estimateId)
      .eq('user_id', userId)
      .single();

    if (estimateError || !estimate) {
      return { success: false, error: 'Estimate not found' };
    }

    // Determine recipient email - send directly to client
    const recipientEmail = clientEmail || estimate.clients?.email;
    
    if (!recipientEmail) {
      return { success: false, error: 'Client email address is required' };
    }

    // For prototype/demo: Send to verified email (can verify more recipient emails in Resend)
    // In production with verified domain: emails will go directly to clientEmail
    const verifiedEmail = process.env.RESEND_VERIFIED_EMAIL || 'nabhanralph@gmail.com';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Use verified email for prototype, client email in production
    const recipients = isDevelopment 
      ? [verifiedEmail] // Send to verified email for prototype demo
      : [recipientEmail]; // Send to client in production

    // Add note in email body for prototype demo
    const prototypeNote = isDevelopment ? `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
        <strong>PROTOTYPE DEMO:</strong> This estimate was intended for ${recipientEmail}. In production, emails will be sent directly to the client's email address.
      </div>
    ` : '';

    // Create email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimate from DyluxePro</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .estimate-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .line-items { margin: 20px 0; }
          .line-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .totals { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .total-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .total-final { font-weight: bold; font-size: 18px; border-top: 2px solid #2563eb; padding-top: 10px; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Project Estimate</h1>
            <p>From DyluxePro</p>
          </div>
          
          <div class="content">
            ${prototypeNote}
            <h2>Hello ${clientName},</h2>
            <p>Thank you for your interest in our services! Please find your detailed estimate below:</p>
            
            <div class="estimate-details">
              <h3>Estimate Details</h3>
              <p><strong>Estimate #:</strong> ${estimate.id.slice(0, 8)}</p>
              <p><strong>Date:</strong> ${new Date(estimate.created_at).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${estimate.status}</p>
            </div>

            <div class="line-items">
              <h3>Line Items</h3>
              ${estimate.estimate_line_items?.map(item => `
                <div class="line-item">
                  <div>
                    <strong>${item.description}</strong><br>
                    <small>${item.quantity} ${item.unit} × $${Number(item.unit_price).toFixed(2)}</small>
                  </div>
                  <div>$${Number(item.total).toFixed(2)}</div>
                </div>
              `).join('') || '<p>No line items</p>'}
            </div>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${Number(estimate.subtotal).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax (13%):</span>
                <span>$${Number(estimate.tax).toFixed(2)}</span>
              </div>
              <div class="total-row total-final">
                <span>Total:</span>
                <span>$${Number(estimate.total).toFixed(2)}</span>
              </div>
            </div>

            ${estimate.contract_message ? `
            <div style="background: #f3f4f6; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 15px;">Contract Terms & Conditions</h3>
              <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${estimate.contract_message}</div>
            </div>
            ` : ''}

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-weight: 500;">
                <strong>Important:</strong> By clicking "Approve Estimate" below, you agree to accept this estimate and ${estimate.contract_message ? 'the contract terms and conditions listed above' : 'proceed with this project'}.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/estimate-action?estimateId=${estimate.id}&action=approve&clientEmail=${encodeURIComponent(clientEmail)}&clientName=${encodeURIComponent(clientName)}" class="button" style="background: #10b981; margin-right: 10px;">Approve Estimate</a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/estimate-action?estimateId=${estimate.id}&action=request_changes&clientEmail=${encodeURIComponent(clientEmail)}&clientName=${encodeURIComponent(clientName)}" class="button" style="background: #f59e0b;">Request Changes</a>
            </div>

            <p>This estimate is valid for 30 days. Please let us know if you have any questions or would like to proceed with this project.</p>
            
            <p>Best regards,<br>DyluxePro Team</p>
          </div>
          
          <div class="footer">
            <p>This estimate was generated by DyluxePro CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    // Use RESEND_FROM_EMAIL environment variable, fallback to test domain
    // Once dyluxepro.com is verified in Resend, set RESEND_FROM_EMAIL=noreply@dyluxepro.com
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'DyluxePro <onboarding@resend.dev>';
    
    // Initialize Resend client (lazy initialization to avoid build-time errors)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'RESEND_API_KEY is not configured. Please set it in your environment variables.' };
    }
    const resend = new Resend(apiKey);
    
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject: `Project Estimate for ${clientName} - ${estimate.id.slice(0, 8)}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Email sending error:', error);
      // Return more detailed error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'Failed to send email';
      
      return { 
        success: false, 
        error: `Failed to send email: ${errorMessage}. Please check that the client email address is valid and your Resend domain is verified.` 
      };
    }

    // Update estimate status to "Sent"
    await supabase
      .from('estimates')
      .update({ 
        status: 'Sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', estimateId)
      .eq('user_id', userId);

    // If estimate has a linked lead, update the lead status to "Estimate Sent"
    let leadToUpdate = estimate.lead_id

    // If no lead_id, try to find lead by matching client email/name
    if (!leadToUpdate && estimate.clients) {
      const clientEmail = estimate.clients.email
      const clientName = estimate.clients.name

      if (clientEmail || clientName) {
        let query = supabase
          .from('leads')
          .select('id')
          .eq('user_id', userId)
          .in('status', ['New Leads', 'Estimate Sent']) // Only update leads in these stages

        if (clientEmail && clientName) {
          query = query.or(`email.eq.${clientEmail},name.ilike.%${clientName}%`)
        } else if (clientEmail) {
          query = query.eq('email', clientEmail)
        } else if (clientName) {
          query = query.ilike('name', `%${clientName}%`)
        }

        const { data: matchingLeads, error: findError } = await query.limit(1)

        if (!findError && matchingLeads && matchingLeads.length > 0) {
          leadToUpdate = matchingLeads[0].id
          console.log(`[SEND ESTIMATE] Found lead by client match: ${leadToUpdate}`)
        } else {
          console.log('[SEND ESTIMATE] No matching lead found by email/name')
        }
      }
    }

    if (leadToUpdate) {
      const { data: updatedLead, error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          status: 'Estimate Sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadToUpdate)
        .eq('user_id', userId)
        .select()

      if (leadUpdateError) {
        console.error('[SEND ESTIMATE] Error updating lead status to "Estimate Sent":', leadUpdateError)
        console.error('[SEND ESTIMATE] Lead ID:', leadToUpdate, 'User ID:', userId)
        // Don't fail the request if lead update fails, just log it
      } else {
        console.log(`[SEND ESTIMATE] Lead ${leadToUpdate} status updated to "Estimate Sent"`)
        console.log('[SEND ESTIMATE] Updated lead:', updatedLead)
        
        // Also update the estimate with the lead_id if it wasn't set
        if (!estimate.lead_id) {
          await supabase
            .from('estimates')
            .update({ lead_id: leadToUpdate })
            .eq('id', estimateId)
            console.log(`[SEND ESTIMATE] Updated estimate with lead_id: ${leadToUpdate}`)
        }
      }
    } else {
      console.log('[SEND ESTIMATE] No lead found to update')
      console.log('[SEND ESTIMATE] Estimate ID:', estimateId, 'Client ID:', estimate.client_id, 'Lead ID:', estimate.lead_id)
    }

    // Trigger automations for estimate_sent event
    await checkAndExecuteAutomations('estimate_sent', {
      event: 'estimate_sent',
      user_id: userId,
      estimate_id: estimateId,
      client_name: clientName,
      client_email: clientEmail,
      user_email: undefined
    });

    return { 
      success: true, 
      messageId: data?.id
    };
  } catch (error) {
    console.error('Email sending error:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    return { 
      success: false, 
      error: `Failed to send email: ${errorMessage}. Please check your Resend API key and domain verification.` 
    };
  }
}

