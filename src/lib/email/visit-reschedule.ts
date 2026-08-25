import {
  getFromAddress,
  getResendClient,
  isEmailConfigured,
} from "@/lib/email/resend-client";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Tell a client their appointment moved to a new time. */
export async function sendVisitRescheduledEmail(input: {
  clientEmail: string;
  clientName?: string;
  jobTitle: string;
  newStart: string;
  newEnd: string;
  orgName?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { success: false, error: "Email is not configured" };
  }
  if (!input.clientEmail) {
    return { success: false, error: "Client has no email on file" };
  }

  try {
    const resend = getResendClient();
    const from = getFromAddress();

    const { error } = await resend.emails.send({
      from,
      to: [input.clientEmail],
      subject: `Your appointment has been rescheduled${input.orgName ? ` - ${input.orgName}` : ""}`,
      html: `
        <html><body style="font-family: Arial, sans-serif; color: #1e293b;">
          <p>Hi${input.clientName ? ` ${input.clientName}` : ""},</p>
          <p>Your appointment${input.orgName ? ` with ${input.orgName}` : ""} has been rescheduled.</p>
          <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>${input.jobTitle}</strong></p>
            <p style="margin: 0;">New time: <strong>${formatDateTime(input.newStart)} - ${new Date(input.newEnd).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</strong></p>
          </div>
          <p>If this new time doesn't work for you, please reach out and we'll find another time.</p>
        </body></html>
      `,
    });

    if (error) {
      const message = error instanceof Error ? error.message : "Failed to send email";
      return { success: false, error: message };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
