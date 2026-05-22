import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api-auth'
import { pipelineStageSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'
import { parseJsonBody } from '@/lib/validation'

// GET: Fetch all pipeline stages for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch user's pipeline stages
    const { data: stages, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching pipeline stages:', error)
      return NextResponse.json({ error: 'Failed to fetch pipeline stages' }, { status: 500 })
    }

    // If no stages exist, create default ones
    if (!stages || stages.length === 0) {
      const defaultStages = [
        { name: 'New Leads', position: 0, color: '#3b82f6' },
        { name: 'Estimate Sent', position: 1, color: '#8b5cf6' },
        { name: 'Approved', position: 2, color: '#10b981' },
        { name: 'Job Scheduled', position: 3, color: '#f59e0b' },
        { name: 'Completed', position: 4, color: '#6b7280' },
      ]

      const { data: newStages, error: insertError } = await supabase
        .from('pipeline_stages')
        .insert(
          defaultStages.map(stage => ({
            user_id: user.id,
            ...stage
          }))
        )
        .select()

      if (insertError) {
        console.error('Error creating default stages:', insertError)
        return NextResponse.json({ error: 'Failed to create default stages' }, { status: 500 })
      }

      return NextResponse.json(newStages || [])
    }

    return NextResponse.json(stages)
  } catch (error) {
    captureApiError(error, { route: 'pipeline-stages/GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new pipeline stage
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireUser(supabase)
    if (!auth.ok) return auth.response
    const user = auth.user

    const parsed = await parseJsonBody(request, pipelineStageSchema)
    if (!parsed.ok) return parsed.response

    const { name, position, color } = parsed.data

    // Get max position to add at the end if not specified
    let finalPosition = position
    if (finalPosition === undefined || finalPosition === null) {
      const { data: maxStage } = await supabase
        .from('pipeline_stages')
        .select('position')
        .eq('user_id', user.id)
        .order('position', { ascending: false })
        .limit(1)
        .single()

      finalPosition = maxStage ? maxStage.position + 1 : 0
    }

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .insert({
        user_id: user.id,
        name: name.trim(),
        position: finalPosition,
        color: color || '#3b82f6'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating pipeline stage:', error)
      return NextResponse.json({ error: 'Failed to create pipeline stage' }, { status: 500 })
    }

    return NextResponse.json(stage, { status: 201 })
  } catch (error) {
    captureApiError(error, { route: 'pipeline-stages/POST' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


