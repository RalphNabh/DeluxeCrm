import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { signupSchema } from "@/lib/api-schemas";
import { captureApiError } from "@/lib/api-error";
import {
  getEmailConfirmationRedirectUrl,
  mapAuthError,
} from "@/lib/auth-email-redirect";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createOrganizationForUser } from "@/lib/org";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/validation";

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Prefer msg/code/status — SDK turns empty GoTrue bodies into message "{}". */
function serializeAuthError(error: {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}) {
  const message = error.message?.trim();
  const usefulMessage =
    message && message !== "{}" && message !== "[object Object]"
      ? message
      : null;

  return {
    message: usefulMessage,
    code: error.code ?? null,
    status: error.status ?? null,
    name: error.name ?? null,
  };
}

/**
 * Server-side signup proxy — browser calls same-origin /api/auth/signup
 * instead of cross-site Supabase (avoids Safari CORS / flaky edge errors).
 */
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, "signup");
    if (!rl.success && rl.limit > 0) {
      return NextResponse.json(
        {
          error:
            "Too many signup attempts from this network. Please try again later.",
        },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const parsed = await parseJsonBody(request, signupSchema);
    if (!parsed.ok) {
      const body = await parsed.response.clone().json().catch(() => null) as
        | { error?: string; details?: Record<string, string> }
        | null;
      const mapped = mapAuthError(body?.error || "Validation failed", {
        details: body?.details,
      });
      return NextResponse.json(
        {
          error: mapped.message,
          code: mapped.code,
          details: body?.details,
        },
        { status: 400 },
      );
    }

    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      company_name,
      business_type,
    } = parsed.data;

    const fullName = `${first_name} ${last_name}`;
    const emailRedirectTo = getEmailConfirmationRedirectUrl();

    const supabase = getAuthClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          first_name,
          last_name,
          full_name: fullName,
          phone: phone || undefined,
          company_name: company_name || undefined,
          business_type: business_type || undefined,
        },
      },
    });

    if (signUpError) {
      const raw = serializeAuthError(signUpError);
      const mapped = mapAuthError(raw.message || "{}", {
        code: raw.code,
      });
      captureApiError(signUpError, {
        route: "auth/signup",
        step: "signUp",
        authStatus: String(raw.status ?? ""),
        authCode: raw.code ?? "",
      });
      return NextResponse.json(
        {
          error: mapped.message,
          code: mapped.code,
          debug: {
            ...raw,
            // Helps confirm which project Vercel is talking to
            supabaseHost: (() => {
              try {
                return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host;
              } catch {
                return null;
              }
            })(),
          },
        },
        { status: 400 },
      );
    }

    // Enrich profile via service role (no browser session required)
    if (data.user?.id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createServiceRoleClient();
        await admin.from("user_profiles").upsert(
          {
            id: data.user.id,
            user_id: data.user.id,
            first_name,
            last_name,
            full_name: fullName,
            phone: phone || null,
            company_name: company_name || null,
            business_type: business_type || null,
            persona: "contractor",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

        await createOrganizationForUser(
          admin,
          data.user.id,
          company_name || `${first_name}'s Company`,
        );
      } catch (profileErr) {
        captureApiError(profileErr, { route: "auth/signup", step: "profile" });
      }
    }

    return NextResponse.json({
      success: true,
      email,
      userId: data.user?.id ?? null,
      needsEmailConfirmation: !data.session,
    });
  } catch (error) {
    captureApiError(error, { route: "auth/signup" });
    const mapped = mapAuthError(
      error instanceof Error ? error.message : "Unable to create account",
    );
    const message =
      mapped.code === "invalid_api_key"
        ? mapped.message
        : mapped.code === "network"
          ? mapped.message
          : "Unable to create account right now. Please try again in a moment.";
    return NextResponse.json(
      { error: message, code: mapped.code },
      { status: 503 },
    );
  }
}
