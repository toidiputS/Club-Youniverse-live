/**
 * @file This service handles all interactions with Supabase for song data,
 * including file uploads to Storage and metadata management in the database.
 */
import { supabase } from "./supabaseClient";
import type { Song } from "../types";

// Define the shape of the song object as it exists in the database (snake_case).
type DbSong = {
  id: string;
  uploader_id: string;
  title: string;
  artist_name: string;
  source: "suno" | "producer.ai" | "mubert" | "upload";
  audio_url: string;
  duration_sec: number;
  stars: number;
  live_stars_sum: number;
  live_stars_count: number;
  is_dsw: boolean;
  box_rounds_seen: number;
  box_rounds_lost: number;
  box_appearance_count: number;
  status: "pool" | "in_box" | "now_playing" | "graveyard" | "debut";
  cover_art_url?: string;
  is_canvas?: boolean;
  lyrics?: string;
  play_count: number;
  upvotes: number;
  downvotes: number;
  last_played_at: string;
  created_at: string;
};

/**
 * Maps a song object from the database (snake_case) to the application's format (camelCase).
 * @param dbSong - The song object from the Supabase database.
 * @returns A song object in the format expected by the application.
 */
const mapDbSongToAppSong = (dbSong: DbSong): Song => {
  let audioUrl = dbSong.audio_url;

  if (audioUrl && !audioUrl.startsWith("http")) {
    const { data } = supabase!.storage.from("songs").getPublicUrl(audioUrl);
    audioUrl = data.publicUrl;
  }

  return {
    id: dbSong.id,
    uploaderId: dbSong.uploader_id,
    title: dbSong.title,
    artistName: dbSong.artist_name,
    source: dbSong.source,
    audioUrl: audioUrl,
    coverArtUrl: dbSong.cover_art_url,
    is_canvas: dbSong.is_canvas,
    durationSec: dbSong.duration_sec,
    stars: dbSong.stars,
    liveStarsSum: dbSong.live_stars_sum,
    liveStarsCount: dbSong.live_stars_count,
    isDsw: dbSong.is_dsw,
    boxRoundsSeen: dbSong.box_rounds_seen,
    boxRoundsLost: dbSong.box_rounds_lost,
    boxAppearanceCount: dbSong.box_appearance_count,
    status: dbSong.status,
    lyrics: dbSong.lyrics,
    playCount: dbSong.play_count,
    upvotes: dbSong.upvotes,
    downvotes: dbSong.downvotes,
    lastPlayedAt: dbSong.last_played_at,
    createdAt: dbSong.created_at,
  };
};

/**
 * Uploads an audio file to the 'songs' bucket in Supabase Storage.
 * A comment is included to guide the user in creating the bucket if it doesn't exist.
 * @param audioFile The audio file to upload.
 * @param userId The ID of the user uploading the file.
 * @returns The public URL of the uploaded file.
 */
export const uploadAudioFile = async (
  audioFile: File,
  userId: string,
): Promise<string> => {
  if (!supabase)
    throw new Error("Supabase client not initialized. Please set credentials.");

  // IMPORTANT: Ensure you have a Supabase Storage bucket named 'songs' with public access.
  // You can create one here: https://supabase.com/dashboard/project/_/storage/buckets
  const BUCKET_NAME = "songs";
  const fileExtension = audioFile.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExtension}`;
  const filePath = `user_uploads/${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, audioFile);

  if (uploadError) {
    console.error("Error uploading audio file:", uploadError);
    throw new Error(
      `Failed to upload audio file. Make sure a public 'songs' bucket exists in Supabase Storage.`,
    );
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * Inserts a new song's metadata into the 'songs' table in the Supabase database.
 * @param songData The song metadata to insert, using camelCase properties.
 * @returns The newly created song object from the database, mapped to camelCase.
 */
export const addSongToDatabase = async (
  songData: Omit<Song, "id" | "createdAt" | "lastPlayedAt">,
): Promise<Song> => {
  if (!supabase)
    throw new Error("Supabase client not initialized. Please set credentials.");

  // Mapping from camelCase (app) to snake_case (database)
  const songToInsert = {
    uploader_id: songData.uploaderId,
    title: songData.title,
    artist_name: songData.artistName,
    source: songData.source,
    audio_url: songData.audioUrl,
    duration_sec: songData.durationSec,
    stars: songData.stars,
    live_stars_sum: 0,
    live_stars_count: 0,
    is_dsw: false,
    box_rounds_seen: songData.boxRoundsSeen,
    box_rounds_lost: songData.boxRoundsLost,
    box_appearance_count: songData.boxAppearanceCount,
    status: songData.status,
    cover_art_url: songData.coverArtUrl,
    is_canvas: songData.is_canvas,
    lyrics: songData.lyrics,
    play_count: songData.playCount,
    upvotes: songData.upvotes,
    downvotes: songData.downvotes,
  };

  const { data, error } = await supabase
    .from("songs") // Assumes a 'songs' table exists
    .insert(songToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error adding song to database:", error);
    throw new Error(
      'Failed to save song metadata. Ensure the "songs" table schema is correct.',
    );
  }

  return mapDbSongToAppSong(data as DbSong);
};

/**
 * Fetches all songs for a specific user from the Supabase database.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of songs, mapped to camelCase.
 */
export const getUserSongs = async (userId: string): Promise<Song[]> => {
  if (!supabase)
    throw new Error("Supabase client not initialized. Please set credentials.");

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("uploader_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user songs:", error);
    throw new Error("Failed to fetch user songs.");
  }

  return data.map((song) => mapDbSongToAppSong(song as DbSong));
};

/**
 * Fetches ALL songs from the Supabase database for the global radio pool.
 * @returns A promise that resolves to an array of all songs, mapped to camelCase.
 */
export const getAllSongs = async (): Promise<Song[]> => {
  console.log("🔍 getAllSongs: Starting...");

  if (!supabase) {
    console.error("❌ getAllSongs: Supabase client not initialized!");
    throw new Error("Supabase client not initialized. Please set credentials.");
  }

  console.log("✅ getAllSongs: Supabase client is initialized");
  console.log("📡 getAllSongs: Executing query on 'songs' table...");

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("📊 getAllSongs: Query completed");
  console.log("📊 getAllSongs: Error:", error);
  console.log("📊 getAllSongs: Data length:", data?.length ?? "null");

  if (data && data.length > 0) {
    console.log("📊 getAllSongs: First song sample:", {
      id: data[0].id,
      title: data[0].title,
      status: data[0].status,
    });
  }

  if (error) {
    console.error("❌ getAllSongs: Error fetching all songs:", error);
    console.error(
      "❌ getAllSongs: Error details:",
      JSON.stringify(error, null, 2),
    );
    throw new Error("Failed to fetch all songs.");
  }

  if (!data) {
    console.warn(
      "⚠️ getAllSongs: Data is null/undefined, returning empty array",
    );
    return [];
  }

  console.log(`✅ getAllSongs: Returning ${data.length} songs`);
  return data.map((song) => mapDbSongToAppSong(song as DbSong));
};

/**
 * Updates a user's profile in the database.
 * Used for transitioning listeners to artists.
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<any>,
): Promise<void> => {
  if (!supabase) throw new Error("Supabase client not initialized.");

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating profile:", error);
    throw new Error("Failed to update profile.");
  }
};

/**
 * Fetches a user's profile from the database.
 * @param userId The ID of the user.
 * @returns The user's profile or null if not found.
 */
export const getProfile = async (userId: string): Promise<any | null> => {
  if (!supabase) throw new Error("Supabase client not initialized.");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
};

/**
 * Updates a song's metadata in the database.
 * Handles mapping from camelCase (app) to snake_case (db).
 */
export const updateSong = async (
  songId: string,
  updates: Partial<Song>,
): Promise<void> => {
  if (!supabase) throw new Error("Supabase client not initialized.");

  const dbUpdates: any = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.stars !== undefined) {
    dbUpdates.stars = Math.max(0, Math.min(10, updates.stars));
  }
  if (updates.playCount !== undefined) dbUpdates.play_count = updates.playCount;
  if (updates.boxAppearanceCount !== undefined)
    dbUpdates.box_appearance_count = updates.boxAppearanceCount;
  if (updates.lastPlayedAt) dbUpdates.last_played_at = updates.lastPlayedAt;
  if (updates.boxRoundsSeen !== undefined)
    dbUpdates.box_rounds_seen = updates.boxRoundsSeen;
  if (updates.boxRoundsLost !== undefined)
    dbUpdates.box_rounds_lost = updates.boxRoundsLost;
  if (updates.upvotes !== undefined) dbUpdates.upvotes = updates.upvotes;
  if (updates.downvotes !== undefined) dbUpdates.downvotes = updates.downvotes;

  const { error } = await supabase
    .from("songs")
    .update(dbUpdates)
    .eq("id", songId);

  if (error) {
    console.error("Error updating song:", error);
    // Don't throw here to avoid crashing the radio loop, just log it.
  }
};

/**
 * Resets ALL songs in the database to 'pool' status.
 * Useful for debugging or restarting the radio simulation.
 */
export const resetAllSongsToPool = async (): Promise<void> => {
  if (!supabase) throw new Error("Supabase client not initialized.");

  const { error } = await supabase
    .from("songs")
    .update({ status: "pool", stars: 5, play_count: 0 }) // Reset stars and play count too for a fresh start
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Dummy condition to update all rows (or use a known valid condition)

  if (error) {
    console.error("Error resetting songs:", error);
    throw new Error("Failed to reset songs.");
  }
};
