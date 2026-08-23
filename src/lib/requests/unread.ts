import type { SupabaseClient } from "@supabase/supabase-js";

/** Count of service_requests still awaiting triage ('new' is the unread signal). */
export async function getOrgNewRequestCount(
  admin: SupabaseClient,
  organizationId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "new");
  if (error) throw new Error(error.message);
  return count ?? 0;
}
