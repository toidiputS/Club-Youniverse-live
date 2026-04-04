/**
 * @file TheBox Component - The 2-song voting mechanism (Mobile Optimized)
 */

import React, { useContext, useState, useEffect } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import type { Song } from "../types";

export const TheBox: React.FC = () => {
  const context = useContext(RadioContext);
  if (!context) return null;

  const { radioState } = context;
  const [candidates, setCandidates] = useState<Song[]>([]);
  const [votedId, setVotedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBox = async () => {
      const { data } = await supabase
        .from("songs")
        .select("*")
        .eq("status", "in_box")
        .limit(2);

      if (data) {
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
    const interval = setInterval(fetchBox, 5000);

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

  const roundKey = candidates.length === 2
    ? `voted_round_${[...candidates].map(c => c.id).sort().join('_')}`
    : null;

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
    setVotedId(songId);
    localStorage.setItem(roundKey, songId);

    const { data: song } = await supabase.from("songs").select("upvotes").eq("id", songId).single();
    if (song) {
      await supabase.from("songs").update({ upvotes: (song.upvotes || 0) + 1 }).eq("id", songId);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Voting Grid - Mobile Optimized (2 candidates only) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Voting Candidates */}
        {[0, 1].map((idx) => {
          const song = candidates[idx];
          if (!song) return (
            <div key={`empty-${idx}`} className="h-full min-h-[4rem] bg-zinc-900/40 border border-white/[0.03] rounded-xl flex items-center justify-center">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-700 animate-pulse">Syncing...</span>
            </div>
          );

          return (
            <button
              key={song.id}
              onClick={() => handleVote(song.id)}
              disabled={!!votedId}
              className={`group relative flex flex-col p-1.5 rounded-xl border transition-all duration-300 overflow-hidden ${
                votedId === song.id
                  ? 'border-purple-600 bg-zinc-900 ring-1 ring-purple-500/50'
                  : 'border-white/[0.06] bg-zinc-950 hover:bg-zinc-900 hover:border-white/20'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative h-12 sm:h-14 rounded-lg overflow-hidden mb-1 border border-white/5">
                <img
                  src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    votedId && votedId !== song.id ? 'opacity-20 grayscale' : 'group-hover:scale-105'
                  }`}
                  alt={song.title}
                />

                {song.isDsw && (
                  <div className="absolute top-0 left-0 px-1 py-0.5 rounded-br-lg bg-red-500 text-[5px] font-black text-white tracking-wider uppercase z-10">
                    DSW
                  </div>
                )}

                {/* Vote Badge */}
                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full backdrop-blur-md border transition-all ${
                  votedId === song.id
                    ? 'bg-purple-600/90 border-purple-400'
                    : 'bg-black/60 border-white/10 group-hover:bg-purple-900/40 group-hover:border-purple-500/30'
}`}>
                  <span className={`text-[7px] font-black tracking-wider ${
                    votedId === song.id ? 'text-white' : 'text-zinc-300 group-hover:text-purple-300'
                  }`}>
                    {votedId === song.id ? 'VOTED' : 'VOTE'}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="w-full text-left px-0.5">
                <h4 className={`text-[9px] font-black leading-tight truncate uppercase transition-colors ${
                  votedId === song.id ? 'text-purple-300' : 'text-white'
                }`}>
                  {song.title}
                </h4>
                <p className="text-zinc-600 text-[7px] font-bold truncate uppercase">
                  {song.artistName}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
