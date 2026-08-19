import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchContractorInbox,
  type ContractorInboxRow,
} from "@/lib/hub-messaging";
import { truncatePreview } from "@/lib/messaging/format";

export function mergeContractorInbox(
  rows: Array<Record<string, unknown>>,
  inbox: ContractorInboxRow[],
): Array<Record<string, unknown>> {
  const byId = new Map(inbox.map((row) => [row.conversation_id, row]));
  return rows.map((row) => {
    const extra = byId.get(row.id as string);
    return {
      ...row,
      last_message_preview: extra?.last_body
        ? truncatePreview(extra.last_body)
        : null,
      unread_count: Number(extra?.unread_count) || 0,
    };
  });
}

export async function enrichConversationsForContractor(
  admin: SupabaseClient,
  organizationId: string,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const inbox = await fetchContractorInbox(admin, organizationId);
  return mergeContractorInbox(rows, inbox);
}
