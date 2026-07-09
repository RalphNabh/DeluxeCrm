import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/api-auth";
import { syncStripeSeatQuantity } from "@/lib/stripe-seats";
import { createStripeClient } from "@/lib/stripe-server";
import { getDefaultRouteForRole } from "@/lib/rbac";
import type { OrgRole } from "@/lib/org";
import { captureApiError } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    const { data: invitation, error } = await supabase
      .from("organization_invitations")
      .select("*, organizations(id, name)")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
    }

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      orgName: (invitation.organizations as { name?: string })?.name,
    });
  } catch (error) {
    captureApiError(error, { route: "org/invitations/accept/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const admin = createServiceRoleClient();

    const { data: invitation, error: invError } = await admin
      .from("organization_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    if (invError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
    }

    if (
      auth.user.email?.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address." },
        { status: 403 },
      );
    }

    const { error: memberError } = await admin.from("organization_members").upsert(
      {
        org_id: invitation.org_id,
        user_id: auth.user.id,
        role: invitation.role,
        status: "active",
        invited_by: invitation.invited_by,
      },
      { onConflict: "org_id,user_id" },
    );

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    await admin
      .from("organization_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    await admin
      .from("user_profiles")
      .update({
        active_org_id: invitation.org_id,
        persona: "contractor",
      })
      .eq("user_id", auth.user.id);

    try {
      const stripe = createStripeClient();
      await syncStripeSeatQuantity(stripe, admin, invitation.org_id);
    } catch {
      // Non-fatal if Stripe not configured
    }

    const role = invitation.role as OrgRole;
    return NextResponse.json({
      success: true,
      redirectTo: getDefaultRouteForRole(role),
      orgId: invitation.org_id,
    });
  } catch (error) {
    captureApiError(error, { route: "org/invitations/accept/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
