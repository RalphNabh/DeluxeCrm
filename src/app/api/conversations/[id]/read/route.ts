import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";
import { markConversationRead } from "@/lib/hub-messaging";

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

export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "messaging");
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const convo = await requireOrgConversation(admin, id, auth.ctx.orgId);
    if (!convo) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const marked = await markConversationRead(admin, id, "contractor");
    return NextResponse.json({ marked });
  } catch (error) {
    captureApiError(error, { route: "conversations/read/PATCH" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
