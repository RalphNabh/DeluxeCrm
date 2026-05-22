import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api-auth'
import { parseJsonBody } from '@/lib/validation'
import { automationUpdateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const supabase = await createClient()
  const auth = await requireUser(supabase)
  if (!auth.ok) return auth.response

  const { id } = await params
  const parsed = await parseJsonBody(request, automationUpdateSchema)
  if (!parsed.ok) return parsed.response

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('automations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
  } catch (error) {
    captureApiError(error, { route: 'automations/[id]/PUT' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const supabase = await createClient()
  const auth = await requireUser(supabase)
  if (!auth.ok) return auth.response

  const { id } = await params
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
  } catch (error) {
    captureApiError(error, { route: 'automations/[id]/DELETE' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


