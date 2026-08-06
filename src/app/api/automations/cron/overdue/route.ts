import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/automations/cron-auth";
import { checkAndExecuteAutomations } from "@/lib/automations/executor";

/**
 * Scan overdue invoices and emit invoice_overdue once per invoice.
 * Claim (set overdue_notified_at) BEFORE sending so concurrent crons cannot double-send.
 * On execute failure, clear the claim so a later run can retry.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 200;

async function handle(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { data: candidates, error } = await admin
      .from("invoices")
      .select(
        "id, user_id, organization_id, invoice_number, total, due_date, status, client_id, clients(name, email, phone)",
      )
      .lt("due_date", today)
      .in("status", ["Sent", "Partially Paid"])
      .is("overdue_notified_at", null)
      .order("due_date", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      throw new Error(`Failed to query overdue invoices: ${error.message}`);
    }

    let emitted = 0;
    let skipped = 0;

    for (const invoice of candidates ?? []) {
      if (!invoice.organization_id) {
        skipped += 1;
        continue;
      }

      const claimedAt = new Date().toISOString();
      const { data: claimed, error: claimError } = await admin
        .from("invoices")
        .update({
          overdue_notified_at: claimedAt,
          updated_at: claimedAt,
        })
        .eq("id", invoice.id)
        .is("overdue_notified_at", null)
        .select("id")
        .maybeSingle();

      if (claimError || !claimed) {
        skipped += 1;
        continue;
      }

      const due = invoice.due_date ? new Date(`${invoice.due_date}T00:00:00Z`) : null;
      const daysOverdue = due
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - due.getTime()) / (24 * 60 * 60 * 1000),
            ),
          )
        : 0;

      const client = Array.isArray(invoice.clients)
        ? invoice.clients[0]
        : invoice.clients;

      try {
        await checkAndExecuteAutomations("invoice_overdue", {
          event: "invoice_overdue",
          user_id: invoice.user_id,
          organization_id: invoice.organization_id,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount:
            invoice.total != null
              ? `$${Number(invoice.total).toFixed(2)}`
              : undefined,
          invoice_total: invoice.total,
          days_overdue: daysOverdue,
          client_id: invoice.client_id,
          client_name: client?.name || "Client",
          client_email: client?.email || undefined,
          client_phone: client?.phone || undefined,
        });
        emitted += 1;
      } catch (err) {
        Sentry.captureException(err);
        // Clear claim so a later cron can retry.
        await admin
          .from("invoices")
          .update({
            overdue_notified_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id)
          .eq("overdue_notified_at", claimedAt);
        skipped += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      today,
      scanned: candidates?.length ?? 0,
      emitted,
      skipped,
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Overdue cron failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
