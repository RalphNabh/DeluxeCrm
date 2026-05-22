import OpenAI from "openai";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  AiContext,
  DetectedItem,
  EnrichedLineItem,
} from "./types";
import { applyMarkup, findBestMatch, round2 } from "./scoring";

/**
 * Catalog matching + price suggestion.
 *
 * For each detected item:
 *   1. Fuzzy match against the user's own `materials` rows. If similarity
 *      >= MATCH_THRESHOLD, use that material's `default_price` (source: 'catalog').
 *   2. Otherwise, batch all unmatched items into a single cheap `gpt-4o-mini`
 *      call that returns plausible USD prices (source: 'ai_suggested').
 *
 * Finally, apply context.markup_pct to the unit price and compute totals.
 *
 * Pricing comes from the user's catalog first by design — the killer
 * feature is "the AI fills in YOUR prices." We never overwrite a user's
 * catalogued price with a model guess.
 */

const MATCH_THRESHOLD = 0.7;
const PRICING_MODEL = process.env.OPENAI_PRICING_MODEL || "gpt-4o-mini";

interface MaterialRow {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  default_price: number | null;
}

interface PriceSuggestion {
  unit_price: number;
  suggested_low: number;
  suggested_high: number;
}

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

/**
 * Batched price suggestion for unknown items. One LLM call regardless of
 * how many items need pricing. Falls back to $0 with no range if the call
 * fails, so the pipeline never throws here — the contractor will see
 * "unpriced" items on the review screen and can fill them in.
 */
async function suggestPricesBatch(
  items: DetectedItem[],
  context: AiContext,
): Promise<PriceSuggestion[]> {
  if (items.length === 0) return [];

  const client = getClient();

  const region = context.region_zip ? `ZIP ${context.region_zip}` : "the United States";
  const tradeNote = context.trade ? ` Trade: ${context.trade}.` : "";

  const completion = await client.chat.completions.create({
    model: PRICING_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "You are a construction-pricing assistant. For each item, return a",
          "plausible typical retail price RANGE in USD that a contractor",
          `would pay at a supply house or hardware store in ${region}.${tradeNote}`,
          "",
          "Be realistic and conservative. If you are unsure, return a wide range.",
          "Prices must be per unit, not total. Never return negative numbers.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify(
          items.map((it, idx) => ({
            id: idx,
            description: it.description,
            category: it.category,
            unit: it.unit,
          })),
        ),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "price_suggestions",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["prices"],
          properties: {
            prices: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "unit_price", "low", "high"],
                properties: {
                  id: { type: "integer" },
                  unit_price: {
                    type: "number",
                    description: "Most likely per-unit retail price in USD.",
                  },
                  low: {
                    type: "number",
                    description: "Low end of plausible range, USD.",
                  },
                  high: {
                    type: "number",
                    description: "High end of plausible range, USD.",
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return items.map(() => ({ unit_price: 0, suggested_low: 0, suggested_high: 0 }));

  try {
    const parsed = JSON.parse(raw) as {
      prices: Array<{ id: number; unit_price: number; low: number; high: number }>;
    };
    // Re-align by id; missing ids fall back to zero.
    const byId = new Map(parsed.prices.map((p) => [p.id, p]));
    return items.map((_, idx) => {
      const p = byId.get(idx);
      if (!p) return { unit_price: 0, suggested_low: 0, suggested_high: 0 };
      return {
        unit_price: Math.max(0, Number(p.unit_price) || 0),
        suggested_low: Math.max(0, Number(p.low) || 0),
        suggested_high: Math.max(0, Number(p.high) || 0),
      };
    });
  } catch {
    return items.map(() => ({ unit_price: 0, suggested_low: 0, suggested_high: 0 }));
  }
}

export async function matchAndPriceItems(
  userId: string,
  items: DetectedItem[],
  context: AiContext,
): Promise<EnrichedLineItem[]> {
  if (items.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data: materials, error } = await admin
    .from("materials")
    .select("id, name, category, unit, default_price")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load user materials catalog: ${error.message}`);
  }

  const rows = (materials ?? []) as MaterialRow[];

  // First pass: match what we can against the user's catalog.
  const matchedFlags: boolean[] = [];
  const partial: Array<Partial<EnrichedLineItem> & { _idx: number }> = items.map(
    (item, idx) => {
      const match = findBestMatch(item, rows, MATCH_THRESHOLD);
      if (match) {
        matchedFlags[idx] = true;
        const unitPrice = round2(
          applyMarkup(match.row.default_price ?? 0, context.markup_pct),
        );
        return {
          ...item,
          _idx: idx,
          unit_price: unitPrice,
          total: round2(unitPrice * item.quantity),
          source: "catalog",
          matched_material_id: match.row.id,
        };
      }
      matchedFlags[idx] = false;
      return { ...item, _idx: idx };
    },
  );

  // Second pass: batch-price the unmatched ones.
  const unmatchedIndices = items
    .map((_, i) => i)
    .filter((i) => !matchedFlags[i]);
  const unmatchedItems = unmatchedIndices.map((i) => items[i]);

  const suggestions = await suggestPricesBatch(unmatchedItems, context).catch(
    () => unmatchedItems.map(() => ({ unit_price: 0, suggested_low: 0, suggested_high: 0 })),
  );

  unmatchedIndices.forEach((origIdx, suggestionIdx) => {
    const item = items[origIdx];
    const sug = suggestions[suggestionIdx];
    const unitPrice = round2(applyMarkup(sug.unit_price, context.markup_pct));
    partial[origIdx] = {
      ...item,
      _idx: origIdx,
      unit_price: unitPrice,
      total: round2(unitPrice * item.quantity),
      source: "ai_suggested",
      suggested_low: round2(applyMarkup(sug.suggested_low, context.markup_pct)),
      suggested_high: round2(applyMarkup(sug.suggested_high, context.markup_pct)),
    };
  });

  // Drop the internal _idx and assert the shape.
  return partial.map((p) => {
    const { _idx: _drop, ...rest } = p;
    void _drop;
    return rest as EnrichedLineItem;
  });
}
