import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT: Update a pipeline stage
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, position, color } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (position !== undefined) updates.position = position
    if (color !== undefined) updates.color = color

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating pipeline stage:', error)
      return NextResponse.json({ error: 'Failed to update pipeline stage' }, { status: 500 })
    }

    if (!stage) {
      return NextResponse.json({ error: 'Pipeline stage not found' }, { status: 404 })
    }

    return NextResponse.json(stage)
  } catch (error) {
    console.error('Error in PUT /api/pipeline-stages/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a pipeline stage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Check if any leads are using this stage
    const { data: leadsUsingStage } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', (await supabase.from('pipeline_stages').select('name').eq('id', id).single()).data?.name)
      .limit(1)

    if (leadsUsingStage && leadsUsingStage.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete stage. There are leads using this stage. Please move them first.' 
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting pipeline stage:', error)
      return NextResponse.json({ error: 'Failed to delete pipeline stage' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/pipeline-stages/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


