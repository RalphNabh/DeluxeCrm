# Vercel Environment Variables Setup Guide

Follow these steps to get all your API keys and set them up in Vercel.

## Step 1: Get Supabase Keys

### 1.1 Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard
2. Log in to your account
3. Select your project (or create a new one if you don't have one)

### 1.2 Get API Keys
1. Click on **Settings** (gear icon) in the left sidebar
2. Click on **API** in the settings menu
3. You'll see two sections:

**Project URL:**
- Copy the **Project URL** (looks like: `https://xxxxx.supabase.co`)
- This is your `NEXT_PUBLIC_SUPABASE_URL`

**Project API keys:**
- Copy the **`anon` `public`** key (starts with `eyJhbG...`)
- This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Service Role Key (Keep Secret!):**
- Scroll down to find **`service_role` `secret`** key
- ⚠️ **WARNING**: This key has admin access. Never expose it in client-side code!
- Copy this key
- This is your `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Get Resend API Key

### 2.1 Go to Resend Dashboard
1. Visit: https://resend.com/api-keys
2. Log in to your account
3. If you don't have an account, sign up at https://resend.com/signup

### 2.2 Create API Key
1. Click **"Create API Key"**
2. Give it a name (e.g., "DyluxePro Production")
3. Select permissions (usually "Full Access" for production)
4. Copy the API key immediately (starts with `re_...`)
   - ⚠️ **You can only see it once!** Save it now.
5. This is your `RESEND_API_KEY`

---

## Step 3: Get Stripe Test Mode Keys (Sandbox)

### 3.1 Go to Stripe Dashboard
1. Visit: https://dashboard.stripe.com/test
2. Log in to your account
3. If you don't have an account, sign up at https://stripe.com
4. **Make sure you're in Test Mode** (toggle at the top should say "Test mode" - if it says "Live mode", click it to switch)

### 3.2 Get Test API Keys
1. Click on **"Developers"** in the left sidebar
2. Click on **"API keys"**
3. You should see **"Test mode keys"** section at the top
4. You'll see two keys:

**Publishable key (Test):**
- Copy the **Publishable key** (starts with `pk_test_...`)
- ⚠️ **Important:** Make sure it starts with `pk_test_` (not `pk_live_`)
- This is your `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Secret key (Test):**
- Click **"Reveal test key"** button
- Copy the **Secret key** (starts with `sk_test_...`)
- ⚠️ **Keep this secret!** Never expose it in client-side code
- ⚠️ **Important:** Make sure it starts with `sk_test_` (not `sk_live_`)
- This is your `STRIPE_SECRET_KEY`

### 3.3 Get Test Webhook Secret (for subscriptions)
1. Still in Stripe Dashboard → **Developers**
2. Click on **"Webhooks"** in the left sidebar
3. **Make sure you're in Test Mode** (the toggle at the top of the Stripe dashboard)
4. Click **"Add endpoint"** button

**Configure the webhook:**
5. **Endpoint URL:** Enter `https://dyluxepro.com/api/stripe/webhook`

6. **Events from:** Select **"Your account"** (not "Connected and v2 accounts")

7. **API version:** Leave as default (e.g., `2025-11-17.clover`)

8. **Events:** Select **"Selected events"** (not "All events"), then add these specific events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   
   You can search for each event in the search box or scroll through the list to find them.

9. Click **"Add endpoint"**

10. After the endpoint is created, click on it to view details

11. In the **"Signing secret"** section, click **"Reveal"** or **"Click to reveal"**

12. Copy the signing secret (starts with `whsec_test_...` for test mode)
    - ⚠️ **You can only see this once!** Save it immediately.

13. This is your `STRIPE_WEBHOOK_SECRET`

**Note:** These are test mode keys for development/testing. No real payments will be processed. When ready for production, you'll need to complete Stripe's business verification and get live mode keys.

---

## Step 4: Add All Variables to Vercel

### 4.1 Go to Vercel Project Settings
1. Visit: https://vercel.com/dashboard
2. Click on your **DyluxePro** project
3. Click on **Settings** (top navigation)
4. Click on **Environment Variables** in the left sidebar

### 4.2 Add Each Variable

For each variable below, click **"Add New"** and enter:

#### Supabase Variables:

**Variable Name:** `NEXT_PUBLIC_SUPABASE_URL`  
**Value:** (Your Supabase Project URL from Step 1.2)  
**Environment:** Select all (Production, Preview, Development)

**Variable Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Value:** (Your Supabase anon/public key from Step 1.2)  
**Environment:** Select all (Production, Preview, Development)

**Variable Name:** `SUPABASE_SERVICE_ROLE_KEY`  
**Value:** (Your Supabase service_role key from Step 1.2)  
**Environment:** Select all (Production, Preview, Development)

#### Resend Variables:

**Variable Name:** `RESEND_API_KEY`  
**Value:** (Your Resend API key from Step 2.2)  
**Environment:** Select all (Production, Preview, Development)

**Variable Name:** `RESEND_FROM_EMAIL`  
**Value:** `DyluxePro <onboarding@resend.dev>`  
**Environment:** Select all (Production, Preview, Development)

**Variable Name:** `RESEND_VERIFIED_EMAIL` (Optional - for testing)  
**Value:** (Your email address, e.g., `nabhanralph@gmail.com`)  
**Environment:** Select all (Production, Preview, Development)

#### Stripe Variables:

**Variable Name:** `STRIPE_SECRET_KEY`  
**Value:** (Your Stripe Secret key from Step 3.2)  
**Environment:** Select all (Production, Preview, Development)

**Variable Name:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  
**Value:** (Your Stripe Publishable key from Step 3.2)  
**Environment:** Select all (Production, Preview, Development)

**Variable Name:** `STRIPE_WEBHOOK_SECRET`  
**Value:** (Your Stripe Test Webhook secret from Step 3.3 - starts with `whsec_...`)  
**Environment:** Select all (Production, Preview, Development) - Test webhooks work in all environments

#### Application Variables:

**Variable Name:** `NEXT_PUBLIC_APP_URL`  
**Value:** `https://dyluxepro.com`  
**Environment:** Select all (Production, Preview, Development)

---

## Step 5: Redeploy Your Application

After adding all environment variables:

1. Go back to your Vercel project dashboard
2. Click on **Deployments** tab
3. Click the **"..."** menu on the latest deployment
4. Click **"Redeploy"**
5. Confirm the redeployment

This ensures all new environment variables are available to your application.

---

## Verification Checklist

After setting everything up, verify:

- [ ] All Supabase variables are set
- [ ] All Resend variables are set
- [ ] All Stripe variables are set
- [ ] `NEXT_PUBLIC_APP_URL` is set to `https://dyluxepro.com`
- [ ] Application has been redeployed
- [ ] Site loads at https://dyluxepro.com
- [ ] Can sign up and log in (tests Supabase)
- [ ] Can send a test email (tests Resend)
- [ ] Stripe checkout works with test card numbers (tests Stripe test mode)

---

## Troubleshooting

### If you get "Missing API key" errors:
- Check that you copied the entire key (they're long!)
- Make sure you didn't add extra spaces
- Verify the variable name matches exactly (case-sensitive)

### If Supabase doesn't work:
- Verify your Supabase project is active
- Check that you're using the correct project's keys
- Make sure RLS (Row Level Security) policies are set up correctly

### If Resend doesn't work:
- Verify your Resend account is active
- Check that you're using the correct API key
- Make sure you haven't exceeded rate limits

### If Stripe doesn't work:
- Verify you're using **test mode keys** (start with `pk_test_` and `sk_test_`)
- Make sure you're not mixing test and live keys
- Check that webhook endpoint URL is correct: `https://dyluxepro.com/api/stripe/webhook`
- Verify webhook events are selected correctly
- Make sure you're using test card numbers for testing (like `4242 4242 4242 4242`)

---

## Security Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Never share service role keys** - They have admin access
3. **Use test keys for development** - You're currently using test mode keys (starts with `test_`). Switch to live keys only when ready for production after completing business verification.
4. **Rotate keys if exposed** - If you suspect a key is compromised, regenerate it
5. **Use different keys for dev/prod** - Vercel allows environment-specific variables

---

## Quick Reference: Variable Names

Copy-paste this list to make sure you have everything:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_VERIFIED_EMAIL (optional)
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
```

---

**Need Help?** If you get stuck on any step, let me know which service and I can guide you through it!
