import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/env";
import {
  getFromAddress,
  getResendClient,
  isEmailConfigured,
} from "@/lib/email/resend-client";
import { humanizeSource } from "@/lib/requests/metadata-labels";

/**
 * Email the org owner (+ any configured extra recipients) when a new
 * service request lands, regardless of source. Idempotent per row via
 * lead_alert_sent_at — each lead gets its own email, no time-window
 * coalescing (unlike message alerts, where bursts are expected).
 */
export async function maybeSendNewLeadEmail(
  admin: SupabaseClient,
  input: {
    serviceRequestId: string;
    organizationId: string;
    ownerUserId: string;
    orgName?: string;
    title: string;
    clientName?: string;
    clientEmail?: string;
    source: string;
  },
): Promise<void> {
  if (!isEmailConfigured()) return;

  const { data: row } = await admin
    .from("service_requests")
    .select("lead_alert_sent_at")
    .eq("id", input.serviceRequestId)
    .maybeSingle();
  if (row?.lead_alert_sent_at) return;

  const { data: org } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", input.organizationId)
    .maybeSingle();
  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  if (settings.email_notifications === false) return;

  const notifications = (settings.notifications ?? {}) as Record<string, unknown>;
  const extraRecipients = Array.isArray(notifications.lead_recipients)
    ? (notifications.lead_recipients as unknown[]).map((e) => String(e))
    : [];

  const { data: ownerAuth } = await admin.auth.admin.getUserById(input.ownerUserId);
  const ownerEmail = ownerAuth?.user?.email;

  const recipients = Array.from(
    new Set([ownerEmail, ...extraRecipients].filter(Boolean).map((e) => e!.toLowerCase())),
  );
  if (recipients.length === 0) return;

  const resend = getResendClient();
  const from = getFromAddress();
  const appUrl = getAppUrl();
  const sourceLabel = humanizeSource(input.source);

  await resend.emails.send({
    from,
    to: recipients,
    subject: `New lead: ${input.title}`,
    html: `
      <html><body style="font-family: Arial, sans-serif;">
        <p>You have a new request${input.orgName ? ` for ${input.orgName}` : ""}.</p>
        <p>
          <strong>Title:</strong> ${input.title}<br/>
          ${input.clientName ? `<strong>From:</strong> ${input.clientName}<br/>` : ""}
          ${input.clientEmail ? `<strong>Email:</strong> ${input.clientEmail}<br/>` : ""}
          <strong>Source:</strong> ${sourceLabel}
        </p>
        <p><a href="${appUrl}/requests">Open Requests</a></p>
      </body></html>
    `,
  });

  await admin
    .from("service_requests")
    .update({ lead_alert_sent_at: new Date().toISOString() })
    .eq("id", input.serviceRequestId);
}
