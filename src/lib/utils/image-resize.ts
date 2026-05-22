/**
 * Client-side image resize.
 *
 * Used by the AI Estimate wizard before upload — most phone photos are
 * 3-6 MB at 4032x3024. Resizing to 1280px (longest edge) typically yields
 * 200-400 KB JPEGs which:
 *   - Upload fast on mobile data
 *   - Cost ~half as many vision tokens
 *   - Still keep enough detail for GPT-4o to identify materials
 *
 * Always returns a `Blob` (PNGs become JPEGs) so callers don't have to
 * branch on type.
 */
export interface ResizeOptions {
  /** Max longest-edge length in pixels. Default 1280. */
  maxDimension?: number;
  /** JPEG quality, 0..1. Default 0.85. */
  quality?: number;
  /** Output mime, default image/jpeg. */
  mimeType?: "image/jpeg" | "image/webp";
}

export async function resizeImage(
  file: File,
  options: ResizeOptions = {},
): Promise<Blob> {
  const maxDimension = options.maxDimension ?? 1280;
  const quality = options.quality ?? 0.85;
  const mimeType = options.mimeType ?? "image/jpeg";

  // Skip resize for already-small files.
  if (file.size < 256 * 1024) return file;

  const bitmap = await createImageBitmapSafe(file);
  const { width: srcW, height: srcH } = bitmap;
  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(dstW, dstH)
      : Object.assign(document.createElement("canvas"), { width: dstW, height: dstH });

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, dstW, dstH);

  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: mimeType, quality });
  }
  return await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      mimeType,
      quality,
    );
  });
}

async function createImageBitmapSafe(file: File): Promise<ImageBitmap> {
  // createImageBitmap directly from a File works in modern browsers; on
  // older Safari it requires going through an <img> element.
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => {
        img.onload = () => res(null);
        img.onerror = rej;
      });
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
