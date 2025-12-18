-- IMPORTANT: The proper solution is to use SUPABASE_SERVICE_ROLE_KEY
-- This SQL is a TEMPORARY workaround that makes automations readable without auth
-- You should get your service role key and use it instead!

-- Option 1: Allow service role to bypass RLS (RECOMMENDED)
-- Service role automatically bypasses RLS, so if you use SUPABASE_SERVICE_ROLE_KEY
-- in your code, you don't need to change RLS policies.

-- Option 2: Make automations table readable by anon key (TEMPORARY WORKAROUND)
-- This is less secure but works if you can't get service role key
-- WARNING: This allows anyone to read all automations if they know the table structure

-- Drop existing restrictive read policy
drop policy if exists "Enable read own automations" on public.automations;

-- Create permissive policy (allows reading all automations)
-- This is needed because when clients approve from email, there's no authenticated user
create policy "Enable read automations for executor" on public.automations
for select using (true);

-- NOTE: This policy allows reading ALL automations, not just by user_id
-- The code filters by user_id, but RLS can't enforce that without auth
-- For production, you MUST use SUPABASE_SERVICE_ROLE_KEY instead

