import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { userNeedsSignupOnboarding } from "@/lib/signup-provision";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { needsOnboarding: true, email: user.email ?? undefined },
      { status: 200 },
    );
  }

  const admin = createServiceRoleClient();
  const needsOnboarding = await userNeedsSignupOnboarding(admin, user.id);

  if (!needsOnboarding) {
    return NextResponse.json({
      needsOnboarding: false,
      redirectTo: "/home",
      email: user.email ?? undefined,
    });
  }

  return NextResponse.json({
    needsOnboarding: true,
    email: user.email ?? undefined,
  });
}
