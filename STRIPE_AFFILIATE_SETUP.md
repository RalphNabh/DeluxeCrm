# Stripe Affiliate Integration Guide

This document explains how the affiliate/referral system integrates with Stripe subscriptions.

## How It Works

### 1. User Signs Up with Referral Code

When a user signs up with a referral code (e.g., `https://dyluxepro.com/signup?ref=ABC123`):

1. The referral code is stored in the database via `/api/affiliates` POST endpoint
2. A `referrals` record is created with status `Pending`
3. The referrer's `total_referrals` count is incremented

### 2. User Subscribes via Stripe

When the referred user completes a Stripe subscription checkout:

1. Stripe sends `checkout.session.completed` webhook event
2. The webhook handler (`/api/stripe/webhook`) processes the subscription
3. **NEW:** After saving the subscription, it checks if the user was referred
4. If referred, it:
   - Gets the subscription amount (monthly price)
   - Calculates commission (default 30% of subscription value)
   - Updates the referral record:
     - Status: `Pending` → `Active`
     - Sets `subscription_value` (monthly subscription amount)
     - Sets `commission_earned` (calculated commission)
     - Sets `converted_at` timestamp
   - Updates the referrer's `total_earnings` in the `affiliates` table

### 3. Commission Calculation

```
Commission = (Subscription Monthly Price × Commission Rate) / 100
```

Example:
- Subscription: $79/month (Professional plan)
- Commission Rate: 30%
- Commission Earned: $79 × 30% = $23.70

**Note:** Currently, commission is calculated on the initial subscription amount only. Recurring monthly commissions can be added later if needed.

## Database Schema

### `affiliates` Table
- `user_id`: The affiliate/referrer
- `referral_code`: Unique code for sharing
- `commission_rate`: Percentage (default 30%)
- `total_referrals`: Count of referrals made
- `total_earnings`: Sum of all commissions earned

### `referrals` Table
- `referrer_id`: User who made the referral
- `referred_user_id`: User who was referred
- `referral_code`: Code used
- `status`: `Pending`, `Active`, `Converted`, `Cancelled`
- `subscription_value`: Monthly subscription amount
- `commission_earned`: Commission amount calculated
- `commission_paid`: Whether commission has been paid out
- `converted_at`: When subscription was completed

## Setup Steps

### 1. Run Database Schema

If you haven't already, run the affiliate schema in Supabase:

```sql
-- Run: supabase-affiliates-schema.sql
-- This creates the affiliates and referrals tables
```

### 2. Webhook Already Configured

The webhook handler at `/api/stripe/webhook` now automatically:
- Processes subscriptions
- Checks for referrals
- Calculates commissions
- Updates affiliate earnings

### 3. Test the Flow

1. **Create a test affiliate:**
   - Sign up a test account
   - Go to `/affiliates` page
   - Copy the referral code

2. **Refer a new user:**
   - Sign up a new account with `?ref=YOUR_CODE` in the URL
   - Or use the referral link from the affiliates page

3. **Complete subscription:**
   - Have the referred user subscribe via Stripe
   - Use test card: `4242 4242 4242 4242`

4. **Verify commission:**
   - Check the referrer's `/affiliates` page
   - Should see the referral status as "Active"
   - Commission should be calculated and displayed
   - Total earnings should be updated

## Commission Rates

Default commission rate: **30%**

To change commission rates:

1. **Per Affiliate:** Update `commission_rate` in the `affiliates` table
2. **Default for New Affiliates:** Update the default in `/api/affiliates` route (line 39)

## Future Enhancements

Possible improvements:

1. **Recurring Commissions:** Track commissions on each monthly payment
2. **Stripe Connect Payouts:** Automatically pay commissions to affiliates via Stripe
3. **Commission Thresholds:** Set minimum earnings before payout
4. **Tiered Rates:** Different commission rates based on referral volume
5. **Commission History:** Detailed history of all commission payments

## Webhook Events

The affiliate system listens for:

- ✅ `checkout.session.completed` - Processes initial subscription commission
- 🔄 `customer.subscription.updated` - Can track subscription changes (future)
- 🔄 `invoice.payment_succeeded` - Could track recurring commissions (future)

## Testing

To test the affiliate flow:

1. Use Stripe test mode (already configured)
2. Use test card numbers (e.g., `4242 4242 4242 4242`)
3. Check webhook logs in Stripe Dashboard
4. Verify records in Supabase:
   - `subscriptions` table (should have subscription)
   - `referrals` table (should show Active status with commission)
   - `affiliates` table (should show updated total_earnings)

## Troubleshooting

### Commission Not Showing Up

1. **Check webhook logs:**
   - Stripe Dashboard → Webhooks → Your endpoint → Recent events
   - Look for `checkout.session.completed` events
   - Check if they succeeded or failed

2. **Check database:**
   - Verify `referrals` table has a record for the user
   - Check if `status` is `Pending` (should update to `Active`)
   - Verify `subscription_value` and `commission_earned` are set

3. **Check webhook code:**
   - Look for errors in Vercel logs
   - Affiliate processing errors are logged but don't fail the webhook

### Referral Code Not Working

1. Verify the code exists in `affiliates` table
2. Check if user already has a referral record (one referral per user)
3. Ensure the code is being passed correctly in signup URL

---

**Need Help?** Check the webhook logs in Stripe and Vercel for detailed error messages.
