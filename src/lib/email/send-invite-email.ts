import {
  getFromAddress,
  getResendClient,
  isEmailConfigured,
} from "@/lib/email/resend-client";
import { getAppUrl, isDevelopment } from "@/lib/env";

type InviteEmail = {
  to: string;
  inviteUrl: string;
  organizationName: string;
  invitedByName?: string | null;
  recipientName?: string | null;
  role: string;
};

/**
 * Email a team invitation.
 *
 * Invitations previously returned a URL in the API response for the inviter to
 * copy and paste out of band. Nobody was ever emailed.
 */
export async function sendTeamInviteEmail(
  invite: InviteEmail,
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { success: false, error: "Email is not configured" };
  }

  const greeting = invite.recipientName?.trim()
    ? `Hi ${invite.recipientName.trim()},`
    : "Hi,";
  const inviter = invite.invitedByName?.trim() || "Your colleague";

  // In development Resend will only deliver to a verified address, so redirect
  // there rather than silently failing.
  const verified = process.env.RESEND_VERIFIED_EMAIL;
  const recipient = isDevelopment() && verified ? verified : invite.to;
  const redirectNotice =
    recipient !== invite.to
      ? `<p style="background:#fef3c7;border:1px solid #f59e0b;padding:10px;border-radius:4px">
           <strong>Development mode:</strong> this invitation was addressed to ${invite.to}.
         </p>`
      : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background:#16a34a;color:#fff;padding:20px;text-align:center;">
            <h1 style="margin:0;font-size:20px;">You have been added to ${invite.organizationName}</h1>
          </div>
          <div style="padding:24px;">
            ${redirectNotice}
            <p>${greeting}</p>
            <p>${inviter} invited you to join <strong>${invite.organizationName}</strong>
               on DyluxePro as a ${invite.role}.</p>
            <p style="margin:28px 0;">
              <a href="${invite.inviteUrl}"
                 style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;
                        text-decoration:none;display:inline-block;">
                Accept invitation
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px;">
              This link expires in 7 days. If the button does not work, paste this
              into your browser:<br />
              <a href="${invite.inviteUrl}">${invite.inviteUrl}</a>
            </p>
          </div>
          <div style="text-align:center;color:#6b7280;font-size:12px;padding:16px;">
            <p>Sent by DyluxePro · <a href="${getAppUrl()}">${getAppUrl()}</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const { error } = await getResendClient().emails.send({
      from: getFromAddress(),
      to: [recipient],
      subject: `Join ${invite.organizationName} on DyluxePro`,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send invitation",
    };
  }
}
