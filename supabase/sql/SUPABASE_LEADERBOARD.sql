-- 🏆 YOUNIVERSAL LEADERBOARD SETUP
-- Tracks wins for the multiplayer particle game.

CREATE TABLE IF NOT EXISTS public.youniversal_leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    wins INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.youniversal_leaderboard ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Leaderboard is viewable by everyone" ON public.youniversal_leaderboard
    FOR SELECT USING (true);

CREATE POLICY "System can update leaderboard" ON public.youniversal_leaderboard
    FOR ALL USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leaderboard_modtime
    BEFORE UPDATE ON public.youniversal_leaderboard
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
