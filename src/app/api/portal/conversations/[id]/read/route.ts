import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { markConversationRead } from "@/lib/hub-messaging";

async function requireOwnedConversation(
  admin: ReturnType<typeof createServiceRoleClient>,
  conversationId: string,
  clientId: string,
  orgId: string,
) {
  const { data: convo } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("client_id", clientId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return Boolean(convo);
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const allowed = await requireOwnedConversation(
      admin,
      id,
      auth.clientId,
      auth.orgId,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const marked = await markConversationRead(admin, id, "client");
    return NextResponse.json({ marked });
  } catch (error) {
    captureApiError(error, { route: "portal/conversations/read/PATCH" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
