import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/env";
import {
  getFromAddress,
  getResendClient,
  isEmailConfigured,
} from "@/lib/email/resend-client";

const THROTTLE_MS = 15 * 60 * 1000;

/**
 * Send a throttled email when the other party receives a new Hub message.
 * Max one email per conversation per 15 minutes (persisted on conversations.last_alert_at).
 */
export async function maybeSendNewMessageEmail(
  admin: SupabaseClient,
  input: {
    conversationId: string;
    recipientEmail: string;
    recipientName?: string;
    deepLink: string;
    orgName?: string;
  },
): Promise<void> {
  if (!isEmailConfigured() || !input.recipientEmail) return;

  const { data: convo } = await admin
    .from("conversations")
    .select("last_alert_at")
    .eq("id", input.conversationId)
    .maybeSingle();

  const last = convo?.last_alert_at
    ? new Date(convo.last_alert_at as string).getTime()
    : 0;
  if (Number.isFinite(last) && Date.now() - last < THROTTLE_MS) return;

  const resend = getResendClient();
  const from = getFromAddress();
  const appUrl = getAppUrl();
  const link = input.deepLink.startsWith("http")
    ? input.deepLink
    : `${appUrl}${input.deepLink}`;

  await resend.emails.send({
    from,
    to: [input.recipientEmail],
    subject: `New Client Hub message${input.orgName ? ` from ${input.orgName}` : ""}`,
    html: `
      <html><body style="font-family: Arial, sans-serif;">
        <p>Hi${input.recipientName ? ` ${input.recipientName}` : ""},</p>
        <p>You have a new message in Client Hub.</p>
        <p><a href="${link}">Open messages</a></p>
      </body></html>
    `,
  });

  await admin
    .from("conversations")
    .update({ last_alert_at: new Date().toISOString() })
    .eq("id", input.conversationId);
}
