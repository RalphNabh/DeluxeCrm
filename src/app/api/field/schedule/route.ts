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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Prefer today's visits (calendar atom). Fall back to jobs if visits unavailable.
    const mapVisitToScheduleItem = (visit: Record<string, unknown>) => {
      const job = visit.jobs as Record<string, unknown> | null;
      return {
        id: visit.id,
        visit_id: visit.id,
        job_id: visit.job_id,
        title: (job?.title as string) || "Visit",
        status: visit.status,
        start_time: visit.scheduled_start,
        end_time: visit.scheduled_end,
        location: (job?.location as string) || undefined,
        clients: job?.clients ?? null,
      };
    };

    if (role === "worker") {
      const { data: assignments } = await supabase
        .from("job_assignments")
        .select("job_id")
        .eq("user_id", user.id);

      const jobIds = (assignments ?? []).map((a) => a.job_id).filter(Boolean);

      if (jobIds.length === 0) {
        return NextResponse.json({ jobs: [], visits: [], role });
      }

      const { data: visits, error: visitsError } = await supabase
        .from("visits")
        .select("*, jobs(*, clients(id, name, email, phone, address))")
        .in("job_id", jobIds)
        .gte("scheduled_start", today.toISOString())
        .lt("scheduled_start", tomorrow.toISOString())
        .neq("status", "cancelled")
        .order("scheduled_start", { ascending: true });

      if (!visitsError && visits) {
        const items = visits.map(mapVisitToScheduleItem);
        return NextResponse.json({ jobs: items, visits: items, role });
      }

      // Fallback: assigned jobs (legacy)
      const { data: assignmentJobs } = await supabase
        .from("job_assignments")
        .select("job_id, jobs(*, clients(id, name, email, phone))")
        .eq("user_id", user.id);

      const jobs = (assignmentJobs ?? [])
        .map((a) => a.jobs)
        .filter(Boolean);

      return NextResponse.json({ jobs, visits: [], role });
    }

    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select("*, jobs(*, clients(id, name, email, phone, address))")
      .eq("organization_id", orgId)
      .gte("scheduled_start", today.toISOString())
      .lt("scheduled_start", tomorrow.toISOString())
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: true });

    if (!visitsError && visits) {
      const items = visits.map(mapVisitToScheduleItem);
      return NextResponse.json({ jobs: items, visits: items, role });
    }

    // Fallback to jobs when visits table is not ready
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*, clients(id, name, email, phone, address)")
      .eq("organization_id", orgId)
      .gte("start_time", today.toISOString())
      .lt("start_time", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ jobs: jobs ?? [], visits: [], role });
  } catch (error) {
    captureApiError(error, { route: "field/schedule/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
