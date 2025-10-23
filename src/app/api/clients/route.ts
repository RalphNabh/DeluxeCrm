import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    const baseQuery = supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    let clientsRes
    if (q && q.length > 0) {
      clientsRes = await baseQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    } else {
      clientsRes = await baseQuery
    }

    const { data: clients, error } = clientsRes

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(clients)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, address, notes } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert([
        {
          user_id: user.id,
          name,
          email,
          phone,
          address,
          notes,
        }
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create a corresponding lead in "New Leads" stage automatically
    // Ignore error here to avoid failing client creation if lead insert fails
    await supabase
      .from('leads')
      .insert([{ user_id: user.id, name: name, address, phone, email, value: 0, status: 'New Leads' }])

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
