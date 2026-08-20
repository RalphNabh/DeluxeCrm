import type { SupabaseClient } from "@supabase/supabase-js";
import { createOrganizationForUser } from "@/lib/org";
import type { OnboardingSettings } from "@/lib/signup-onboarding";

export type SignupProfileInput = {
  first_name: string;
  last_name: string;
  phone?: string;
  company_name?: string;
  business_type?: string;
};

export type SignupProvisionInput = SignupProfileInput & {
  userId: string;
  email?: string;
  onboarding?: OnboardingSettings;
  referral_code?: string;
};

export function buildOnboardingSettings(
  onboarding: OnboardingSettings | undefined,
): Record<string, unknown> | null {
  if (!onboarding) return null;
  return {
    onboarding: {
      ...onboarding,
      completed_at: onboarding.completed_at ?? new Date().toISOString(),
    },
  };
}

export async function upsertSignupProfile(
  admin: SupabaseClient,
  input: SignupProfileInput & { userId: string },
): Promise<void> {
  const fullName = `${input.first_name} ${input.last_name}`.trim();
  await admin.from("user_profiles").upsert(
    {
      id: input.userId,
      user_id: input.userId,
      first_name: input.first_name,
      last_name: input.last_name,
      full_name: fullName,
      phone: input.phone || null,
      company_name: input.company_name || null,
      business_type: input.business_type || null,
      persona: "contractor",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

export async function applyOrgOnboardingSettings(
  admin: SupabaseClient,
  orgId: string,
  onboarding: OnboardingSettings | undefined,
): Promise<void> {
  const patch = buildOnboardingSettings(onboarding);
  if (!patch) return;

  const { data: org } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();

  const existing =
    org?.settings && typeof org.settings === "object" && !Array.isArray(org.settings)
      ? (org.settings as Record<string, unknown>)
      : {};

  await admin
    .from("organizations")
    .update({
      settings: { ...existing, ...patch },
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);
}

export async function recordAffiliateReferral(
  admin: SupabaseClient,
  referredUserId: string,
  referralCode: string | undefined,
): Promise<void> {
  const code = referralCode?.trim().toUpperCase();
  if (!code) return;

  const { data: referrerAffiliate } = await admin
    .from("affiliates")
    .select("user_id, total_referrals")
    .eq("referral_code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!referrerAffiliate || referrerAffiliate.user_id === referredUserId) return;

  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();

  if (existing) return;

  const { error } = await admin.from("referrals").insert({
    referrer_id: referrerAffiliate.user_id,
    referred_user_id: referredUserId,
    referral_code: code,
    status: "Pending",
  });

  if (error) return;

  await admin
    .from("affiliates")
    .update({
      total_referrals: (Number(referrerAffiliate.total_referrals) || 0) + 1,
    })
    .eq("user_id", referrerAffiliate.user_id);
}

/** Create profile, org, onboarding settings, and optional affiliate referral. */
export async function provisionSignupAccount(
  admin: SupabaseClient,
  input: SignupProvisionInput,
): Promise<{ orgId: string | null }> {
  const { data: existingProfile } = await admin
    .from("user_profiles")
    .select("active_org_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  await upsertSignupProfile(admin, input);

  const existingOrgId = existingProfile?.active_org_id ?? null;
  if (existingOrgId) {
    if (input.onboarding) {
      await applyOrgOnboardingSettings(admin, existingOrgId, input.onboarding);
    }
    await recordAffiliateReferral(admin, input.userId, input.referral_code);
    return { orgId: existingOrgId };
  }

  const companyName =
    input.company_name?.trim() || `${input.first_name}'s Company`;

  const orgId = await createOrganizationForUser(
    admin,
    input.userId,
    companyName,
  );

  if (orgId && input.onboarding) {
    await applyOrgOnboardingSettings(admin, orgId, input.onboarding);
  }

  await recordAffiliateReferral(admin, input.userId, input.referral_code);

  return { orgId };
}

export async function userNeedsSignupOnboarding(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("active_org_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !profile?.active_org_id;
}
