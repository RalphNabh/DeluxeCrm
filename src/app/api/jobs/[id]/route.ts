import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'
import { parseJsonBody } from '@/lib/validation'
import { jobUpdateSchema } from '@/lib/api-schemas'
import { generateVisitsForJob, type JobRecurrence } from '@/lib/visits/generate'
import { captureApiError } from '@/lib/api-error'

const RECURRENCE_KEYS = [
  'start_time',
  'end_time',
  'recurrence_freq',
  'recurrence_interval',
  'recurrence_byweekday',
  'recurrence_until',
  'recurrence_count',
  'timezone',
] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { orgId } = auth.ctx

    const { id } = await params

    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          address
        ),
        job_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          total
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    let jobWithEstimate = job
    if (job && (job as Record<string, unknown>).estimate_id) {
      try {
        const { data: estimate } = await supabase
          .from('estimates')
          .select('id, status, total, created_at')
          .eq('id', (job as Record<string, unknown>).estimate_id)
          .single()
        jobWithEstimate = { ...job, estimates: estimate }
      } catch {
        // continue without estimate
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const transformedJob = {
      ...jobWithEstimate,
      client_name: ((jobWithEstimate?.clients as { name?: string })?.name) || 'Unknown Client',
      client_email: ((jobWithEstimate?.clients as { email?: string })?.email) || '',
      client_phone: ((jobWithEstimate?.clients as { phone?: string })?.phone) || '',
    }

    return NextResponse.json(transformedJob)
  } catch (error) {
    captureApiError(error, { route: 'jobs/[id]/GET' })
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { id } = await params
    const parsed = await parseJsonBody(request, jobUpdateSchema)
    if (!parsed.ok) return parsed.response

    const body = parsed.data
    const { status, ...updates } = body

    const { data: currentJob } = await supabase
      .from('jobs')
      .select('*, clients(id, name, email)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!currentJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const scheduleTouched = RECURRENCE_KEYS.some(
      (key) => (updates as Record<string, unknown>)[key] !== undefined,
    )

    const { data: job, error } = await supabase
      .from('jobs')
      .update({
        ...updates,
        ...(status !== undefined ? { status } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('*, clients(id, name, email)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (scheduleTouched) {
      const admin = createServiceRoleClient()
      const nowIso = new Date().toISOString()
      // Delete future scheduled visits, then regenerate from the new rule.
      await admin
        .from('visits')
        .delete()
        .eq('job_id', id)
        .eq('organization_id', orgId)
        .eq('status', 'scheduled')
        .gte('scheduled_start', nowIso)

      await generateVisitsForJob(admin, job as JobRecurrence)
    }

    if (status === 'Completed' && currentJob.status !== 'Completed') {
      const client = job.clients as { name?: string; email?: string } | null

      await checkAndExecuteAutomations('job_completed', {
        event: 'job_completed',
        user_id: user.id,
        organization_id: orgId,
        job_id: id,
        client_name: client?.name || 'Client',
        client_email: client?.email || undefined,
        user_email: user.email || undefined,
      })
    }

    return NextResponse.json(job)
  } catch (error) {
    captureApiError(error, { route: 'jobs/[id]/PUT' })
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { orgId } = auth.ctx

    const { id } = await params

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    captureApiError(error, { route: 'jobs/[id]/DELETE' })
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}
