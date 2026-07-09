import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getActiveMembership,
  type OrgContext,
  type OrgRole,
} from "@/lib/org";
import { hasPermission, isManagerOrAbove, type Permission } from "@/lib/rbac";

type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

type OrgAuthResult =
  | { ok: true; ctx: OrgContext }
  | { ok: false; response: NextResponse };

export async function requireUser(
  supabase: SupabaseClient,
): Promise<AuthResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export async function requireOrgMember(
  supabase: SupabaseClient,
  options?: { roles?: OrgRole[] },
): Promise<OrgAuthResult> {
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth;

  const membership = await getActiveMembership(supabase, auth.user.id);
  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No organization membership found" },
        { status: 403 },
      ),
    };
  }

  const role = membership.role as OrgRole;
  if (options?.roles && !options.roles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    ctx: {
      user: auth.user,
      orgId: membership.org_id,
      role,
      membership,
    },
  };
}

export async function requirePermission(
  supabase: SupabaseClient,
  permission: Permission,
): Promise<OrgAuthResult> {
  const result = await requireOrgMember(supabase);
  if (!result.ok) return result;

  if (!hasPermission(result.ctx.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}

export async function requireManager(
  supabase: SupabaseClient,
): Promise<OrgAuthResult> {
  const result = await requireOrgMember(supabase);
  if (!result.ok) return result;

  if (!isManagerOrAbove(result.ctx.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}

export async function requirePortalUser(
  supabase: SupabaseClient,
): Promise<
  | {
      ok: true;
      user: User;
      portalUserId: string;
      clientId: string;
      orgId: string;
    }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth;

  const { data: portalUser } = await supabase
    .from("client_portal_users")
    .select("id, client_id, organization_id")
    .eq("auth_user_id", auth.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!portalUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Client portal access not found" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    user: auth.user,
    portalUserId: portalUser.id,
    clientId: portalUser.client_id,
    orgId: portalUser.organization_id,
  };
}
