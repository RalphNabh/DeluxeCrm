import type { SupabaseClient } from "@supabase/supabase-js";

export type PortalConversation = {
  id: string;
  client_id: string;
  organization_id: string;
  last_message_at: string | null;
};

/** Find the client's Hub thread, or create one so Send always has a destination. */
export async function ensurePortalConversation(
  admin: SupabaseClient,
  clientId: string,
  organizationId: string,
): Promise<PortalConversation> {
  const { data: existing, error: findError } = await admin
    .from("conversations")
    .select("id, client_id, organization_id, last_message_at")
    .eq("client_id", clientId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (existing) return existing as PortalConversation;

  const { data: created, error: createError } = await admin
    .from("conversations")
    .insert({
      organization_id: organizationId,
      client_id: clientId,
    })
    .select("id, client_id, organization_id, last_message_at")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "Failed to start conversation");
  }

  return created as PortalConversation;
}

export async function postHubMessage(
  admin: SupabaseClient,
  input: {
    clientId: string;
    organizationId: string;
    senderAuthUserId: string;
    senderType: "client" | "contractor";
    body: string;
  },
): Promise<{ id: string }> {
  const conversation = await ensurePortalConversation(
    admin,
    input.clientId,
    input.organizationId,
  );

  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_auth_user_id: input.senderAuthUserId,
      sender_type: input.senderType,
      body: input.body,
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
