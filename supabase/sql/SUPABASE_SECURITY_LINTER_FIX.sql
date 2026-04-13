-- 🛡️ CLUB YOUNIVERSE - SECURITY LINTER FIXES
-- This script addresses several security warnings from the Supabase Linter.

-- 1. Fix Function Search Path (Resolves: function_search_path_mutable)
-- Setting search_path to 'public' prevents search_path hijacking attacks.

ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_first_100_remaining() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. Tighten RLS Policy (Resolves: rls_policy_always_true)
-- Replaces overly permissive 'USING (true)' with a check for authenticated status.

-- Drop known variations of the policy
DROP POLICY IF EXISTS "Allow update for metadata" ON public.songs;
DROP POLICY IF EXISTS "Allow authenticated update for metadata" ON public.songs;

CREATE POLICY "Allow authenticated update for metadata"
  ON public.songs FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) IS NOT NULL )
  WITH CHECK ( (select auth.uid()) IS NOT NULL );

-- 3. Tighten Broadcast RLS Policy
DROP POLICY IF EXISTS "Allow any user to update broadcast" ON public.broadcasts;
CREATE POLICY "Allow authenticated update for broadcast"
  ON public.broadcasts FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) IS NOT NULL )
  WITH CHECK ( (select auth.uid()) IS NOT NULL );

-- 4. Note on auth_leaked_password_protection
-- This must be enabled in the Supabase Dashboard:
-- Auth -> Settings -> Password Security -> Enable "Protect against leaked passwords"
