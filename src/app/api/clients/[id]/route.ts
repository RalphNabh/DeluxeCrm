import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const updates = await request.json()

    // Handle tags - convert to array if it's a string
    if (updates.tags !== undefined && typeof updates.tags === 'string') {
      updates.tags = updates.tags ? [updates.tags] : []
    }

    // Try to update with folder information
    let { data: client, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
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
        .eq('user_id', user.id)
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: clientId } = await params

    // First, get all related IDs before deletion
    // Get estimates
    const { data: estimates } = await supabase
      .from('estimates')
      .select('id')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
    
    const estimateIds = estimates?.map(e => e.id) || []

    // Get invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
    
    const invoiceIds = invoices?.map(i => i.id) || []

    // Get jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
    
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
      .eq('user_id', user.id)
      .single()

    if (client) {
      // Delete leads that match the client's name or email
      // Use a more reliable query approach
      const leadQuery = supabase
        .from('leads')
        .delete()
        .eq('user_id', user.id)
      
      if (client.email) {
        await leadQuery.or(`name.eq.${client.name},email.eq.${client.email}`)
      } else {
        await leadQuery.eq('name', client.name)
      }
    }

    // Finally, delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Client and all related data deleted successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
