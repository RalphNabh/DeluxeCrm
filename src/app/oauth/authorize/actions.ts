"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/org";
import { createAuthorizationCode, getZapierRedirectUri } from "@/lib/oauth/zapier";

export async function approveAuthorization(formData: FormData) {
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");

  let expectedRedirectUri: string;
  try {
    expectedRedirectUri = getZapierRedirectUri();
  } catch {
    redirect("/dashboard");
  }
  if (redirectUri !== expectedRedirectUri) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership(supabase, user.id);
  if (!membership) redirect("/dashboard");

  const code = await createAuthorizationCode({
    organizationId: membership.org_id,
    userId: user.id,
    redirectUri,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  redirect(url.toString());
}

export async function denyAuthorization(formData: FormData) {
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");

  let expectedRedirectUri: string;
  try {
    expectedRedirectUri = getZapierRedirectUri();
  } catch {
    redirect("/dashboard");
  }
  if (redirectUri !== expectedRedirectUri) {
    redirect("/dashboard");
  }

  const url = new URL(redirectUri);
  url.searchParams.set("error", "access_denied");
  if (state) url.searchParams.set("state", state);
  redirect(url.toString());
}
