import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'
import { requireOrgMember } from '@/lib/api-auth'
import { parseJsonBody } from '@/lib/validation'
import { leadUpdateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'
import { leadAutomationEventForStatus } from '@/lib/route-access'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const supabase = await createClient()
  const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

  const { id } = await params
  const parsed = await parseJsonBody(request, leadUpdateSchema)
  if (!parsed.ok) return parsed.response

  const updates: Record<string, unknown> = { ...parsed.data }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }
  
  // Get the old lead data to check if status changed
  const { data: oldLead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  // Try to fetch with folder join first
  let { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
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
        .eq('organization_id', orgId)
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
    const triggerEvent = leadAutomationEventForStatus(newStatus, oldLead.status)
    if (triggerEvent) {
      // Trigger automations for this stage change
      await checkAndExecuteAutomations(triggerEvent, {
        event: triggerEvent,
        user_id: user.id, organization_id: orgId,
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
  } catch (error) {
    captureApiError(error, { route: 'leads/[id]/PUT' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

  const { id } = await params
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
  } catch (error) {
    captureApiError(error, { route: 'leads/[id]/DELETE' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



