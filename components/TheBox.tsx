/**
 * @file TheBox Component - The 2-song voting mechanism.
 */

import React, { useContext, useState, useEffect } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import type { Song } from "../types";

export const TheBox: React.FC = () => {
  const context = useContext(RadioContext);
  if (!context) return null;

  const { radioState, nowPlaying } = context;
  const [candidates, setCandidates] = useState<Song[]>([]);
  const [votedId, setVotedId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch 'in_box' songs from DB
    const fetchBox = async () => {
      const { data } = await supabase
        .from("songs")
        .select("*")
        .eq("status", "in_box")
        .limit(2);

      if (data) {
        // Map snake_case to camelCase
        setCandidates(data.map((raw: any) => ({
          id: raw.id,
          title: raw.title,
          artistName: raw.artist_name,
          audioUrl: raw.audio_url,
          coverArtUrl: raw.cover_art_url,
          is_canvas: raw.is_canvas,
          upvotes: raw.upvotes || 0,
          status: raw.status,
          uploaderId: raw.uploader_id,
          source: raw.source,
          durationSec: raw.duration_sec,
          stars: raw.stars,
          liveStarsSum: raw.live_stars_sum,
          liveStarsCount: raw.live_stars_count,
          isDsw: raw.is_dsw,
          boxRoundsSeen: raw.box_rounds_seen,
          boxRoundsLost: raw.box_rounds_lost,
          boxAppearanceCount: raw.box_appearance_count,
          playCount: raw.play_count,
          downvotes: raw.downvotes,
          lastPlayedAt: raw.last_played_at,
          createdAt: raw.created_at
        })));
      }
    };

    fetchBox();

    // Resilient fallback: Check every 5s if we are missing slots
    const interval = setInterval(() => {
      fetchBox();
    }, 5000);

    // Subscribe to changes in the box
    const channel = supabase.channel('box-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, (payload) => {
        const newSong = payload.new as any;
        const oldSong = payload.old as any;
        if (newSong?.status === 'in_box' || oldSong?.status === 'in_box') {
          fetchBox();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [radioState]);

  // 1. Generate a unique key for this pair of songs to prevent re-voting in the same round
  const roundKey = candidates.length === 2
    ? `voted_round_${[...candidates].map(c => c.id).sort().join('_')}`
    : null;

  // 2. Restore votedId from localStorage on mount or when candidates change
  useEffect(() => {
    if (roundKey) {
      const persistedVote = localStorage.getItem(roundKey);
      setVotedId(persistedVote);
    } else {
      setVotedId(null);
    }
  }, [roundKey]);

  const handleVote = async (songId: string) => {
    if (votedId || !roundKey) return;

    // 3. Persist the vote locally
    setVotedId(songId);
    localStorage.setItem(roundKey, songId);

    // Optimistic / Real update
    const { data: song } = await supabase.from("songs").select("upvotes").eq("id", songId).single();
    if (song) {
      // Add 10 votes for punchy weight
      await supabase.from("songs").update({ upvotes: (song.upvotes || 0) + 10 }).eq("id", songId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent w-full">
      {/* Box Header - Minimalist */}
      <div className="w-full flex justify-between items-center mb-2 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-400">
            The <span className="text-purple-400">Box</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Live Vote</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* On Air / Now Playing Info Box */}
        <div className="relative flex flex-col p-1.5 rounded-xl border border-purple-500/30 bg-zinc-950 shadow-[0_0_15px_rgba(168,85,247,0.15)] group">
          <div className="relative h-16 rounded-lg overflow-hidden mb-1.5 border border-white/5">
            {nowPlaying ? (
              nowPlaying.is_canvas && nowPlaying.coverArtUrl ? (
                <video
                  src={nowPlaying.coverArtUrl}
                  className="w-full h-full object-cover grayscale opacity-50 pointer-events-none"
                  autoPlay loop muted playsInline
                />
              ) : (
                <img
                  src={nowPlaying.coverArtUrl || `https://picsum.photos/seed/${nowPlaying.id}/100`}
                  className="w-full h-full object-cover grayscale opacity-50"
                  alt={nowPlaying.title}
                />
              )
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-ping" />
              </div>
            )}
            {/* Minimal Vote Badge */}
            <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center justify-center border border-white/10">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse mr-1" />
              <span className="text-[7px] font-black text-green-400 tracking-wider">ON AIR</span>
            </div>
          </div>
          <div className="w-full text-left px-1">
            <h4 className="text-[10px] font-black text-white leading-tight truncate uppercase tracking-tight">
              {nowPlaying?.title || "Silence"}
            </h4>
            <p className="text-zinc-500 text-[8px] font-bold truncate uppercase tracking-tighter group-hover:text-zinc-400 transition-colors">
              {nowPlaying?.artistName || "Unknown"}
            </p>
          </div>
        </div>

        {/* Voting Candidates */}
        {[0, 1].map((idx) => {
          const song = candidates[idx];
          if (!song) return (
            <div key={`empty-${idx}`} className="h-full min-h-[5rem] bg-zinc-900/40 border border-white/[0.03] rounded-xl flex items-center justify-center">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700 animate-pulse">Syncing...</span>
            </div>
          );

          return (
            <button
              key={song.id}
              onClick={() => handleVote(song.id)}
              disabled={!!votedId}
              className={`group relative flex flex-col p-1.5 rounded-xl border transition-all duration-500 overflow-hidden ${votedId === song.id
                ? 'border-purple-600 bg-zinc-900'
                : 'border-white/[0.06] bg-zinc-950 hover:bg-zinc-900 hover:border-white/20'
                }`}
            >
              {/* Compact Thumbnail */}
              <div className="relative h-16 rounded-lg overflow-hidden mb-1.5 border border-white/5">
                {song.is_canvas && song.coverArtUrl ? (
                  <video
                    src={song.coverArtUrl}
                    className={`w-full h-full object-cover transition-all duration-700 pointer-events-none ${votedId && votedId !== song.id ? 'opacity-20 grayscale' : 'group-hover:scale-105'}`}
                    autoPlay loop muted playsInline
                  />
                ) : (
                  <img
                    src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`}
                    className={`w-full h-full object-cover transition-all duration-700 ${votedId && votedId !== song.id ? 'opacity-20 grayscale' : 'group-hover:scale-105'}`}
                    alt={song.title}
                  />
                )}

                {song.isDsw && (
                  <div className="absolute top-0 left-0 px-1.5 py-0.5 rounded-br-lg bg-red-500 text-[6px] font-black text-white tracking-widest uppercase z-10 shadow-lg shadow-red-500/50 animate-pulse">
                    Dead Song Walking
                  </div>
                )}

                {/* Minimal Vote Badge */}
                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${votedId === song.id
                  ? 'bg-purple-600/80 border-purple-400'
                  : 'bg-black/60 border-white/10 group-hover:bg-purple-900/40 group-hover:border-purple-500/30'
                  }`}>
                  <span className={`text-[7px] font-black tracking-wider ${votedId === song.id ? 'text-white' : 'text-zinc-300 group-hover:text-purple-300'}`}>
                    {votedId === song.id ? 'VOTED' : 'VOTE'}
                  </span>
                </div>
              </div>

              {/* Minimal Text Info */}
              <div className="w-full text-left px-1">
                <h4 className={`text-[10px] font-black leading-tight truncate uppercase tracking-tight transition-colors ${votedId === song.id ? 'text-purple-300' : 'text-white'}`}>
                  {song.title}
                </h4>
                <p className="text-zinc-500 text-[8px] font-bold truncate uppercase tracking-tighter group-hover:text-zinc-400 transition-colors">
                  {song.artistName}
                </p>
              </div>

              {votedId === song.id && (
                <div className="absolute inset-0 bg-purple-500/5 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
