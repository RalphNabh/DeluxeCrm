import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — matches estimate validity copy

function getSecret(): string {
  const secret =
    process.env.ESTIMATE_ACTION_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "ESTIMATE_ACTION_SECRET (or CRON_SECRET) must be set for estimate email actions.",
    );
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Create a signed token for client estimate approve / request-changes links. */
export function createEstimateActionToken(
  estimateId: string,
  clientEmail: string,
  action: "approve" | "request_changes",
): string {
  const exp = Date.now() + TTL_MS;
  const normalizedEmail = clientEmail.trim().toLowerCase();
  const payload = `${estimateId}|${normalizedEmail}|${action}|${exp}`;
  const sig = signPayload(payload);
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyEstimateActionToken(
  token: string,
  estimateId: string,
  clientEmail: string,
  action: "approve" | "request_changes",
): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 5) return false;

    const [id, email, act, expStr, sig] = parts;
    const payload = `${id}|${email}|${act}|${expStr}`;
    const expected = signPayload(payload);

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    if (id !== estimateId) return false;
    if (act !== action) return false;
    if (email !== clientEmail.trim().toLowerCase()) return false;
    if (Date.now() > Number(expStr)) return false;

    return true;
  } catch {
    return false;
  }
}

export function buildEstimateActionUrl(
  estimateId: string,
  clientEmail: string,
  clientName: string,
  action: "approve" | "request_changes",
  appUrl: string,
): string {
  const token = createEstimateActionToken(estimateId, clientEmail, action);
  const url = new URL("/estimate-action", appUrl);
  url.searchParams.set("estimateId", estimateId);
  url.searchParams.set("action", action);
  url.searchParams.set("clientEmail", clientEmail);
  url.searchParams.set("clientName", clientName);
  url.searchParams.set("token", token);
  return url.toString();
}
