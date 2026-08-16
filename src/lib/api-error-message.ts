/**
 * Turn API { error, details } bodies into a sentence the user can act on.
 * Zod field paths like `lineItems.0.description` become "Line item 1 description".
 */
export function formatApiErrorMessage(body: {
  error?: string;
  details?: Record<string, string>;
} | null): string {
  const details = body?.details;
  if (details && typeof details === "object") {
    const parts = Object.entries(details).map(
      ([path, message]) => `${humanizePath(path)}: ${humanizeIssue(message)}`,
    );
    if (parts.length > 0) return parts.join(". ");
  }
  return body?.error?.trim() || "Request failed";
}

function humanizePath(path: string): string {
  const line = /^lineItems\.(\d+)\.(.+)$/.exec(path);
  if (line) {
    const index = Number(line[1]) + 1;
    const field = line[2];
    const labels: Record<string, string> = {
      description: "description",
      quantity: "quantity",
      unit_price: "price",
      unit: "unit",
    };
    return `Line item ${index} ${labels[field] || field}`;
  }
  if (path === "client_id") return "Client";
  if (path === "lead_id") return "Lead ID";
  return path;
}

function humanizeIssue(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("at least 1") ||
    lower === "required" ||
    lower === "too small"
  ) {
    return "is required";
  }
  if (lower.includes("invalid uuid")) return "must be a valid ID";
  if (lower.includes("expected number")) return "must be a number";
  return message;
}
