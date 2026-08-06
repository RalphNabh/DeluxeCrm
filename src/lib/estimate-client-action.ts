import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndExecuteAutomations } from "@/lib/automations/executor";
import { findMatchingLead } from "@/lib/leads";
import { captureApiError } from "@/lib/api-error";
import { getAppUrl, isDevelopment } from "@/lib/env";
import {
  getFromAddress,
  getResendClient,
  isEmailConfigured,
} from "@/lib/email/resend-client";

export type EstimateClientAction = "approve" | "request_changes";

export type ApplyEstimateClientActionResult =
  | { ok: true; status: string; message: string; alreadyApplied?: boolean }
  | { ok: false; httpStatus: number; error: string };

const ACTIONABLE_STATUSES = ["Sent", "Changes Requested"] as const;

/**
 * Shared client-facing estimate outcome: approve or request changes.
 * Used by HMAC email links and the authenticated Client Hub.
 *
 * Caller must use a service-role (or otherwise privileged) Supabase client.
 */
export async function applyEstimateClientAction(
  supabase: SupabaseClient,
  input: {
    estimateId: string;
    action: EstimateClientAction;
    clientEmail: string;
    clientName?: string;
    /** When false, require estimate.clients.email to match clientEmail. */
    verifyClientEmail?: boolean;
  },
): Promise<ApplyEstimateClientActionResult> {
  const {
    estimateId,
    action,
    clientEmail,
    clientName,
    verifyClientEmail = true,
  } = input;

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select(
      "user_id, organization_id, lead_id, client_id, estimate_number, status, clients(email, name)",
    )
    .eq("id", estimateId)
    .single();

  if (estimateError || !estimate) {
    return { ok: false, httpStatus: 404, error: "Estimate not found" };
  }

  const clientRecord = estimate.clients as {
    email?: string;
    name?: string;
  } | null;

  if (!clientRecord?.email) {
    return { ok: false, httpStatus: 400, error: "Client email not on file" };
  }

  if (
    verifyClientEmail &&
    clientRecord.email.toLowerCase() !== clientEmail.toLowerCase()
  ) {
    return { ok: false, httpStatus: 403, error: "Invalid client email" };
  }

  const newStatus = action === "approve" ? "Approved" : "Changes Requested";

  // Idempotent replay: already in target status → success without re-firing side effects.
  if (estimate.status === newStatus) {
    return {
      ok: true,
      status: newStatus,
      message: "Estimate already updated",
      alreadyApplied: true,
    };
  }

  if (
    !ACTIONABLE_STATUSES.includes(
      estimate.status as (typeof ACTIONABLE_STATUSES)[number],
    )
  ) {
    return {
      ok: false,
      httpStatus: 400,
      error: `Estimate cannot be actioned while status is ${estimate.status}`,
    };
  }

  const userId = estimate.user_id as string;
  const orgId = estimate.organization_id as string | null;

  let contractorEmail = "";
  try {
    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserById(userId);
    if (!authError) {
      contractorEmail = authUser?.user?.email || "";
    }
  } catch (error) {
    captureApiError(error, {
      route: "estimate-client-action",
      step: "getUserById",
    });
  }

  const displayName = clientName || clientRecord.name || "Client";
  const reference =
    (estimate.estimate_number as string | null) || estimateId.slice(0, 8);

  const emailSubject =
    action === "approve"
      ? `Estimate approved by ${displayName} - ${reference}`
      : `Changes requested by ${displayName} - ${reference}`;
  const emailMessage =
    action === "approve"
      ? `Great news! ${displayName} approved estimate ${reference}.`
      : `${displayName} asked for changes to estimate ${reference}. Review it and send an updated version.`;

  const { data: updated, error: updateError } = await supabase
    .from("estimates")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId)
    .in("status", [...ACTIONABLE_STATUSES])
    .select("id")
    .maybeSingle();

  if (updateError) {
    captureApiError(updateError, { route: "estimate-client-action" });
    return { ok: false, httpStatus: 500, error: "Failed to update estimate" };
  }

  if (!updated) {
    // Race: another request won — re-read and treat target status as success.
    const { data: again } = await supabase
      .from("estimates")
      .select("status")
      .eq("id", estimateId)
      .maybeSingle();
    if (again?.status === newStatus) {
      return {
        ok: true,
        status: newStatus,
        message: "Estimate already updated",
        alreadyApplied: true,
      };
    }
    return {
      ok: false,
      httpStatus: 409,
      error: "Estimate was updated by another request. Refresh and try again.",
    };
  }

  if (action === "approve") {
    let leadToUpdate = estimate.lead_id as string | null;

    if (!leadToUpdate && orgId) {
      const matched = await findMatchingLead(supabase, orgId, {
        clientId: estimate.client_id as string | undefined,
        email: clientRecord.email,
        name: clientRecord.name,
      });
      if (matched) {
        leadToUpdate = matched.id;
        await supabase
          .from("estimates")
          .update({ lead_id: leadToUpdate })
          .eq("id", estimateId);
      }
    }

    if (leadToUpdate) {
      await supabase
        .from("leads")
        .update({
          status: "Approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadToUpdate);
    }

    try {
      await checkAndExecuteAutomations("estimate_approved", {
        event: "estimate_approved",
        user_id: userId,
        organization_id: orgId ?? undefined,
        estimate_id: estimateId,
        client_name: displayName,
        client_email: clientEmail,
      });
    } catch (error) {
      captureApiError(error, {
        route: "estimate-client-action",
        step: "automations",
      });
    }
  }

  if (isEmailConfigured() && contractorEmail) {
    const resend = getResendClient();
    const fromEmail = getFromAddress();
    let emailToSend = contractorEmail;

    if (isDevelopment() && process.env.RESEND_VERIFIED_EMAIL) {
      emailToSend = process.env.RESEND_VERIFIED_EMAIL;
    }

    const appUrl = getAppUrl();
    const confirmationEmailHtml = `
        <html><body style="font-family: Arial, sans-serif;">
          <h2>${newStatus}</h2>
          <p>${emailMessage}</p>
          <p><a href="${appUrl}/estimates/${estimateId}">View estimate in dashboard</a></p>
        </body></html>
      `;

    await resend.emails.send({
      from: fromEmail,
      to: [emailToSend],
      subject: emailSubject,
      html: confirmationEmailHtml,
    });
  }

  return {
    ok: true,
    status: newStatus,
    message: "Estimate updated successfully",
  };
}
