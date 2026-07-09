import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndExecuteAutomations } from '@/lib/automations/executor'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Get the current user
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    // Fetch the estimate with client and line items
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        *,
        clients (
          name,
          email,
          phone,
          address
        ),
        estimate_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          total
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (estimateError) {
      console.error('Error fetching estimate:', estimateError)
      return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 })
    }

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    return NextResponse.json(estimate)
  } catch (error) {
    console.error('Error in GET /api/estimates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { id } = await params
    const body = await request.json()
    const { status, lineItems, contract_message, tags } = body

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Update status if provided
    if (status) {
      updateData.status = status
    }

    // Update contract message if provided
    if (contract_message !== undefined) {
      updateData.contract_message = contract_message || null
    }

    // Update tags if provided
    if (tags !== undefined) {
      updateData.tags = tags || null
    }

    // Update the estimate
    const { data: updatedEstimate, error: updateError } = await supabase
      .from('estimates')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select(`
        *,
        clients (
          name,
          email,
          phone,
          address
        ),
        estimate_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          total
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating estimate:', updateError)
      return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 })
    }

    // Update line items if provided
    if (lineItems && Array.isArray(lineItems)) {
      // Delete existing line items
      await supabase
        .from('estimate_line_items')
        .delete()
        .eq('estimate_id', id)

      // Insert new line items
      const itemsToInsert = lineItems.map((item: {
        description: string;
        quantity: number;
        unit: string;
        unit_price: number;
      }) => ({
        estimate_id: id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }))

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('estimate_line_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('Error updating line items:', itemsError)
          return NextResponse.json({ error: 'Failed to update line items' }, { status: 500 })
        }

        // Recalculate totals
        const subtotal = itemsToInsert.reduce((sum, item) => sum + item.total, 0)
        const tax = Math.round(subtotal * 0.13 * 100) / 100
        const total = subtotal + tax

        await supabase
          .from('estimates')
          .update({ subtotal, tax, total })
          .eq('id', id)
      }
    }

    // Fetch updated estimate with all relations
    const { data: finalEstimate, error: fetchError } = await supabase
      .from('estimates')
      .select(`
        *,
        clients (
          name,
          email,
          phone,
          address
        ),
        estimate_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          total
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated estimate:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch updated estimate' }, { status: 500 })
    }

    // If there's a lead associated with this estimate, update its status
    if (finalEstimate.lead_id && status) {
      let leadStatus = ''
      
      switch (status) {
        case 'Approved':
          leadStatus = 'Approved'
          break
        case 'Scheduled':
          leadStatus = 'Job Scheduled'
          break
        case 'Completed':
          leadStatus = 'Completed'
          break
        case 'Rejected':
          leadStatus = 'Lost'
          break
        default:
          leadStatus = 'Estimate Sent'
      }

      if (leadStatus) {
        const { error: leadError } = await supabase
          .from('leads')
          .update({ 
            status: leadStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', finalEstimate.lead_id)
          .eq('organization_id', orgId)

        if (leadError) {
          console.error('Error updating lead status:', leadError)
          // Don't fail the request, just log the error
        }
      }
    }

    // Trigger automations if estimate was approved
    if (status === 'Approved') {
      try {
        await checkAndExecuteAutomations('estimate_approved', {
          event: 'estimate_approved',
          user_id: user.id, organization_id: orgId,
          estimate_id: id,
          client_name: finalEstimate.clients?.name || 'Client',
          client_email: finalEstimate.clients?.email || undefined,
          user_email: user.email || undefined
        })
      } catch (automationError) {
        console.error('Error triggering automations:', automationError)
        // Don't fail the request if automation fails
      }
    }

    return NextResponse.json(finalEstimate || updatedEstimate)
  } catch (error) {
    console.error('Error in PUT /api/estimates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}