import type { SupabaseClient } from "@supabase/supabase-js";

export type PortalInvitationRow = {
  id: string;
  email: string;
  client_id: string;
  organization_id: string;
  expires_at?: string | null;
  accepted_at?: string | null;
};

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Page auth.admin.listUsers until we find a matching email.
 * Supabase JS 2.75 has no getUserByEmail.
 */
export async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string,
  options?: { maxPages?: number; perPage?: number },
): Promise<string | null> {
  const target = normalizeInviteEmail(email);
  const perPage = options?.perPage ?? 200;
  const maxPages = options?.maxPages ?? 10;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find(
      (u) => u.email && normalizeInviteEmail(u.email) === target,
    );
    if (match?.id) return match.id;

    if (data.users.length < perPage) break;
  }

  return null;
}

/** Link auth user to Client Hub for this invitation and mark invite accepted. */
export async function attachPortalInvite(
  admin: SupabaseClient,
  invitation: PortalInvitationRow,
  userId: string,
): Promise<{ portalUserId: string }> {
  const now = new Date().toISOString();

  const { data: portalUser, error: portalError } = await admin
    .from("client_portal_users")
    .upsert(
      {
        auth_user_id: userId,
        client_id: invitation.client_id,
        organization_id: invitation.organization_id,
        status: "active",
        accepted_at: now,
      },
      { onConflict: "auth_user_id,organization_id" },
    )
    .select("id")
    .single();

  if (portalError) {
    throw new Error(portalError.message);
  }

  await admin
    .from("client_portal_invitations")
    .update({ accepted_at: now })
    .eq("id", invitation.id);

  await admin
    .from("user_profiles")
    .update({
      persona: "client",
      active_org_id: invitation.organization_id,
    })
    .eq("user_id", userId);

  return { portalUserId: portalUser.id as string };
}

export async function hasActivePortalMembership(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("client_portal_users")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data?.id);
}
