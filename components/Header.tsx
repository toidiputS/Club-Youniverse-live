import React, { useContext, useEffect, useState } from "react";
import type { View, Profile } from "../types";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { getBroadcastManager } from "../services/globalBroadcastManager";
import { getChatMood, getMoodColors, getMoodLabel } from "../utils/emotionEngine";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, LogOut, User as UserIcon } from "lucide-react";

interface HeaderProps {
  onNavigate: (view: View) => void;
  profile: Profile;
  onProfileClick?: () => void;
  onFeedbackClick?: () => void;
  onSmokeClick?: () => void;
}

const EmotionMeter: React.FC = () => {
    const context = useContext(RadioContext);
    if (!context) return null;
    const mood = getChatMood(context.chatMessages);
    const colors = getMoodColors(mood.primary);

    return (
        <div className="flex flex-col items-center gap-1 group/meter">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/40 rounded-full border border-white/5 backdrop-blur-md">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]`}
                     style={{ backgroundColor: colors.text.includes('[') ? colors.text.split('[')[1].split(']')[0] : 'currentColor' }} />
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/60">
                    CGEI: <span style={{ color: colors.text.includes('[') ? colors.text.split('[')[1].split(']')[0] : 'inherit' }}>{getMoodLabel(mood.primary)}</span>
                </span>
            </div>
            <div className="w-24 h-0.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${mood.intensity * 100}%` }}
                    className="h-full bg-linear-to-r from-transparent via-white/40 to-white"
                    style={{ backgroundColor: colors.text.includes('[') ? colors.text.split('[')[1].split(']')[0] : 'currentColor' }}
                />
            </div>
        </div>
    );
};

export const Header: React.FC<HeaderProps> = ({ profile, onProfileClick, onSmokeClick }) => {
  const context = useContext(RadioContext);

  const broadcastManager = getBroadcastManager();
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let handle: number;
    const update = () => {
      const intensity = broadcastManager.getBassIntensity();
      setPulse(intensity);
      document.documentElement.style.setProperty('--audio-pulse', intensity.toString());
      handle = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!context) return null;

  const [inviteText, setInviteText] = useState("Invite");

  const handleInvite = async () => {
    const shareData = {
      title: "Club Youniverse Live",
      text: "Come join the club! Vote on songs, chat with the crowd, and share tracks with the YOUniverse.",
      url: "https://clubyouniverse.live",
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText("https://clubyouniverse.live");
        setInviteText("Copied!");
        setTimeout(() => setInviteText("Invite"), 2000);
      } catch (err) {
        console.error("Failed to copy", err);
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 flex flex-col w-full pointer-events-none z-100">
      {/* PRIMARY HEADER ROW - Flush to corners */}
      <div className="flex justify-between items-center w-full pointer-events-auto px-3 py-1">
        
        {/* Left Section: Logo & Action */}
        <div className="flex items-center gap-3">
            {/* Logo - Navigation to Sidewalk (Smoke Break) */}
            <div 
            onClick={onSmokeClick}
            className="w-12 h-12 bg-black border-2 border-white/10 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(0,0,0,0.8)] cursor-pointer transition-all hover:border-purple-500/50 hover:scale-105 active:scale-95 group/logo relative"
            style={{ boxShadow: `0 0 ${pulse * 30}px rgba(168, 85, 247, 0.2)` }}
            >
                <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity rounded-2xl" />
                <img src="/icons/favicon.svg" alt="Youniverse" className="w-7 h-7 object-contain opacity-80 group-hover/logo:opacity-100 transition-all group-hover/logo:rotate-12" />
                
                {/* Status Indicator */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black animate-pulse" />
                
                {/* Tooltip */}
                <div className="absolute left-0 top-14 w-max bg-black/90 text-[8px] text-white font-black px-3 py-1.5 rounded-lg border border-white/10 opacity-0 group-hover/logo:opacity-100 transition-all translate-y-2 group-hover/logo:translate-y-0 pointer-events-none uppercase tracking-[0.2em] shadow-2xl backdrop-blur-xl flex items-center gap-2">
                    <LogOut size={10} className="text-red-500" />
                    Smoke Break (Exit Club)
                </div>
            </div>

            {/* Invite & System Stats */}
            <div className="flex flex-col gap-1.5">
                <button
                    onClick={handleInvite}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-white/40 hover:text-white rounded-lg text-[7px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 group/invite"
                >
                    <div className="w-1 h-1 rounded-full bg-pink-500 group-hover:scale-125 transition-transform" />
                    {inviteText}
                </button>
                <div className="flex items-center gap-2 px-2 text-[6px] font-bold text-zinc-600 uppercase tracking-tighter">
                   <Activity size={8} /> LIVE_NODE_0{context.leaderId?.slice(0,1) || '1'} // {context.chatMessages.length} PKTS
                </div>
            </div>
        </div>

        {/* Center Section: Title & Emotion Meter */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none w-1/3">
            <div className="flex flex-col items-center">
                <h1 className="text-[14px] font-black tracking-[0.6em] uppercase whitespace-nowrap bg-clip-text text-transparent bg-linear-to-r from-white via-white to-white/60 drop-shadow-2xl opacity-90">
                    Club Youniverse
                </h1>
                <div className="h-px w-20 bg-linear-to-r from-transparent via-white/20 to-transparent -mt-0.5" />
            </div>
            
            <div className="pointer-events-auto">
                <EmotionMeter />
            </div>
        </div>

        {/* Right Section: Profile Identity */}
        <div 
          onClick={onProfileClick}
          className="flex items-center gap-3 pointer-events-auto shrink-0 group cursor-pointer"
        >
          <div className="flex flex-col items-end min-w-0">
             <div className="flex items-center gap-1.5">
                {profile.is_premium && (
                    <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-[6px] font-black text-purple-400 uppercase tracking-widest">VIP</span>
                )}
                <span className="text-[10px] font-black text-white group-hover:text-purple-400 transition-colors uppercase tracking-widest">
                  {profile.name}
                </span>
             </div>
             <span className="text-[7px] font-black text-white/20 tracking-[0.2em] uppercase mt-0.5 font-mono">
                {profile.role?.toUpperCase() || 'LISTENER'} // {profile.user_id.slice(0,8)}
             </span>
          </div>

          <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-black border-2 border-white/10 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-all group-hover:border-purple-500/50 group-hover:scale-105 group-active:scale-95 shrink-0 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.img 
                    key={profile.avatar_url}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.user_id}`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                    />
                </AnimatePresence>
                
                {/* Overlay for "Edit" feel */}
                <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <UserIcon size={16} className="text-white" />
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Subtle bottom border line */}
      <div className="w-full px-4 transform -translate-y-2 opacity-10">
        <div className="w-full h-px bg-linear-to-r from-transparent via-white to-transparent" />
      </div>
    </header>
  );
};
