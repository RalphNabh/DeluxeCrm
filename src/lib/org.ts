import type { SupabaseClient, User } from "@supabase/supabase-js";

export type OrgRole = "owner" | "admin" | "manager" | "worker";

export type OrgMembership = {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  status: string;
  organizations?: { id: string; name: string } | { id: string; name: string }[] | null;
};

export type OrgContext = {
  user: User;
  orgId: string;
  role: OrgRole;
  membership: OrgMembership;
};

export async function getActiveMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrgMembership | null> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active_org_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.active_org_id) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id, org_id, user_id, role, status, organizations(id, name)")
      .eq("user_id", userId)
      .eq("org_id", profile.active_org_id)
      .eq("status", "active")
      .maybeSingle();
    if (membership) return membership as unknown as OrgMembership;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id, org_id, user_id, role, status, organizations(id, name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (membership as unknown as OrgMembership) ?? null;
}

export async function createOrganizationForUser(
  admin: SupabaseClient,
  userId: string,
  companyName: string,
): Promise<string | null> {
  const slug = `org-${userId.replace(/-/g, "").slice(0, 12)}`;
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: companyName || "My Company",
      slug,
      owner_user_id: userId,
    })
    .select("id")
    .single();

  if (orgError || !org) return null;

  await admin.from("organization_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    status: "active",
  });

  await admin
    .from("user_profiles")
    .update({ active_org_id: org.id, persona: "contractor" })
    .eq("user_id", userId);

  return org.id;
}

/** Fields to include on inserts for org-scoped tables */
export function orgScopedInsert(
  orgId: string,
  userId: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...fields,
    organization_id: orgId,
    user_id: userId,
  };
}

export async function countActiveSeats(
  supabase: SupabaseClient,
  orgId: string,
): Promise<number> {
  const { count } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "active")
    .neq("role", "owner");

  return count ?? 0;
}
