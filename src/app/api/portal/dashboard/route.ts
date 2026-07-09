import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const [estimatesRes, invoicesRes, jobsRes] = await Promise.all([
      supabase
        .from("estimates")
        .select("id, estimate_number, total, status, created_at, valid_until")
        .eq("client_id", auth.clientId)
        .eq("organization_id", auth.orgId)
        .neq("status", "Draft")
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, invoice_number, total, status, created_at, due_date")
        .eq("client_id", auth.clientId)
        .eq("organization_id", auth.orgId)
        .neq("status", "Draft")
        .order("created_at", { ascending: false }),
      supabase
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
