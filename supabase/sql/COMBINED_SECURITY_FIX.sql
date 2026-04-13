-- 🛡️ CLUB YOUNIVERSE CONSOLIDATED SECURITY HARDENING
-- This script applies all critical security fixes, RLS hardening, and role management.

-- 1. HARDEN FUNCTIONS (Prevent Search Path Hijacking)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_first_100_remaining() SET search_path = public;

-- 2. SCHEMA UPDATES (Role Management)
-- Ensure 'role' column exists in profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'listener';
    END IF;
END $$;

-- 3. RLS HARDENING (Tighten Permissive Policies)

-- PROFILES: Allow admins/owners to update any profile
DROP POLICY IF EXISTS "Admins can update any profile" on public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING ( 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = (SELECT auth.uid()) 
      AND (is_admin = true OR role IN ('owner', 'admin'))
    )
  );

-- SONGS: Restrict updates to staff only (prevents hijacking metadata)
DROP POLICY IF EXISTS "Authenticated users can update songs" ON public.songs;
DROP POLICY IF EXISTS "Staff can update songs" ON public.songs;
CREATE POLICY "Staff can update songs"
  ON public.songs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = (SELECT auth.uid()) 
      AND (is_admin = true OR role IN ('owner', 'admin', 'bouncer'))
    )
  );

-- BROADCASTS: Only staff can update broadcast state
DROP POLICY IF EXISTS "Anyone can update broadcasts" ON public.broadcasts;
CREATE POLICY "Staff can update broadcasts"
  ON public.broadcasts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = (SELECT auth.uid()) 
      AND (is_admin = true OR role IN ('owner', 'admin', 'bouncer'))
    )
  );

-- BOX_SLOTS: Only staff can manage slots
DROP POLICY IF EXISTS "Authenticated users can update box_slots" ON public.box_slots;
CREATE POLICY "Staff can manage box_slots"
  ON public.box_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = (SELECT auth.uid()) 
      AND (is_admin = true OR role IN ('owner', 'admin', 'bouncer'))
    )
  );

-- 4. PROMOTE OWNER (Hardcoded for itstraderbaby@gmail.com)
UPDATE public.profiles 
SET role = 'owner', is_admin = true 
WHERE email = 'itstraderbaby@gmail.com';

-- 5. VERIFY
SELECT email, role, is_admin FROM public.profiles WHERE email = 'itstraderbaby@gmail.com';
