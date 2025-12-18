import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { checkAndExecuteAutomations } from '@/lib/automations/executor';

export async function sendInvoiceEmail(
  invoiceId: string,
  clientEmail: string,
  clientName: string,
  userId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Fetch invoice details with all related data
    const { data: invoice, error: invoiceError } = await supabase
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
          payment_date
        )
      `)
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (invoiceError || !invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    // Parse payment_method and payment_email from notes if they exist
    // (They might be stored in notes or as separate fields)
    let paymentMethod = (invoice as Record<string, unknown>).payment_method as string | undefined;
    let paymentEmail = (invoice as Record<string, unknown>).payment_email as string | undefined;
    
    // If not in separate fields, try to extract from notes
    if (!paymentMethod && invoice.notes) {
      const paymentMatch = invoice.notes.match(/Payment Method:\s*([^\n]+)/);
      if (paymentMatch) {
        paymentMethod = paymentMatch[1].trim();
      }
      const emailMatch = invoice.notes.match(/Payment Email:\s*([^\n]+)/);
      if (emailMatch) {
        paymentEmail = emailMatch[1].trim();
      }
    }
    
    // Add parsed payment info to invoice object
    const invoiceWithPayment = {
      ...invoice,
      payment_method: paymentMethod,
      payment_email: paymentEmail
    };

    // Determine recipient email - send directly to client
    const recipientEmail = clientEmail || invoice.clients?.email;
    
    if (!recipientEmail) {
      return { success: false, error: 'Client email address is required' };
    }

    // Calculate total paid from payments
    const totalPaid = (invoice.payments || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const remaining = invoice.total - totalPaid;

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
        <strong>PROTOTYPE DEMO:</strong> This invoice was intended for ${recipientEmail}. In production, emails will be sent directly to the client's email address.
      </div>
    ` : '';

    // Create email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice from DyluxePro</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; }
          .content { padding: 30px; }
          .invoice-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
          .invoice-details h3 { margin-top: 0; color: #1e293b; }
          .invoice-details p { margin: 8px 0; }
          .line-items { margin: 25px 0; }
          .line-items h3 { color: #1e293b; margin-bottom: 15px; }
          .line-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .line-item:last-child { border-bottom: none; }
          .line-item-desc { flex: 1; }
          .line-item-desc strong { color: #1e293b; display: block; margin-bottom: 4px; }
          .line-item-desc small { color: #64748b; }
          .line-item-amount { font-weight: 600; color: #1e293b; }
          .totals { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; }
          .total-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; }
          .total-final { font-weight: bold; font-size: 20px; border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 10px; color: #1e293b; }
          .payment-info { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .payment-info h3 { margin-top: 0; color: #92400e; }
          .payment-info p { margin: 5px 0; color: #78350f; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 15px 5px; font-weight: 600; }
          .button:hover { background: #059669; }
          .due-date { font-size: 16px; font-weight: 600; color: #dc2626; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: 10px; }
          .status-paid { background: #d1fae5; color: #065f46; }
          .status-pending { background: #dbeafe; color: #1e40af; }
          .status-overdue { background: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice</h1>
            <p>From DyluxePro</p>
          </div>
          
          <div class="content">
            ${prototypeNote}
            <h2 style="color: #1e293b; margin-top: 0;">Hello ${clientName},</h2>
            <p>Please find your invoice details below. We appreciate your business!</p>
            
            <div class="invoice-details">
              <h3>Invoice Details</h3>
              <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
              <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
              ${invoice.due_date ? `
                <p><strong>Due Date:</strong> <span class="due-date">${new Date(invoice.due_date).toLocaleDateString()}</span></p>
              ` : ''}
              <p><strong>Status:</strong> ${invoice.status}
                <span class="status-badge ${
                  invoice.status === 'Paid' ? 'status-paid' :
                  invoice.status === 'Overdue' ? 'status-overdue' :
                  'status-pending'
                }">${invoice.status}</span>
              </p>
            </div>

            <div class="line-items">
              <h3>Line Items</h3>
              ${invoice.invoice_line_items && invoice.invoice_line_items.length > 0 ? invoice.invoice_line_items.map((item: { description: string; quantity: number; unit: string; unit_price: number; total: number }) => `
                <div class="line-item">
                  <div class="line-item-desc">
                    <strong>${item.description}</strong>
                    <small>${item.quantity} ${item.unit} × $${Number(item.unit_price).toFixed(2)}</small>
                  </div>
                  <div class="line-item-amount">$${Number(item.total).toFixed(2)}</div>
                </div>
              `).join('') : '<p style="color: #64748b;">No line items</p>'}
            </div>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax (13%):</span>
                <span>$${Number(invoice.tax).toFixed(2)}</span>
              </div>
              ${totalPaid > 0 ? `
                <div class="total-row">
                  <span>Amount Paid:</span>
                  <span style="color: #10b981;">$${totalPaid.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Remaining Balance:</span>
                  <span style="color: #dc2626; font-weight: 600;">$${remaining.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row total-final">
                <span>Total Amount:</span>
                <span>$${Number(invoice.total).toFixed(2)}</span>
              </div>
            </div>

            ${totalPaid > 0 && remaining > 0 ? `
              <div class="payment-info">
                <h3>Payment Status</h3>
                <p><strong>Amount Paid:</strong> $${totalPaid.toFixed(2)}</p>
                <p><strong>Remaining Balance:</strong> $${remaining.toFixed(2)}</p>
                <p>Thank you for your partial payment. Please remit the remaining balance by the due date.</p>
              </div>
            ` : totalPaid === 0 && invoice.status !== 'Paid' ? `
              <div class="payment-info">
                <h3>Payment Instructions</h3>
                <p>Please remit payment of <strong>$${invoice.total.toFixed(2)}</strong>${invoice.due_date ? ` by ${new Date(invoice.due_date).toLocaleDateString()}` : ''}.</p>
                <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
              </div>
            ` : ''}

            ${invoiceWithPayment.payment_method || invoice.notes ? `
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <h3 style="margin-top: 0; color: #1e293b; margin-bottom: 15px;">Payment Instructions</h3>
                ${invoiceWithPayment.payment_method ? `
                  <div style="margin-bottom: 15px;">
                    <p style="margin: 5px 0; color: #1e293b;"><strong>Preferred Payment Method:</strong> ${invoiceWithPayment.payment_method}</p>
                    ${invoiceWithPayment.payment_email ? `
                      <p style="margin: 5px 0; color: #1e293b;"><strong>Payment Email:</strong> <a href="mailto:${invoiceWithPayment.payment_email}" style="color: #2563eb; text-decoration: none;">${invoiceWithPayment.payment_email}</a></p>
                      <p style="margin: 10px 0 0 0; color: #475569; font-size: 14px;">Please send payment to the email address above.</p>
                    ` : ''}
                  </div>
                ` : ''}
                ${invoice.notes ? `
                  <div style="margin-top: ${invoiceWithPayment.payment_method ? '15px' : '0'}; padding-top: ${invoiceWithPayment.payment_method ? '15px' : '0'}; border-top: ${invoiceWithPayment.payment_method ? '1px solid #e5e7eb' : 'none'};">
                    <h4 style="margin-top: 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase;">Additional Notes</h4>
                    <p style="margin: 0; color: #475569; white-space: pre-wrap; line-height: 1.6;">${invoice.notes.replace(/Payment Method:.*/g, '').replace(/Payment Email:.*/g, '').trim()}</p>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br><strong>DyluxePro Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This invoice was generated by DyluxePro CRM</p>
            <p style="margin-top: 5px; font-size: 12px;">Invoice ID: ${invoice.id.slice(0, 8)}</p>
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
      subject: `Invoice ${invoice.invoice_number} from DyluxePro${invoice.due_date ? ` - Due ${new Date(invoice.due_date).toLocaleDateString()}` : ''}`,
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

    // Update invoice status to "Sent" if it's currently "Draft"
    if (invoice.status === 'Draft') {
      await supabase
        .from('invoices')
        .update({ 
          status: 'Sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', userId);
    }

    // Trigger automations for invoice_sent event
    await checkAndExecuteAutomations('invoice_sent', {
      event: 'invoice_sent',
      user_id: userId,
      invoice_id: invoiceId,
      client_name: clientName,
      client_email: clientEmail,
      invoice_number: invoice.invoice_number,
      invoice_total: invoice.total,
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

