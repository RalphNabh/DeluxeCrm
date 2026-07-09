import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePortalUser, requireManager } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  preferred_date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const scope = request.nextUrl.searchParams.get("scope");

    if (scope === "contractor") {
      const auth = await requireManager(supabase);
      if (!auth.ok) return auth.response;

      const status = request.nextUrl.searchParams.get("status");
      let query = supabase
        .from("service_requests")
        .select("*, clients(id, name, email)")
        .eq("organization_id", auth.ctx.orgId)
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data ?? []);
    }

    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("client_id", auth.clientId)
      .eq("organization_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (error) {
    captureApiError(error, { route: "portal/requests/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, requestSchema);
    if (!parsed.ok) return parsed.response;

    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        organization_id: auth.orgId,
        client_id: auth.clientId,
        portal_user_id: auth.portalUserId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        preferred_date: parsed.data.preferred_date ?? null,
        status: "new",
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("conversations").insert({
      organization_id: auth.orgId,
      client_id: auth.clientId,
      service_request_id: data.id,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "portal/requests/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
