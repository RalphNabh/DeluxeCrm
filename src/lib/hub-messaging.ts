import type { SupabaseClient } from "@supabase/supabase-js";

export type MessageType = "text" | "system";

export type SystemMessageMetadata = {
  kind?: "service_request" | "estimate_change" | "estimate_approved";
  service_request_id?: string;
  estimate_id?: string;
  estimate_number?: string;
  title?: string;
  note?: string;
};

export type HubConversation = {
  id: string;
  client_id: string;
  organization_id: string;
  last_message_at: string | null;
  service_request_id?: string | null;
};

export type HubMessageRow = {
  id: string;
  body: string;
  sender_type: "client" | "contractor";
  message_type: MessageType;
  metadata: SystemMessageMetadata;
  read_at: string | null;
  created_at: string;
};

/** Single entry point: find or create the canonical thread for a client. */
export async function ensureClientConversation(
  admin: SupabaseClient,
  clientId: string,
  organizationId: string,
  opts?: { serviceRequestId?: string },
): Promise<HubConversation> {
  const { data: existing, error: findError } = await admin
    .from("conversations")
    .select("id, client_id, organization_id, last_message_at, service_request_id")
    .eq("client_id", clientId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (existing) {
    if (opts?.serviceRequestId && !existing.service_request_id) {
      await admin
        .from("conversations")
        .update({ service_request_id: opts.serviceRequestId })
        .eq("id", existing.id);
      return { ...existing, service_request_id: opts.serviceRequestId } as HubConversation;
    }
    return existing as HubConversation;
  }

  const { data: created, error: createError } = await admin
    .from("conversations")
    .insert({
      organization_id: organizationId,
      client_id: clientId,
      service_request_id: opts?.serviceRequestId ?? null,
    })
    .select("id, client_id, organization_id, last_message_at, service_request_id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "Failed to start conversation");
  }

  return created as HubConversation;
}

/** @deprecated Use ensureClientConversation */
export const ensurePortalConversation = ensureClientConversation;

export async function postHubMessage(
  admin: SupabaseClient,
  input: {
    clientId: string;
    organizationId: string;
    senderAuthUserId: string;
    senderType: "client" | "contractor";
    body: string;
    messageType?: MessageType;
    metadata?: SystemMessageMetadata;
    serviceRequestId?: string;
  },
): Promise<{ id: string }> {
  const conversation = await ensureClientConversation(
    admin,
    input.clientId,
    input.organizationId,
    input.serviceRequestId ? { serviceRequestId: input.serviceRequestId } : undefined,
  );

  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_auth_user_id: input.senderAuthUserId,
      sender_type: input.senderType,
      body: input.body,
      message_type: input.messageType ?? "text",
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to send message");
  }

  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return { id: data.id as string };
}

export async function postSystemMessage(
  admin: SupabaseClient,
  input: {
    clientId: string;
    organizationId: string;
    senderAuthUserId: string;
    senderType: "client" | "contractor";
    body: string;
    metadata: SystemMessageMetadata;
    serviceRequestId?: string;
  },
): Promise<{ id: string }> {
  return postHubMessage(admin, {
    ...input,
    messageType: "system",
    metadata: input.metadata,
  });
}

/** Mark all messages from the other party as read for the given viewer role. */
export async function markConversationRead(
  admin: SupabaseClient,
  conversationId: string,
  viewerRole: "client" | "contractor",
): Promise<number> {
  const otherSender = viewerRole === "client" ? "contractor" : "client";
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("messages")
    .update({ read_at: now })
    .eq("conversation_id", conversationId)
    .eq("sender_type", otherSender)
    .is("read_at", null)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/** Count unread messages from the other party in a single conversation. */
export async function getUnreadCount(
  admin: SupabaseClient,
  conversationId: string,
  viewerRole: "client" | "contractor",
): Promise<number> {
  const otherSender = viewerRole === "client" ? "contractor" : "client";

  const { count, error } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("sender_type", otherSender)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type ContractorInboxRow = {
  conversation_id: string;
  unread_count: number | string;
  last_body: string | null;
  last_created_at: string | null;
};

export async function fetchContractorInbox(
  admin: SupabaseClient,
  organizationId: string,
): Promise<ContractorInboxRow[]> {
  const { data, error } = await admin.rpc("contractor_inbox", {
    p_org_id: organizationId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContractorInboxRow[];
}

export function inboxToUnreadSummary(inbox: ContractorInboxRow[]): {
  total: number;
  byConversation: Record<string, number>;
} {
  const byConversation: Record<string, number> = {};
  let total = 0;
  for (const row of inbox) {
    const count = Number(row.unread_count) || 0;
    if (count > 0) {
      byConversation[row.conversation_id] = count;
      total += count;
    }
  }
  return { total, byConversation };
}

/** Total unread across all org conversations for contractor view. */
export async function getOrgUnreadSummary(
  admin: SupabaseClient,
  organizationId: string,
): Promise<{ total: number; byConversation: Record<string, number> }> {
  const inbox = await fetchContractorInbox(admin, organizationId);
  return inboxToUnreadSummary(inbox);
}

/** Total unread for a portal client across their thread(s). */
export async function getClientUnreadSummary(
  admin: SupabaseClient,
  clientId: string,
  organizationId: string,
): Promise<number> {
  const { data: convo } = await admin
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!convo) return 0;
  return getUnreadCount(admin, convo.id as string, "client");
}

export function buildSystemMessageBody(
  kind: SystemMessageMetadata["kind"],
  input: {
    title?: string;
    estimateNumber?: string;
    note?: string;
  },
): string {
  switch (kind) {
    case "service_request":
      return input.title ? `New request: ${input.title}` : "New service request submitted";
    case "estimate_change":
      return input.note
        ? `Changes requested on estimate ${input.estimateNumber ?? ""}:\n\n${input.note}`
        : `Changes requested on estimate ${input.estimateNumber ?? ""}`;
    case "estimate_approved":
      return `Estimate ${input.estimateNumber ?? ""} approved`;
    default:
      return input.title ?? "System notification";
  }
}
