import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { getOrgUnreadSummary } from "@/lib/hub-messaging";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "messaging");
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const summary = await getOrgUnreadSummary(admin, auth.ctx.orgId);
    return NextResponse.json(summary);
  } catch (error) {
    captureApiError(error, { route: "conversations/unread-summary/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
