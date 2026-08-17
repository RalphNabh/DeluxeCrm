import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { ensurePortalConversation } from "@/lib/portal-conversation";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const conversation = await ensurePortalConversation(
      admin,
      auth.clientId,
      auth.orgId,
    );

    return NextResponse.json([conversation]);
  } catch (error) {
    captureApiError(error, { route: "portal/conversations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
