import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch jobs with client information
    const { data: jobs, error } = await supabase
      .from('jobs')
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
      .eq('user_id', user.id)
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
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
      tags
    } = await request.json()
    
    if (!title || !client_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create the job
    // Build insert object - only include estimate_id if it exists (column may not exist yet)
    const jobData: Record<string, unknown> = {
      user_id: user.id,
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
      tags: tags && Array.isArray(tags) ? tags : null
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
        .eq('user_id', user.id)
    }

    // Transform the data to include client_name
    const transformedJob = {
      ...jobWithEstimate,
      client_name: (jobWithEstimate?.clients as { name?: string })?.name || 'Unknown Client'
    }

    return NextResponse.json(transformedJob, { status: 201 })

  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
