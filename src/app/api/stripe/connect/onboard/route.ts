import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { createConnectOnboardingLink } from "@/lib/stripe-connect";

export async function POST() {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "billing");
    if (!auth.ok) return auth.response;

    const { url, accountId } = await createConnectOnboardingLink(
      supabase,
      auth.ctx.orgId,
      auth.ctx.user.email,
    );

    return NextResponse.json({ url, accountId });
  } catch (error) {
    captureApiError(error, { route: "stripe/connect/onboard/POST" });
    const message =
      error instanceof Error ? error.message : "Failed to start Connect onboarding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
