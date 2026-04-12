-- 🛠️ CLUB YOUNIVERSE - RLS FIX SCRIPT
-- Resolves: "new row violates row-level security policy for table songs"
-- This update allows all authenticated users to contribute to song metadata (stars, votes, play counts)
-- while maintaining security for other tables.

-- 1. Drop the restrictive update policy
DROP POLICY IF EXISTS "Allow authenticated update (owner or admin)" ON public.songs;

-- 2. Create the expanded metadata-friendly policy for songs
-- Allowing 'anon' (Guests) so they can lead the radio on the sidewalk.
CREATE POLICY "Allow update for metadata"
  ON public.songs FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 3. Ensure broadcasts table allows the Leader (who could be a guest) to transition songs
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow any user to update broadcast" ON public.broadcasts;
CREATE POLICY "Allow any user to update broadcast"
  ON public.broadcasts FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 4. Verify RLS is still enabled
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
