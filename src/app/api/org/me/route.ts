import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { permissionsFor } from "@/lib/rbac";

/**
 * The signed-in member's organization context.
 *
 * The UI needs the caller's role to hide sections they cannot use: workers were
 * shown Team, Billing and Reports links that returned 403 when followed.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;

    const { orgId, role, user } = auth.ctx;

    const [{ data: organization }, { data: profile }] = await Promise.all([
      supabase.from("organizations").select("id, name").eq("id", orgId).maybeSingle(),
      supabase
        .from("user_profiles")
        .select("full_name, email, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      userId: user.id,
      orgId,
      role,
      permissions: permissionsFor(role),
      organizationName: organization?.name ?? null,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? user.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    });
  } catch (error) {
    captureApiError(error, { route: "org/me/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
