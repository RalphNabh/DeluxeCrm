import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canInviteTeam } from "@/lib/rbac";
import { canAddSeat } from "@/lib/stripe-seats";
import { getAppUrl } from "@/lib/env";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "worker"]).default("worker"),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;

    const { data: invitations, error } = await supabase
      .from("organization_invitations")
      .select("*")
      .eq("org_id", auth.ctx.orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: members } = await supabase
      .from("organization_members")
      .select("id, user_id, role, status, joined_at, user_profiles:user_id(full_name, email)")
      .eq("org_id", auth.ctx.orgId)
      .order("joined_at", { ascending: true });

    return NextResponse.json({ invitations: invitations ?? [], members: members ?? [] });
  } catch (error) {
    captureApiError(error, { route: "org/invitations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;

    if (!canInviteTeam(auth.ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const seatCheck = await canAddSeat(supabase, auth.ctx.orgId);
    if (!seatCheck.allowed) {
      return NextResponse.json({ error: seatCheck.reason }, { status: 402 });
    }

    const parsed = await parseJsonBody(request, inviteSchema);
    if (!parsed.ok) return parsed.response;

    const { email, role } = parsed.data;

    const { data: invitation, error } = await supabase
      .from("organization_invitations")
      .insert({
        org_id: auth.ctx.orgId,
        email: email.toLowerCase(),
        role,
        invited_by: auth.ctx.user.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const inviteUrl = `${getAppUrl()}/invite/${invitation.token}`;

    return NextResponse.json(
      { invitation, inviteUrl, message: `Invitation created. Share: ${inviteUrl}` },
      { status: 201 },
    );
  } catch (error) {
    captureApiError(error, { route: "org/invitations/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
