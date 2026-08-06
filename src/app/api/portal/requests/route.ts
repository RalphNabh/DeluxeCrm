import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalUser, requireManager } from "@/lib/api-auth";
import { captureApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";
import { z } from "zod";
import {
  collectImageFiles,
  uploadServiceRequestPhotos,
} from "@/lib/service-request-photos";

const requestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  preferred_date: z.string().optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const scope = request.nextUrl.searchParams.get("scope");

    if (scope === "contractor") {
      const auth = await requireManager(supabase);
      if (!auth.ok) return auth.response;

      const status = request.nextUrl.searchParams.get("status");
      let query = supabase
        .from("service_requests")
        .select("*, clients(id, name, email)")
        .eq("organization_id", auth.ctx.orgId)
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data ?? []);
    }

    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("client_id", auth.clientId)
      .eq("organization_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (error) {
    captureApiError(error, { route: "portal/requests/GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requirePortalUser(supabase);
    if (!auth.ok) return auth.response;

    const contentType = request.headers.get("content-type") || "";
    let title = "";
    let description: string | undefined;
    let preferredDate: string | undefined;
    let photoUrls: string[] = [];
    let photoFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      title = String(form.get("title") ?? "").trim();
      description = String(form.get("description") ?? "").trim() || undefined;
      preferredDate =
        String(form.get("preferred_date") ?? "").trim() || undefined;
      photoFiles = collectImageFiles(form);
    } else {
      const parsed = await parseJsonBody(request, requestSchema);
      if (!parsed.ok) return parsed.response;
      title = parsed.data.title;
      description = parsed.data.description;
      preferredDate = parsed.data.preferred_date;
      photoUrls = parsed.data.photos ?? [];
    }

    if (!title || title.length > 200) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (photoFiles.length > 0) {
      const admin = createServiceRoleClient();
      const uploaded = await uploadServiceRequestPhotos(
        admin,
        auth.orgId,
        photoFiles,
      );
      if (uploaded.error) {
        return NextResponse.json({ error: uploaded.error }, { status: 400 });
      }
      photoUrls = [...photoUrls, ...uploaded.urls].slice(0, 5);
    }

    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        organization_id: auth.orgId,
        client_id: auth.clientId,
        portal_user_id: auth.portalUserId,
        title,
        description: description ?? null,
        preferred_date: preferredDate ?? null,
        photos: photoUrls,
        status: "new",
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("conversations").insert({
      organization_id: auth.orgId,
      client_id: auth.clientId,
      service_request_id: data.id,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: "portal/requests/POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
