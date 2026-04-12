import React, { useContext, useEffect, useState } from "react";
import type { View, Profile } from "../types";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { getBroadcastManager } from "../services/globalBroadcastManager";

interface HeaderProps {
  onNavigate: (view: View) => void;
  profile: Profile;
  onProfileClick?: () => void;
  onFeedbackClick?: () => void;
  onSmokeClick?: () => void;
}

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
    <header className="relative flex flex-col w-full pointer-events-none z-100">
      {/* PRIMARY HEADER ROW - Flush to corners */}
      <div className="flex justify-between items-center w-full pointer-events-auto">
        
        {/* Left Section: Logo & Action */}
        <div className="flex items-center gap-1.5 p-1.5">
            {/* Logo - Navigation to Sidewalk (Smoke Break) */}
            <div 
            onClick={onSmokeClick}
            className="w-10 h-10 bg-zinc-950/40 hover:bg-zinc-900 rounded-lg flex items-center justify-center border border-white/5 shrink-0 shadow-lg cursor-pointer transition-transform active:scale-95 group/logo relative"
            style={{ boxShadow: `0 0 ${pulse * 15}px rgba(168, 85, 247, 0.1)` }}
            >
                <img src="/icons/favicon.svg" alt="Youniverse" className="w-6 h-6 object-contain opacity-60 group-hover/logo:opacity-100 transition-opacity" />
                <span className="absolute left-0 top-11 w-max bg-black text-[6px] text-white/40 px-2 py-1 rounded border border-white/5 opacity-0 group-hover/logo:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest font-black">Smoke Break (Exit)</span>
            </div>

            {/* Invite Button */}
            <button
                onClick={handleInvite}
                className="px-3 py-2 bg-zinc-950/20 hover:bg-zinc-800/40 border border-white/5 hover:border-white/10 text-white/40 hover:text-white rounded-lg text-[7px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2"
            >
                <div className="w-1 h-1 rounded-full bg-pink-500/60 group-hover:bg-pink-500 animate-pulse" />
                {inviteText}
            </button>
        </div>

        {/* Centered Title */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none opacity-40">
          <span className="text-[8px] font-black tracking-[0.5em] uppercase whitespace-nowrap bg-clip-text text-transparent bg-linear-to-r from-white via-white/80 to-white/60">
            Club Youniverse
          </span>
        </div>

        {/* Profile Identity (Flush Right Corner) */}
        <div 
          onClick={onProfileClick}
          className="flex items-center gap-2 pointer-events-auto shrink-0 group cursor-pointer p-1.5"
        >
          <div className="flex flex-col items-end min-w-0 pr-1">
             <span className="text-[9px] font-black text-white group-hover:text-white transition-colors uppercase tracking-widest">
               {profile.name}
             </span>
             <span className="text-[6px] font-black text-white/30 tracking-[0.2em] uppercase -mt-0.5">
                NODE-{profile.user_id.slice(0,4)}
             </span>
          </div>

          <div className="w-10 h-10 rounded-lg bg-zinc-950/40 border border-white/5 overflow-hidden shadow-lg transition-all group-active:scale-95 shrink-0">
            <img 
              src={profile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.user_id}`} 
              alt="Avatar" 
              className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Subtle bottom border line */}
      <div className="w-full px-4 transform -translate-y-2 opacity-20">
        <div className="w-full h-px bg-white/20" />
      </div>
    </header>
  );
};
