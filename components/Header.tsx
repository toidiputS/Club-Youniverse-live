import React, { useContext, useEffect, useState } from "react";
import type { View, Profile } from "../types";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { getBroadcastManager } from "../services/globalBroadcastManager";
import { getChatMood, getMoodLabel } from "../utils/emotionEngine";
import { motion } from "framer-motion";

interface HeaderProps {
    profile: Profile;
    onProfileClick: () => void;
    onSmokeClick: () => void;
    onNavigate: (view: View) => void;
    onFeedbackClick?: () => void;
}



const EmotionMeter: React.FC = () => {
    const context = useContext(RadioContext);
    if (!context) return null;
    const mood = getChatMood(context.chatMessages);
    
    return (
        <div className="flex flex-col gap-1 min-w-[60px]">
            <div className="flex items-center justify-center gap-1 leading-none">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30">CGEI: </span>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-cyan-400">{getMoodLabel(mood.primary)}</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${mood.intensity * 100}%` }}
                    className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                />
            </div>
        </div>
    );
};

export const Header: React.FC<HeaderProps> = ({ profile, onProfileClick, onSmokeClick }) => {
  const context = useContext(RadioContext);
  const broadcastManager = getBroadcastManager();



  useEffect(() => {
    let handle: number;
    const update = () => {
      const intensity = broadcastManager.getBassIntensity();
      document.documentElement.style.setProperty('--audio-pulse', intensity.toString());
      handle = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!context) return null;

  const [inviteText, setInviteText] = useState("Invite");

  const handleInvite = async () => {
    try {
      await navigator.clipboard.writeText("https://clubyouniverse.live");
      setInviteText("Copied!");
      setTimeout(() => setInviteText("Invite"), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 p-4 sm:p-5 pointer-events-none z-100">
      <div className="relative w-full h-12 flex items-center justify-between pointer-events-auto">
        
        {/* Left: Branding Icon (Smoke Break Action) - NO BORDER, BLUE GLOW */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onSmokeClick();
          }}
          className="cursor-pointer active:scale-95 transition-transform z-10"
        >
          <div className="p-1 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] hover:drop-shadow-[0_0_18px_rgba(6,182,212,1)] transition-all">
            <img 
              src="/icons/icon.svg" 
              alt="Logo" 
              className="w-11 h-11 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE1IDN2MTJIOEwzIDEwaDhsNC04WiIvPjwvc3ZnPg==';
              }}
            />
          </div>
        </div>

        {/* Center: Command Center Stack (Refined & Symmetrical) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 w-max">
            {/* 1. Profile Name (Directly Above) */}
            <span className="text-[14px] font-black text-white uppercase tracking-widest leading-none">
                {profile.name}
            </span>

            {/* 2. Club Title (Smaller & Blue) */}
            <h1 className="text-[13px] font-black tracking-[0.4em] uppercase leading-none text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                Club Youniverse
            </h1>

            {/* 3. Metrics (Small Pills / Refined) */}
            <div className="flex items-center gap-3 mt-1">
                {/* Meter Pill */}
                <div className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full flex items-center h-6 min-w-[90px]">
                    <EmotionMeter />
                </div>
                
                {/* Invite Pill */}
                <button 
                  onClick={handleInvite}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-full h-6 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
                >
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">{inviteText}</span>
                </button>
            </div>
        </div>

        {/* Right: User Avatar & Admin Tools (Profile Action) */}
        <div className="flex items-center gap-3 z-10">
        
            
            <div 
               onClick={(e) => {
                  e.stopPropagation();
                  onProfileClick();
               }}
               className="cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-13 h-13 rounded-2xl bg-black/40 border border-white/10 overflow-hidden shadow-xl hover:border-cyan-500/30 transition-all drop-shadow-[0_0_12px_rgba(34,211,238,0.8)] hover:drop-shadow-[0_0_18px_rgba(6,182,212,1)]">
                <img 
                  src={profile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.user_id}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover transition-all"
                />
              </div>
            </div>
        </div>

      </div>
    </header>
  );
};
