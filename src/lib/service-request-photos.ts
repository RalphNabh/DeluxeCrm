import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

/** Upload service-request images under `{orgId}/service-requests/…` in materials. */
export async function uploadServiceRequestPhotos(
  admin: SupabaseClient,
  orgId: string,
  files: File[],
): Promise<{ urls: string[]; error?: string }> {
  if (files.length > MAX_PHOTOS) {
    return { urls: [], error: `Upload at most ${MAX_PHOTOS} photos` };
  }

  const urls: string[] = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;
    if (!file.type.startsWith("image/")) {
      return { urls: [], error: "Photos must be image files" };
    }
    if (file.size > MAX_BYTES) {
      return { urls: [], error: "Each photo must be under 5MB" };
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
    const filePath = `${orgId}/service-requests/${fileName}`;

    const { error: uploadError } = await admin.storage
      .from("materials")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      return {
        urls: [],
        error: uploadError.message || "Failed to upload photo",
      };
    }

    const { data: urlData } = admin.storage
      .from("materials")
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return { urls: [], error: "Failed to generate photo URL" };
    }
    urls.push(urlData.publicUrl);
  }

  return { urls };
}

export function collectImageFiles(form: FormData, field = "photos"): File[] {
  return form
    .getAll(field)
    .filter((v): v is File => v instanceof File && v.size > 0);
}
