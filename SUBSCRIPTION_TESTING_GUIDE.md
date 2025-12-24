# 🧪 Subscription Testing & Setup Guide

Complete guide to finish subscription implementation and test everything before client delivery.

---

## ⚠️ Common Error: Product ID vs Price ID

**Error:** `No such price: 'prod_TdlvHg2X1NAEyV'`

**Cause:** You're using a **Product ID** (`prod_...`) instead of a **Price ID** (`price_...`)

**Fix:**
1. In Stripe Dashboard → **Products** → Click your product
2. Look for the **"Pricing"** section below the product name
3. Find the Price ID (starts with `price_`, not `prod_`)
4. Copy the Price ID and use that in your environment variable

---

## Step 1: Create Stripe Test Products & Prices

**Make sure you're in Test Mode** (toggle at top of Stripe Dashboard)

1. Go to **Stripe Dashboard** → **Products** → **Add product**

2. Create 3 products with prices:

### Starter Plan ($29/month)
- **Name:** `Starter Plan`
- **Description:** `Perfect for solo contractors`
- **Pricing model:** Recurring
- **Price:** `$29.00`
- **Billing period:** Monthly
- Click **"Save product"**
- **📋 IMPORTANT:** Copy the **Price ID** (starts with `price_`), NOT the Product ID!

### Professional Plan ($79/month)
- Repeat steps above with `$79/month`
- Copy the **Price ID**

### Enterprise Plan ($199/month)
- Repeat steps above with `$199/month`
- Copy the **Price ID**

---

## Step 2: Add Price IDs to Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add these three variables:

**Variable Name:** `NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER`  
**Value:** `price_xxxxx` (your Starter Price ID - starts with `price_`)  
**Environment:** Select all (Production, Preview, Development)

**Variable Name:** `NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL`  
**Value:** `price_xxxxx` (your Professional Price ID)  
**Environment:** Select all

**Variable Name:** `NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE`  
**Value:** `price_xxxxx` (your Enterprise Price ID)  
**Environment:** Select all

⚠️ **Critical:** Make sure you're using **Price IDs** (`price_...`), NOT Product IDs (`prod_...`)

---

## Step 3: Verify Database Schema

1. Go to **Supabase Dashboard** → **SQL Editor**

2. Run this SQL to create the subscriptions table (if not already created):

```sql
-- Create subscriptions table to track user subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL, -- active, canceled, past_due, trialing, etc.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON public.subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

3. Verify the table exists: **Table Editor** → `subscriptions`

---

## Step 4: Verify Webhook is Set Up

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Confirm you have an endpoint: `https://dyluxepro.com/api/stripe/webhook`
3. Verify these events are selected:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

If webhook is not set up, see `VERCEL_ENV_SETUP.md` Step 3.3 for instructions.

---

## Step 5: Redeploy Application

After adding Price ID environment variables:

1. Go to **Vercel Dashboard** → **Deployments**
2. Click **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

This ensures all new environment variables are available.

---

## Step 6: Test Subscription Flow

### 6.1 Visit Subscription Page
1. Go to `https://dyluxepro.com/subscription`
2. You should see 3 pricing plans displayed
3. Verify prices match: $29, $79, $199

### 6.2 Test Checkout
1. Click **"Get Started"** on any plan (try Professional - it's marked "Most Popular")
2. You should be redirected to Stripe Checkout
3. Use Stripe test card:
   - **Card number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/34`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)
4. Click **"Subscribe"**
5. You should be redirected to `/subscription/success`

### 6.3 Verify Success Page
- Should see "Subscription Activated!" or "Payment Successful"
- Should have button to "Go to Dashboard"

---

## Step 7: Verify Subscription in Database

1. Go to **Supabase Dashboard** → **Table Editor** → `subscriptions`
2. You should see a new row with:
   - ✅ `status`: `active`
   - ✅ `stripe_customer_id`: Starts with `cus_`
   - ✅ `stripe_subscription_id`: Starts with `sub_`
   - ✅ `stripe_price_id`: Should match your Price ID (starts with `price_`)
   - ✅ `user_id`: Should match your logged-in user's ID

---

## Step 8: Test Subscription Status Check

1. Visit `https://dyluxepro.com/settings`
2. Scroll to **"Subscription"** section
3. You should see:
   - Subscription status (e.g., "Active")
   - Plan name
   - "Manage Subscription" button

4. Click **"Manage Subscription"**
   - Should redirect to Stripe Customer Portal
   - You can cancel, update payment method, etc.

---

## Step 9: Test Webhook Events

1. Go to **Stripe Dashboard** → **Webhooks** → Click your endpoint
2. Click **"Recent events"** tab
3. You should see:
   - ✅ `checkout.session.completed` event (status: "Succeeded")
   - ✅ Other events may appear as subscription is processed

If events show "Failed" or you don't see any events:
- Check webhook URL is correct: `https://dyluxepro.com/api/stripe/webhook`
- Verify webhook secret matches in Vercel
- Check Vercel logs for errors

---

## Step 10: Test Additional Scenarios

### Test Different Card Numbers

**Success (default):**
- Card: `4242 4242 4242 4242`

**Card Declined:**
- Card: `4000 0000 0000 0002`
- Should show error message

**Requires 3D Secure:**
- Card: `4000 0025 0000 3155`
- Should show authentication step

### Test Cancellation Flow
1. In Stripe Customer Portal (accessed from Settings)
2. Cancel subscription
3. Verify subscription status updates to "canceled" in database

---

## 🎯 Final Pre-Client Testing Checklist

### Core Functionality
- [ ] Can sign up new account
- [ ] Can log in
- [ ] Can create a client
- [ ] Can create an estimate
- [ ] Can send estimate email
- [ ] Can create invoice
- [ ] Subscription page loads correctly
- [ ] All 3 pricing plans display with correct prices
- [ ] Can complete subscription checkout with test card
- [ ] Subscription record created in database
- [ ] Subscription status shows correctly in Settings
- [ ] Can access Stripe Customer Portal
- [ ] Webhook events are received successfully

### Error Handling
- [ ] Invalid card shows appropriate error
- [ ] Canceled checkout redirects to cancel page
- [ ] Missing subscription shows appropriate message
- [ ] Duplicate subscription attempt is prevented

### Email
- [ ] Estimate emails are sent (may be from `onboarding@resend.dev` until domain verified)
- [ ] Invoice emails are sent
- [ ] Email links work correctly

---

## 🐛 Troubleshooting

### "No such price: 'prod_xxxxx'"
**Problem:** Using Product ID instead of Price ID  
**Solution:** 
1. Go to Stripe → Products → Your product
2. Find Price ID (starts with `price_`) in Pricing section
3. Update environment variable with Price ID
4. Redeploy

### Subscription not showing in Settings
**Problem:** Webhook didn't process or database record missing  
**Solution:**
1. Check Supabase `subscriptions` table for record
2. Verify webhook processed `checkout.session.completed` event
3. Check browser console for API errors
4. Verify `NEXT_PUBLIC_APP_URL` is set correctly

### Webhook events not being received
**Problem:** Webhook endpoint not configured correctly  
**Solution:**
1. Verify webhook URL: `https://dyluxepro.com/api/stripe/webhook`
2. Check webhook secret matches in Vercel environment variables
3. Look at Stripe webhook logs for delivery status
4. Check Vercel logs for webhook endpoint errors

### Checkout fails with "Invalid price"
**Problem:** Price ID doesn't exist or is wrong  
**Solution:**
1. Verify Price ID in Stripe Dashboard (Products → Your product → Pricing)
2. Confirm Price ID starts with `price_` (not `prod_`)
3. Check environment variable is set correctly
4. Redeploy after updating environment variable

---

## 📋 Quick Reference

### Stripe Test Card Numbers

| Scenario | Card Number |
|----------|-------------|
| Success | `4242 4242 4242 4242` |
| Declined | `4000 0000 0000 0002` |
| Requires 3D Secure | `4000 0025 0000 3155` |
| Insufficient Funds | `4000 0000 0000 9995` |

### Environment Variables Checklist

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ RESEND_API_KEY
✅ RESEND_FROM_EMAIL
✅ RESEND_VERIFIED_EMAIL (optional)
✅ STRIPE_SECRET_KEY (test mode: sk_test_...)
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test mode: pk_test_...)
✅ STRIPE_WEBHOOK_SECRET (test mode: whsec_test_...)
✅ NEXT_PUBLIC_APP_URL
✅ NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER (price_...)
✅ NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL (price_...)
✅ NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE (price_...)
```

---

## ✅ You're Ready!

Once all checklist items are complete, your subscription system is ready for client testing!

**Next Steps:**
1. Share the app URL with your client: `https://dyluxepro.com`
2. Provide test card numbers for them to try
3. Monitor Stripe dashboard for subscription activity
4. Be ready to switch to live mode when they're ready to accept real payments

---

**Need Help?** If you encounter any issues, check the troubleshooting section above or review the Vercel logs for specific error messages.
