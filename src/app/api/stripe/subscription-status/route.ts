import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if subscription is active
    const isActive = subscription && 
      subscription.status === 'active' && 
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())

    return NextResponse.json({
      hasSubscription: !!subscription,
      subscription: subscription || null,
      isActive: !!isActive,
      status: subscription?.status || 'none',
    })
  } catch (error) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}


