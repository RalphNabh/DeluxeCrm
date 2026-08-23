import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { getOrgNewRequestCount } from "@/lib/requests/unread";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "manage_requests");
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const total = await getOrgNewRequestCount(admin, auth.ctx.orgId);
    return NextResponse.json({ total });
  } catch (error) {
    captureApiError(error, { route: "requests/unread-summary/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
