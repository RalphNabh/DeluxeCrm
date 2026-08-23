import crypto from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";

const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function getZapierClientId(): string {
  const id = process.env.ZAPIER_OAUTH_CLIENT_ID?.trim();
  if (!id) throw new Error("ZAPIER_OAUTH_CLIENT_ID is not configured");
  return id;
}

export function getZapierClientSecret(): string {
  const secret = process.env.ZAPIER_OAUTH_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("ZAPIER_OAUTH_CLIENT_SECRET is not configured");
  return secret;
}

export function getZapierRedirectUri(): string {
  const uri = process.env.ZAPIER_OAUTH_REDIRECT_URI?.trim();
  if (!uri) throw new Error("ZAPIER_OAUTH_REDIRECT_URI is not configured");
  return uri;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyClientCredentials(clientId: string, clientSecret: string): boolean {
  try {
    return (
      safeEqual(clientId, getZapierClientId()) &&
      safeEqual(clientSecret, getZapierClientSecret())
    );
  } catch {
    return false;
  }
}

function randomToken(bytes: number): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAuthorizationCode(params: {
  organizationId: string;
  userId: string;
  redirectUri: string;
}): Promise<string> {
  const admin = createServiceRoleClient();
  const code = randomToken(24);
  const { error } = await admin.from("oauth_authorization_codes").insert({
    code,
    organization_id: params.organizationId,
    user_id: params.userId,
    redirect_uri: params.redirectUri,
    expires_at: new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString(),
  });
  if (error) throw new Error("Failed to create authorization code");
  return code;
}

export async function consumeAuthorizationCode(params: {
  code: string;
  redirectUri: string;
}): Promise<{ organizationId: string; userId: string } | null> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("oauth_authorization_codes")
    .select("organization_id, user_id, redirect_uri, expires_at, used_at")
    .eq("code", params.code)
    .maybeSingle();

  if (!row || row.used_at) return null;
  if (row.redirect_uri !== params.redirectUri) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await admin
    .from("oauth_authorization_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", params.code);

  return { organizationId: row.organization_id, userId: row.user_id };
}

export type TokenPair = { accessToken: string; refreshToken: string; expiresIn: number };

export async function issueAccessToken(params: {
  organizationId: string;
  userId: string;
}): Promise<TokenPair> {
  const admin = createServiceRoleClient();
  const accessToken = randomToken(32);
  const refreshToken = randomToken(32);
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);

  const { error } = await admin.from("oauth_access_tokens").insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    token_hash: hashToken(accessToken),
    refresh_token_hash: hashToken(refreshToken),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error("Failed to issue access token");

  return { accessToken, refreshToken, expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000) };
}

export async function rotateAccessToken(refreshToken: string): Promise<TokenPair | null> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("oauth_access_tokens")
    .select("id, organization_id, user_id, revoked_at")
    .eq("refresh_token_hash", hashToken(refreshToken))
    .maybeSingle();

  if (!row || row.revoked_at) return null;

  await admin
    .from("oauth_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", row.id);

  return issueAccessToken({ organizationId: row.organization_id, userId: row.user_id });
}

export async function verifyAccessToken(
  accessToken: string,
): Promise<{ organizationId: string; userId: string } | null> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("oauth_access_tokens")
    .select("organization_id, user_id, expires_at, revoked_at")
    .eq("token_hash", hashToken(accessToken))
    .maybeSingle();

  if (!row || row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return { organizationId: row.organization_id, userId: row.user_id };
}
