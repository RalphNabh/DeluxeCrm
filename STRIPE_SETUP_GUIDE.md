# Stripe Subscription Setup Guide

This guide will walk you through setting up Stripe subscriptions for your CRM app.

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a free account (or log in if you already have one)
3. Complete the account setup process

## Step 2: Get Your API Keys

1. In your Stripe Dashboard, go to **Developers** → **API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

3. Copy both keys - you'll need them in the next step

## Step 3: Create Products and Prices in Stripe

1. In Stripe Dashboard, go to **Products** → **Add product**

2. Create three products (or adjust as needed):

   **Starter Plan:**
   - Name: "Starter Plan"
   - Description: "Perfect for solo contractors"
   - Pricing: $29/month (recurring)
   - Copy the **Price ID** (starts with `price_`)

   **Professional Plan:**
   - Name: "Professional Plan"
   - Description: "For growing teams"
   - Pricing: $79/month (recurring)
   - Copy the **Price ID**

   **Enterprise Plan:**
   - Name: "Enterprise Plan"
   - Description: "For large operations"
   - Pricing: $199/month (recurring)
   - Copy the **Price ID**

## Step 4: Set Up Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   - **Development**: `http://localhost:3000/api/stripe/webhook` (use Stripe CLI - see below)
   - **Production**: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

## Step 5: Set Up Stripe CLI (For Local Development)

For local development, you'll need to use Stripe CLI to forward webhooks:

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret that appears (starts with `whsec_`)

## Step 6: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (from Step 3)
NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER=price_your_starter_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL=price_your_professional_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE=price_your_enterprise_price_id

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# For production, use: https://yourdomain.com

# Supabase Service Role Key (for webhooks)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Step 7: Run Database Migration

Run the subscription schema migration in your Supabase dashboard:

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-subscriptions-schema.sql`
4. Click **Run**

## Step 8: Configure Stripe Customer Portal (Optional but Recommended)

1. In Stripe Dashboard, go to **Settings** → **Billing** → **Customer portal**
2. Customize the portal settings:
   - Allow customers to update payment methods
   - Allow customers to cancel subscriptions
   - Allow customers to update billing information
3. Save your changes

## Step 9: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Start Stripe CLI webhook forwarding (in a separate terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Test the flow:
   - Go to `/subscription` page
   - Click "Get Started" on a plan
   - Use Stripe test card: `4242 4242 4242 4242`
   - Use any future expiry date and any CVC
   - Complete the checkout
   - Verify subscription appears in Settings

## Step 10: Go Live

When you're ready for production:

1. Switch to **Live mode** in Stripe Dashboard
2. Get your **live** API keys
3. Update environment variables with live keys
4. Update `NEXT_PUBLIC_APP_URL` to your production domain
5. Set up the webhook endpoint with your production URL
6. Test with a real card (you can refund it)

## Important Notes

- **Never commit your `.env.local` file** - it contains sensitive keys
- Use **test mode** for development and testing
- The webhook endpoint must be publicly accessible (use Stripe CLI for local dev)
- Webhook signature verification is critical for security
- Always test subscription flows before going live

## Troubleshooting

**Webhook not receiving events:**
- Make sure Stripe CLI is running (for local dev)
- Check that webhook URL is correct
- Verify webhook secret matches

**Subscription not activating:**
- Check webhook logs in Stripe Dashboard
- Verify database migration ran successfully
- Check server logs for errors

**Checkout not working:**
- Verify Stripe keys are correct
- Check that price IDs match your Stripe products
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly

## Support

For Stripe-specific issues, check:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)


