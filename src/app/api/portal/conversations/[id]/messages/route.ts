import { after, NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";
import { maybeSendNewMessageEmail } from "@/lib/email/message-alert";
import { MESSAGE_PAGE_SIZE, MESSAGE_SELECT } from "@/lib/messaging/message-select";

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

async function requireOwnedConversation(
  admin: ReturnType<typeof createServiceRoleClient>,
  conversationId: string,
  clientId: string,
  orgId: string,
) {
  const { data: convo } = await admin
    .from("conversations")
    .select("id, organization_id, organizations(name, owner_user_id)")
    .eq("id", conversationId)
    .eq("client_id", clientId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return convo;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const before = request.nextUrl.searchParams.get("before");
    const limit = Math.min(
      Number(request.nextUrl.searchParams.get("limit")) || MESSAGE_PAGE_SIZE,
      100,
    );

    const admin = createServiceRoleClient();
    const convo = await requireOwnedConversation(
      admin,
      id,
      auth.clientId,
      auth.orgId,
    );
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
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, messageSchema);
    if (!parsed.ok) return parsed.response;

    const admin = createServiceRoleClient();
    const convo = await requireOwnedConversation(
      admin,
      id,
      auth.clientId,
      auth.orgId,
    );
    if (!convo) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("messages")
      .insert({
        conversation_id: id,
        sender_auth_user_id: auth.user.id,
        sender_type: "client",
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

    const org = convo.organizations as {
      name?: string;
      owner_user_id?: string;
    } | null;
    const ownerUserId = org?.owner_user_id;
    const orgName = org?.name;
    const clientId = auth.clientId;
    after(async () => {
      if (!ownerUserId) return;
      try {
        const { data: ownerAuth } = await admin.auth.admin.getUserById(ownerUserId);
        const ownerEmail = ownerAuth?.user?.email;
        if (!ownerEmail) return;
        await maybeSendNewMessageEmail(admin, {
          conversationId: id,
          recipientEmail: ownerEmail,
          deepLink: `/messages?clientId=${clientId}`,
          orgName,
        });
      } catch {
        /* never fail the send */
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "portal/conversations/messages/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
