import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const admin = createServiceRoleClient();
    const [{ data: client }, { data: organization }] = await Promise.all([
      admin
        .from("clients")
        .select("id, name, email")
        .eq("id", auth.clientId)
        .eq("organization_id", auth.orgId)
        .maybeSingle(),
      admin
        .from("organizations")
        .select("id, name")
        .eq("id", auth.orgId)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      email: auth.user.email ?? client?.email ?? null,
      client: {
        id: auth.clientId,
        name: client?.name ?? "Client",
        email: client?.email ?? auth.user.email ?? null,
      },
      organization: {
        id: auth.orgId,
        name: organization?.name ?? "Your contractor",
      },
    });
  } catch (error) {
    captureApiError(error, { route: "portal/me/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
