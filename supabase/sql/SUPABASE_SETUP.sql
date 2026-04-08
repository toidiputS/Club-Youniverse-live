-- 🎵 CLUB YOUNIVERSE - MASTER SUPABASE SETUP SCRIPT
-- Run this entire script in the Supabase SQL Editor to set up your database.

-- ==========================================
-- 1. TABLES
-- ==========================================

-- PROFILES TABLE
-- Stores user data. 'is_artist' becomes TRUE only after first upload.
create table public.profiles (
  user_id uuid references auth.users not null primary key,
  email text,
  name text, -- Display name (Artist Name)
  phone_number text, -- Required for Artists
  is_artist boolean default false,
  is_premium boolean default false,
  roast_consent boolean default false,
  is_admin boolean default false, -- For DJ Booth access
  avatar_url text,
  last_debut_at timestamptz, -- Tracks 24h rule for debuts
  stats jsonb default '{"plays": 0, "uploads": 0, "votes_cast": 0, "graveyard_count": 0}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SONGS TABLE
-- The core music library.
create table public.songs (
  id uuid default gen_random_uuid() primary key,
  uploader_id uuid references public.profiles(user_id) not null,
  title text not null,
  artist_name text not null, -- Snapshot of artist name at time of upload
  source text check (source in ('suno', 'producer.ai', 'mubert', 'upload')),
  audio_url text not null,
  cover_art_url text,
  lyrics text,
  duration_sec integer default 0,
  is_dsw boolean default false,
  dsw_announced boolean default false,
  genre text default 'Other',
  stars integer default 5, -- Starts at 5, max 10, min 0
  status text check (status in ('pool', 'in_box', 'now_playing', 'graveyard', 'debut', 'next_play', 'review')) default 'pool',
  suno_url text,
  box_rounds_seen integer default 0,
  box_rounds_lost integer default 0,
  box_appearance_count integer default 0, -- Tracks consecutive appearances in box
  play_count integer default 0,
  upvotes integer default 0,
  downvotes integer default 0,
  last_played_at timestamptz,
  created_at timestamptz default now()
);

-- VOTES TABLE
-- Tracks individual votes to prevent double-voting and for analytics.
create table public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(user_id) not null,
  song_id uuid references public.songs(id) not null,
  vote_type text check (vote_type in ('up', 'down', 'box_choice')),
  created_at timestamptz default now()
);

-- USER FAVORITES TABLE
-- Tracks which songs a user has "Hearted".
create table public.user_favorites (
    user_id uuid references public.profiles(user_id) on delete cascade not null,
    song_id uuid references public.songs(id) on delete cascade not null,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    primary key (user_id, song_id)
);

-- GALLERY ITEMS TABLE
-- Stores generated music videos and album covers.
create table public.gallery_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(user_id) not null,
  type text check (type in ('music-video', 'album-cover')),
  title text,
  url text not null,
  prompt text,
  created_at timestamptz default now()
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.votes enable row level security;
alter table public.user_favorites enable row level security;
alter table public.gallery_items enable row level security;

-- PROFILES POLICIES
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( (select auth.uid()) = user_id );

-- SONGS POLICIES
create policy "Songs are viewable by everyone."
  on public.songs for select
  using ( true );

create policy "Authenticated users can upload songs."
  on public.songs for insert
  with check ( (select auth.role()) = 'authenticated' );

create policy "Allow authenticated update (owner or admin)"
  on public.songs for update
  using (
    (select auth.uid()) = uploader_id 
    or 
    exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_admin = true)
  );

create policy "Allow authenticated delete (owner or admin)"
  on public.songs for delete
  using (
    (select auth.uid()) = uploader_id 
    or 
    exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_admin = true)
  );

-- VOTES POLICIES
create policy "Votes are viewable by everyone."
  on public.votes for select
  using ( true );

create policy "Authenticated users can vote."
  on public.votes for insert
  with check ( (select auth.role()) = 'authenticated' );

-- GALLERY POLICIES
create policy "Gallery items are viewable by everyone."
  on public.gallery_items for select
  using ( true );

create policy "Users can add to gallery."
  on public.gallery_items for insert
  with check ( (select auth.uid()) = user_id );

-- ==========================================
-- 3. STORAGE BUCKETS
-- ==========================================

-- Note: You usually have to create buckets in the dashboard, but we can try to insert them if the system allows.
-- If this fails, create buckets named 'songs', 'covers', 'videos' manually in the dashboard and set them to Public.

insert into storage.buckets (id, name, public) values ('songs', 'songs', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('videos', 'videos', true) on conflict do nothing;

-- STORAGE POLICIES (Allow authenticated uploads)
create policy "Authenticated users can upload songs"
  on storage.objects for insert
  with check ( bucket_id = 'songs' and (select auth.role()) = 'authenticated' );

create policy "Authenticated users can upload covers"
  on storage.objects for insert
  with check ( bucket_id = 'covers' and (select auth.role()) = 'authenticated' );

create policy "Authenticated users can upload videos"
  on storage.objects for insert
  with check ( bucket_id = 'videos' and (select auth.role()) = 'authenticated' );
  
create policy "Public read access for all buckets"
  on storage.objects for select
  using ( bucket_id in ('songs', 'covers', 'videos') );

-- ==========================================
-- 4. TRIGGERS & FUNCTIONS
-- ==========================================

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 5. INDEXES (For Performance)
-- ==========================================

create index if not exists songs_status_idx on public.songs (status);
create index if not exists songs_stars_idx on public.songs (stars);
create index if not exists profiles_is_artist_idx on public.profiles (is_artist);
