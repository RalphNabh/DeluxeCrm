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
