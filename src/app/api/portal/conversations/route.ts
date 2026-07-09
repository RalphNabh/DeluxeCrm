import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (!auth.ok) return auth.response;

    const { data: portalUser } = await supabase
      .from("client_portal_users")
      .select("client_id, organization_id")
      .eq("auth_user_id", auth.user.id)
      .eq("status", "active")
      .maybeSingle();

    let query = supabase
      .from("conversations")
      .select("id, client_id, last_message_at, clients(name)")
      .order("last_message_at", { ascending: false });

    if (portalUser) {
      query = query
        .eq("client_id", portalUser.client_id)
        .eq("organization_id", portalUser.organization_id);
    } else {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      query = query.eq("organization_id", membership.org_id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (error) {
    captureApiError(error, { route: "portal/conversations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
