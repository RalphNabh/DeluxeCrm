import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureApiError } from '@/lib/api-error'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/validation'

const visitPatchSchema = z.object({
  status: z.enum(['scheduled', 'completed', 'skipped', 'cancelled']).optional(),
  scheduled_start: z.string().trim().min(1).max(100).optional(),
  scheduled_end: z.string().trim().min(1).max(100).optional(),
  notes: z.string().max(5000).optional().nullable(),
})

/**
 * PATCH /api/visits/[id] — complete / skip / reschedule a visit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { id } = await params
    const parsed = await parseJsonBody(request, visitPatchSchema)
    if (!parsed.ok) return parsed.response

    const { status, scheduled_start, scheduled_end, notes } = parsed.data

    const { data: current, error: loadError } = await supabase
      .from('visits')
      .select(`
        *,
        jobs (
          id,
          title,
          status,
          recurrence_freq,
          recurrence_until,
          clients (id, name, email)
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (loadError || !current) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      updates.status = status
      updates.completed_at =
        status === 'completed' ? new Date().toISOString() : null
    }
    if (scheduled_start) updates.scheduled_start = scheduled_start
    if (scheduled_end) updates.scheduled_end = scheduled_end
    if (notes !== undefined) updates.notes = notes

    // Reschedule without an explicit status keeps it scheduled
    if ((scheduled_start || scheduled_end) && !status) {
      updates.status = 'scheduled'
      updates.completed_at = null
    }

    const { data: visit, error } = await supabase
      .from('visits')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select(`
        *,
        jobs (
          id,
          title,
          status,
          recurrence_freq,
          recurrence_until,
          clients (id, name, email)
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Automations: fire visit_completed when a visit is completed.
    // job_completed stays on job status Completed only (see /api/jobs/[id]).
    if (status === 'completed' && current.status !== 'completed') {
      const job = visit.jobs as {
        title?: string
        recurrence_freq?: string | null
        clients?: { name?: string; email?: string } | null
      } | null

      await checkAndExecuteAutomations('visit_completed', {
        event: 'visit_completed',
        user_id: user.id,
        organization_id: orgId,
        visit_id: id,
        job_id: visit.job_id,
        job_title: job?.title || 'Job',
        client_name: job?.clients?.name || 'Client',
        client_email: job?.clients?.email || undefined,
        user_email: user.email || undefined,
      })
    }

    return NextResponse.json(visit)
  } catch (error) {
    captureApiError(error, { route: 'visits/[id]/PATCH' })
    return NextResponse.json({ error: 'Failed to update visit' }, { status: 500 })
  }
}
