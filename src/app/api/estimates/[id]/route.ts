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
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      .eq('user_id', user.id)
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
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Update the estimate status
    const { data: updatedEstimate, error: updateError } = await supabase
      .from('estimates')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
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

    // If there's a lead associated with this estimate, update its status
    if (updatedEstimate.lead_id) {
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
          .eq('id', updatedEstimate.lead_id)
          .eq('user_id', user.id)

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
          user_id: user.id,
          estimate_id: id,
          client_name: updatedEstimate.clients?.name || 'Client',
          client_email: updatedEstimate.clients?.email || undefined,
          user_email: user.email || undefined
        })
      } catch (automationError) {
        console.error('Error triggering automations:', automationError)
        // Don't fail the request if automation fails
      }
    }

    return NextResponse.json(updatedEstimate)
  } catch (error) {
    console.error('Error in PUT /api/estimates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}