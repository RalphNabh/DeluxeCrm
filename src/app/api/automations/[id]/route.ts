import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJsonBody } from '@/lib/validation'
import { automationUpdateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { orgId } = auth.ctx

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
      .eq('organization_id', orgId)
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
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { orgId } = auth.ctx

    const { id } = await params
    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error) {
    captureApiError(error, { route: 'automations/[id]/DELETE' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
