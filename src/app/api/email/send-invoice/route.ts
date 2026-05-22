import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInvoiceEmail } from "@/lib/email/send-invoice-email";
import { requireUser } from "@/lib/api-auth";
import { parseJsonBody } from "@/lib/validation";
import { sendInvoiceEmailSchema } from "@/lib/api-schemas";
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
    const auth = await requireUser(supabase);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, sendInvoiceEmailSchema);
    if (!parsed.ok) return parsed.response;

    const { invoiceId, clientEmail, clientName } = parsed.data;
    const result = await sendInvoiceEmail(
      invoiceId,
      clientEmail,
      clientName,
      auth.user.id,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: "Invoice sent successfully",
    });
  } catch (error) {
    captureApiError(error, { route: "email/send-invoice" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
