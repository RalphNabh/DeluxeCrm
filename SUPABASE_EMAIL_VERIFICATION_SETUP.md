# Supabase Email Verification Setup Guide

## Issue: Users not appearing in Supabase and no email verification

If users are signing up but not appearing in Supabase, and no email verification is being sent, check the following:

### 1. Check Email Confirmation Settings in Supabase

**In your Supabase Dashboard:**

1. Go to **Authentication** → **Settings** → **Email Auth**
2. Check the **"Confirm email"** setting:
   - **Enable email confirmations**: Should be **ON** for production
   - **Email confirmation template**: Should be configured

3. Check **"Email rate limit"** settings if emails aren't sending

### 2. Configure Site URL and Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://www.dyluxepro.com` (or your production domain)
3. Add to **Redirect URLs**:
   - `https://www.dyluxepro.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 3. Check Email Provider Settings

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Verify email sending is configured:
   - **Use Supabase's built-in email service** (for development/testing)
   - **Or configure custom SMTP** (for production)

### 4. Check if Users are Being Created

**In Supabase Dashboard:**

1. Go to **Authentication** → **Users**
2. Check if users appear there (they should appear even if email isn't confirmed)
3. Users might be in **"Unconfirmed"** state

### 5. Check Database Triggers

If users are being created in `auth.users` but not in your `user_profiles` table:

1. Check if the trigger `on_auth_user_created` exists
2. Run this SQL in Supabase SQL Editor to verify:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

3. If missing, run the trigger creation SQL from `supabase-user-profiles-schema.sql`

### 6. Temporary: Disable Email Confirmation (Development Only)

**⚠️ WARNING: Only for development/testing, NOT for production!**

If you need to test without email confirmation:

1. Go to **Authentication** → **Settings** → **Email Auth**
2. Turn **OFF** "Enable email confirmations"
3. Users will be created immediately without verification

**Remember to turn this back ON for production!**

### 7. Check Browser Console for Errors

When signing up, check the browser console for:
- Network errors
- Supabase API errors
- Any error messages from the signup process

### 8. Verify Environment Variables

Make sure these are set correctly in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Testing Email Verification

1. Sign up with a real email address (not a test email)
2. Check spam folder
3. Check Supabase logs: **Logs** → **Postgres Logs** or **API Logs**
4. Check if email was sent: **Authentication** → **Users** → Click on user → Check email status

### Common Issues

1. **Users not in database**: Email confirmation is disabled, users are created but immediately deleted
2. **No email sent**: SMTP not configured or email rate limits reached
3. **Email in spam**: Check spam folder, configure SPF/DKIM for custom domain
4. **Users in auth.users but not in user_profiles**: Trigger not working, check trigger logs

### Next Steps

1. Check Supabase dashboard settings (steps 1-3 above)
2. Try signing up again
3. Check Authentication → Users to see if user was created
4. Check email inbox (including spam)
5. If still not working, check Supabase logs for errors
