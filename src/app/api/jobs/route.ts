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

    // Transform the data to include client_name
    const transformedJobs = jobs.map(job => ({
      ...job,
      client_name: job.clients?.name || 'Unknown Client'
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
      start_time,
      end_time,
      status = 'Scheduled',
      location,
      description,
      estimated_duration,
      team_members,
      equipment,
      notes
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
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
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
        notes
      })
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

    if (error) {
      console.error('Error creating job:', error)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // Transform the data to include client_name
    const transformedJob = {
      ...job,
      client_name: job.clients?.name || 'Unknown Client'
    }

    return NextResponse.json(transformedJob, { status: 201 })

  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
