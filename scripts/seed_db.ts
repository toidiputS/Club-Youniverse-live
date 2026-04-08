import { createClient } from "@supabase/supabase-js";

// Use the environment variables from the project
const supabaseUrl = "https://ksnjoyfsmbkvzqhpjhpr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbmpveWZzbWJrdnpxaHBqaHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDIzNzYsImV4cCI6MjA3NzcxODM3Nn0.GZ8HiOnUgeMvkZfqewShAiHAQ26_IXqz3_qPALRu7pU";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const songsToSeed = [
  {
    title: "Neon Horizon",
    artist_name: "Cyberwave",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover_art_url:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400",
    duration_sec: 372,
    uploader_id: "system",
    status: "pool",
    stars: 5,
    play_count: 0,
    source: "upload",
  },
  {
    title: "Midnight City",
    artist_name: "The Nightcallers",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover_art_url:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400",
    duration_sec: 425,
    uploader_id: "system",
    status: "pool",
    stars: 5,
    play_count: 0,
    source: "upload",
  },
  {
    title: "Digital Dreams",
    artist_name: "Synth Masters",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover_art_url:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400",
    duration_sec: 340,
    uploader_id: "system",
    status: "pool",
    stars: 5,
    play_count: 0,
    source: "upload",
  },
];

async function seed() {
  console.log("🌱 Seeding database...");

  for (const song of songsToSeed) {
    const { error } = await supabase.from("songs").insert(song).select();

    if (error) {
      console.error(`❌ Failed to insert ${song.title}:`, error);
    } else {
      console.log(`✅ Inserted ${song.title}`);
    }
  }
  console.log("✨ Seeding complete.");
}

seed();
