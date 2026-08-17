import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { captureApiError } from "@/lib/api-error";
import { escapePostgrestValue } from "@/lib/postgrest-escape";
import {
  collectImageFiles,
  uploadServiceRequestPhotos,
} from "@/lib/service-request-photos";
import {
  buildSystemMessageBody,
  ensureClientConversation,
  postSystemMessage,
} from "@/lib/hub-messaging";

type RouteContext = { params: Promise<{ orgSlug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { orgSlug } = await context.params;
    const slug = orgSlug.trim().toLowerCase();
    if (!slug || slug.length > 100) {
      return NextResponse.json({ error: "Invalid organization" }, { status: 400 });
    }

    const rl = await rateLimit(_request, "public-default");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const admin = createServiceRoleClient();
    const { data: org, error } = await admin
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ name: org.name, slug: org.slug });
  } catch (error) {
    captureApiError(error, { route: "request/[orgSlug]/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orgSlug } = await context.params;
    const slug = orgSlug.trim().toLowerCase();
    if (!slug || slug.length > 100) {
      return NextResponse.json({ error: "Invalid organization" }, { status: 400 });
    }

    const rl = await rateLimit(request, "contact");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests from this IP. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let name = "";
    let email = "";
    let phone = "";
    let title = "";
    let description = "";
    let preferredDate = "";
    let website = "";
    let photoFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      name = String(form.get("name") ?? "").trim();
      email = String(form.get("email") ?? "").trim();
      phone = String(form.get("phone") ?? "").trim();
      title = String(form.get("title") ?? "").trim();
      description = String(form.get("description") ?? "").trim();
      preferredDate = String(form.get("preferred_date") ?? "").trim();
      website = String(form.get("website") ?? "");
      photoFiles = collectImageFiles(form);
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      name = String(body.name ?? "").trim();
      email = String(body.email ?? "").trim();
      phone = String(body.phone ?? "").trim();
      title = String(body.title ?? "").trim();
      description = String(body.description ?? "").trim();
      preferredDate = String(body.preferred_date ?? "").trim();
      website = String(body.website ?? "");
    }

    // Honeypot: silently accept bots
    if (website.length > 0) {
      return NextResponse.json({ success: true, id: "ok" }, { status: 201 });
    }

    if (!name || name.length > 200) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!title || title.length > 200) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (description.length > 5000) {
      return NextResponse.json({ error: "Description is too long" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .select("id, owner_user_id, name, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!org.owner_user_id) {
      return NextResponse.json(
        { error: "Organization is not ready to accept requests" },
        { status: 400 },
      );
    }

    let photos: string[] = [];
    if (photoFiles.length > 0) {
      const uploaded = await uploadServiceRequestPhotos(admin, org.id, photoFiles);
      if (uploaded.error) {
        return NextResponse.json({ error: uploaded.error }, { status: 400 });
      }
      photos = uploaded.urls;
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
          notes: "Created via public request form",
        })
        .select("id")
        .single();

      if (clientError || !created) {
        captureApiError(clientError, {
          route: "request/[orgSlug]/POST",
          step: "createClient",
        });
        return NextResponse.json(
          { error: "Failed to create client record" },
          { status: 500 },
        );
      }
      clientId = created.id;
    }

    const { data: requestRow, error: insertError } = await admin
      .from("service_requests")
      .insert({
        organization_id: org.id,
        client_id: clientId,
        title,
        description: description || null,
        preferred_date: preferredDate || null,
        photos,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError || !requestRow) {
      captureApiError(insertError, {
        route: "request/[orgSlug]/POST",
        step: "insertRequest",
      });
      return NextResponse.json(
        { error: "Failed to submit request" },
        { status: 500 },
      );
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

    return NextResponse.json(
      { success: true, id: requestRow.id },
      { status: 201 },
    );
  } catch (error) {
    captureApiError(error, { route: "request/[orgSlug]/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
