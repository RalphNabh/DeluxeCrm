import { requireOrgMember } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/env'
import { isAllowedStripePriceId } from '@/lib/stripe-prices'
import { createStripeClient } from '@/lib/stripe-server'
import { getBillableSeatCount } from '@/lib/stripe-seats'
import { parseJsonBody } from '@/lib/validation'
import { checkoutBodySchema } from '@/lib/api-schemas'
import { captureApiError } from '@/lib/api-error'

export async function POST(request: NextRequest) {
  try {
    const stripe = createStripeClient();
    const supabase = await createClient()
    
    const auth = await requireOrgMember(supabase, { roles: ['owner', 'admin'] })
    if (!auth.ok) return auth.response
    const { user, orgId } = auth.ctx

    const parsed = await parseJsonBody(request, checkoutBodySchema)
    if (!parsed.ok) return parsed.response
    const { priceId } = parsed.data

    if (!isAllowedStripePriceId(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSubscription) {
      return NextResponse.json({ 
        error: 'You already have an active subscription',
        subscriptionId: existingSubscription.id
      }, { status: 400 })
    }

    const { data: pendingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle()

    let customerId = pendingSub?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id, organizationId: orgId },
      })
      customerId = customer.id

      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        organization_id: orgId,
        stripe_customer_id: customerId,
        status: 'pending',
        seat_quantity: 1,
      }, { onConflict: 'organization_id' })
    }

    const seatCount = await getBillableSeatCount(supabase, orgId)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: seatCount }],
      success_url: `${getAppUrl()}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/subscription/cancel`,
      metadata: { userId: user.id, organizationId: orgId },
      subscription_data: { metadata: { userId: user.id, organizationId: orgId } },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    captureApiError(error, { route: 'stripe/create-checkout' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
