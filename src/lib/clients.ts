import type { SupabaseClient } from "@supabase/supabase-js";
import { escapePostgrestValue } from "@/lib/postgrest-escape";

export type DuplicateClientMatch = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  matchedOn: "email" | "name";
};

/**
 * Org-scoped duplicate scan for client create. Email is the strong signal
 * (same person); name-only is a collision warning (two "John Smith"s happen).
 */
export async function findMatchingClients(
  supabase: SupabaseClient,
  orgId: string,
  identity: { email?: string | null; name?: string | null },
): Promise<DuplicateClientMatch[]> {
  const matches: DuplicateClientMatch[] = [];
  const seen = new Set<string>();

  const email = identity.email?.trim();
  if (email) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("organization_id", orgId)
      .ilike("email", escapePostgrestValue(email))
      .limit(5);
    for (const row of data ?? []) {
      seen.add(row.id);
      matches.push({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        matchedOn: "email",
      });
    }
  }

  const name = identity.name?.trim();
  if (name) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("organization_id", orgId)
      .ilike("name", escapePostgrestValue(name))
      .limit(5);
    for (const row of data ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      matches.push({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        matchedOn: "name",
      });
    }
  }

  return matches;
}
