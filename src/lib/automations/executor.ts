import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { isTwilioConfigured, sendTwilioSms } from '@/lib/sms/twilio';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured. Please set it in your environment variables.');
  }
  return new Resend(apiKey);
};

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'DyluxePro <onboarding@resend.dev>';
}

type Automation = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  name: string;
  trigger_event: string;
  action_type: string;
  action_payload: Record<string, unknown> | null;
};

type AutomationContext = {
  event: string;
  user_id: string;
  organization_id?: string;
  [key: string]: unknown;
};

type ExecuteOptions = {
  /** When true, skip delay enqueue (used by job processor / test runs). */
  skipDelay?: boolean;
};

function replaceTemplateVariables(text: string, context: AutomationContext): string {
  let result = text;
  for (const key in context) {
    const value = context[key];
    if (value !== null && value !== undefined) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
  }
  return result;
}

function getServiceRoleClient(): SupabaseClient {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for automations in production.');
    }
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function isOrgSmsEnabled(
  supabase: SupabaseClient,
  organizationId: string | undefined,
): Promise<boolean> {
  if (!organizationId) return false;
  const { data } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .maybeSingle();

  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  return settings.sms_notifications === true;
}

function buildDedupeKey(
  automation: Automation,
  context: AutomationContext,
  runAt: Date,
): string {
  const entity =
    (context.invoice_id as string) ||
    (context.estimate_id as string) ||
    (context.client_id as string) ||
    (context.lead_id as string) ||
    (context.job_id as string) ||
    'na';
  const day = runAt.toISOString().slice(0, 10);
  return `${automation.id}:${context.event}:${entity}:${day}`;
}

async function enqueueAutomationJob(
  supabase: SupabaseClient,
  automation: Automation,
  context: AutomationContext,
  delayDays: number,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const organizationId = context.organization_id || automation.organization_id;
  if (!organizationId) {
    return {
      success: false,
      error: 'Cannot schedule automation: missing organization_id',
    };
  }

  const runAt = new Date();
  runAt.setUTCDate(runAt.getUTCDate() + delayDays);
  const dedupeKey = buildDedupeKey(automation, context, runAt);

  const { error } = await supabase.from('automation_jobs').insert({
    organization_id: organizationId,
    automation_id: automation.id,
    run_at: runAt.toISOString(),
    payload: { context },
    status: 'pending',
    dedupe_key: dedupeKey,
  });

  if (error) {
    // Unique violation → already queued
    if (error.code === '23505') {
      return {
        success: true,
        message: `Automation already scheduled (dedupe: ${dedupeKey})`,
      };
    }
    console.error('[AUTOMATION] Failed to enqueue job:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: `Automation scheduled for ${runAt.toISOString()} (${delayDays} day delay)`,
  };
}

export async function executeAutomation(
  automation: Automation,
  context: AutomationContext,
  options: ExecuteOptions = {},
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const delayDays = Number(automation.action_payload?.delay_days) || 0;
    if (!options.skipDelay && delayDays > 0) {
      const supabase = getServiceRoleClient();
      return await enqueueAutomationJob(supabase, automation, context, delayDays);
    }

    if (automation.action_type === 'send_email') {
      return await executeSendEmail(automation, context);
    }

    if (automation.action_type === 'send_sms') {
      return await executeSendSms(automation, context);
    }

    return { success: false, error: `Unknown action type: ${automation.action_type}` };
  } catch (error) {
    console.error('Error executing automation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function executeSendEmail(
  automation: Automation,
  context: AutomationContext,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'Email service is not configured. Please set RESEND_API_KEY in your environment variables.',
      };
    }

    const resend = getResendClient();
    const payload = automation.action_payload || {};
    const subject = String(payload.subject || 'Automated Email');
    const body = String(payload.body || '');

    const finalSubject = replaceTemplateVariables(subject, context);
    const finalBody = replaceTemplateVariables(body, context);

    const verifiedEmail = process.env.RESEND_VERIFIED_EMAIL;
    const isDevelopment = process.env.NODE_ENV === 'development';

    const clientEmail = (context.client_email || context.lead_email || context.email) as
      | string
      | undefined;

    // Prefer client email in production; verified/dev fallback for testing.
    // Do not require a cookie session — cron job processing has none.
    const recipientEmail =
      clientEmail && !isDevelopment
        ? clientEmail
        : clientEmail || verifiedEmail || (context.user_email as string | undefined);

    if (!recipientEmail) {
      return {
        success: false,
        error: 'No recipient email configured for automation email.',
      };
    }

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
            ${finalBody.split('\n').map((line: string) => (line.trim() ? `<p>${line}</p>` : '<br>')).join('')}
          </div>
          <div class="footer">
            <p>This email was sent automatically from DyluxePro CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const prototypeNote =
      isDevelopment && clientEmail
        ? `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
        <strong>PROTOTYPE DEMO:</strong> This email was intended for ${clientEmail}. In production, emails will be sent directly to the client's email address.
      </div>
    `
        : '';

    const fullEmailHtml = emailHtml.replace(
      '<div class="content">',
      `<div class="content">${prototypeNote}`,
    );

    const { error } = await resend.emails.send({
      from: getFromEmail(),
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
      message: `Email sent successfully to ${recipientEmail}`,
    };
  } catch (error) {
    console.error('Error executing send email automation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

async function executeSendSms(
  automation: Automation,
  context: AutomationContext,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const organizationId = context.organization_id || automation.organization_id || undefined;
    const supabase = getServiceRoleClient();

    const smsEnabled = await isOrgSmsEnabled(supabase, organizationId);
    if (!smsEnabled) {
      return {
        success: false,
        error:
          'SMS notifications are disabled for this organization. Enable sms_notifications in organization settings.',
      };
    }

    if (!isTwilioConfigured()) {
      return {
        success: false,
        error:
          'SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.',
      };
    }

    const payload = automation.action_payload || {};
    const bodyTemplate = String(payload.body || payload.message || '');
    if (!bodyTemplate.trim()) {
      return { success: false, error: 'SMS automation is missing body/message text.' };
    }

    const phone = (context.client_phone ||
      context.lead_phone ||
      context.phone) as string | undefined;

    if (!phone) {
      return { success: false, error: 'No recipient phone number in automation context.' };
    }

    const finalBody = replaceTemplateVariables(bodyTemplate, context);
    const result = await sendTwilioSms({ to: phone, body: finalBody });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      message: `SMS sent successfully to ${phone}${result.sid ? ` (${result.sid})` : ''}`,
    };
  } catch (error) {
    console.error('Error executing send SMS automation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

/** Process a single due automation_jobs row (called by cron). */
export async function processAutomationJob(job: {
  id: string;
  automation_id: string;
  organization_id: string;
  payload: { context?: AutomationContext } | null;
  attempts: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceRoleClient();

  const { data: automation, error: autoErr } = await supabase
    .from('automations')
    .select('*')
    .eq('id', job.automation_id)
    .maybeSingle();

  if (autoErr || !automation) {
    return { success: false, error: autoErr?.message || 'Automation not found' };
  }

  if (!automation.is_active) {
    return { success: false, error: 'Automation is inactive' };
  }

  const context: AutomationContext = {
    event: automation.trigger_event,
    user_id: automation.user_id,
    organization_id: job.organization_id,
    ...(job.payload?.context || {}),
  };

  const result = await executeAutomation(automation as Automation, context, {
    skipDelay: true,
  });

  try {
    await supabase.from('automation_runs').insert([
      {
        user_id: context.user_id,
        organization_id: job.organization_id,
        automation_id: automation.id,
        event: automation.trigger_event,
        input: context,
        result: result.success ? 'success' : 'error',
        output: result,
      },
    ]);
  } catch (logError) {
    console.error('Error logging automation run from job:', logError);
  }

  return result.success
    ? { success: true }
    : { success: false, error: result.error || 'Execution failed' };
}

export async function checkAndExecuteAutomations(
  triggerEvent: string,
  context: AutomationContext,
): Promise<void> {
  try {
    const supabase = getServiceRoleClient();

    console.log(`Checking automations for event: ${triggerEvent}, user_id: ${context.user_id}`);

    let query = supabase
      .from('automations')
      .select('*')
      .eq('trigger_event', triggerEvent)
      .eq('is_active', true);

    if (context.organization_id) {
      query = query.eq('organization_id', context.organization_id);
    } else {
      query = query.eq('user_id', context.user_id);
    }

    const { data: automations, error } = await query;

    if (error) {
      console.error('[AUTOMATION EXECUTOR] Error fetching automations:', error);
      return;
    }

    if (!automations || automations.length === 0) {
      console.log(
        `[AUTOMATION EXECUTOR] No active automations found for event: ${triggerEvent}`,
      );
      return;
    }

    for (const automation of automations) {
      try {
        console.log(`Executing automation: ${automation.name} (ID: ${automation.id})`);
        const result = await executeAutomation(automation as Automation, context);
        console.log(`Automation result:`, result);

        try {
          await supabase.from('automation_runs').insert([
            {
              user_id: context.user_id,
              organization_id: context.organization_id || automation.organization_id,
              automation_id: automation.id,
              event: triggerEvent,
              input: context,
              result: result.success ? 'success' : 'error',
              output: result,
            },
          ]);
        } catch (logError) {
          console.error('Error logging automation run:', logError);
        }
      } catch (err) {
        console.error(`Error executing automation ${automation.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error checking automations:', error);
  }
}
