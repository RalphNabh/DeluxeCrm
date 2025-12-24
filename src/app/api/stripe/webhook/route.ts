import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Disable body parsing, we need the raw body for signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Initialize Stripe client (lazy initialization to avoid build-time errors)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY is not configured. Please set it in your environment variables.' },
      { status: 500 }
    );
  }
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia',
  });

  // Use service role for webhook to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }
  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured. Please set it in your environment variables.' },
      { status: 500 }
    );
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          const userId = session.metadata?.userId || subscription.metadata?.userId

          if (!userId) {
            console.error('No userId in session metadata')
            break
          }

          // Update or create subscription record
          const { data: upsertData, error: upsertError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0]?.price.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, {
              onConflict: 'user_id'
            })

          if (upsertError) {
            console.error('Error upserting subscription:', upsertError)
            console.error('Subscription data:', {
              user_id: userId,
              stripe_customer_id: subscription.customer,
              stripe_subscription_id: subscription.id,
            })
            throw upsertError
          }

          console.log('Subscription successfully saved to database:', {
            user_id: userId,
            subscription_id: subscription.id,
          })

          // Process affiliate commission if user was referred
          try {
            // Check if this user was referred
            const { data: referral, error: referralFetchError } = await supabaseAdmin
              .from('referrals')
              .select('*, referrer:referrer_id(commission_rate)')
              .eq('referred_user_id', userId)
              .eq('status', 'Pending')
              .single()

            if (referral && !referralFetchError) {
              // Get subscription price amount (in cents, convert to dollars)
              const priceAmount = subscription.items.data[0]?.price.unit_amount || 0
              const subscriptionValue = priceAmount / 100 // Convert cents to dollars

              // Get commission rate from referrer's affiliate record
              const commissionRate = (referral.referrer as any)?.commission_rate || 30.00
              const commissionEarned = (subscriptionValue * commissionRate) / 100

              // Update referral record with subscription info and commission
              const { error: referralUpdateError } = await supabaseAdmin
                .from('referrals')
                .update({
                  status: 'Active',
                  subscription_value: subscriptionValue,
                  commission_earned: commissionEarned,
                  converted_at: new Date().toISOString(),
                })
                .eq('id', referral.id)

              if (referralUpdateError) {
                console.error('Error updating referral with commission:', referralUpdateError)
              } else {
                console.log('Referral commission processed:', {
                  referral_id: referral.id,
                  referrer_id: referral.referrer_id,
                  subscription_value: subscriptionValue,
                  commission_earned: commissionEarned,
                })

                // Update referrer's total earnings in affiliates table
                const { data: referrerAffiliate, error: affiliateFetchError } = await supabaseAdmin
                  .from('affiliates')
                  .select('total_earnings')
                  .eq('user_id', referral.referrer_id)
                  .single()

                if (referrerAffiliate && !affiliateFetchError) {
                  const currentEarnings = Number(referrerAffiliate.total_earnings) || 0
                  const newTotalEarnings = currentEarnings + commissionEarned

                  const { error: affiliateUpdateError } = await supabaseAdmin
                    .from('affiliates')
                    .update({ total_earnings: newTotalEarnings })
                    .eq('user_id', referral.referrer_id)

                  if (affiliateUpdateError) {
                    console.error('Error updating referrer total earnings:', affiliateUpdateError)
                  } else {
                    console.log('Referrer total earnings updated:', {
                      referrer_id: referral.referrer_id,
                      new_total_earnings: newTotalEarnings,
                    })
                  }
                }
              }
            }
          } catch (affiliateError) {
            // Log but don't fail the webhook if affiliate processing fails
            console.error('Error processing affiliate commission (non-fatal):', affiliateError)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          throw updateError
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )

          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)

          if (updateError) {
            console.error('Error updating subscription from invoice:', updateError)
            throw updateError
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'past_due',
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          if (updateError) {
            console.error('Error updating subscription status to past_due:', updateError)
            throw updateError
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

