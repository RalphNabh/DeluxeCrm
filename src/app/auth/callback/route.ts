import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { userNeedsSignupOnboarding } from "@/lib/signup-provision";
import { NextResponse } from "next/server";

function onboardingResumePath(ref: string | null): string {
  const base = "/signup?oauth=continue";
  const code = ref?.trim().toUpperCase();
  return code ? `${base}&ref=${encodeURIComponent(code)}` : base;
}

function isHomeIntent(next: string | null): boolean {
  if (!next) return true;
  return next === "/home" || next.startsWith("/home?");
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const refParam = requestUrl.searchParams.get("ref");
  // Only allow relative in-app redirects
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let destination =
          next ||
          (user.email_confirmed_at ? "/account-verified" : "/verify-email");

        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const admin = createServiceRoleClient();
            const needsOnboarding = await userNeedsSignupOnboarding(
              admin,
              user.id,
            );
            if (needsOnboarding && isHomeIntent(next)) {
              destination = onboardingResumePath(refParam);
            }
          } catch {
            /* fall through to default destination */
          }
        }

        if (user.email_confirmed_at || destination.includes("/signup")) {
          return NextResponse.redirect(new URL(destination, requestUrl.origin));
        }
      }
    }
  }

  return NextResponse.redirect(
    new URL(next || "/verify-email", requestUrl.origin),
  );
}
