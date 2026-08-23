import { NextRequest, NextResponse } from "next/server";
import {
  verifyClientCredentials,
  consumeAuthorizationCode,
  issueAccessToken,
  rotateAccessToken,
  getZapierRedirectUri,
} from "@/lib/oauth/zapier";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { captureApiError } from "@/lib/api-error";

async function parseBody(request: NextRequest): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, string>;
  }
  const form = await request.formData();
  const result: Record<string, string> = {};
  form.forEach((value, key) => {
    result[key] = String(value);
  });
  return result;
}

function getBasicAuthCredentials(
  request: NextRequest,
): { clientId: string; clientSecret: string } | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) return null;
  return {
    clientId: decoded.slice(0, separatorIndex),
    clientSecret: decoded.slice(separatorIndex + 1),
  };
}

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, "public-strict");
    if (!rl.success) {
      return NextResponse.json(
        { error: "invalid_request" },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = await parseBody(request);
    const basic = getBasicAuthCredentials(request);
    const clientId = basic?.clientId ?? body.client_id;
    const clientSecret = basic?.clientSecret ?? body.client_secret;

    if (!clientId || !clientSecret || !verifyClientCredentials(clientId, clientSecret)) {
      return NextResponse.json({ error: "invalid_client" }, { status: 401 });
    }

    if (body.grant_type === "authorization_code") {
      if (!body.code) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      const redirectUri = body.redirect_uri || getZapierRedirectUri();
      const grant = await consumeAuthorizationCode({ code: body.code, redirectUri });
      if (!grant) {
        return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
      }
      const tokens = await issueAccessToken({
        organizationId: grant.organizationId,
        userId: grant.userId,
      });
      return NextResponse.json({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: "Bearer",
        expires_in: tokens.expiresIn,
      });
    }

    if (body.grant_type === "refresh_token") {
      if (!body.refresh_token) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      const tokens = await rotateAccessToken(body.refresh_token);
      if (!tokens) {
        return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
      }
      return NextResponse.json({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: "Bearer",
        expires_in: tokens.expiresIn,
      });
    }

    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  } catch (error) {
    captureApiError(error, { route: "oauth/token" });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
