import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    // Try to fetch with folder information, gracefully handle if folder_id column doesn't exist
    let baseQuery = supabase
      .from('clients')
      .select(`
        *,
        client_folders (
          id,
          name,
          color
        )
      `)
      .eq('user_id', user.id)
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
    const { name, email, phone, address, notes, tags, folder_id } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Build insert object - include tags and folder_id if provided
    const clientData: Record<string, unknown> = {
      user_id: user.id,
      name,
      email,
      phone,
      address,
      notes,
    }
    
    // Add tags if provided (convert to array if it's a string)
    if (tags !== undefined) {
      clientData.tags = Array.isArray(tags) ? tags : (tags ? [tags] : [])
    }
    
    // Add folder_id if provided (defensively handle if column doesn't exist)
    if (folder_id) {
      clientData.folder_id = folder_id
    }

    let { data: client, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select(`
        *,
        client_folders (
          id,
          name,
          color
        )
      `)
      .single()
    
    // If error and folder_id was included, try without it (column may not exist)
    if (error && folder_id) {
      delete clientData.folder_id
      const { data: retryClient, error: retryError } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single()
      
      if (!retryError) {
        client = retryClient
        error = null
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create a corresponding lead in "New Leads" stage automatically
    // Ignore error here to avoid failing client creation if lead insert fails
    await supabase
      .from('leads')
      .insert([{ user_id: user.id, name: name, address, phone, email, value: 0, status: 'New Leads' }])

    // Trigger automations for client_created event
    await checkAndExecuteAutomations('client_created', {
      event: 'client_created',
      user_id: user.id,
      client_id: client.id,
      client_name: name,
      client_email: email || undefined,
      user_email: user.email || undefined
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
