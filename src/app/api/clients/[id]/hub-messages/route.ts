import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { MESSAGE_SELECT } from "@/lib/messaging/message-select";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: clientId } = await context.params;
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "messaging");
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const { data: client } = await admin
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("organization_id", auth.ctx.orgId)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { data: convo } = await admin
      .from("conversations")
      .select("id")
      .eq("client_id", clientId)
      .eq("organization_id", auth.ctx.orgId)
      .maybeSingle();

    let messages: unknown[] = [];
    if (convo) {
      const { data } = await admin
        .from("messages")
        .select(MESSAGE_SELECT)
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: false })
        .limit(5);
      messages = (data ?? []).reverse();
    }

    const { data: changeRequests } = await admin
      .from("estimates")
      .select("id, estimate_number, change_request_note, status")
      .eq("client_id", clientId)
      .eq("organization_id", auth.ctx.orgId)
      .eq("status", "Changes Requested")
      .not("change_request_note", "is", null);

    return NextResponse.json({
      conversation_id: convo?.id ?? null,
      messages,
      change_requests: changeRequests ?? [],
    });
  } catch (error) {
    captureApiError(error, { route: "clients/hub-messages/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
