import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";
import { maybeSendNewMessageEmail } from "@/lib/email/message-alert";
import { MESSAGE_PAGE_SIZE, MESSAGE_SELECT } from "@/lib/messaging/message-select";

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
    .select("id, client_id, organization_id, clients(name, email)")
    .eq("id", conversationId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return data;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "messaging");
    if (!auth.ok) return auth.response;

    const before = request.nextUrl.searchParams.get("before");
    const limit = Math.min(
      Number(request.nextUrl.searchParams.get("limit")) || MESSAGE_PAGE_SIZE,
      100,
    );

    const admin = createServiceRoleClient();
    const convo = await requireOrgConversation(admin, id, auth.ctx.orgId);
    if (!convo) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = admin
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const messages = [...page].reverse();

    return NextResponse.json({ messages, hasMore });
  } catch (error) {
    captureApiError(error, { route: "conversations/messages/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "messaging");
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
        message_type: "text",
        metadata: {},
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", id);

    const client = convo.clients as { name?: string; email?: string } | null;
    if (client?.email) {
      try {
        await maybeSendNewMessageEmail(admin, {
          conversationId: id,
          recipientEmail: client.email,
          recipientName: client.name,
          deepLink: "/portal/messages",
        });
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "conversations/messages/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
