import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/env'
import { isAllowedStripePriceId } from '@/lib/stripe-prices'
import { createStripeClient } from '@/lib/stripe-server'
import { parseJsonBody } from '@/lib/validation'
import { checkoutBodySchema } from '@/lib/api-schemas'

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe client (lazy initialization to avoid build-time errors)
    const stripe = createStripeClient();

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = await parseJsonBody(request, checkoutBodySchema)
    if (!parsed.ok) return parsed.response
    const { priceId } = parsed.data

    if (!isAllowedStripePriceId(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json({ 
        error: 'You already have an active subscription',
        subscriptionId: existingSubscription.id
      }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId: string

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id
    } else {
      // Get user email
      const { data: { user: userData } } = await supabase.auth.getUser()
      
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: userData?.email || undefined,
        metadata: {
          userId: user.id,
        },
      })

      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          status: 'pending',
        }, {
          onConflict: 'user_id'
        })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${getAppUrl()}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/subscription/cancel`,
      metadata: {
        userId: user.id,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}


