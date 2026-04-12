/**
 * @file TheBox Component - The 2-song voting mechanism (Mobile Optimized)
 */

import React, { useContext, useState, useEffect } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import type { Song } from "../types";
import { Info, Play, Square, Star } from "lucide-react";

export const TheBox: React.FC = () => {
  const context = useContext(RadioContext);
  const { radioState = "POOL" } = context || {};
  const [candidates, setCandidates] = useState<Song[]>([]);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showStatsId, setShowStatsId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  if (!context) return null;

  // Preview Logic
  const handlePreview = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation(); // Don't vote when clicking preview
    
    if (previewId === song.id) {
        audioRef.current?.pause();
        setPreviewId(null);
        return;
    }

    if (audioRef.current) {
        audioRef.current.pause();
    }

    const audio = new Audio(song.audioUrl);
    audio.volume = 0.5;
    audioRef.current = audio;
    setPreviewId(song.id);
    audio.play();

    // Auto-stop after 15 seconds
    setTimeout(() => {
        if (audioRef.current === audio) {
            audio.pause();
            setPreviewId(null);
        }
    }, 15000);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
        audioRef.current?.pause();
    };
  }, []);

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
      <div className="grid grid-cols-2 gap-2">
        {/* Voting Candidates */}
        {[0, 1].map((idx) => {
          const song = candidates[idx];
          if (!song) return (
            <div key={`empty-${idx}`} className="h-full min-h-16 bg-zinc-900/40 border border-white/3 rounded-xl flex items-center justify-center">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-700 animate-pulse">Syncing...</span>
            </div>
          );

          return (
            <div
              key={song.id}
              onClick={() => handleVote(song.id)}
              className={`group relative flex flex-col p-0.5 sm:p-1 rounded-lg border transition-all duration-300 overflow-hidden cursor-pointer ${
                votedId === song.id
                  ? 'border-purple-600 bg-zinc-900 ring-1 ring-purple-500/50'
                  : 'border-white/6 bg-zinc-950 hover:bg-zinc-900 hover:border-white/20'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleVote(song.id); }}
            >
              {/* Thumbnail */}
              <div className="relative h-8 sm:h-10 rounded-md overflow-hidden mb-0.5 border border-white/5">
                <img
                  src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    votedId && votedId !== song.id ? 'opacity-20 grayscale' : 'group-hover:scale-105'
                  }`}
                  alt={song.title}
                />

                {/* Stats / Influence Badge */}
                <div className="absolute bottom-0.5 left-0.5 flex items-center gap-1">
                  <div className="px-0.5 py-0 rounded-md bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-0.5">
                    <Star size={5} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-[5px] font-black text-white">{song.stars?.toFixed(0)}</span>
                  </div>
                </div>

                {/* Vote Badge */}
                <div className={`absolute top-0.5 right-0.5 px-1 py-0 rounded-full backdrop-blur-md border transition-all flex items-center gap-1 ${
                  votedId === song.id
                    ? 'bg-purple-600/90 border-purple-400'
                    : 'bg-black/60 border-white/10 group-hover:bg-purple-900/40 group-hover:border-purple-500/30'
                }`}>
                  <span className={`text-[6px] font-black tracking-wider ${
                    votedId === song.id ? 'text-white' : 'text-zinc-300 group-hover:text-purple-300'
                  }`}>
                    {votedId === song.id ? 'VOTED' : 'VOTE'}
                  </span>
                  <div className="w-px h-1.5 bg-white/20" />
                  <span className="text-[6px] font-black text-white/80">{song.upvotes || 0}</span>
                </div>

                {/* Preview Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                   <button 
                     onClick={(e) => handlePreview(e, song)}
                     className="p-1 rounded-full bg-white text-black hover:scale-110 transition-transform shadow-lg"
                   >
                     {previewId === song.id ? <Square size={6} fill="currentColor" /> : <Play size={6} fill="currentColor" />}
                   </button>
                   <button 
                     onMouseEnter={() => setShowStatsId(song.id)}
                     onMouseLeave={() => setShowStatsId(null)}
                     onClick={(e) => { e.stopPropagation(); setShowStatsId(song.id === showStatsId ? null : song.id); }}
                     className="p-1 rounded-full bg-zinc-900 text-white border border-white/10 hover:border-white/30"
                   >
                     <Info size={6} />
                   </button>
                </div>

                {/* Stats Pop-out */}
                {showStatsId === song.id && (
                  <div className="absolute inset-0 z-20 bg-zinc-950/95 backdrop-blur-md p-1 flex flex-col justify-center border border-purple-500/30 rounded-lg animate-in fade-in zoom-in duration-200">
                     <div className="flex-1 min-w-0 pr-1 pl-1 border-r border-white/6 flex items-center justify-between">
                        <span className="text-[5px] font-black text-purple-400 uppercase tracking-widest">N-Data</span>
                        <Star size={6} className="text-yellow-500" />
                     </div>
                     <div className="space-y-0.5">
                        <div className="flex justify-between">
                           <span className="text-[4px] text-zinc-500 uppercase">Plays</span>
                           <span className="text-[4px] text-white font-bold">{song.playCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-[4px] text-zinc-500 uppercase">Seen</span>
                           <span className="text-[4px] text-white font-bold">{song.boxAppearanceCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-[4px] text-zinc-500 uppercase">Strikes</span>
                           <span className={`text-[4px] font-bold ${song.boxRoundsLost > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                              {song.boxRoundsLost || 0}/3
                           </span>
                        </div>
                     </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="w-full text-left px-0.5">
                <h4 className={`text-[7px] sm:text-[8px] font-black leading-tight truncate uppercase transition-colors ${
                  votedId === song.id ? 'text-purple-300' : 'text-white'
                }`}>
                  {song.title}
                </h4>
                <p className="text-zinc-600 text-[5px] sm:text-[6px] font-bold truncate uppercase">
                  {song.artistName}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
