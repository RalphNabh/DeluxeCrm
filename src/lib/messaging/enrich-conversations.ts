import type { SupabaseClient } from "@supabase/supabase-js";
import { getUnreadCount } from "@/lib/hub-messaging";
import { truncatePreview } from "@/lib/messaging/format";

export async function enrichConversationsForContractor(
  admin: SupabaseClient,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const enriched = [];
  for (const row of rows) {
    const id = row.id as string;
    const { data: lastMsg } = await admin
      .from("messages")
      .select("body, message_type")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const unread_count = await getUnreadCount(admin, id, "contractor");
    enriched.push({
      ...row,
      last_message_preview: lastMsg?.body
        ? truncatePreview(lastMsg.body as string)
        : null,
      unread_count,
    });
  }
  return enriched;
}
