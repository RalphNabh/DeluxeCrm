import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const updates = await request.json()
  
  // Get the old lead data to check if status changed
  const { data: oldLead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Trigger automations if status changed
  if (updates.status && oldLead && oldLead.status !== updates.status) {
    // Map pipeline stages to trigger events
    const stageToEvent: Record<string, string> = {
      'New Leads': 'lead_created',
      'Estimate Sent': 'lead_estimate_sent',
      'Approved': 'lead_approved',
      'Job Scheduled': 'lead_job_scheduled',
      'Completed': 'lead_completed'
    }

    const triggerEvent = stageToEvent[updates.status]
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
        new_status: updates.status,
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



