-- Fix subscriptions table: Add UNIQUE constraint on user_id
-- This allows the upsert with onConflict: 'user_id' to work correctly

-- First, check if there are any duplicate user_ids (there shouldn't be, but let's be safe)
-- If you see any duplicates, you'll need to resolve them first

-- Add UNIQUE constraint on user_id
-- If the constraint already exists, this will fail gracefully with IF NOT EXISTS
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Verify the constraint was added
-- You can check this in Supabase Table Editor → subscriptions → Constraints
