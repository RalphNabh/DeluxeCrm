import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { requireOrgMember } from '@/lib/api-auth';
import { captureApiError } from '@/lib/api-error';
import { buildTeamList } from '@/lib/team-members';

/**
 * The team, as one list of accepted members plus outstanding invitations.
 *
 * This used to read `team_members`, a separate table of standalone contact cards
 * with no link to an auth user, while invitations wrote to
 * `organization_members`. Inviting someone therefore never made them appear
 * here. `team_members` is gone; this is the only team list.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response

    return NextResponse.json(await buildTeamList(supabase, auth.ctx.orgId));
  } catch (error) {
    captureApiError(error, { route: 'team/GET' });
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
