/**
 * @file TheBox Component - The 2-song voting mechanism (Mobile Optimized)
 */

import React, { useContext, useState, useEffect } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import type { Song } from "../types";
import { Info, Play, Square, Star, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const TheBox: React.FC = () => {
  const context = useContext(RadioContext);
  const { radioState = "POOL" } = context || {};
  const [candidates, setCandidates] = useState<Song[]>([]);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showStatsId, setShowStatsId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  if (!context) return null;

  // ... (keeping existing logic for fetchBox, handleVote, handlePreview) ...
  // [I will merge the logic mentally and output the full replacement below]

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
    <div className="relative w-full">
      {/* 
          1. TRIGGER TAB (Always Visible at Sidebar Bottom)
      */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-1.5 flex flex-col items-center justify-center bg-black/40 hover:bg-black/60 border-t border-white/5 transition-all group relative z-10"
      >
         <div className="flex items-center gap-2">
            <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/30 group-hover:text-white transition-colors">Voter Box</span>
            {isExpanded ? <ChevronDown size={8} className="text-white/40" /> : <ChevronUp size={8} className="text-white/40 group-hover:animate-bounce" />}
         </div>
      </button>

      {/* 
          2. SLIDING DRAWER (Slides UP over the chat input)
      */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: "20%", opacity: 0, scale: 0.95 }}
            animate={{ y: "-100%", opacity: 1, scale: 1 }}
            exit={{ y: "20%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 250 }}
            className="absolute left-1 right-1 p-2 bg-zinc-950 border border-white/10 rounded-xl shadow-[0_-20px_50px_rgba(0,0,0,0.9)] z-20 pointer-events-auto mb-1"
            style={{ bottom: "100%" }}
          >
             {/* Header Section */}
             <div className="flex items-center justify-between mb-2 px-1 border-b border-white/5 pb-1.5">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-500 animate-ping" />
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] italic">Live Election</span>
                </div>
                <button 
                    onClick={() => setIsExpanded(false)} 
                    className="text-white/20 hover:text-white transition-colors p-1"
                >
                    <ChevronDown size={10} />
                </button>
             </div>

             {/* Voting Grid */}
             <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((idx) => {
                  const song = candidates[idx];
                  if (!song) return (
                    <div key={`empty-${idx}`} className="h-20 bg-zinc-900/40 border border-white/3 rounded-xl flex items-center justify-center">
                      <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-700 animate-pulse">Syncing...</span>
                    </div>
                  );

                  return (
                    <div
                      key={song.id}
                      onClick={() => handleVote(song.id)}
                      className={`group relative flex flex-col p-1 rounded-lg border transition-all duration-300 overflow-hidden cursor-pointer ${
                        votedId === song.id
                          ? 'border-purple-600 bg-zinc-900 ring-1 ring-purple-500/50'
                          : 'border-white/6 bg-zinc-950 hover:bg-zinc-900 hover:border-white/20'
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Thumbnail Area */}
                      <div className="relative h-14 rounded-md overflow-hidden mb-1 border border-white/5 shadow-inner">
                        <img
                          src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/150`}
                          className={`w-full h-full object-cover transition-all duration-700 ${
                            votedId && votedId !== song.id ? 'opacity-20 grayscale' : 'group-hover:scale-110'
                          }`}
                          alt={song.title}
                        />

                        {/* Stars Overlay */}
                        <div className="absolute bottom-1 left-1">
                          <div className="px-1 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-lg">
                            <Star size={6} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-[6px] font-black text-white">{song.stars?.toFixed(0)}</span>
                          </div>
                        </div>

                        {/* Status Label */}
                        <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full backdrop-blur-md border transition-all flex items-center gap-1 ${
                          votedId === song.id ? 'bg-purple-600 border-purple-400' : 'bg-black/60 border-white/10'
                        }`}>
                          <span className="text-[6px] font-black uppercase tracking-widest text-white/90">
                            {votedId === song.id ? 'Voted' : 'Vote'}
                          </span>
                        </div>

                        {/* Preview Interaction Layer */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                           <button 
                             onClick={(e) => handlePreview(e, song)}
                             className="p-1.5 rounded-full bg-white text-black hover:scale-110 active:scale-90 transition-all shadow-xl"
                           >
                             {previewId === song.id ? <Square size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" />}
                           </button>
                           <button 
                             onMouseEnter={() => setShowStatsId(song.id)}
                             onMouseLeave={() => setShowStatsId(null)}
                             className="p-1.5 rounded-full bg-zinc-950/80 text-white border border-white/10 hover:border-purple-500/50"
                           >
                             <Info size={8} />
                           </button>
                        </div>

                        {/* Stats Panel */}
                        <AnimatePresence>
                            {showStatsId === song.id && (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="absolute inset-0 z-30 bg-zinc-950/95 backdrop-blur-xl p-2 flex flex-col justify-center border border-purple-500/30 rounded-lg"
                            >
                                <div className="space-y-1">
                                    <div className="flex justify-between border-b border-white/5 pb-0.5">
                                        <span className="text-[5px] text-zinc-500 uppercase tracking-tighter">Plays</span>
                                        <span className="text-[5px] text-white font-black">{song.playCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-0.5">
                                        <span className="text-[5px] text-zinc-500 uppercase tracking-tighter">Seen</span>
                                        <span className="text-[5px] text-white font-black">{song.boxAppearanceCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[5px] text-zinc-500 uppercase tracking-tighter">Strikes</span>
                                        <span className={`text-[5px] font-black ${song.boxRoundsLost > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                            {song.boxRoundsLost || 0}/3
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                            )}
                        </AnimatePresence>
                      </div>

                      {/* Song Info Section */}
                      <div className="px-1 pb-1">
                        <h4 className={`text-[9px] font-black leading-tight truncate uppercase transition-colors ${
                          votedId === song.id ? 'text-purple-300' : 'text-white'
                        }`}>
                          {song.title}
                        </h4>
                        <p className="text-zinc-500 text-[6px] font-bold truncate uppercase tracking-tighter">
                          {song.artistName}
                        </p>
                      </div>
                    </div>
                  );
                })}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

