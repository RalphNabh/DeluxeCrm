-- Tighten referrals INSERT policy (run in Supabase SQL Editor)
DROP POLICY IF EXISTS "Users can insert referrals" ON referrals;

CREATE POLICY "Users can insert referrals for themselves as referrer"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);
