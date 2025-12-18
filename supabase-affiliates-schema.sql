-- Affiliates/Referrals schema
-- Tracks user referrals and affiliate earnings

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- The user who referred this user
  referral_code text NOT NULL UNIQUE, -- Unique referral code for each user
  total_referrals integer DEFAULT 0, -- Total number of users referred
  total_earnings numeric(12,2) DEFAULT 0, -- Total earnings from referrals
  commission_rate numeric(5,2) DEFAULT 30.00, -- Commission percentage (default 30%)
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Referral tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User who made the referral
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User who was referred
  referral_code text NOT NULL, -- The code that was used
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Converted', 'Cancelled')),
  subscription_value numeric(12,2) DEFAULT 0, -- Value of the subscription
  commission_earned numeric(12,2) DEFAULT 0, -- Commission earned from this referral
  commission_paid boolean DEFAULT false, -- Whether commission has been paid
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  converted_at timestamptz, -- When the referral converted to a paying customer
  UNIQUE(referred_user_id) -- A user can only be referred once
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Affiliates policies
CREATE POLICY "Users can view their own affiliate record"
  ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view referrer's affiliate record if they were referred by them"
  ON public.affiliates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.referrals 
      WHERE referrals.referred_user_id = auth.uid() 
      AND referrals.referrer_id = affiliates.user_id
    )
  );

CREATE POLICY "Users can insert their own affiliate record"
  ON public.affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate record"
  ON public.affiliates FOR UPDATE
  USING (auth.uid() = user_id);

-- Referrals policies
CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view referrals where they were referred"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_user_id);

CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true); -- Will be controlled by application logic

CREATE POLICY "Users can update referrals they made"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = referrer_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- Updated_at triggers
CREATE TRIGGER handle_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.affiliates WHERE referral_code = code) INTO exists_check;
    
    -- If code doesn't exist, return it
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.affiliates IS 'Affiliate program records for users';
COMMENT ON TABLE public.referrals IS 'Tracks individual referrals and commissions';
COMMENT ON COLUMN public.affiliates.commission_rate IS 'Commission percentage (e.g., 30.00 for 30%)';
COMMENT ON COLUMN public.referrals.status IS 'Pending: Referred but not subscribed, Active: Subscribed, Converted: Paying customer, Cancelled: Referral cancelled';


