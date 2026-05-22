/**
 * Pure, dependency-free helpers used by the AI Estimate pipeline.
 *
 * Kept in its own file (and importing nothing) so it can be unit-tested
 * without pulling in the OpenAI SDK, Supabase, or Next.js path aliases.
 */

export interface ScoredItem {
  description: string;
  category: string;
}

export interface ScoredMaterial {
  name: string;
  category: string | null;
}

/** Lowercase + strip punctuation + collapse whitespace. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length >= 2));
}

/**
 * Jaccard token-set similarity, with a small bonus if categories agree.
 * Cheap (no embeddings), works well for short item descriptions, and
 * doesn't require any new dependencies. Result is clamped to [0, 1].
 */
export function similarity(item: ScoredItem, material: ScoredMaterial): number {
  const a = tokenize(`${item.description} ${item.category}`);
  const b = tokenize(`${material.name} ${material.category ?? ""}`);
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const tok of a) if (b.has(tok)) intersection++;
  const union = a.size + b.size - intersection;
  let score = intersection / union;

  if (
    item.category &&
    material.category &&
    normalize(item.category) === normalize(material.category)
  ) {
    score += 0.1;
  }

  return Math.min(1, score);
}

/** Returns the best-matching material, or null if no match clears the threshold. */
export function findBestMatch<M extends ScoredMaterial>(
  item: ScoredItem,
  materials: M[],
  threshold: number,
): { row: M; score: number } | null {
  let best: { row: M; score: number } | null = null;
  for (const m of materials) {
    const s = similarity(item, m);
    if (!best || s > best.score) best = { row: m, score: s };
  }
  if (!best || best.score < threshold) return null;
  return best;
}

export function applyMarkup(unitPrice: number, markupPct: number | undefined): number {
  if (!markupPct || markupPct <= 0) return unitPrice;
  return unitPrice * (1 + markupPct / 100);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** YYYY-MM in UTC (matches ai_estimate_usage.year_month). */
export function currentYearMonthUtc(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** First of next UTC month at 00:00:00.000 UTC, as ISO string. */
export function nextMonthResetIso(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  ).toISOString();
}
