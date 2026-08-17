import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/validation";
import { verifyEstimateActionToken } from "@/lib/estimate-action-token";
import { captureApiError } from "@/lib/api-error";
import { applyEstimateClientAction } from "@/lib/estimate-client-action";

const actionSchema = z.object({
  estimateId: z.string().uuid(),
  action: z.enum(["approve", "request_changes"]),
  clientEmail: z.string().email(),
  clientName: z.string().max(200).optional(),
  token: z.string().min(10),
  clientMessage: z.string().trim().max(5000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, "email-action");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const parsed = await parseJsonBody(request, actionSchema);
    if (!parsed.ok) return parsed.response;

    const { estimateId, action, clientEmail, clientName, token, clientMessage } =
      parsed.data;

    if (action === "request_changes" && !clientMessage?.trim()) {
      return NextResponse.json(
        { error: "Please describe the changes you need." },
        { status: 400 },
      );
    }

    if (!verifyEstimateActionToken(token, estimateId, clientEmail, action)) {
      return NextResponse.json(
        { error: "Invalid or expired action link" },
        { status: 403 },
      );
    }

    const supabase = createServiceRoleClient();
    const result = await applyEstimateClientAction(supabase, {
      estimateId,
      action,
      clientEmail,
      clientName,
      clientMessage,
      verifyClientEmail: true,
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
    captureApiError(error, { route: "email/action" });
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 },
    );
  }
}
