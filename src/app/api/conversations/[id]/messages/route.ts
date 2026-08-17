import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

type RouteContext = { params: Promise<{ id: string }> };

async function requireOrgConversation(
  admin: ReturnType<typeof createServiceRoleClient>,
  conversationId: string,
  orgId: string,
) {
  const { data } = await admin
    .from("conversations")
    .select("id, client_id, organization_id")
    .eq("id", conversationId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return data;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "manage_requests");
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const convo = await requireOrgConversation(admin, id, auth.ctx.orgId);
    if (!convo) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("messages")
      .select("id, body, sender_type, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (error) {
    captureApiError(error, { route: "conversations/messages/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "manage_requests");
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, messageSchema);
    if (!parsed.ok) return parsed.response;

    const admin = createServiceRoleClient();
    const convo = await requireOrgConversation(admin, id, auth.ctx.orgId);
    if (!convo) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("messages")
      .insert({
        conversation_id: id,
        sender_auth_user_id: auth.ctx.user.id,
        sender_type: "contractor",
        body: parsed.data.body,
      })
      .select("id, body, sender_type, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "conversations/messages/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
