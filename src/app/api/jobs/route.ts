import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jobCreateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'
import { parseJsonBody } from '@/lib/validation'
import {
  generateVisitsForJob,
  weekdayCodeFromDate,
  type JobRecurrence,
} from '@/lib/visits/generate'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    // Fetch jobs with client information
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        *,
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
      `)
      .eq('organization_id', orgId)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Try to fetch estimates if estimate_id column exists (gracefully handle if column doesn't exist)
    const jobsWithEstimates = await Promise.all((jobs || []).map(async (job: Record<string, unknown>) => {
      if (job.estimate_id) {
        try {
          const { data: estimate } = await supabase
            .from('estimates')
            .select('id, status, total, created_at')
            .eq('id', job.estimate_id)
            .single()
          return { ...job, estimates: estimate }
        } catch (e) {
          // Column doesn't exist or estimate not found, return job without estimate
          return job
        }
      }
      return job
    }))
    
    // Transform the data to include client_name
    const transformedJobs = jobsWithEstimates.map((job: Record<string, unknown>) => ({
      ...job,
      client_name: (job.clients as { name?: string })?.name || 'Unknown Client'
    }))

    return NextResponse.json(transformedJobs)

  } catch (error) {
    captureApiError(error, { route: 'jobs/GET' })
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const parsed = await parseJsonBody(request, jobCreateSchema)
    if (!parsed.ok) return parsed.response

    const {
      title,
      client_id,
      estimate_id,
      start_time,
      end_time,
      status = 'Scheduled',
      location,
      description,
      estimated_duration,
      team_members,
      equipment,
      notes,
      tags,
      recurrence_freq,
      recurrence_interval,
      recurrence_byweekday,
      recurrence_until,
      recurrence_count,
      timezone,
    } = parsed.data

    const byweekday =
      recurrence_freq === 'weekly'
        ? (recurrence_byweekday && recurrence_byweekday.length > 0
            ? recurrence_byweekday
            : [weekdayCodeFromDate(new Date(start_time))])
        : recurrence_byweekday ?? null

    // Create the job
    // Build insert object - only include estimate_id if it exists (column may not exist yet)
    const jobData: Record<string, unknown> = {
      user_id: user.id, organization_id: orgId,
      title,
      client_id,
      start_time,
      end_time,
      status,
      location,
      description,
      estimated_duration,
      team_members,
      equipment,
      notes,
      tags: tags && Array.isArray(tags) ? tags : null,
      recurrence_freq: recurrence_freq ?? null,
      recurrence_interval: recurrence_interval ?? 1,
      recurrence_byweekday: byweekday,
      recurrence_until: recurrence_until ?? null,
      recurrence_count: recurrence_count ?? null,
      timezone: timezone ?? null,
    };
    
    // Try to insert with estimate_id first, fall back to without if column doesn't exist
    let insertData = jobData
    if (estimate_id) {
      insertData = { ...jobData, estimate_id }
    }
    
    let { data: job, error } = await supabase
      .from('jobs')
      .insert(insertData)
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .single()
    
    // If error and estimate_id was included, try again without it (column may not exist)
    if (error && estimate_id) {
      const { data: retryJob, error: retryError } = await supabase
        .from('jobs')
        .insert(jobData)
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .single()
      
      if (!retryError) {
        job = retryJob
        error = null
      }
    }
    
    if (error) {
      console.error('Error creating job:', error)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }
    
    // Try to fetch estimate if estimate_id was provided and column exists
    let jobWithEstimate = job
    if (job && estimate_id) {
      try {
        const { data: estimate } = await supabase
          .from('estimates')
          .select('id, status, total, created_at')
          .eq('id', estimate_id)
          .single()
        jobWithEstimate = { ...job, estimates: estimate }
      } catch (e) {
        // Column doesn't exist or estimate not found, continue without estimate
        console.log('Could not fetch estimate (column may not exist):', e)
      }
    }

    // If job was created from an estimate, update estimate status to "Scheduled"
    if (estimate_id && job) {
      await supabase
        .from('estimates')
        .update({ status: 'Scheduled', updated_at: new Date().toISOString() })
        .eq('id', estimate_id)
        .eq('organization_id', orgId)
    }

    // Materialize visits (one-off or rolling 90-day recurrence window)
    if (job) {
      try {
        await generateVisitsForJob(supabase, {
          id: job.id,
          organization_id: orgId,
          start_time: job.start_time,
          end_time: job.end_time,
          recurrence_freq: (job.recurrence_freq as JobRecurrence['recurrence_freq']) ?? null,
          recurrence_interval: job.recurrence_interval ?? 1,
          recurrence_byweekday: job.recurrence_byweekday ?? null,
          recurrence_until: job.recurrence_until ?? null,
          recurrence_count: job.recurrence_count ?? null,
          timezone: job.timezone ?? null,
        })
      } catch (genError) {
        console.error('Visit generation after job create failed:', genError)
      }
    }

    // Transform the data to include client_name
    const transformedJob = {
      ...jobWithEstimate,
      client_name: (jobWithEstimate?.clients as { name?: string })?.name || 'Unknown Client'
    }

    return NextResponse.json(transformedJob, { status: 201 })

  } catch (error) {
    captureApiError(error, { route: 'jobs/POST' })
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
