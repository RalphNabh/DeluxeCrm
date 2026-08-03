import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api-auth';
import { captureApiError } from '@/lib/api-error';
import { parseJsonBody } from '@/lib/validation';
import { teamMemberUpdateSchema } from '@/lib/api-schemas';
import { roleValue } from '@/lib/team';
import { syncSeatQuantity } from '@/lib/stripe-seats';

/**
 * Change a member's role or disable them, or re-role a pending invitation.
 *
 * `id` is an organization_members id, or an organization_invitations id when the
 * person has not accepted yet — the Team page lists both and tags each with
 * `kind`, which the caller passes back.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    // Changing who can do what is an invite_team capability: owners and admins.
    const auth = await requirePermission(supabase, 'invite_team')
    if (!auth.ok) return auth.response
    const { orgId } = auth.ctx
    const { id } = await params;

    const parsed = await parseJsonBody(request, teamMemberUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const { kind, role, status } = parsed.data;

    if (kind === 'invitation') {
      const updates: Record<string, string> = {};
      if (role) updates.role = roleValue(role);
      if (!Object.keys(updates).length) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('organization_invitations')
        .update(updates)
        .eq('id', id)
        .eq('org_id', orgId)
        .is('accepted_at', null)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data);
    }

    const { data: membership, error: lookupError } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (lookupError || !membership) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // An organization without an owner has nobody who can manage billing, so the
    // owner's role is not editable here. Transferring ownership is separate.
    if (membership.role === 'owner') {
      return NextResponse.json(
        { error: 'The owner\'s role cannot be changed here.' },
        { status: 400 },
      );
    }

    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (role) {
      const nextRole = roleValue(role);
      if (nextRole === 'owner') {
        return NextResponse.json(
          { error: 'Ownership cannot be assigned from the team list.' },
          { status: 400 },
        );
      }
      updates.role = nextRole;
    }
    if (status) {
      updates.status = status === 'Active' ? 'active' : 'disabled';
    }

    const { data, error } = await supabase
      .from('organization_members')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Disabling a member frees a billable seat.
    if (status) {
      await syncSeatQuantity(supabase, orgId);
    }

    return NextResponse.json(data);
  } catch (error) {
    captureApiError(error, { route: 'team/[id]/PUT' });
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

/** Remove a member from the organization, or withdraw a pending invitation. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await requirePermission(supabase, 'invite_team')
    if (!auth.ok) return auth.response
    const { orgId, user } = auth.ctx
    const { id } = await params;

    const kind = request.nextUrl.searchParams.get('kind');

    if (kind === 'invitation') {
      // Revoked rather than deleted, so the audit trail survives.
      const { error } = await supabase
        .from('organization_invitations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .is('accepted_at', null);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('id, role, user_id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }
    if (membership.role === 'owner') {
      return NextResponse.json(
        { error: 'The owner cannot be removed from the organization.' },
        { status: 400 },
      );
    }
    if (membership.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the organization.' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await syncSeatQuantity(supabase, orgId);

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error, { route: 'team/[id]/DELETE' });
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
