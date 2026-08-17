import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import {
  ensureClientConversation,
  getUnreadCount,
} from "@/lib/hub-messaging";
import { truncatePreview } from "@/lib/messaging/format";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const conversation = await ensureClientConversation(
      admin,
      auth.clientId,
      auth.orgId,
    );

    const { data: lastMsg } = await admin
      .from("messages")
      .select("body")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const unread_count = await getUnreadCount(admin, conversation.id, "client");

    return NextResponse.json([
      {
        ...conversation,
        last_message_preview: lastMsg?.body
          ? truncatePreview(lastMsg.body as string)
          : null,
        unread_count,
      },
    ]);
  } catch (error) {
    captureApiError(error, { route: "portal/conversations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
