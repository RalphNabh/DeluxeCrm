/**
 * Shared types for the AI Estimate pipeline.
 *
 * The pipeline has three stages:
 *   1. Vision      - photo(s) -> DetectedItem[]      (src/lib/ai/vision.ts)
 *   2. Catalog     - DetectedItem[] -> EnrichedLineItem[] (src/lib/ai/catalog-match.ts)
 *   3. Finalize    - EnrichedLineItem[] -> /api/estimates POST body
 *
 * Keeping all the shapes here lets every layer share one source of truth and
 * lets the API route, the wizard UI, and the unit tests import from one path.
 */

export type Trade =
  | "electrical"
  | "plumbing"
  | "hvac"
  | "carpentry"
  | "roofing"
  | "painting"
  | "flooring"
  | "drywall"
  | "general"
  | "other";

export interface AiContext {
  trade?: Trade;
  /** Job area in square feet, when relevant (e.g. flooring, painting). */
  sqft?: number;
  /** Estimated labor hours. Combined with labor_rate to derive a labor line item. */
  labor_hours?: number;
  /** Hourly labor rate in dollars. */
  labor_rate?: number;
  /** Markup percent applied on top of material unit prices, e.g. 20 for +20%. */
  markup_pct?: number;
  /** Free-form contractor notes passed to the vision prompt as extra context. */
  notes?: string;
  /** ZIP / postal code for regional price suggestions. */
  region_zip?: string;
  /** Optional FK so the resulting estimate is pre-linked to the right client/lead. */
  client_id?: string;
  lead_id?: string;
}

/** One discrete material/hardware item the vision model identified. */
export interface DetectedItem {
  description: string;
  /** Coarse category for grouping and for catalog-match boost. */
  category: string;
  quantity: number;
  /** Construction-standard unit, e.g. "ea", "ft", "sqft", "lb", "gal", "box". */
  unit: string;
  /** Model self-reported confidence, 0..1. Low-confidence items get a UI warning. */
  confidence: number;
  /** Optional one-sentence reasoning. Surfaced as a tooltip in the review UI. */
  reasoning?: string;
}

/** A DetectedItem after catalog matching + pricing. Ready to render in the wizard. */
export interface EnrichedLineItem extends DetectedItem {
  unit_price: number;
  total: number;
  source: "catalog" | "ai_suggested" | "manual";
  /** When source === 'catalog', the materials.id we matched on. */
  matched_material_id?: string;
  /** When source === 'ai_suggested', the model's plausible price range. */
  suggested_low?: number;
  suggested_high?: number;
}

export interface VisionResult {
  detectedItems: DetectedItem[];
  /** Echoed model name (e.g. "gpt-4o-2024-08-06"); useful for debugging + analytics. */
  model: string;
  /** Token counts returned by the provider, if available. */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Implemented by every vision provider. Lets us swap OpenAI for Claude/Gemini
 * later without touching the route handler or the wizard.
 */
export interface VisionProvider {
  analyzePhotos(
    photoUrls: string[],
    context: AiContext,
  ): Promise<VisionResult>;
}
