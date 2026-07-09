import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["reviewing", "quoted", "scheduled", "declined", "archived"]).optional(),
  converted_estimate_id: z.string().uuid().optional(),
  converted_job_id: z.string().uuid().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireManager(supabase);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, updateSchema);
    if (!parsed.ok) return parsed.response;

    const { data, error } = await supabase
      .from("service_requests")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", auth.ctx.orgId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error) {
    captureApiError(error, { route: "portal/requests/[id]/PATCH" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
