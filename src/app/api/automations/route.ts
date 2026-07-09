import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/validation";
import { automationCreateSchema } from "@/lib/api-schemas";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;
    const { user, orgId } = auth.ctx;

    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error) {
    captureApiError(error, { route: "automations/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;
    const { user, orgId } = auth.ctx;

    const parsed = await parseJsonBody(request, automationCreateSchema);
    if (!parsed.ok) return parsed.response;

    const {
      name,
      description,
      is_active = true,
      trigger_event,
      trigger_filter,
      action_type,
      action_payload,
    } = parsed.data;

    const { data, error } = await supabase
      .from("automations")
      .insert([
        {
          user_id: user.id,
          organization_id: orgId,
          name,
          description,
          is_active,
          trigger_event,
          trigger_filter,
          action_type,
          action_payload,
        },
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "automations/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
