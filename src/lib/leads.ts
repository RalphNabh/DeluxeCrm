import type { SupabaseClient } from "@supabase/supabase-js";
import { escapePostgrestValue } from "@/lib/postgrest-escape";

export type MatchedLead = {
  id: string;
  client_id: string | null;
};

/**
 * Find the pipeline card that already represents someone, if any.
 *
 * Prefers an explicit `client_id` link, then falls back to email and finally
 * name — the same order the dashboard used to guess with, kept so that leads
 * created before `leads.client_id` existed still match.
 */
export async function findMatchingLead(
  supabase: SupabaseClient,
  orgId: string,
  identity: { clientId?: string; email?: string | null; name?: string | null },
): Promise<MatchedLead | null> {
  const byLink = identity.clientId
    ? await supabase
        .from("leads")
        .select("id, client_id")
        .eq("organization_id", orgId)
        .eq("client_id", identity.clientId)
        .limit(1)
        .maybeSingle()
    : null;
  if (byLink?.data) return byLink.data as MatchedLead;

  const email = identity.email?.trim();
  if (email) {
    const { data } = await supabase
      .from("leads")
      .select("id, client_id")
      .eq("organization_id", orgId)
      .ilike("email", escapePostgrestValue(email))
      .limit(1)
      .maybeSingle();
    if (data) return data as MatchedLead;
  }

  const name = identity.name?.trim();
  if (name) {
    const { data } = await supabase
      .from("leads")
      .select("id, client_id")
      .eq("organization_id", orgId)
      .ilike("name", escapePostgrestValue(name))
      .limit(1)
      .maybeSingle();
    if (data) return data as MatchedLead;
  }

  return null;
}

/**
 * pipeline_stages is the source of truth for lead status names. The old
 * leads.status CHECK contradicted that; after it was dropped, the API must
 * reject values that are not a stage for this org.
 */
export async function isOrgPipelineStage(
  supabase: SupabaseClient,
  orgId: string,
  status: string,
): Promise<boolean> {
  const name = status.trim();
  if (!name) return false;

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", name)
    .limit(1)
    .maybeSingle();

  if (error) {
    // If stages have not been seeded yet, allow the write so the first lead
    // create (default "New Leads") is not blocked on a chicken-and-egg.
    if (
      error.message?.includes("does not exist") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return true;
    }
    throw error;
  }

  if (data) return true;

  // Empty stage list means the org has never customized the board; accept the
  // value so built-in defaults still work until stages are created.
  const { count } = await supabase
    .from("pipeline_stages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  return (count ?? 0) === 0;
}
