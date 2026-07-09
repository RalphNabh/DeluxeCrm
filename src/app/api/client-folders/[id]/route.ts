import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMember } from '@/lib/api-auth'

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
    const body = await request.json()
    const { name, color, description } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (color !== undefined) updates.color = color
    if (description !== undefined) updates.description = description

    const { data: folder, error } = await supabase
      .from('client_folders')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating folder:', error)
      return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
    }

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Error in PUT /api/client-folders/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { id } = await params

    // First, remove folder_id from all clients in this folder
    await supabase
      .from('clients')
      .update({ folder_id: null })
      .eq('folder_id', id)
      .eq('organization_id', orgId)

    // Then delete the folder
    const { error } = await supabase
      .from('client_folders')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) {
      console.error('Error deleting folder:', error)
      return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/client-folders/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


