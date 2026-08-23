import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/oauth/zapier";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { captureApiError } from "@/lib/api-error";

/** Zapier's OAuth "Test" call and connection-label source. */
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const grant = await verifyAccessToken(token);
    if (!grant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", grant.organizationId)
      .maybeSingle();

    return NextResponse.json({ organization: org?.name ?? "DyluxePro account" });
  } catch (error) {
    captureApiError(error, { route: "oauth/me" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
