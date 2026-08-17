import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/env";
import {
  getFromAddress,
  getResendClient,
  isEmailConfigured,
} from "@/lib/email/resend-client";

const THROTTLE_MS = 15 * 60 * 1000;
const lastAlertSent = new Map<string, number>();

/**
 * Send a throttled email when the other party receives a new Hub message.
 * Max one email per conversation per 15 minutes.
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

  const key = input.conversationId;
  const last = lastAlertSent.get(key) ?? 0;
  if (Date.now() - last < THROTTLE_MS) return;

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

  lastAlertSent.set(key, Date.now());
}
