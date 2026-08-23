import { after, NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyAccessToken } from "@/lib/oauth/zapier";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { captureApiError } from "@/lib/api-error";
import { escapePostgrestValue } from "@/lib/postgrest-escape";
import {
  buildSystemMessageBody,
  ensureClientConversation,
  postSystemMessage,
} from "@/lib/hub-messaging";
import { checkAndExecuteAutomations } from "@/lib/automations/executor";
import { maybeSendNewLeadEmail } from "@/lib/email/lead-alert";

const KNOWN_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "title",
  "description",
  "message",
  "notes",
  "preferred_date",
]);

/** Zapier Action: "Create Request" — authenticated via the org's OAuth access token. */
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const grant = await verifyAccessToken(token);
    if (!grant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimit(request, "public-default", grant.organizationId);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const title = String(body.title ?? "Lead from Zapier").trim();
    const description = String(body.description ?? body.message ?? body.notes ?? "").trim();
    const preferredDate = String(body.preferred_date ?? "").trim();

    if (!name || name.length > 200) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const metadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!KNOWN_FIELDS.has(key)) metadata[key] = value;
    }

    const admin = createServiceRoleClient();
    const { data: org } = await admin
      .from("organizations")
      .select("id, owner_user_id, name")
      .eq("id", grant.organizationId)
      .maybeSingle();

    if (!org?.owner_user_id) {
      return NextResponse.json(
        { error: "Organization is not ready to accept requests" },
        { status: 400 },
      );
    }

    const escapedEmail = escapePostgrestValue(email);
    const { data: existingClient } = await admin
      .from("clients")
      .select("id")
      .eq("organization_id", org.id)
      .ilike("email", escapedEmail)
      .limit(1)
      .maybeSingle();

    let clientId = existingClient?.id as string | undefined;
    if (!clientId) {
      const { data: created, error: clientError } = await admin
        .from("clients")
        .insert({
          user_id: org.owner_user_id,
          organization_id: org.id,
          name,
          email,
          phone: phone || null,
          notes: "Created via Zapier",
        })
        .select("id")
        .single();

      if (clientError || !created) {
        captureApiError(clientError, { route: "zapier/leads", step: "createClient" });
        return NextResponse.json(
          { error: "Failed to create client record" },
          { status: 500 },
        );
      }
      clientId = created.id;
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "Failed to resolve client record" },
        { status: 500 },
      );
    }

    const { data: requestRow, error: insertError } = await admin
      .from("service_requests")
      .insert({
        organization_id: org.id,
        client_id: clientId,
        title: title || "Lead from Zapier",
        description: description || null,
        preferred_date: preferredDate || null,
        status: "new",
        source: "zapier",
        metadata,
      })
      .select("id")
      .single();

    if (insertError || !requestRow) {
      captureApiError(insertError, { route: "zapier/leads", step: "insertRequest" });
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
    }

    await ensureClientConversation(admin, clientId, org.id, {
      serviceRequestId: requestRow.id,
    });
    await postSystemMessage(admin, {
      clientId,
      organizationId: org.id,
      senderAuthUserId: org.owner_user_id as string,
      senderType: "client",
      body: buildSystemMessageBody("service_request", { title }),
      metadata: {
        kind: "service_request",
        service_request_id: requestRow.id,
        title,
      },
      serviceRequestId: requestRow.id,
    });

    await checkAndExecuteAutomations("service_request_received", {
      event: "service_request_received",
      user_id: org.owner_user_id as string,
      organization_id: org.id,
      service_request_id: requestRow.id,
      client_id: clientId,
      client_name: name,
      client_email: email,
      title: title || "Lead from Zapier",
      source: "zapier",
    });

    after(() =>
      maybeSendNewLeadEmail(admin, {
        serviceRequestId: requestRow.id,
        organizationId: org.id,
        ownerUserId: org.owner_user_id as string,
        orgName: org.name ?? undefined,
        title: title || "Lead from Zapier",
        clientName: name,
        clientEmail: email,
        source: "zapier",
      }).catch(() => {}),
    );

    return NextResponse.json({ id: requestRow.id, status: "new" }, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "zapier/leads" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
