import { NextRequest, NextResponse } from "next/server";
import { completeSignupSchema } from "@/lib/api-schemas";
import { captureApiError } from "@/lib/api-error";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { provisionSignupAccount } from "@/lib/signup-provision";
import { parseJsonBody } from "@/lib/validation";
import type { OnboardingSettings } from "@/lib/signup-onboarding";

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, "complete-signup");
    if (!rl.success && rl.limit > 0) {
      return NextResponse.json(
        {
          error:
            "Too many signup completion attempts. Please try again later.",
        },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, completeSignupSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const {
      first_name,
      last_name,
      phone,
      company_name,
      business_type,
      marketing_opt_in,
      team_size,
      years_in_business,
      primary_goals,
      referral_source,
      estimated_revenue,
      referral_code,
    } = parsed.data;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 },
      );
    }

    const admin = createServiceRoleClient();

    const onboarding: OnboardingSettings = {
      team_size,
      years_in_business,
      primary_goals,
      referral_source,
      estimated_revenue,
      marketing_opt_in,
    };

    const { orgId } = await provisionSignupAccount(admin, {
      userId: user.id,
      email: user.email,
      first_name,
      last_name,
      phone,
      company_name,
      business_type,
      onboarding,
      referral_code,
    });

    if (!orgId) {
      return NextResponse.json(
        { error: "Unable to create organization" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, redirect: "/account-verified" });
  } catch (error) {
    captureApiError(error, { route: "auth/complete-signup" });
    return NextResponse.json(
      { error: "Unable to complete signup" },
      { status: 500 },
    );
  }
}
