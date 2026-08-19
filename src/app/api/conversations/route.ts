import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";
import { ensureClientConversation } from "@/lib/hub-messaging";
import { enrichConversationsForContractor } from "@/lib/messaging/enrich-conversations";

const startSchema = z.object({
  clientId: z.string().uuid(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "messaging");
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("conversations")
      .select(
        "id, client_id, last_message_at, created_at, service_request_id, clients(id, name, email)",
      )
      .eq("organization_id", auth.ctx.orgId)
      .order("last_message_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const enriched = await enrichConversationsForContractor(
      admin,
      auth.ctx.orgId,
      data ?? [],
    );
    return NextResponse.json(enriched);
  } catch (error) {
    captureApiError(error, { route: "conversations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "messaging");
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, startSchema);
    if (!parsed.ok) return parsed.response;

    const admin = createServiceRoleClient();
    const { data: client } = await admin
      .from("clients")
      .select("id")
      .eq("id", parsed.data.clientId)
      .eq("organization_id", auth.ctx.orgId)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const conversation = await ensureClientConversation(
      admin,
      parsed.data.clientId,
      auth.ctx.orgId,
    );

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "conversations/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
