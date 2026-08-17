import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { getClientUnreadSummary } from "@/lib/hub-messaging";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const total = await getClientUnreadSummary(admin, auth.clientId, auth.orgId);
    return NextResponse.json({ total });
  } catch (error) {
    captureApiError(error, { route: "portal/conversations/unread-summary/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
