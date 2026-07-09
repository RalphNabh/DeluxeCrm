import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMember } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { data: folders, error } = await supabase
      .from('client_folders')
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching folders:', error)
      return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
    }

    return NextResponse.json(folders || [])
  } catch (error) {
    console.error('Error in GET /api/client-folders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const body = await request.json()
    const { name, color, description } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    const { data: folder, error } = await supabase
      .from('client_folders')
      .insert({
        user_id: user.id, organization_id: orgId,
        name: name.trim(),
        color: color || '#3b82f6',
        description: description || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating folder:', error)
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
    }

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/client-folders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


