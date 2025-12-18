import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { checkAndExecuteAutomations } from '@/lib/automations/executor';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEstimateEmail(
  estimateId: string,
  clientEmail: string,
  clientName: string,
  userId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Fetch estimate details
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

