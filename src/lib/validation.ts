import { NextResponse } from "next/server";
import { z, ZodError, ZodSchema } from "zod";

/**
 * Parse a JSON body against a zod schema.
 * Returns either { ok: true, data } or { ok: false, response } where
 * response is a NextResponse(400) with structured field errors.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodError(result.error),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}

/**
 * Parse query params against a zod schema.
 */
export function parseSearchParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
):
  | { ok: true; data: T }
  | { ok: false; response: NextResponse } {
  const obj: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodError(result.error),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}

function formatZodError(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".") || "_";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}

/** Whitelist fields from a parsed body for safe Supabase updates. */
export function pickAllowed<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  keys: readonly (keyof T & string)[],
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in body && body[key] !== undefined) {
      out[key] = body[key];
    }
  }
  return out as Partial<T>;
}

export { z };
