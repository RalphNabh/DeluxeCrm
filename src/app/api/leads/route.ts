import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try to fetch with folder join first
  let { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      client_folders (
        id,
        name,
        color,
        description
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // If the join fails (likely folder_id column doesn't exist), fall back to simple query
  if (error) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('column') || errorMsg.includes('does not exist') || errorMsg.includes('relation') || errorMsg.includes('foreign key')) {
      console.log('Folder join failed, falling back to simple query:', errorMsg);
      const simpleQuery = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (simpleQuery.error) {
        console.error('Simple query also failed:', simpleQuery.error);
        return NextResponse.json({ error: simpleQuery.error.message }, { status: 400 })
      }
      
      // Add null folder info to match expected structure
      data = simpleQuery.data?.map((lead: any) => ({
        ...lead,
        client_folders: null
      })) || []
    } else {
      console.error('Unexpected error fetching leads:', error);
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, address, phone, email, value, status, tags } = body
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('leads')
    .insert([{ 
      user_id: user.id, 
      name, 
      address, 
      phone, 
      email, 
      value, 
      status,
      tags: tags && Array.isArray(tags) ? tags : null
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}



