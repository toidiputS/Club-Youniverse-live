-- 💰 CLUB YOUNIVERSE - MONETIZATION SCHEMA
-- This script sets up the "Daily Cover Charge" and "First 100" logic.

-- 1. Extend Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS is_first_100 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_streak_update timestamptz;

-- 2. Daily Passes Table
-- Tracks who has paid the $1 entry for the current 24h window
CREATE TABLE IF NOT EXISTS public.daily_passes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT null,
    stripe_payment_intent_id text,
    amount_paid_cents integer DEFAULT 100,
    expires_at timestamptz NOT null,
    is_free_streak_pass boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- RLS for passes
ALTER TABLE public.daily_passes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own passes" ON public.daily_passes
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Utility Function to count remaining First 100 spots
CREATE OR REPLACE FUNCTION get_first_100_remaining()
RETURNS integer AS $$
DECLARE
    taken_count integer;
BEGIN
    SELECT count(*) INTO taken_count FROM public.profiles WHERE is_first_100 = true;
    RETURN GREATEST(0, 100 - taken_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Automatically assign First 100 status to new signups if spots available
-- Note: This happens AFTER auth.users insert (via handle_new_user trigger in SUPABASE_SETUP)
-- We'll update the handle_new_user function to include this logic.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger as $$
DECLARE
    remaining_spots integer;
BEGIN
  SELECT count(*) INTO remaining_spots FROM public.profiles WHERE is_first_100 = true;
  
  INSERT INTO public.profiles (user_id, email, name, is_first_100)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    (remaining_spots < 100)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
