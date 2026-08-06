import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { syncConnectAccountStatus } from "@/lib/stripe-connect";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;

    const status = await syncConnectAccountStatus(supabase, auth.ctx.orgId);
    return NextResponse.json(status);
  } catch (error) {
    captureApiError(error, { route: "stripe/connect/status/GET" });
    const message =
      error instanceof Error ? error.message : "Failed to load Connect status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
