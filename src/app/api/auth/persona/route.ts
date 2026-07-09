import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/api-auth";
import { resolvePersona } from "@/lib/persona";
import { captureApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (!auth.ok) return auth.response;

    const persona = await resolvePersona(supabase, auth.user.id);

    return NextResponse.json({
      ...persona,
      userId: auth.user.id,
      email: auth.user.email,
    });
  } catch (error) {
    captureApiError(error, { route: "auth/persona" });
    return NextResponse.json(
      { error: "Failed to resolve persona" },
      { status: 500 },
    );
  }
}
