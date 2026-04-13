-- Create the broadcasts table to manage global radio state
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_song_id UUID REFERENCES public.songs(id),
    song_started_at TIMESTAMPTZ DEFAULT NOW(),
    radio_state TEXT NOT NULL DEFAULT 'DJ_BANTER_INTRO', -- 'NOW_PLAYING', 'DJ_TALKING', 'BOX_VOTING', etc.
    box_round_id TEXT, -- ID of the active box round if any
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) -- The "DJ" or system user who updated it
);

-- Enable Row Level Security
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the broadcast state (it's a public radio)
DROP POLICY IF EXISTS "Public broadcasts are viewable by everyone" ON public.broadcasts;
CREATE POLICY "Public broadcasts are viewable by everyone"
ON public.broadcasts FOR SELECT
USING (true);

-- Allow authenticated users (DJs/Admins) to update the broadcast
-- In a real prod env, this might be restricted to specific DJ roles.
DROP POLICY IF EXISTS "Authenticated users can update broadcast" ON public.broadcasts;
CREATE POLICY "Authenticated users can update broadcast"
ON public.broadcasts FOR ALL
USING ((select auth.role()) = 'authenticated');

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;

-- Create a single initial broadcast row if it doesn't exist
INSERT INTO public.broadcasts (id, radio_state)
SELECT '00000000-0000-0000-0000-000000000000', 'DJ_BANTER_INTRO'
WHERE NOT EXISTS (SELECT 1 FROM public.broadcasts);
