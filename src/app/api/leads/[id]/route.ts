import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const allowed = [
    'name', 'email', 'phone', 'address', 'status', 'notes', 'folder_id', 'value', 'source',
  ] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }
  
  // Get the old lead data to check if status changed
  const { data: oldLead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // Try to fetch with folder join first
  let { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      client_folders (
        id,
        name,
        color,
        description
      )
    `)
    .single()

  // If the join fails (likely folder_id column doesn't exist), fall back to simple query
  if (error) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('column') || errorMsg.includes('does not exist') || errorMsg.includes('relation') || errorMsg.includes('foreign key')) {
      console.log('Folder join failed in update, falling back to simple query:', errorMsg);
      const simpleQuery = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single()
      
      if (simpleQuery.error) {
        console.error('Simple update query also failed:', simpleQuery.error);
        return NextResponse.json({ error: simpleQuery.error.message }, { status: 400 })
      }
      
      // Add null folder info to match expected structure
      data = simpleQuery.data ? {
        ...simpleQuery.data,
        client_folders: null
      } : null;
      error = null; // Clear error since fallback succeeded
    } else {
      console.error('Unexpected error updating lead:', error);
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }
  }

  if (error) {
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Lead not found or update failed' }, { status: 404 })
  }

  // Trigger automations if status changed
  const newStatus =
    typeof updates.status === 'string' ? updates.status : undefined
  if (newStatus && oldLead && oldLead.status !== newStatus) {
    const stageToEvent: Record<string, string> = {
      'New Leads': 'lead_created',
      'Estimate Sent': 'lead_estimate_sent',
      'Approved': 'lead_approved',
      'Job Scheduled': 'lead_job_scheduled',
      'Completed': 'lead_completed'
    }

    const triggerEvent = stageToEvent[newStatus]
    if (triggerEvent) {
      // Trigger automations for this stage change
      await checkAndExecuteAutomations(triggerEvent, {
        event: triggerEvent,
        user_id: user.id,
        lead_id: id,
        lead_name: data.name,
        lead_email: data.email,
        lead_phone: data.phone,
        lead_address: data.address,
        old_status: oldLead.status,
        new_status: newStatus,
        client_name: data.name,
        client_email: data.email
      })
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}



