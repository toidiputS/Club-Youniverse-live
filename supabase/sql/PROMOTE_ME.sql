-- 🛠️ DATABASE FIX: ADD ROLE COLUMN AND PROMOTE OWNER
-- Run this in the Supabase SQL Editor to resolve the "column role does not exist" error.

-- 1. Check and Add the 'role' column if it's missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'listener';
    END IF;
END $$;

-- 2. Promote user to Owner
-- This ensures you have full administrative access to all tools (Bouncer, Song Editing, etc.)
UPDATE public.profiles 
SET role = 'owner' 
WHERE email = 'itstraderbaby@gmail.com';

-- 3. Verify the change (Check the Results tab after running)
SELECT name, email, role FROM public.profiles WHERE email = 'itstraderbaby@gmail.com';
