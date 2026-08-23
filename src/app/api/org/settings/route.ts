import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireOrgMember, requireManager } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";

type OrgSettingsPatch = {
  sms_notifications?: boolean;
  email_notifications?: boolean;
  weekly_reports?: boolean;
  business_hours?: Record<string, unknown>;
  invoice_defaults?: Record<string, unknown>;
  branding?: Record<string, unknown>;
  lead_recipients?: string[];
};

function cleanLeadRecipients(emails: unknown[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of emails) {
    const email = String(raw).trim().toLowerCase();
    if (
      email &&
      email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      !seen.has(email)
    ) {
      seen.add(email);
      cleaned.push(email);
    }
    if (cleaned.length >= 10) break;
  }
  return cleaned;
}

/**
 * Organization notification / preference settings stored on organizations.settings.
 * SMS automations read settings->>'sms_notifications' server-side (not localStorage).
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase);
    if (!auth.ok) return auth.response;

    const { data, error } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", auth.ctx.orgId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = (data?.settings ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      sms_notifications: settings.sms_notifications === true,
      email_notifications: settings.email_notifications !== false,
      weekly_reports: settings.weekly_reports !== false,
      business_hours: settings.business_hours ?? null,
      invoice_defaults: settings.invoice_defaults ?? null,
      branding: settings.branding ?? null,
      lead_recipients: Array.isArray(
        (settings.notifications as Record<string, unknown> | undefined)?.lead_recipients,
      )
        ? (settings.notifications as Record<string, unknown>).lead_recipients
        : [],
    });
  } catch (error) {
    captureApiError(error, { route: "org/settings/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireManager(supabase);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as OrgSettingsPatch;
    const patch: Record<string, unknown> = {};

    if (typeof body.sms_notifications === "boolean") {
      patch.sms_notifications = body.sms_notifications;
    }
    if (typeof body.email_notifications === "boolean") {
      patch.email_notifications = body.email_notifications;
    }
    if (typeof body.weekly_reports === "boolean") {
      patch.weekly_reports = body.weekly_reports;
    }
    if (body.business_hours && typeof body.business_hours === "object") {
      patch.business_hours = body.business_hours;
    }
    if (body.invoice_defaults && typeof body.invoice_defaults === "object") {
      patch.invoice_defaults = body.invoice_defaults;
    }
    if (body.branding && typeof body.branding === "object") {
      patch.branding = body.branding;
    }
    const hasLeadRecipients = Array.isArray(body.lead_recipients);

    if (Object.keys(patch).length === 0 && !hasLeadRecipients) {
      return NextResponse.json(
        { error: "No valid settings fields provided" },
        { status: 400 },
      );
    }

    // Service role: org UPDATE RLS is admin-only; managers may update notification prefs.
    const admin = createServiceRoleClient();
    const { data: org, error: fetchError } = await admin
      .from("organizations")
      .select("settings")
      .eq("id", auth.ctx.orgId)
      .single();

    if (fetchError || !org) {
      return NextResponse.json(
        { error: fetchError?.message || "Organization not found" },
        { status: 404 },
      );
    }

    if (hasLeadRecipients) {
      const existingNotifications = ((org.settings as Record<string, unknown>)
        ?.notifications ?? {}) as Record<string, unknown>;
      patch.notifications = {
        ...existingNotifications,
        lead_recipients: cleanLeadRecipients(body.lead_recipients as unknown[]),
      };
    }

    const merged = {
      ...((org.settings as Record<string, unknown>) || {}),
      ...patch,
    };

    const { error: updateError } = await admin
      .from("organizations")
      .update({ settings: merged, updated_at: new Date().toISOString() })
      .eq("id", auth.ctx.orgId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      sms_notifications: merged.sms_notifications === true,
      email_notifications: merged.email_notifications !== false,
      weekly_reports: merged.weekly_reports !== false,
      lead_recipients: Array.isArray(
        (merged.notifications as Record<string, unknown> | undefined)?.lead_recipients,
      )
        ? (merged.notifications as Record<string, unknown>).lead_recipients
        : [],
    });
  } catch (error) {
    captureApiError(error, { route: "org/settings/PATCH" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
