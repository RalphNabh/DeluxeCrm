import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { canAddSeat } from "@/lib/stripe-seats";
import { getAppUrl } from "@/lib/env";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { teamInviteSchema } from "@/lib/api-schemas";
import { sendTeamInviteEmail } from "@/lib/email/send-invite-email";
import { displayNameFor, roleLabel } from "@/lib/team";
import { listOrgMembers, listPendingInvitations } from "@/lib/team-members";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "invite_team");
    if (!auth.ok) return auth.response;

    const [invitations, members] = await Promise.all([
      listPendingInvitations(supabase, auth.ctx.orgId),
      listOrgMembers(supabase, auth.ctx.orgId),
    ]);

    // Never return raw invite tokens — accepting uses the emailed link only.
    const safeInvitations = invitations.map(
      ({ token: _token, ...rest }) => rest,
    );

    return NextResponse.json({ invitations: safeInvitations, members });
  } catch (error) {
    captureApiError(error, { route: "org/invitations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "invite_team");
    if (!auth.ok) return auth.response;

    const seatCheck = await canAddSeat(supabase, auth.ctx.orgId);
    if (!seatCheck.allowed) {
      return NextResponse.json({ error: seatCheck.reason }, { status: 402 });
    }

    const parsed = await parseJsonBody(request, teamInviteSchema);
    if (!parsed.ok) return parsed.response;

    const { email, role, name, phone } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Re-inviting someone should refresh their existing invitation rather than
    // leave two open rows for the same address.
    const { data: existing } = await supabase
      .from("organization_invitations")
      .select("id")
      .eq("org_id", auth.ctx.orgId)
      .eq("email", normalizedEmail)
      .is("accepted_at", null)
      .maybeSingle();

    const invitationFields = {
      org_id: auth.ctx.orgId,
      email: normalizedEmail,
      role,
      invited_by: auth.ctx.user.id,
      invited_name: name ?? null,
      invited_phone: phone ?? null,
      revoked_at: null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data: invitation, error } = existing
      ? await supabase
          .from("organization_invitations")
          .update(invitationFields)
          .eq("id", existing.id)
          .select("*")
          .single()
      : await supabase
          .from("organization_invitations")
          .insert(invitationFields)
          .select("*")
          .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const inviteUrl = `${getAppUrl()}/invite/${invitation.token}`;

    const [{ data: organization }, { data: inviterProfile }] = await Promise.all([
      supabase
        .from("organizations")
        .select("name")
        .eq("id", auth.ctx.orgId)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("full_name, email")
        .eq("user_id", auth.ctx.user.id)
        .maybeSingle(),
    ]);

    // The invitation exists either way; a mail failure is reported so the
    // inviter can fall back to sharing the link.
    const delivery = await sendTeamInviteEmail({
      to: normalizedEmail,
      inviteUrl,
      organizationName: organization?.name ?? "your team",
      invitedByName: displayNameFor(
        inviterProfile?.full_name,
        inviterProfile?.email ?? auth.ctx.user.email,
      ),
      recipientName: name,
      role: roleLabel(role),
    });

    return NextResponse.json(
      {
        invitation,
        inviteUrl,
        emailed: delivery.success,
        message: delivery.success
          ? `Invitation sent to ${normalizedEmail}.`
          : `Invitation created, but the email could not be sent. Share this link: ${inviteUrl}`,
      },
      { status: 201 },
    );
  } catch (error) {
    captureApiError(error, { route: "org/invitations/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
