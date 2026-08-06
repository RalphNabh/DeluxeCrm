import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api-auth';
import { captureApiError } from '@/lib/api-error';
import { buildTeamList } from '@/lib/team-members';

/**
 * The team, as one list of accepted members plus outstanding invitations.
 * Restricted to invite_team so invite tokens / pending invites are not
 * visible to every worker.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, 'invite_team')
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
