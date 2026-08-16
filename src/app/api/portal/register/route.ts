import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import {
  attachPortalInvite,
  findAuthUserIdByEmail,
  hasActivePortalMembership,
  normalizeInviteEmail,
  type PortalInvitationRow,
} from "@/lib/portal-invite";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

/**
 * Complete a Client Hub invite without Supabase's "Confirm your signup" email.
 * Creates a new auth user, or heals an orphan auth user (exists but no portal row).
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

    const inviteRow = invitation as PortalInvitationRow;
    const inviteEmail = normalizeInviteEmail(String(inviteRow.email || ""));
    if (!inviteEmail) {
      return NextResponse.json(
        { error: "Invitation is missing an email address" },
        { status: 400 },
      );
    }

    if (
      inviteRow.expires_at &&
      new Date(inviteRow.expires_at).getTime() < Date.now()
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

      // Orphan / existing auth user: invite token proves mailbox ownership.
      userId = await findAuthUserIdByEmail(admin, inviteEmail);
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists, but it could not be found. Contact support.",
          },
          { status: 400 },
        );
      }

      const alreadyLinked = await hasActivePortalMembership(
        admin,
        userId,
        inviteRow.organization_id,
      );

      if (!alreadyLinked) {
        const { error: updateError } = await admin.auth.admin.updateUserById(
          userId,
          { password, email_confirm: true },
        );
        if (updateError) {
          return NextResponse.json(
            { error: updateError.message || "Failed to update account" },
            { status: 400 },
          );
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }

    try {
      await attachPortalInvite(admin, inviteRow, userId);
    } catch (attachErr) {
      return NextResponse.json(
        {
          error:
            attachErr instanceof Error
              ? attachErr.message
              : "Failed to link Client Hub access",
        },
        { status: 400 },
      );
    }

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
