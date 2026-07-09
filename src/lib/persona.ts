import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgRole } from "@/lib/org";
import { getDefaultRouteForRole } from "@/lib/rbac";

export type PersonaType = "contractor" | "client";

export type PersonaResult = {
  type: PersonaType;
  redirectTo: string;
  orgId?: string;
  role?: OrgRole;
  clientId?: string;
};

export async function resolvePersona(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonaResult> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("persona, active_org_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.persona === "client") {
    const { data: portalUser } = await supabase
      .from("client_portal_users")
      .select("client_id, organization_id, status")
      .eq("auth_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (portalUser) {
      return {
        type: "client",
        redirectTo: "/portal",
        orgId: portalUser.organization_id,
        clientId: portalUser.client_id,
      };
    }
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership) {
    const role = membership.role as OrgRole;
    return {
      type: "contractor",
      redirectTo: getDefaultRouteForRole(role),
      orgId: membership.org_id,
      role,
    };
  }

  return { type: "contractor", redirectTo: "/dashboard" };
}

export function isContractorRoute(pathname: string): boolean {
  const contractorPrefixes = [
    "/dashboard",
    "/clients",
    "/leads",
    "/estimates",
    "/invoices",
    "/jobs",
    "/calendar",
    "/tasks",
    "/team",
    "/materials",
    "/automations",
    "/reports",
    "/settings",
    "/requests",
    "/affiliates",
    "/subscription",
    "/mobile",
  ];
  return contractorPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isFieldRoute(pathname: string): boolean {
  return pathname === "/field" || pathname.startsWith("/field/");
}

export function isPortalRoute(pathname: string): boolean {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}
