import {
  getFromAddress,
  getResendClient,
  isEmailConfigured,
} from "@/lib/email/resend-client";
import { getAppUrl, isDevelopment } from "@/lib/env";

type PortalInviteEmail = {
  to: string;
  inviteUrl: string;
  clientName?: string | null;
  organizationName: string;
};

/**
 * Email a client their Client Hub invitation.
 *
 * Like team invitations, this previously returned a URL for the contractor to
 * copy and send themselves.
 */
export async function sendPortalInviteEmail(
  invite: PortalInviteEmail,
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { success: false, error: "Email is not configured" };
  }

  const greeting = invite.clientName?.trim()
    ? `Hi ${invite.clientName.trim()},`
    : "Hi,";

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
            <h1 style="margin:0;font-size:20px;">${invite.organizationName}</h1>
            <p style="margin:6px 0 0;">Your online account is ready</p>
          </div>
          <div style="padding:24px;">
            ${redirectNotice}
            <p>${greeting}</p>
            <p>${invite.organizationName} set up an account where you can review
               quotes, approve work, pay invoices and see your appointments in one
               place.</p>
            <p style="margin:28px 0;">
              <a href="${invite.inviteUrl}"
                 style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;
                        text-decoration:none;display:inline-block;">
                Set up my account
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px;">
              If the button does not work, paste this into your browser:<br />
              <a href="${invite.inviteUrl}">${invite.inviteUrl}</a>
            </p>
          </div>
          <div style="text-align:center;color:#6b7280;font-size:12px;padding:16px;">
            <p>Powered by DyluxePro · <a href="${getAppUrl()}">${getAppUrl()}</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const { error } = await getResendClient().emails.send({
      from: getFromAddress(),
      to: [recipient],
      subject: `Your ${invite.organizationName} account`,
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
