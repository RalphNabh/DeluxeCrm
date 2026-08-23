const SOURCE_LABELS: Record<string, string> = {
  public_form: "Website",
  portal: "Client Portal",
  zapier: "Zapier",
  manual: "Manual",
};

/**
 * Human label for a request's origin. Refines "Zapier" to the actual ad
 * platform when ad-tracking metadata is present, since contractors think in
 * terms of the ad platform, not the plumbing that delivered the lead.
 */
export function humanizeSource(
  source: string | null | undefined,
  metadata?: Record<string, unknown> | null,
): string {
  const base = SOURCE_LABELS[source ?? ""] ?? source ?? "Unknown";
  if (source === "zapier" && metadata) {
    if (metadata.gclid) return "Google Ads";
    const utmSource = String(metadata.utm_source ?? "").toLowerCase();
    if (utmSource.includes("google")) return "Google Ads";
    if (utmSource.includes("facebook") || utmSource.includes("meta")) return "Facebook Ads";
    if (utmSource.includes("bing")) return "Bing Ads";
  }
  return base;
}

const KNOWN_METADATA_LABELS: Record<string, string> = {
  gclid: "Google Click ID",
  utm_source: "Campaign Source",
  utm_medium: "Campaign Medium",
  utm_campaign: "Campaign",
  utm_term: "Search Term",
  utm_content: "Ad Content",
  fbclid: "Facebook Click ID",
};

/** Turn an arbitrary snake_case/space-cased key into Title Case as a fallback label. */
function titleCaseFallback(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface MetadataEntry {
  key: string;
  label: string;
  value: string;
}

/** Flatten a service_request's metadata jsonb into ordered, friendly-labeled rows for display. */
export function formatMetadataEntries(
  metadata: Record<string, unknown> | null | undefined,
): MetadataEntry[] {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      key,
      label: KNOWN_METADATA_LABELS[key] ?? titleCaseFallback(key),
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));
}
