import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgRole } from "./org";
import { classifyPersona, type PersonaPrefer, type PersonaResult } from "./persona-classify";

export type { PersonaType, PersonaPrefer, PersonaResult } from "./persona-classify";
export { classifyPersona } from "./persona-classify";

export async function resolvePersona(
  supabase: SupabaseClient,
  userId: string,
  prefer?: PersonaPrefer,
): Promise<PersonaResult> {
  const [{ data: portalUser }, { data: membership }] = await Promise.all([
    supabase
      .from("client_portal_users")
      .select("client_id, organization_id")
      .eq("auth_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return classifyPersona(
    portalUser
      ? {
          client_id: portalUser.client_id as string,
          organization_id: portalUser.organization_id as string,
        }
      : null,
    membership
      ? { org_id: membership.org_id as string, role: membership.role as OrgRole }
      : null,
    prefer,
  );
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
