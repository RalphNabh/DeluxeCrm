import { requireOrgMember } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api-auth'
import { parseJsonBody } from '@/lib/validation'
import { clientUpdateSchema } from '@/lib/api-schemas'
import { escapePostgrestValue } from '@/lib/postgrest-escape'
import { captureApiError } from '@/lib/api-error'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { id } = await params
    const parsed = await parseJsonBody(request, clientUpdateSchema)
    if (!parsed.ok) return parsed.response

    const updates: Record<string, unknown> = { ...parsed.data }
    if (updates.tags !== undefined && typeof updates.tags === 'string') {
      updates.tags = updates.tags ? [updates.tags] : []
    }

    // Try to update with folder information
    let { data: client, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
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
    if (error && updates.folder_id) {
      const { folder_id, ...updatesWithoutFolder } = updates
      const { data: retryClient, error: retryError } = await supabase
        .from('clients')
        .update(updatesWithoutFolder)
        .eq('id', id)
        .eq('organization_id', orgId)
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

    return NextResponse.json(client)
  } catch (error) {
    captureApiError(error, { route: 'clients/[id]/PUT' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { id: clientId } = await params

    // First, get all related IDs before deletion
    // Get estimates
    const { data: estimates } = await supabase
      .from('estimates')
      .select('id')
      .eq('client_id', clientId)
      .eq('organization_id', orgId)
    
    const estimateIds = estimates?.map(e => e.id) || []

    // Get invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('client_id', clientId)
      .eq('organization_id', orgId)
    
    const invoiceIds = invoices?.map(i => i.id) || []

    // Get jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('client_id', clientId)
      .eq('organization_id', orgId)
    
    const jobIds = jobs?.map(j => j.id) || []

    // Delete child records first (in order of dependencies)
    
    // Delete estimate line items
    if (estimateIds.length > 0) {
      await supabase
        .from('estimate_line_items')
        .delete()
        .in('estimate_id', estimateIds)
    }

    // Delete invoice line items and payments
    if (invoiceIds.length > 0) {
      await supabase
        .from('invoice_line_items')
        .delete()
        .in('invoice_id', invoiceIds)
      
      await supabase
        .from('payments')
        .delete()
        .in('invoice_id', invoiceIds)
    }

    // Delete job-related records
    if (jobIds.length > 0) {
      await supabase
        .from('job_notes')
        .delete()
        .in('job_id', jobIds)
      
      await supabase
        .from('job_photos')
        .delete()
        .in('job_id', jobIds)
      
      await supabase
        .from('job_equipment')
        .delete()
        .in('job_id', jobIds)
      
      await supabase
        .from('job_assignments')
        .delete()
        .in('job_id', jobIds)
    }

    // Delete parent records
    if (estimateIds.length > 0) {
      await supabase
        .from('estimates')
        .delete()
        .in('id', estimateIds)
    }

    if (invoiceIds.length > 0) {
      await supabase
        .from('invoices')
        .delete()
        .in('id', invoiceIds)
    }

    if (jobIds.length > 0) {
      await supabase
        .from('jobs')
        .delete()
        .in('id', jobIds)
    }

    // Delete leads associated with this client (by matching name/email)
    const { data: client } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', clientId)
      .eq('organization_id', orgId)
      .single()

    if (client) {
      // Delete leads that match the client's name or email
      // Use a more reliable query approach
      const leadQuery = supabase
        .from('leads')
        .delete()
        .eq('organization_id', orgId)
      
      const safeName = escapePostgrestValue(client.name)
      if (client.email) {
        const safeEmail = escapePostgrestValue(client.email)
        await leadQuery.or(`name.eq.${safeName},email.eq.${safeEmail}`)
      } else {
        await leadQuery.eq('name', client.name)
      }
    }

    // Finally, delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('organization_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Client and all related data deleted successfully' })
  } catch (error) {
    captureApiError(error, { route: 'clients/[id]/DELETE' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
