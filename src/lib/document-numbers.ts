import type { SupabaseClient } from "@supabase/supabase-js";

/** How long a quote stays valid, matching what the estimate email tells clients. */
export const ESTIMATE_VALID_DAYS = 30;

const ESTIMATE_PREFIX = "EST-";
const SEQUENCE_WIDTH = 6;

function formatSequence(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(SEQUENCE_WIDTH, "0")}`;
}

/**
 * Next estimate number for an organization, sequential and human-readable.
 *
 * Derived from the highest existing number rather than a row count, so deleting
 * an estimate cannot hand out a number that is already in use. A unique index
 * backs this up; callers should retry on conflict.
 */
export async function nextEstimateNumber(
  supabase: SupabaseClient,
  orgId: string,
): Promise<string> {
  const { data } = await supabase
    .from("estimates")
    .select("estimate_number")
    .eq("organization_id", orgId)
    .not("estimate_number", "is", null)
    .order("estimate_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const highest = data?.estimate_number as string | undefined;
  const digits = highest?.replace(/\D/g, "");
  const previous = digits ? Number.parseInt(digits, 10) : 0;

  return formatSequence(
    ESTIMATE_PREFIX,
    Number.isFinite(previous) ? previous + 1 : 1,
  );
}

/** Expiry date (YYYY-MM-DD) for a quote created today. */
export function estimateValidUntil(from: Date = new Date()): string {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + ESTIMATE_VALID_DAYS);
  return expires.toISOString().slice(0, 10);
}
