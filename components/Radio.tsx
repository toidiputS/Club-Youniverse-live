import React, { useContext, useMemo, useState } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { TheBox } from "./TheBox";
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
import { X } from "lucide-react";

interface RadioProps {
  onNavigate: (view: View) => void;
  onSignOut: () => void;
  profile: Profile;
  minimal?: boolean;
}

export const Radio: React.FC<RadioProps> = ({ onNavigate, onSignOut, profile, minimal = false }) => {
  const context = useContext(RadioContext);
  const [showProfile, setShowProfile] = useState(false);
  const [showVote, setShowVote] = useState(false);

  const parsedLyrics = useMemo((): Partial<ChoreographedLine>[] => {
    if (!context?.nowPlaying?.lyrics) return [];
    const raw = context.nowPlaying.lyrics;
    
    if (Array.isArray(raw)) return raw;

    if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn("Failed to parse lyrics as JSON");
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
    <div className="h-full w-full relative flex flex-col bg-black overflow-hidden">

        <div className="h-full w-full relative flex z-20 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-grow relative flex flex-col min-w-0 h-full overflow-hidden">
                {/* Atmosphere Layer */}
                <div className="absolute inset-0 z-0">
                    {context.nowPlaying && (
                        <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-overlay">
                            <img 
                                src={context.nowPlaying.coverArtUrl || `https://picsum.photos/seed/${context.nowPlaying.id}/1000`} 
                                className="w-full h-full object-cover grayscale brightness-50" 
                                alt="" 
                            />
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
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-[5]" />
                    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none z-[10]" />

                    {/* YOUNIVERSAL DANCE FLOOR */}
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

                {/* HEADER */}
                {!minimal && (
                    <div className="flex-none z-30">
                        <Header 
                            onNavigate={onNavigate} 
                            onSignOut={onSignOut} 
                            profile={profile} 
                            onProfileClick={() => setShowProfile(true)}
                            onVoteClick={() => setShowVote(true)}
                        />
                    </div>
                )}

                {/* DANCE FLOOR CLEAR AREA */}
                <div className="flex-grow relative flex flex-col">
                    {/* Status */}
                    <div className="flex justify-center pt-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white/15">
                            {context.radioState === 'NOW_PLAYING' || context.radioState === 'DJ_TALKING' ? 'B-MAX BROADCAST' : 'STANDBY'}
                        </span>
                    </div>

                    {/* Now Playing - Bottom Left, Compact */}
                    <div className="mt-auto mb-4 mx-3 sm:mx-6 z-40 pointer-events-auto">
                        <NowPlay />
                    </div>
                </div>
            </div>

            {/* DESKTOP SIDEBAR: CHAT + VOTE */}
            {!minimal && (
                <div className="hidden lg:flex flex-none w-[340px] h-full flex-col pointer-events-auto bg-black/70 backdrop-blur-3xl border-l border-white/5">
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
                    <div className="flex-grow overflow-hidden">
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
                    {/* MOBILE PROFILE DRAWER - Right Side */}
                    <AnimatePresence>
                        {showProfile && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="lg:hidden fixed inset-0 bg-black/60 z-[60]"
                                    onClick={() => setShowProfile(false)}
                                />
                                <motion.div
                                    initial={{ x: "100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="lg:hidden fixed right-0 top-0 bottom-0 w-[85%] max-w-[360px] bg-black/95 backdrop-blur-xl z-[70] border-l border-white/10"
                                >
                                    <div className="flex flex-col h-full">
<div className="flex items-center justify-between p-4 border-b border-white/5">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Profile</span>
                                            <button onClick={() => setShowProfile(false)} className="p-2 text-white/40 hover:text-white">
                                                <X size={20} />
                                            </button>
                                        </div>
                                        <div className="flex-grow overflow-y-auto p-4">
                                            <UserProfileCard 
                                                profile={profile} 
                                                onNavigate={onNavigate}
                                                onSignOut={onSignOut}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* MOBILE VOTE DRAWER - Left Side */}
                    <AnimatePresence>
                        {showVote && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="lg:hidden fixed inset-0 bg-black/60 z-[60]"
                                    onClick={() => setShowVote(false)}
                                />
                                <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "-100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="lg:hidden fixed left-0 top-0 bottom-0 w-[85%] max-w-[360px] bg-black/95 backdrop-blur-xl z-[70] border-r border-white/10"
                                >
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Vote for Next</span>
                                            <button onClick={() => setShowVote(false)} className="p-2 text-white/40 hover:text-white">
                                                <X size={20} />
                                            </button>
                                        </div>
                                        <div className="flex-grow overflow-y-auto p-4">
                                            <TheBox />
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* MOBILE BOTTOM BAR - Chat */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10">
                        <div className="h-[60vh] max-h-[400px]">
                            <TheChat profile={profile} transparent={true} />
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};
