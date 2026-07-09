import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'
import { escapePostgrestValue } from '@/lib/postgrest-escape'
import { parseJsonBody } from '@/lib/validation'
import { clientCreateSchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { orgId } = auth.ctx

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    const baseQuery = supabase
      .from('clients')
      .select(`*, client_folders (id, name, color)`)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    const clientsRes = q
      ? await baseQuery.or(`name.ilike.%${escapePostgrestValue(q)}%,email.ilike.%${escapePostgrestValue(q)}%,phone.ilike.%${escapePostgrestValue(q)}%`)
      : await baseQuery

    const { data: clients, error } = clientsRes
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(clients)
  } catch (error) {
    captureApiError(error, { route: 'clients/GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const parsed = await parseJsonBody(request, clientCreateSchema)
    if (!parsed.ok) return parsed.response

    const { name, email, phone, address, notes, tags, folder_id } = parsed.data
    const clientData: Record<string, unknown> = {
      user_id: user.id,
      organization_id: orgId,
      name, email, phone, address, notes,
    }
    if (tags !== undefined) clientData.tags = Array.isArray(tags) ? tags : (tags ? [tags] : [])
    if (folder_id) clientData.folder_id = folder_id

    let { data: client, error } = await supabase.from('clients').insert([clientData]).select(`*, client_folders (id, name, color)`).single()
    if (error && folder_id) {
      delete clientData.folder_id
      const retry = await supabase.from('clients').insert([clientData]).select().single()
      client = retry.data
      error = retry.error
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('leads').insert([{
      user_id: user.id, organization_id: orgId, name, address, phone, email, value: 0, status: 'New Leads',
    }])

    await checkAndExecuteAutomations('client_created', {
      event: 'client_created', user_id: user.id, organization_id: orgId,
      client_id: client.id, client_name: name, client_email: email || undefined, user_email: user.email || undefined,
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    captureApiError(error, { route: 'clients/POST' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
