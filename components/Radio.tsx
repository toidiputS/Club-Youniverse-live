/**
 * @file Radio Component - Rebuilt for Club Youniverse SPA architecture.
 */

import React, { useContext, useMemo, useState } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { TheBox } from "./TheBox";
import { ThePool } from "./ThePool";
import { NowPlay } from "./NowPlay";
import { Header } from "./Header";
import { TheChat } from "./TheChat";
import { UserProfileCard } from "./UserProfileCard";
import { motion, AnimatePresence } from "framer-motion";
import { AudioVisualizer } from "./AudioVisualizer";
import { LyricVisualizer } from "./LyricVisualizer";
import CosmicCanvas from "./Youniversal/CosmicCanvas";
import { YouniversalLeaderboard } from "./Youniversal/Leaderboard";
import { useGameStore } from "./Youniversal/useGameStore";
import type { Profile, ChoreographedLine, View } from "../types";
import { X, Music } from "lucide-react";

interface RadioProps {
  onNavigate: (view: View) => void;
  onSignOut: () => void;
  profile: Profile;
  minimal?: boolean;
}

export const Radio: React.FC<RadioProps> = ({ onNavigate, profile, minimal = false }) => {
  const context = useContext(RadioContext);
  if (!context) return null;
  const { sentimentBurst } = context;
  const [showProfile, setShowProfile] = useState(false);
  const [showPool, setShowPool] = useState(false);

  const parsedLyrics = useMemo((): Partial<ChoreographedLine>[] => {
    if (!context?.nowPlaying?.lyrics) return [];
    const raw = context.nowPlaying.lyrics;
    
    if (Array.isArray(raw)) return raw;

    if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn("Failed to parse lyrics");
        }
    }

    return typeof raw === 'string' 
      ? raw.split('\n').filter(line => line.trim()).map((line, i) => ({
          id: `auto-${i}`,
          time: i * 5,
          text: line.trim()
        }))
      : [];
  }, [context?.nowPlaying?.lyrics]);

  const connect = useGameStore(s => s.connect);
  const disconnect = useGameStore(s => s.disconnect);

  React.useEffect(() => {
    if (context?.danceFloorEnabled) {
      connect();
    } else {
      disconnect();
    }
  }, [context?.danceFloorEnabled, connect, disconnect]);

  if (!context) return null;

  return (
    <div className="h-full w-full relative flex flex-col bg-black overflow-hidden pt-safe-top pb-safe-bottom">
        <div className="h-full w-full relative flex z-20 overflow-hidden">
            {/* Main Content Area */}
            <div className="grow relative flex flex-col min-w-0 h-full overflow-hidden">
                {/* Atmosphere Layer */}
                <div className="absolute inset-0 z-0">
                    {context.nowPlaying && (
                        <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-overlay">
                            {context.nowPlaying.coverArtUrl?.endsWith('.mp4') ? (
                                <video 
                                    src={context.nowPlaying.coverArtUrl} 
                                    autoPlay muted loop playsInline
                                    className="w-full h-full object-cover grayscale brightness-50"
                                />
                            ) : (
                                <img 
                                    src={context.nowPlaying.coverArtUrl || `https://picsum.photos/seed/${context.nowPlaying.id}/1000`} 
                                    className="w-full h-full object-cover grayscale brightness-50" 
                                    alt="" 
                                />
                            )}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {context.vjEnabled && context.nowPlaying && parsedLyrics.length > 0 ? (
                            <motion.div key="vj" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                <LyricVisualizer 
                                    currentTime={context.currentTime}
                                    isPlaying={context.isPlaying}
                                    lyrics={parsedLyrics}
                                    volume={context.volume}
                                />
                            </motion.div>
                        ) : (
                            <motion.div key="visualizer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                {context.isPlaying ? (
                                    <AudioVisualizer isBackground={true} intensity={0.4} volume={context.volume} className="absolute inset-0" />
                                ) : (
                                    <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-3xl" />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Vignette */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-5" />
                    <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-black to-transparent pointer-events-none z-10" />

                    {/* YOUNIVERSAL DANCE FLOOR - Increased z-index to 15, ensure pointer-events: auto when enabled */}
                    <AnimatePresence>
                        {context.danceFloorEnabled && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-15 pointer-events-auto"
                            >
                                <CosmicCanvas />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* 1. ATMOSPHERIC OVERLAY (Generative VJ Layer) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                    <AnimatePresence>
                        {sentimentBurst === 'love' && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-red-600/10 backdrop-blur-[2px] flex items-center justify-center"
                            >
                                {[...Array(16)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ y: 200, x: (Math.random() - 0.5) * 800, opacity: 0, scale: 0.2 }}
                                        animate={{ y: -600, opacity: [0, 0.5, 0], scale: [0.2, 1.2, 0.4] }}
                                        transition={{ duration: 5, repeat: Infinity, delay: i * 0.25 }}
                                        className="absolute text-red-500/20 blur-[1px] text-5xl"
                                    >
                                        ❤️
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                        {sentimentBurst === 'fire' && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.3, 0.1, 0.4, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15, repeat: 12 }}
                                className="absolute inset-0 bg-orange-600/15 mix-blend-color-dodge z-30"
                            >
                                 <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,50,0,0.1)_50%,transparent_100%)] animate-scanline" />
                            </motion.div>
                        )}
                        {sentimentBurst === 'cosmic' && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, filter: ['hue-rotate(0deg)', 'hue-rotate(90deg)', 'hue-rotate(0deg)'] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 6, repeat: Infinity }}
                                className="absolute inset-0 bg-purple-900/15"
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.2),transparent_80%)] mix-blend-screen" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* HEADER - Increased z-index to 50 for priority */}
                {!minimal && (
                    <div className="flex-none z-50 pt-safe-top">
                        <Header 
                            onNavigate={onNavigate} 
                            profile={profile} 
                            onProfileClick={() => setShowProfile(true)}
                            onPoolClick={() => setShowPool(true)}
                        />
                    </div>
                )}

                {/* DANCE FLOOR AREA - HUD and foreground controls */}
                <div className="grow relative flex flex-col justify-end pointer-events-none">
                    {/* Now Playing - Force pointer-events: auto for internal buttons */}
                    <div className="px-3 pb-3 z-40 pointer-events-auto">
                        <NowPlay />
                    </div>
                </div>
            </div>

            {/* DESKTOP SIDEBAR: CHAT + POOL */}
            {!minimal && (
                <div className="hidden lg:flex flex-none w-[320px] h-full flex-col pointer-events-auto bg-black/70 backdrop-blur-3xl border-l border-white/5">
                    {/* LEADERBOARD - TOP */}
                    <AnimatePresence>
                        {context.danceFloorEnabled && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 border-b border-white/5">
                                    <YouniversalLeaderboard />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CHAT FEED */}
                    <div className="grow overflow-hidden">
                        <TheChat profile={profile} transparent={true} />
                    </div>

                    {/* THE BOX */}
                    <div className="flex-none p-3 border-t border-white/5 bg-black/40">
                        <TheBox />
                    </div>
                </div>
            )}

            {/* MOBILE SIDE DRAWS */}
            {!minimal && (
                <>
                    {/* MOBILE PROFILE DRAWER - Right */}
                    <AnimatePresence>
                        {showProfile && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="lg:hidden fixed inset-0 bg-black/60 z-60"
                                    onClick={() => setShowProfile(false)}
                                />
                                <motion.div
                                    initial={{ x: "100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="lg:hidden fixed right-0 top-0 bottom-0 w-[85%] max-w-[360px] bg-black/95 backdrop-blur-xl z-70 border-l border-white/10"
                                >
                                    <div className="flex flex-col h-full pt-safe-top">
                                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Profile</span>
                                            <button onClick={() => setShowProfile(false)} className="p-2 text-white/40 hover:text-white">
                                                <X size={20} />
                                            </button>
                                        </div>
                                        <div className="grow overflow-y-auto p-4">
                                            <UserProfileCard 
                                                userId={profile.user_id}
                                                onClose={() => setShowProfile(false)}
                                                isCurrentUser={true}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* MOBILE POOL DRAWER - Left (Vote + Pool) */}
                    <AnimatePresence>
                        {showPool && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="lg:hidden fixed inset-0 bg-black/60 z-60"
                                    onClick={() => setShowPool(false)}
                                />
                                <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "-100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="lg:hidden fixed left-0 top-0 bottom-0 w-[90%] max-w-[400px] bg-black/95 backdrop-blur-xl z-70 border-r border-white/10 flex flex-col"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0 pt-safe-top">
                                        <div className="flex items-center gap-2">
                                            <Music size={16} className="text-purple-400" />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Song Pool</span>
                                        </div>
                                        <button onClick={() => setShowPool(false)} className="p-2 text-white/40 hover:text-white">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    
                                    {/* Vote Section */}
                                    <div className="p-3 border-b border-white/5 shrink-0">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2 block">Vote for Next</span>
                                        <TheBox />
                                    </div>
                                    
                                    {/* Scrollable Pool */}
                                    <div className="grow overflow-y-auto pb-safe-bottom">
                                        <ThePool />
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* MOBILE BOTTOM CHAT - compact */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe-bottom">
                        <div className="h-[40vh] max-h-[280px]">
                            <TheChat profile={profile} transparent={true} />
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};
