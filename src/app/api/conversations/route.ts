import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, "manage_requests");
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("conversations")
      .select("id, client_id, last_message_at, created_at, clients(id, name, email)")
      .eq("organization_id", auth.ctx.orgId)
      .order("last_message_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    captureApiError(error, { route: "conversations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
