import { requireOrgMember } from '@/lib/api-auth'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/validation";
import { leadCreateSchema } from "@/lib/api-schemas";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;
    const { user, orgId } = auth.ctx;

    let { data, error } = await supabase
      .from("leads")
      .select(
        `
      *,
      client_folders (
        id,
        name,
        color,
        description
      )
    `,
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      const errorMsg = error.message || String(error);
      if (
        errorMsg.includes("column") ||
        errorMsg.includes("does not exist") ||
        errorMsg.includes("relation") ||
        errorMsg.includes("foreign key")
      ) {
        const simpleQuery = await supabase
          .from("leads")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        if (simpleQuery.error) {
          return NextResponse.json(
            { error: simpleQuery.error.message },
            { status: 400 },
          );
        }

        data =
          simpleQuery.data?.map((lead) => ({
            ...lead,
            client_folders: null,
          })) ?? [];
      } else {
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    captureApiError(error, { route: "leads/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;
    const { user, orgId } = auth.ctx;

    const parsed = await parseJsonBody(request, leadCreateSchema);
    if (!parsed.ok) return parsed.response;

    const { name, address, phone, email, value, status, tags, folder_id } =
      parsed.data;

    const leadData: Record<string, unknown> = {
      user_id: user.id,
      organization_id: orgId,
      name,
      address,
      phone,
      email,
      value: value ?? 0,
      status: status ?? "New Leads",
    };

    if (tags !== undefined) {
      leadData.tags = Array.isArray(tags) ? tags : tags ? [tags] : [];
    }
    if (folder_id) leadData.folder_id = folder_id;

    let { data, error } = await supabase
      .from("leads")
      .insert([leadData])
      .select("*")
      .single();

    if (error && folder_id) {
      delete leadData.folder_id;
      const retry = await supabase.from("leads").insert([leadData]).select("*").single();
      data = retry.data;
      error = retry.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "leads/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
