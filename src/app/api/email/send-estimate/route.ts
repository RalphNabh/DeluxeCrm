import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEstimateEmail } from "@/lib/email/send-estimate-email";
import { requirePermission } from "@/lib/api-auth";
import { parseJsonBody } from "@/lib/validation";
import { sendEstimateEmailSchema } from "@/lib/api-schemas";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { captureApiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, "email-send");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const supabase = await createClient();
    // Sending a quote is a manager-and-above action, and it must be scoped to
    // the organization: a manager could not previously send an estimate the
    // owner had drafted, because the lookup filtered on user_id.
    const auth = await requirePermission(supabase, "create_estimates");
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, sendEstimateEmailSchema);
    if (!parsed.ok) return parsed.response;

    const { estimateId, clientEmail, clientName } = parsed.data;
    const result = await sendEstimateEmail(estimateId, clientEmail, clientName, {
      userId: auth.ctx.user.id,
      orgId: auth.ctx.orgId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: "Estimate sent successfully",
    });
  } catch (error) {
    captureApiError(error, { route: "email/send-estimate" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
