import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

async function canAccessConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data: convo } = await supabase
    .from("conversations")
    .select("organization_id, client_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!convo) return false;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .eq("org_id", convo.organization_id)
    .eq("status", "active")
    .maybeSingle();

  if (membership) return true;

  const { data: portalUser } = await supabase
    .from("client_portal_users")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("client_id", convo.client_id)
    .eq("status", "active")
    .maybeSingle();

  return !!portalUser;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (!auth.ok) return auth.response;

    const allowed = await canAccessConversation(supabase, auth.user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (error) {
    captureApiError(error, { route: "portal/conversations/messages/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (!auth.ok) return auth.response;

    const allowed = await canAccessConversation(supabase, auth.user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, messageSchema);
    if (!parsed.ok) return parsed.response;

    const { data: portalUser } = await supabase
      .from("client_portal_users")
      .select("id")
      .eq("auth_user_id", auth.user.id)
      .eq("status", "active")
      .maybeSingle();

    const senderType = portalUser ? "client" : "contractor";

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        sender_auth_user_id: auth.user.id,
        sender_type: senderType,
        body: parsed.data.body,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "portal/conversations/messages/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
