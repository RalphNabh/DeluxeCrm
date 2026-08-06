import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    // Portal users are not org members; use service role after ownership check.
    const admin = createServiceRoleClient();

    const [estimatesRes, invoicesRes, jobsRes] = await Promise.all([
      admin
        .from("estimates")
        .select("id, estimate_number, total, status, created_at, valid_until")
        .eq("client_id", auth.clientId)
        .eq("organization_id", auth.orgId)
        .neq("status", "Draft")
        .order("created_at", { ascending: false }),
      admin
        .from("invoices")
        .select("id, invoice_number, total, status, created_at, due_date, paid_at")
        .eq("client_id", auth.clientId)
        .eq("organization_id", auth.orgId)
        .neq("status", "Draft")
        .order("created_at", { ascending: false }),
      admin
        .from("jobs")
        .select("id, title, status, start_time, end_time, location")
        .eq("client_id", auth.clientId)
        .eq("organization_id", auth.orgId)
        .order("start_time", { ascending: false }),
    ]);

    return NextResponse.json({
      estimates: estimatesRes.data ?? [],
      invoices: invoicesRes.data ?? [],
      jobs: jobsRes.data ?? [],
    });
  } catch (error) {
    captureApiError(error, { route: "portal/dashboard/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
