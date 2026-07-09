import { requireOrgMember } from '@/lib/api-auth'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;

    const { user, orgId, role } = auth.ctx;

    if (role === "worker") {
      const { data: assignments } = await supabase
        .from("job_assignments")
        .select("job_id, jobs(*, clients(id, name, email, phone))")
        .eq("user_id", user.id);

      const jobs = (assignments ?? [])
        .map((a) => a.jobs)
        .filter(Boolean);

      return NextResponse.json({ jobs, role });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*, clients(id, name, email, phone, address)")
      .eq("organization_id", orgId)
      .gte("start_time", today.toISOString())
      .lt("start_time", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ jobs: jobs ?? [], role });
  } catch (error) {
    captureApiError(error, { route: "field/schedule/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
