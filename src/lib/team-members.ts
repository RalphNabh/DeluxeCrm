import type { SupabaseClient } from "@supabase/supabase-js";
import {
  displayNameFor,
  membershipStatusLabel,
  roleLabel,
  type TeamMemberView,
} from "@/lib/team";

type MembershipRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  receives_lead_alerts: boolean;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  token: string;
  invited_name: string | null;
  invited_phone: string | null;
  expires_at: string;
  created_at: string;
  receives_lead_alerts: boolean;
};

/**
 * Memberships joined to their profiles.
 *
 * Two queries rather than a PostgREST embed: `organization_members.user_id` and
 * `user_profiles.user_id` both reference `auth.users`, with no foreign key
 * between the two tables, so PostgREST cannot relate them. Asking it to
 * (`user_profiles:user_id(...)`) fails at request time, which is why the member
 * list was never usable.
 */
export async function listOrgMembers(
  supabase: SupabaseClient,
  orgId: string,
): Promise<Array<MembershipRow & { profile: ProfileRow | null }>> {
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, status, joined_at, receives_lead_alerts")
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  if (!memberships?.length) return [];

  const userIds = memberships.map((m: MembershipRow) => m.user_id);
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, full_name, email, phone, avatar_url")
    .in("user_id", userIds);

  const byUserId = new Map<string, ProfileRow>(
    (profiles ?? []).map((profile: ProfileRow) => [profile.user_id, profile]),
  );

  return memberships.map((membership: MembershipRow) => ({
    ...membership,
    profile: byUserId.get(membership.user_id) ?? null,
  }));
}

/** Invitations that are still open: not accepted, not revoked. */
export async function listPendingInvitations(
  supabase: SupabaseClient,
  orgId: string,
): Promise<InvitationRow[]> {
  const { data } = await supabase
    .from("organization_invitations")
    .select(
      "id, email, role, token, invited_name, invited_phone, expires_at, created_at, receives_lead_alerts",
    )
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as InvitationRow[];
}

/**
 * Completed jobs and hours per member, derived from job assignments.
 *
 * The previous implementation returned whatever integers were stored on the
 * legacy team card, with a comment admitting they were not computed from
 * anything.
 */
export async function completedJobStats(
  supabase: SupabaseClient,
  orgId: string,
): Promise<Map<string, { jobs: number; hours: number }>> {
  const stats = new Map<string, { jobs: number; hours: number }>();

  const { data: completedJobs } = await supabase
    .from("jobs")
    .select("id, estimated_duration, actual_duration")
    .eq("organization_id", orgId)
    .eq("status", "Completed");

  if (!completedJobs?.length) return stats;

  const durations = new Map<string, number>(
    completedJobs.map((job: {
      id: string;
      estimated_duration: number | null;
      actual_duration: number | null;
    }) => {
      const hours = Number(job.actual_duration ?? job.estimated_duration ?? 0);
      return [job.id, Number.isFinite(hours) ? hours : 0];
    }),
  );

  const { data: assignments } = await supabase
    .from("job_assignments")
    .select("user_id, job_id")
    .in("job_id", [...durations.keys()]);

  for (const assignment of (assignments ?? []) as Array<{
    user_id: string;
    job_id: string;
  }>) {
    const current = stats.get(assignment.user_id) ?? { jobs: 0, hours: 0 };
    stats.set(assignment.user_id, {
      jobs: current.jobs + 1,
      hours: current.hours + (durations.get(assignment.job_id) ?? 0),
    });
  }

  return stats;
}

/** The team as one list: accepted members first, then open invitations. */
export async function buildTeamList(
  supabase: SupabaseClient,
  orgId: string,
): Promise<TeamMemberView[]> {
  const [memberships, invitations, stats] = await Promise.all([
    listOrgMembers(supabase, orgId),
    listPendingInvitations(supabase, orgId),
    completedJobStats(supabase, orgId),
  ]);

  const members: TeamMemberView[] = memberships.map((membership) => {
    const stat = stats.get(membership.user_id);
    return {
      id: membership.id,
      kind: "member",
      name: displayNameFor(membership.profile?.full_name, membership.profile?.email),
      email: membership.profile?.email ?? "",
      phone: membership.profile?.phone ?? null,
      role: roleLabel(membership.role),
      status: membershipStatusLabel(membership.status),
      joined_at: membership.joined_at,
      last_active: null,
      jobs_completed: stat?.jobs ?? 0,
      total_hours: stat?.hours ?? 0,
      avatar: membership.profile?.avatar_url ?? null,
      receives_lead_alerts: membership.receives_lead_alerts,
    };
  });

  const now = Date.now();
  const pending: TeamMemberView[] = invitations.map((invitation) => ({
    id: invitation.id,
    kind: "invitation",
    name: displayNameFor(invitation.invited_name, invitation.email),
    email: invitation.email,
    phone: invitation.invited_phone,
    role: roleLabel(invitation.role),
    status:
      new Date(invitation.expires_at).getTime() < now ? "Expired" : "Invited",
    joined_at: invitation.created_at,
    last_active: null,
    jobs_completed: 0,
    total_hours: 0,
    receives_lead_alerts: invitation.receives_lead_alerts,
  }));

  return [...members, ...pending];
}
