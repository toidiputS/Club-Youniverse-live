import React, { useContext, useMemo } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { TheBox } from "./TheBox";
import { NowPlay } from "./NowPlay";
import { Header } from "./Header";
import { TheChat } from "./TheChat";
import { motion, AnimatePresence } from "framer-motion";
import { AudioVisualizer } from "./AudioVisualizer";
import { LyricVisualizer } from "./LyricVisualizer";
import CosmicCanvas from "./Youniversal/CosmicCanvas";
import { YouniversalLeaderboard } from "./Youniversal/Leaderboard";
import { useGameStore } from "./Youniversal/useGameStore";
import type { Profile, ChoreographedLine, View } from "../types";

interface RadioProps {
  onNavigate: (view: View) => void;
  onSignOut: () => void;
  profile: Profile;
  minimal?: boolean;
}

export const Radio: React.FC<RadioProps> = ({ onNavigate, onSignOut, profile, minimal = false }) => {
  const context = useContext(RadioContext);

  const parsedLyrics = useMemo((): Partial<ChoreographedLine>[] => {
    if (!context?.nowPlaying?.lyrics) return [];
    const raw = context.nowPlaying.lyrics;
    
    // If it's already an array, return it
    if (Array.isArray(raw)) return raw;

    // Try parsing as JSON first (Choreographed Protocol)
    if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn("Failed to parse lyrics as JSON protocol, falling back to plaintext auto-map.");
        }
    }

    // Fallback: Plain text auto-mapping (5s intervals)
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
    <div className="h-full w-full relative flex flex-col bg-black overflow-hidden">

        <div className="h-full w-full relative flex z-20 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-grow relative flex flex-col min-w-0 h-full overflow-hidden">
                {/* Atmosphere / VJ Layer (Scoped to this area for centering) */}
                <div className="absolute inset-0 z-0">
                    {/* AMBIENCE BACKGROUND (Now Playing Cover Art) */}
                    {context.nowPlaying && (
                        <div className="absolute inset-0 pointer-events-none opacity-75 mix-blend-overlay animate-fade-in transition-all duration-1000">
                            <img 
                                src={context.nowPlaying.coverArtUrl || `https://picsum.photos/seed/${context.nowPlaying.id}/1000`} 
                                className="w-full h-full object-cover grayscale brightness-50" 
                                alt="" 
                            />
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {context.vjEnabled && context.nowPlaying && parsedLyrics.length > 0 ? (
                            <motion.div 
                                key="vj"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0"
                            >
                                <LyricVisualizer 
                                    currentTime={context.currentTime}
                                    isPlaying={context.isPlaying}
                                    lyrics={parsedLyrics}
                                    volume={context.volume}
                                />
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="visualizer"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0"
                            >
                                {context.isPlaying ? (
                                    <AudioVisualizer 
                                        isBackground={true} 
                                        intensity={0.4} 
                                        volume={context.volume}
                                        className="absolute inset-0"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-3xl" />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Cinematic Vignette */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-[5]" />
                    
                    {/* Bottom UI Shadow Mask */}
                    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none z-[10]" />

                    {/* YOUNIVERSAL DANCE FLOOR LAYER */}
                    <AnimatePresence>
                        {context.danceFloorEnabled && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[8] pointer-events-auto"
                            >
                                <CosmicCanvas />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ORIGINAL HEADER */}
                {!minimal && (
                    <div className="flex-none">
                        <Header onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} />
                    </div>
                )}

                {/* CENTRAL DANCE FLOOR AREA (CLEAR) */}
                <div className="flex-grow relative flex flex-col pt-4 px-6 md:px-12">
                    {/* TOP STATUS (Discrete) */}
                    <div className="flex justify-center w-full">
                        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 animate-pulse">
                            {context.radioState === 'NOW_PLAYING' || context.radioState === 'DJ_TALKING' ? 'B-MAX BROADCAST ACTIVE' : 'SYSTEM STANDBY'}
                        </span>
                    </div>

                    {/* BOTTOM-LEFT: NOW PLAYING INFO (Restored stars & heart in NowPlay component) */}
                    <div className="mt-auto mb-4 z-40 flex items-end justify-between pointer-events-none">
                        <div className="pointer-events-auto">
                            <NowPlay />
                        </div>
                        
                        {/* THE LEADERBOARD (Unobtrusive) */}
                        <AnimatePresence>
                            {context.danceFloorEnabled && (
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="mb-4 mr-4 pointer-events-auto hidden md:block"
                                >
                                    <YouniversalLeaderboard />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR: CHAT + THE BOX */}
            {!minimal && (
                <div className="hidden lg:flex flex-none w-[380px] h-full flex-col pointer-events-auto bg-black/60 backdrop-blur-3xl border-l border-white/5 shadow-[-20px_0_100px_rgba(0,0,0,0.8)]">
                    {/* CHAT FEED (Grows to fill space) */}
                    <div className="flex-grow overflow-hidden">
                        <TheChat profile={profile} transparent={true} />
                    </div>

                    {/* THE BOX (Docked at the bottom of the sidebar) */}
                    <div className="flex-none p-4 border-t border-white/5 bg-black/40">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Up Next / The Box</span>
                            <div className="flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                                <div className="w-1 h-1 rounded-full bg-purple-500/50 animate-pulse delay-75" />
                            </div>
                        </div>
                        <TheBox />
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
