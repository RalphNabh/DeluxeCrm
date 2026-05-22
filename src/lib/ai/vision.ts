import OpenAI from "openai";
import type {
  AiContext,
  DetectedItem,
  VisionProvider,
  VisionResult,
} from "./types";

/**
 * GPT-4o-backed implementation of {@link VisionProvider}.
 *
 * Uses the Chat Completions API with `response_format: { type: "json_schema" }`
 * so the response is guaranteed to match {@link DetectedItem}[]. Callers always
 * get parseable JSON or a thrown error.
 *
 * Multiple photos are sent in a single request — GPT-4o accepts an array of
 * `image_url` parts inside one user message and reasons across all of them.
 */

const DEFAULT_MODEL = "gpt-4o";

/** JSON schema describing the exact shape we want back. */
const DETECTED_ITEMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      description:
        "Distinct hardware/materials visible in the photos. Empty array if nothing is identifiable.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "description",
          "category",
          "quantity",
          "unit",
          "confidence",
          "reasoning",
        ],
        properties: {
          description: {
            type: "string",
            description:
              "Short trade-standard name (e.g. '2x4 pressure-treated lumber, 8ft', '1/2 inch copper elbow', '15 amp duplex outlet').",
          },
          category: {
            type: "string",
            description:
              "Coarse category, lowercase: 'lumber' | 'fastener' | 'fixture' | 'electrical' | 'plumbing' | 'hardware' | 'finish' | 'consumable' | 'tool' | 'other'.",
          },
          quantity: {
            type: "number",
            description:
              "Estimated count of this item in the photos. Round to a sensible whole number when counting discrete pieces.",
          },
          unit: {
            type: "string",
            description:
              "Construction-standard unit. One of: 'ea', 'ft', 'sqft', 'lb', 'gal', 'box', 'roll', 'sheet', 'bundle'.",
          },
          confidence: {
            type: "number",
            description:
              "Self-reported confidence in this identification, between 0 and 1. Be conservative when items are partially obscured.",
          },
          reasoning: {
            type: "string",
            description:
              "One short sentence explaining how this item was identified (e.g. 'Visible threaded copper fitting in upper-right of photo 1').",
          },
        },
      },
    },
  },
} as const;

function buildSystemPrompt(context: AiContext): string {
  const trade = context.trade ?? "general";
  return [
    "You are an expert construction estimator. The user is a contractor who",
    "took photo(s) at a job site and needs an itemized materials list for an estimate.",
    "",
    `Trade context: ${trade}.`,
    "",
    "Rules:",
    "1. Enumerate only distinct hardware/materials that a contractor would buy",
    "   from a supply house or hardware store. Skip surroundings, people,",
    "   tools that don't get installed, and vague 'walls' / 'floors'.",
    "2. Use construction-standard descriptions and units. Prefer specific specs",
    "   (sizes, gauges, finishes) when visible.",
    "3. If multiple items look identical, return ONE row with the correct quantity.",
    "4. Be conservative with confidence. If something is partially obscured or",
    "   ambiguous, mark confidence below 0.6.",
    "5. Return an empty array if you cannot identify any installable materials.",
    "",
    context.notes ? `Contractor notes: ${context.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUserContent(photoUrls: string[], context: AiContext) {
  const intro = context.sqft
    ? `Job area is approximately ${context.sqft} sqft. List the materials visible in these photos.`
    : "List the materials visible in these photos.";

  return [
    { type: "text" as const, text: intro },
    ...photoUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    })),
  ];
}

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cachedClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. AI Estimate cannot run without it.",
      );
    }
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

export class OpenAIVisionProvider implements VisionProvider {
  private readonly model: string;

  constructor(model: string = process.env.OPENAI_VISION_MODEL || DEFAULT_MODEL) {
    this.model = model;
  }

  async analyzePhotos(
    photoUrls: string[],
    context: AiContext,
  ): Promise<VisionResult> {
    if (photoUrls.length === 0) {
      throw new Error("analyzePhotos called with zero photo URLs.");
    }

    const client = getClient();

    const completion = await client.chat.completions.create({
      model: this.model,
      // Lower temperature reduces hallucinated items; we still want some
      // flexibility in description wording.
      temperature: 0.2,
      messages: [
        { role: "system", content: buildSystemPrompt(context) },
        { role: "user", content: buildUserContent(photoUrls, context) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "detected_items",
          strict: true,
          schema: DETECTED_ITEMS_SCHEMA,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("OpenAI returned an empty response.");
    }

    let parsed: { items: DetectedItem[] };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `Failed to parse JSON from vision model: ${(err as Error).message}`,
      );
    }

    return {
      detectedItems: sanitizeItems(parsed.items ?? []),
      model: completion.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
    };
  }
}

/**
 * Defensive: even with strict json_schema, clamp/normalize the fields we rely
 * on so a downstream UI never gets NaN or negative quantities.
 *
 * Exported for unit testing — callers should use {@link OpenAIVisionProvider} or
 * {@link analyzePhotosForMaterials} which apply this automatically.
 */
export function sanitizeItems(items: DetectedItem[]): DetectedItem[] {
  return items
    .filter((it) => it && typeof it.description === "string" && it.description.trim() !== "")
    .map((it) => ({
      description: it.description.trim(),
      category: (it.category || "other").toLowerCase(),
      quantity: Math.max(0, Number(it.quantity) || 0),
      unit: (it.unit || "ea").toLowerCase(),
      confidence: Math.min(1, Math.max(0, Number(it.confidence) || 0)),
      reasoning: it.reasoning?.trim() || undefined,
    }));
}

/** Convenience function. Most callers can use this directly. */
export async function analyzePhotosForMaterials(
  photoUrls: string[],
  context: AiContext,
  provider: VisionProvider = new OpenAIVisionProvider(),
): Promise<VisionResult> {
  return provider.analyzePhotos(photoUrls, context);
}
