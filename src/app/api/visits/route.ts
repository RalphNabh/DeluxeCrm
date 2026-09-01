import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { captureApiError } from '@/lib/api-error'
import { generateVisitsForOrganization } from '@/lib/visits/generate'

/**
 * GET /api/visits?from=&to=
 * Calendar feed of visits with nested job title / client.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { orgId } = auth.ctx

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const from = fromParam ? new Date(fromParam) : new Date()
    const to = toParam
      ? new Date(toParam)
      : new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000)

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json(
        { error: 'Invalid from/to date' },
        { status: 400 }
      )
    }

    // Service role: workers cannot INSERT visits under RLS.
    try {
      const admin = createServiceRoleClient()
      await generateVisitsForOrganization(admin, orgId, { from })
    } catch (genError) {
      console.warn('Visit generation skipped:', genError)
    }

    const { data: visits, error } = await supabase
      .from('visits')
      .select(`
        id,
        organization_id,
        job_id,
        scheduled_start,
        scheduled_end,
        status,
        completed_at,
        notes,
        created_at,
        updated_at,
        jobs (
          id,
          title,
          status,
          location,
          description,
          estimated_duration,
          team_members,
          equipment,
          tags,
          client_id,
          recurrence_freq,
          is_anytime,
          job_assignments (
            user_id,
            assigned_at
          ),
          clients (
            id,
            name,
            email,
            phone,
            address
          )
        )
      `)
      .eq('organization_id', orgId)
      .gte('scheduled_start', from.toISOString())
      .lte('scheduled_start', to.toISOString())
      .order('scheduled_start', { ascending: true })

    if (error) {
      console.error('Error fetching visits:', error)
      return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 })
    }

    const transformed = (visits ?? []).map((visit) => {
      const job = visit.jobs as {
        title?: string
        location?: string
        tags?: string[]
        clients?: { name?: string }
        recurrence_freq?: string | null
      } | null
      return {
        ...visit,
        title: job?.title ?? 'Visit',
        client_name: job?.clients?.name ?? 'Unknown Client',
        location: job?.location ?? null,
        tags: job?.tags ?? [],
        recurrence_freq: job?.recurrence_freq ?? null,
      }
    })

    return NextResponse.json(transformed)
  } catch (error) {
    captureApiError(error, { route: 'visits/GET' })
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 })
  }
}
