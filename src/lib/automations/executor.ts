import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Resend client with error handling
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured. Please set it in your environment variables.');
  }
  return new Resend(apiKey);
};

type Automation = {
  id: string;
  user_id: string;
  name: string;
  trigger_event: string;
  action_type: string;
  action_payload: any;
};

type AutomationContext = {
  event: string;
  user_id: string;
  [key: string]: any;
};

export async function executeAutomation(
  automation: Automation,
  context: AutomationContext
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (automation.action_type === 'send_email') {
      return await executeSendEmail(automation, context);
    }

    return { success: false, error: `Unknown action type: ${automation.action_type}` };
  } catch (error) {
    console.error('Error executing automation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function executeSendEmail(
  automation: Automation,
  context: AutomationContext
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'Email service is not configured. Please set RESEND_API_KEY in your environment variables.'
      };
    }

    const resend = getResendClient();
    const { subject, body, delay_days, days_overdue } = automation.action_payload;

    // Replace template variables
    let finalSubject = subject || 'Automated Email';
    let finalBody = body || '';

    // Replace all template variables dynamically
    const replaceVariables = (text: string) => {
      let result = text;
      for (const key in context) {
        const value = context[key];
        if (value !== null && value !== undefined) {
          result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        }
      }
      return result;
    };

    finalSubject = replaceVariables(finalSubject);
    finalBody = replaceVariables(finalBody);

    // Get recipient email - prioritize client/lead email, fallback to verified email
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;
    
    // Determine recipient: client/lead email in production, verified email in development (for testing)
    const verifiedEmail = process.env.RESEND_VERIFIED_EMAIL || 'nabhanralph@gmail.com';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Get client/lead email from context (could be client_email, lead_email, or email)
    const clientEmail = context.client_email || context.lead_email || context.email;
    
    // Use client email if available and in production, otherwise use verified email for testing
    const recipientEmail = clientEmail && !isDevelopment
      ? clientEmail
      : (clientEmail || verifiedEmail);

    // Create professional HTML email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${finalSubject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${finalSubject}</h1>
            <p>From DyluxePro</p>
          </div>
          
          <div class="content">
            ${finalBody.split('\n').map((line: string) => line.trim() ? `<p>${line}</p>` : '<br>').join('')}
          </div>
          
          <div class="footer">
            <p>This email was sent automatically from DyluxePro CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    // Use RESEND_FROM_EMAIL environment variable, fallback to test domain
    // Once dyluxepro.com is verified in Resend, set RESEND_FROM_EMAIL=noreply@dyluxepro.com
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'DyluxePro <onboarding@resend.dev>';
    
    // Add prototype note if in development and we have a client email
    const prototypeNote = isDevelopment && clientEmail ? `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
        <strong>PROTOTYPE DEMO:</strong> This email was intended for ${clientEmail}. In production, emails will be sent directly to the client's email address.
      </div>
    ` : '';

    const fullEmailHtml = emailHtml.replace(
      '<div class="content">',
      `<div class="content">${prototypeNote}`
    );
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      subject: finalSubject,
      html: fullEmailHtml,
    });

    if (error) {
      console.error('Automation email sending error:', error);
      return { success: false, error: `Failed to send email: ${error.message}` };
    }

    return {
      success: true,
      message: `Email sent successfully to ${recipientEmail}`
    };
  } catch (error) {
    console.error('Error executing send email automation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

// Function to check and execute automations for a specific event
export async function checkAndExecuteAutomations(
  triggerEvent: string,
  context: AutomationContext
): Promise<void> {
  try {
    // Use service role client to bypass RLS when client isn't authenticated
    // This is needed when clients approve estimates from email links
    let supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Use service role key if available (bypasses RLS)
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      console.log('Using service role client for automation queries');
    } else {
      // Fallback: use anon key directly (requires RLS to allow reading by user_id)
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      console.log('Using anon key client for automation queries (RLS must allow reading by user_id)');
    }
    
    console.log(`Checking automations for event: ${triggerEvent}, user_id: ${context.user_id}`);
    
    // Fetch all active automations for this trigger event
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('user_id', context.user_id)
      .eq('trigger_event', triggerEvent)
      .eq('is_active', true);

    if (error) {
      console.error('[AUTOMATION EXECUTOR] Error fetching automations:', error);
      console.error('[AUTOMATION EXECUTOR] Error details:', JSON.stringify(error, null, 2));
      console.error('[AUTOMATION EXECUTOR] Error code:', error.code);
      console.error('[AUTOMATION EXECUTOR] Error message:', error.message);
      console.error('[AUTOMATION EXECUTOR] Error hint:', error.hint);
      console.error('[AUTOMATION EXECUTOR] This might be an RLS policy issue. Make sure SUPABASE_SERVICE_ROLE_KEY is set.');
      return;
    }

    if (!automations) {
      console.error('[AUTOMATION EXECUTOR] Automations query returned null/undefined');
      return;
    }

    if (automations.length === 0) {
      console.log(`[AUTOMATION EXECUTOR] No active automations found for event: ${triggerEvent}, user_id: ${context.user_id}`);
      console.log('[AUTOMATION EXECUTOR] Query params:', { triggerEvent, user_id: context.user_id, is_active: true });
      console.log('[AUTOMATION EXECUTOR] Make sure:');
      console.log('  1. The automation exists in the automations table');
      console.log('  2. The automation has trigger_event = "estimate_approved"');
      console.log('  3. The automation has is_active = true');
      console.log('  4. The automation has user_id matching the estimate owner');
      return;
    }

    console.log(`Found ${automations.length} active automation(s) for event: ${triggerEvent}, user_id: ${context.user_id}`);
    console.log('Automations:', automations.map(a => ({ id: a.id, name: a.name, is_active: a.is_active })));

    // Execute each automation
    for (const automation of automations) {
      try {
        console.log(`Executing automation: ${automation.name} (ID: ${automation.id})`);
        
        // Check delay if specified
        if (automation.action_payload?.delay_days) {
          // For now, we'll execute immediately but note that in production
          // you'd want to schedule this with a job queue (e.g., Bull, Agenda)
          // For simplicity, we'll execute immediately but note the delay requirement
          console.log(`Note: Automation has ${automation.action_payload.delay_days} day delay, but executing immediately for prototype`);
        }

        const result = await executeAutomation(automation, context);

        console.log(`Automation result:`, result);

        // Log the run
        try {
          await supabase
            .from('automation_runs')
            .insert([{
              user_id: context.user_id,
              automation_id: automation.id,
              event: triggerEvent,
              input: context,
              result: result.success ? 'success' : 'error',
              output: result
            }]);
        } catch (logError) {
          console.error('Error logging automation run:', logError);
          // Don't fail if logging fails
        }
      } catch (error) {
        console.error(`Error executing automation ${automation.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking automations:', error);
  }
}

