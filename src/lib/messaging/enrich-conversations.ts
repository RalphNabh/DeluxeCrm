import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchContractorInbox,
  type ContractorInboxRow,
} from "@/lib/hub-messaging";
import { mergeContractorInbox } from "@/lib/messaging/format";

export { mergeContractorInbox };

export async function enrichConversationsForContractor(
  admin: SupabaseClient,
  organizationId: string,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const inbox: ContractorInboxRow[] = await fetchContractorInbox(
    admin,
    organizationId,
  );
  return mergeContractorInbox(rows, inbox);
}
