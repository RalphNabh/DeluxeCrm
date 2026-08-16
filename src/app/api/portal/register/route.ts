import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

/**
 * Complete a Client Hub invite without Supabase's "Confirm your signup" email.
 * The contractor invite already proves the address; we create the auth user with
 * email_confirm: true, attach portal access, then the client signs in.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, registerSchema);
    if (!parsed.ok) return parsed.response;

    const { token, password } = parsed.data;
    const admin = createServiceRoleClient();

    const { data: invitation } = await admin
      .from("client_portal_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found or already used" },
        { status: 404 },
      );
    }

    const inviteEmail = String(invitation.email).trim().toLowerCase();
    if (!inviteEmail) {
      return NextResponse.json(
        { error: "Invitation is missing an email address" },
        { status: 400 },
      );
    }

    if (
      invitation.expires_at &&
      new Date(invitation.expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "This invitation has expired. Ask your contractor for a new invite.",
        },
        { status: 410 },
      );
    }

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: inviteEmail,
        password,
        email_confirm: true,
        user_metadata: { user_type: "client" },
      });

    let userId = created.user?.id ?? null;

    if (createError) {
      const msg = (createError.message || "").toLowerCase();
      const already =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists");

      if (!already) {
        return NextResponse.json(
          { error: createError.message || "Failed to create account" },
          { status: 400 },
        );
      }

      // Do not reset passwords for existing accounts (invite link ≠ takeover).
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Sign in to the Client Hub, then open your invite link again to finish setup.",
          code: "account_exists",
          email: inviteEmail,
        },
        { status: 409 },
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }

    const { error: portalError } = await admin.from("client_portal_users").upsert(
      {
        auth_user_id: userId,
        client_id: invitation.client_id,
        organization_id: invitation.organization_id,
        status: "active",
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id,organization_id" },
    );

    if (portalError) {
      return NextResponse.json({ error: portalError.message }, { status: 400 });
    }

    await admin
      .from("client_portal_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    await admin
      .from("user_profiles")
      .update({
        persona: "client",
        active_org_id: invitation.organization_id,
      })
      .eq("user_id", userId);

    return NextResponse.json({
      success: true,
      email: inviteEmail,
      message: "Account ready. Signing you in…",
    });
  } catch (error) {
    captureApiError(error, { route: "portal/register/POST" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
