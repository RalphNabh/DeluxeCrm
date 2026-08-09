import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { applyEstimateClientAction } from "@/lib/estimate-client-action";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const actionSchema = z.object({
  action: z.enum(["approve", "request_changes"]),
  clientName: z.string().max(200).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: estimateId } = await context.params;
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const rl = await rateLimit(request, "email-action", auth.user.id);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const parsed = await parseJsonBody(request, actionSchema);
    if (!parsed.ok) return parsed.response;

    const admin = createServiceRoleClient();
    const { data: estimate, error } = await admin
      .from("estimates")
      .select("id, status, clients(email, name)")
      .eq("id", estimateId)
      .eq("client_id", auth.clientId)
      .eq("organization_id", auth.orgId)
      .single();

    if (error || !estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (!["Sent", "Changes Requested"].includes(estimate.status)) {
      return NextResponse.json(
        { error: `Estimate cannot be actioned while status is ${estimate.status}` },
        { status: 400 },
      );
    }

    const clientRecord = estimate.clients as {
      email?: string;
      name?: string;
    } | null;
    const clientEmail = clientRecord?.email;
    if (!clientEmail) {
      return NextResponse.json(
        { error: "Client email not on file" },
        { status: 400 },
      );
    }

    const result = await applyEstimateClientAction(admin, {
      estimateId,
      action: parsed.data.action,
      clientEmail,
      clientName: parsed.data.clientName || clientRecord?.name,
      verifyClientEmail: false,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.httpStatus },
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.message,
    });
  } catch (error) {
    captureApiError(error, { route: "portal/estimates/[id]/action/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
