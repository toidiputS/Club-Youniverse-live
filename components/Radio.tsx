/**
 * @file Radio Component - Rebuilt for Club Youniverse SPA architecture.
 */

import React, { useContext, useState } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { TheBox } from "./TheBox";
import { ThePool } from "./ThePool";
import { Header } from "./Header";
import { TheChat } from "./TheChat";
import { UserProfileCard } from "./UserProfileCard";
import { motion, AnimatePresence } from "framer-motion";
import { AudioVisualizer } from "./AudioVisualizer";
import { DjHud } from "./DjHud";
import { ChatAtmosphere } from "./ChatAtmosphere";
import CosmicCanvas from "./DanceFloor/CosmicCanvas";
import { useGameStore } from "./DanceFloor/useGameStore";
import type { Profile, View } from "../types";
import { X } from "lucide-react";

interface RadioProps {
  onNavigate: (view: View) => void;
  onSignOut: () => void;
  profile: Profile;
  minimal?: boolean;
  noGame?: boolean;
}

export const Radio: React.FC<RadioProps> = ({ onNavigate, profile, minimal = false, noGame = false }) => {
  const context = useContext(RadioContext);
  const [showProfile, setShowProfile] = useState(false);
  const [showPool, setShowPool] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const connect = useGameStore(s => s.connect);
  const disconnect = useGameStore(s => s.disconnect);

  const isSmoking = React.useRef(false);

  // Presence Broadcast
  React.useEffect(() => {
    if (!profile?.name) return;
    
    const announce = async (type: 'entered' | 'left' | 'smoke') => {
        const { supabase } = await import("../services/supabaseClient");
        await supabase.channel('club-chat').send({
            type: 'broadcast',
            event: 'status',
            payload: { type, user: profile.name }
        });
    };

    announce('entered');
    return () => { 
        if (!isSmoking.current) {
            announce('left');
        }
    };
  }, [profile?.name]);

  const handleSmokeNavigate = async () => {
    const { supabase } = await import("../services/supabaseClient");
    await supabase.channel('club-chat').send({
        type: 'broadcast',
        event: 'status',
        payload: { type: 'smoke', user: profile.name }
    });
    isSmoking.current = true;
    onNavigate("sidewalk");
  };

  React.useEffect(() => {
    if (context?.danceFloorEnabled && !noGame) {
      connect();
    } else {
      disconnect();
    }
  }, [context?.danceFloorEnabled, connect, disconnect, noGame]);

  if (!context) return null;

    return (
        <ChatAtmosphere 
            messages={context.chatMessages.map(m => ({ text: m.text }))}
            showMoodBadge={true}
            showParticles={true}
        >
            <div className="h-full w-full relative flex flex-col lg:flex-row bg-transparent overflow-hidden select-none">
                
                {/* 1. ATMOSPHERE & BACKGROUND LAYER (Full Site Bleed) */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {context.nowPlaying && (
                        <div className="absolute inset-0 opacity-40 mix-blend-overlay grayscale">
                            {context.nowPlaying.coverArtUrl?.endsWith('.mp4') ? (
                                <video 
                                    src={context.nowPlaying.coverArtUrl} 
                                    autoPlay muted loop playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img 
                                    src={context.nowPlaying.coverArtUrl || `https://picsum.photos/seed/${context.nowPlaying.id}/1000`} 
                                    className="w-full h-full object-cover" 
                                    alt="" 
                                />
                            )}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {context.twitchChannel ? (
                            <motion.div 
                                key="twitch" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                className="absolute inset-0 bg-black"
                            >
                                <iframe
                                    src={`https://player.twitch.tv/?channel=${context.twitchChannel}&parent=${window.location.hostname}&muted=true&autoplay=true`}
                                    className="w-full h-full border-none opacity-40 grayscale"
                                    allowFullScreen
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
                    
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)] z-5" />
                </div>

                {/* DANCE FLOOR (CGEI Background) */}
                <AnimatePresence>
                    {context.danceFloorEnabled && !noGame && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-1 pointer-events-auto"
                        >
                            <CosmicCanvas />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2. MAIN CONTENT AREA (Left on Desktop, Full on Mobile) */}
                <div className="relative z-10 flex flex-col grow h-full overflow-hidden pointer-events-none">
                    {/* Header */}
                    {!minimal && (
                        <div className="flex-none pointer-events-auto">
                            <Header 
                                onNavigate={onNavigate} 
                                profile={profile} 
                                onProfileClick={() => setShowProfile(true)}
                                onSmokeClick={handleSmokeNavigate}
                            />
                        </div>
                    )}

                    {/* Spacer / Center Area */}
                    <div className="grow" />
                </div>

                {/* 3. SIDEBAR (Right on Desktop) */}
                {!minimal && (
                    <div className="relative z-20 flex-none w-full lg:w-[400px] h-full lg:h-full flex flex-col border-l border-white/5 bg-transparent pointer-events-none lg:pointer-events-auto">
                        {/* Chat (Grow) - Now truly flexible */}
                        <div className="grow relative pointer-events-auto min-h-0">
                            <TheChat profile={profile} transparent={true} noAtmosphere={true} />
                        </div>

                        {/* The Box (Bottom of Sidebar) */}
                        <div className="flex-none px-1.5 pb-ticker pt-1.5 pointer-events-auto">
                            <div className="bg-black/20 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                                <TheBox />
                            </div>
                        </div>
                    </div>
                )}

                {/* NAVIGATION SIDE TABS (Floating Pills under primary targets) */}
                {!minimal && (
                    <>
                        {/* POOL TAB (Left side, under Logo) */}
                        <div className="fixed left-0 top-32 z-100 pointer-events-auto">
                            <button 
                                onClick={() => setShowPool(true)}
                                className="flex flex-col items-center gap-2 py-6 px-1 bg-zinc-950 border border-l-0 border-white/10 rounded-r-xl hover:bg-purple-600/20 text-white/40 hover:text-white transition-all group"
                            >
                                <span className="[writing-mode:vertical-lr] rotate-180 text-[7px] font-black uppercase tracking-[0.4em]">Pool</span>
                            </button>
                        </div>

                        {/* SETTINGS TAB (Right side, under Identity) */}
                        <div className="fixed right-0 top-32 z-100 pointer-events-auto lg:hidden">
                            <button 
                                onClick={() => setShowSettings(true)}
                                className="flex flex-col items-center gap-2 py-6 px-1 bg-zinc-950 border border-r-0 border-white/10 rounded-l-xl hover:bg-zinc-800 text-white/40 hover:text-white transition-all group"
                            >
                                <span className="[writing-mode:vertical-lr] text-[7px] font-black uppercase tracking-[0.4em]">Settings</span>
                            </button>
                        </div>
                        
                        {/* Desktop Settings Tab is always reachable if needed, but since we have a sidebar now, maybe just keep it floating for mobile only or for easy access */}
                        <div className="hidden lg:block fixed right-0 top-32 z-100 pointer-events-auto">
                            <button 
                                onClick={() => setShowSettings(true)}
                                className="flex flex-col items-center gap-2 py-6 px-1 bg-zinc-950 border border-r-0 border-white/10 rounded-l-xl hover:bg-zinc-800 text-white/40 hover:text-white transition-all group lg:min-w-[24px]"
                            >
                                <span className="[writing-mode:vertical-lr] text-[7px] font-black uppercase tracking-[0.4em]">Control</span>
                            </button>
                        </div>
                    </>
                )}

                {/* EXTERNAL SLIDERS / MODALS */}
                <AnimatePresence>
                    {showProfile && (
                        <div className="fixed inset-0 z-300">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
                            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} className="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-zinc-950 border-l border-white/10 shadow-2xl overflow-hidden">
                                <UserProfileCard userId={profile.user_id} onClose={() => setShowProfile(false)} isCurrentUser={true} />
                            </motion.div>
                        </div>
                    )}

                    {showPool && (
                        <div className="fixed inset-0 z-300">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPool(false)} />
                            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25 }} className="absolute left-0 top-0 bottom-0 w-full max-w-[420px] bg-zinc-950 border-r border-white/10 flex flex-col shadow-2xl">
                                <div className="flex items-center justify-between p-4 border-b border-white/5 pt-safe-top">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Storage Pool</span>
                                    <button onClick={() => setShowPool(false)} className="p-2 hover:text-purple-400 opacity-30"><X size={20} /></button>
                                </div>
                                <div className="grow overflow-y-auto">
                                    <ThePool />
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Setings Panel (Station Control) */}
                <DjHud isOpen={showSettings} setIsOpen={setShowSettings} />
            </div>
        </ChatAtmosphere>
    );
};
