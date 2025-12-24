# Resend Domain Setup Guide

## Current Error
```
Error: Failed to send email: The support.deluxecrm.com domain is not verified.
```

## Problem
The `RESEND_FROM_EMAIL` environment variable is set to an email using a domain (`support.deluxecrm.com`) that is not verified in Resend.

## Solutions

### Option 1: Use Resend's Test Domain (Quick Fix for Testing)
For development/testing, you can use Resend's default test domain:

1. In Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Delete or update** `RESEND_FROM_EMAIL` to:
   ```
   DyluxePro <onboarding@resend.dev>
   ```
   OR simply **delete** the `RESEND_FROM_EMAIL` variable (the code will use the test domain as fallback)

3. Redeploy your application

**Note:** Emails from `onboarding@resend.dev` will work for testing, but may look less professional in production.

---

### Option 2: Verify dyluxepro.com in Resend (Recommended for Production)

1. **Go to Resend Dashboard:**
   - Visit https://resend.com/domains
   - Click **"Add Domain"**
   - Enter: `dyluxepro.com`

2. **Add DNS Records:**
   Resend will provide DNS records to add to your domain. You'll need to add these to your domain registrar (wherever you bought dyluxecrm.com):
   
   - **SPF Record**: `v=spf1 include:resend.com ~all`
   - **DKIM Records**: 2 CNAME records (Resend will provide the exact values)
   - **DMARC Record** (optional but recommended): `v=DMARC1; p=none;`

3. **Wait for Verification:**
   - DNS changes can take a few minutes to 48 hours to propagate
   - Resend will verify automatically once DNS records are detected

4. **Update Environment Variable:**
   Once verified, in Vercel Dashboard → Environment Variables:
   - Set `RESEND_FROM_EMAIL` to: `DyluxePro <noreply@dyluxepro.com>`

5. **Redeploy your application**

---

### Option 3: Verify support.deluxecrm.com (If you want to use this domain)

If you specifically want to use `support.deluxecrm.com`:

1. **Go to Resend Dashboard:**
   - Visit https://resend.com/domains
   - Click **"Add Domain"**
   - Enter: `support.deluxecrm.com` (or `deluxecrm.com` as the root domain)

2. **Add DNS Records:**
   Add the DNS records Resend provides to your domain's DNS settings

3. **Wait for Verification**

4. **Update Environment Variable:**
   - Set `RESEND_FROM_EMAIL` to: `DyluxePro <support@deluxecrm.com>`

5. **Redeploy**

---

## Recommended Setup for Production

For production, use your main domain (`dyluxepro.com`):

```env
RESEND_FROM_EMAIL=DyluxePro <noreply@dyluxepro.com>
```

Or if you prefer a support email:
```env
RESEND_FROM_EMAIL=DyluxePro <support@dyluxepro.com>
```

---

## Quick Fix (Use Test Domain Now)

If you need emails working immediately for testing:

1. **In Vercel Dashboard:**
   - Go to Settings → Environment Variables
   - Find `RESEND_FROM_EMAIL`
   - Either delete it OR change it to: `DyluxePro <onboarding@resend.dev>`

2. **Redeploy** your application

3. Emails will now work, but will come from `onboarding@resend.dev`

---

## Where Emails Are Used

Emails are sent from:
- Estimate emails (`send-estimate-email.ts`)
- Invoice emails (`send-invoice-email.ts`)
- Automation emails (`executor.ts`)
- General email actions (`api/email/action/route.ts`)

All use the `RESEND_FROM_EMAIL` environment variable or fall back to the test domain.
