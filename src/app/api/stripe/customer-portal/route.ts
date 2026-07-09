import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/env'
import { createStripeClient } from '@/lib/stripe-server'

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe client (lazy initialization to avoid build-time errors)
    const stripe = createStripeClient();

    const supabase = await createClient()
    
    const auth = await requireOrgMember(supabase)
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    // Get user's subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', orgId)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getAppUrl()}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 500 }
    )
  }
}


