import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireManager,
  requirePortalUser,
  requireUser,
} from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/env";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { sendPortalInviteEmail } from "@/lib/email/send-portal-invite-email";
import { z } from "zod";

const inviteSchema = z.object({
  clientId: z.string().uuid(),
});

const acceptSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireManager(supabase);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, inviteSchema);
    if (!parsed.ok) return parsed.response;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, email, name, organization_id")
      .eq("id", parsed.data.clientId)
      .eq("organization_id", auth.ctx.orgId)
      .single();

    if (clientError || !client?.email) {
      return NextResponse.json(
        { error: "Client not found or missing email" },
        { status: 400 },
      );
    }

    const { data: invitation, error } = await supabase
      .from("client_portal_invitations")
      .insert({
        organization_id: auth.ctx.orgId,
        client_id: client.id,
        email: client.email.toLowerCase(),
        invited_by: auth.ctx.user.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const inviteUrl = `${getAppUrl()}/portal/register?token=${invitation.token}`;

    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", auth.ctx.orgId)
      .maybeSingle();

    const delivery = await sendPortalInviteEmail({
      to: client.email,
      inviteUrl,
      clientName: client.name,
      organizationName: organization?.name ?? "Your contractor",
    });

    return NextResponse.json(
      {
        invitation,
        inviteUrl,
        emailed: delivery.success,
        message: delivery.success
          ? `Invitation sent to ${client.email}.`
          : `Invitation created, but the email could not be sent. Share this link: ${inviteUrl}`,
      },
      { status: 201 },
    );
  } catch (error) {
    captureApiError(error, { route: "portal/invitations/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const token = request.nextUrl.searchParams.get("token");

    if (token) {
      const { data: invitation } = await supabase
        .from("client_portal_invitations")
        .select("email, client_id, organization_id, clients(name), organizations(name)")
        .eq("token", token)
        .is("accepted_at", null)
        .maybeSingle();

      if (!invitation) {
        return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
      }

      return NextResponse.json({
        email: invitation.email,
        clientName: (invitation.clients as { name?: string })?.name,
        orgName: (invitation.organizations as { name?: string })?.name,
      });
    }

    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;
    return NextResponse.json({ clientId: auth.clientId, orgId: auth.orgId });
  } catch (error) {
    captureApiError(error, { route: "portal/invitations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, acceptSchema);
    if (!parsed.ok) return parsed.response;

    const admin = createServiceRoleClient();
    const { data: invitation } = await admin
      .from("client_portal_invitations")
      .select("*")
      .eq("token", parsed.data.token)
      .is("accepted_at", null)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (auth.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: `Email mismatch: you're signed in as ${auth.user.email ?? "unknown"}, but this invite is for ${invitation.email}. Sign out and use the invited email.`,
        },
        { status: 403 },
      );
    }

    const { data: portalUser, error } = await admin
      .from("client_portal_users")
      .upsert(
        {
          auth_user_id: auth.user.id,
          client_id: invitation.client_id,
          organization_id: invitation.organization_id,
          status: "active",
          accepted_at: new Date().toISOString(),
        },
        { onConflict: "auth_user_id,organization_id" },
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin
      .from("client_portal_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    await admin
      .from("user_profiles")
      .update({ persona: "client", active_org_id: invitation.organization_id })
      .eq("user_id", auth.user.id);

    return NextResponse.json({ success: true, portalUser });
  } catch (error) {
    captureApiError(error, { route: "portal/invitations/PUT" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
