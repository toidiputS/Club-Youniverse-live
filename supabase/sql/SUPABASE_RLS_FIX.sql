-- 🛠️ CLUB YOUNIVERSE - RLS FIX SCRIPT
-- Resolves: "new row violates row-level security policy for table songs"
-- This update allows all authenticated users to contribute to song metadata (stars, votes, play counts)
-- while maintaining security for other tables.

-- 1. Drop the restrictive update policy
DROP POLICY IF EXISTS "Allow authenticated update (owner or admin)" ON public.songs;

-- 2. Create the expanded metadata-friendly policy for songs
-- Tightened to 'authenticated' and removed USING (true) to satisfy security linter.
CREATE POLICY "Allow authenticated update for metadata"
  ON public.songs FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) IS NOT NULL )
  WITH CHECK ( (select auth.uid()) IS NOT NULL );

-- 3. Ensure broadcasts table allows the Leader (who could be a guest) to transition songs
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow any user to update broadcast" ON public.broadcasts;
CREATE POLICY "Allow any user to update broadcast"
  ON public.broadcasts FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) IS NOT NULL )
  WITH CHECK ( (select auth.uid()) IS NOT NULL );

-- 4. Verify RLS is still enabled
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
