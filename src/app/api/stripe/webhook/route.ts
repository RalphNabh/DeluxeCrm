import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createStripeClient } from '@/lib/stripe-server'
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriod,
} from '@/lib/stripe-subscription'
import { recordStripeInvoicePayment } from '@/lib/stripe-invoice-payment'
import {
  claimWebhookEvent,
  markWebhookFailed,
  markWebhookProcessed,
} from '@/lib/stripe-webhook-claim'
import { captureApiError } from '@/lib/api-error'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let stripe: ReturnType<typeof createStripeClient>;
  try {
    stripe = createStripeClient();
  } catch {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

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

  let claim;
  try {
    claim = await claimWebhookEvent(supabaseAdmin, event.id, event.type)
  } catch (error) {
    captureApiError(error, { route: 'stripe/webhook', step: 'claim' })
    return NextResponse.json({ error: 'Webhook claim failed' }, { status: 500 })
  }

  if (claim.action === 'already_processed') {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (claim.action === 'in_progress') {
    // Another worker is handling this; ask Stripe to retry shortly.
    return NextResponse.json({ error: 'Event processing in progress' }, { status: 409 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'payment' && session.metadata?.type === 'invoice_payment') {
          const result = await recordStripeInvoicePayment(supabaseAdmin, session)
          console.log('Invoice Checkout payment processed:', result)
          break
        }

        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          const period = getSubscriptionPeriod(subscription)

          const userId = session.metadata?.userId || subscription.metadata?.userId

          if (!userId) {
            console.error('No userId in session metadata')
            break
          }

          const { error: upsertError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0]?.price.id,
              status: subscription.status,
              current_period_start: new Date(period.current_period_start * 1000).toISOString(),
              current_period_end: new Date(period.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, {
              onConflict: 'user_id'
            })

          if (upsertError) {
            throw upsertError
          }

          try {
            const { data: referral, error: referralFetchError } = await supabaseAdmin
              .from('referrals')
              .select('*, referrer:referrer_id(commission_rate)')
              .eq('referred_user_id', userId)
              .eq('status', 'Pending')
              .single()

            if (referral && !referralFetchError) {
              const priceAmount = subscription.items.data[0]?.price.unit_amount || 0
              const subscriptionValue = priceAmount / 100
              interface ReferrerData {
                commission_rate?: number;
              }
              const commissionRate = (referral.referrer as ReferrerData)?.commission_rate || 30.00
              const commissionEarned = (subscriptionValue * commissionRate) / 100

              await supabaseAdmin
                .from('referrals')
                .update({
                  status: 'Active',
                  subscription_value: subscriptionValue,
                  commission_earned: commissionEarned,
                  converted_at: new Date().toISOString(),
                })
                .eq('id', referral.id)

              const { data: referrerAffiliate } = await supabaseAdmin
                .from('affiliates')
                .select('total_earnings')
                .eq('user_id', referral.referrer_id)
                .single()

              if (referrerAffiliate) {
                const currentEarnings = Number(referrerAffiliate.total_earnings) || 0
                await supabaseAdmin
                  .from('affiliates')
                  .update({ total_earnings: currentEarnings + commissionEarned })
                  .eq('user_id', referral.referrer_id)
              }
            }
          } catch (affiliateError) {
            console.error('Error processing affiliate commission (non-fatal):', affiliateError)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const period = getSubscriptionPeriod(subscription)

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(period.current_period_start * 1000).toISOString(),
            current_period_end: new Date(period.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) throw updateError
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const period = getSubscriptionPeriod(subscription)

          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(period.current_period_start * 1000).toISOString(),
              current_period_end: new Date(period.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)

          if (updateError) throw updateError
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)

        if (subscriptionId) {
          const { error: updateError } = await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId)

          if (updateError) throw updateError
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    await markWebhookProcessed(supabaseAdmin, event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    await markWebhookFailed(supabaseAdmin, event.id, message)
    captureApiError(error, { route: 'stripe/webhook' })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
