import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";

const assignSchema = z.object({
  jobId: z.string().uuid(),
  memberUserIds: z.array(z.string().uuid()),
  role: z.string().default("Assistant"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireManager(supabase);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, assignSchema);
    if (!parsed.ok) return parsed.response;

    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", parsed.data.jobId)
      .eq("organization_id", auth.ctx.orgId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await supabase
      .from("job_assignments")
      .delete()
      .eq("job_id", parsed.data.jobId);

    const rows = parsed.data.memberUserIds.map((userId) => ({
      job_id: parsed.data.jobId,
      user_id: userId,
      role: parsed.data.role,
    }));

    const { error } = await supabase.from("job_assignments").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error, { route: "org/job-assignments/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const clientAssignSchema = z.object({
  clientId: z.string().uuid(),
  memberUserIds: z.array(z.string().uuid()),
});

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireManager(supabase);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, clientAssignSchema);
    if (!parsed.ok) return parsed.response;

    await supabase
      .from("client_assignments")
      .delete()
      .eq("client_id", parsed.data.clientId)
      .eq("org_id", auth.ctx.orgId);

    const rows = parsed.data.memberUserIds.map((userId) => ({
      org_id: auth.ctx.orgId,
      client_id: parsed.data.clientId,
      member_user_id: userId,
      assigned_by: auth.ctx.user.id,
    }));

    if (rows.length > 0) {
      const { error } = await supabase.from("client_assignments").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error, { route: "org/client-assignments/PUT" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
