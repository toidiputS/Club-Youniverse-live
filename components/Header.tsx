import React, { useContext, useEffect, useState } from "react";
import type { View, Profile } from "../types";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { getBroadcastManager } from "../services/globalBroadcastManager";

interface HeaderProps {
  onNavigate: (view: View) => void;
  profile: Profile;
  onProfileClick?: () => void;
  onPoolClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, profile, onProfileClick, onPoolClick }) => {
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
  const { vjEnabled, setVjEnabled } = context;

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
    <header className="relative flex flex-col w-full pointer-events-none px-3 pt-3 pb-2 gap-2">
      {/* SINGLE ROW - MOBILE FIRST */}
      <div className="flex justify-between items-center w-full gap-2 pointer-events-auto">

        {/* Logo Button (Left) */}
        <button
          onClick={() => onNavigate("club")}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-white/5 shrink-0"
          style={{ boxShadow: `0 0 ${pulse * 20}px rgba(168, 85, 247, 0.2)` }}
        >
          <img src="/icons/favicon.svg" alt="Youniverse" className="w-5 h-5 sm:w-6 sm:h-6 object-contain opacity-70" />
        </button>

        {/* Center Title - Mobile Club Youniverse */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] sm:text-[11px] font-black text-white/60 tracking-[0.3em] uppercase hidden sm:block">Club Youniverse</span>
          <span className="text-[9px] font-black text-white/40 tracking-widest sm:hidden">CLUB YOUNIVERSE</span>
        </div>

        {/* Mobile: Only VJ toggle, Desktop: Volume too */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVjEnabled(!vjEnabled)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all text-[8px] sm:text-[9px] font-black uppercase ${vjEnabled 
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-400' 
              : 'bg-black/40 border-white/5 text-zinc-600'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${vjEnabled ? 'bg-purple-400 animate-pulse' : 'bg-zinc-800'}`} />
            <span className="hidden xs:inline">VJ</span>
          </button>

          {/* Desktop Volume */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full border border-white/5 w-28">
            <button onClick={() => context.setMuted(!context.isMuted)} className="text-zinc-500 hover:text-white">
              {context.isMuted || context.volume === 0 ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              )}
            </button>
            <div className="w-full h-1 bg-zinc-800 rounded-full relative">
              <input type="range" min="0" max="1" step="0.01" value={context.volume} onChange={(e) => context.setVolume(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="absolute inset-y-0 left-0 bg-purple-500" style={{ width: `${context.volume * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Action Buttons (Right) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onPoolClick}
            className="px-2 py-1.5 sm:px-3 sm:py-2 bg-purple-600/30 border border-purple-500/30 text-purple-400 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-wider hover:bg-purple-500/50 transition-all"
          >
            Pool
          </button>

          <button
            onClick={() => onNavigate("dj-booth")}
            className="px-2 py-1.5 sm:px-3 sm:py-2 bg-white text-black rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-wider hover:bg-purple-500 hover:text-white transition-all"
          >
            DJ
          </button>

          <button
            onClick={handleInvite}
            className="px-3 py-2 sm:px-4 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border border-white/30"
          >
            {inviteText === "Invite" ? "✨" : ""} {inviteText}
          </button>

          {/* Desktop Profile */}
          <button
            onClick={() => onNavigate("profile")}
            className="hidden sm:flex items-center gap-2 group"
          >
            <span className="text-[8px] font-black text-white/40 group-hover:text-white truncate max-w-[60px]">{profile.name}</span>
            <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-white/5 overflow-hidden">
              <img src={profile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.user_id}`} alt="Avatar" className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100" />
            </div>
          </button>

          {/* Mobile Profile Button */}
          <button
            onClick={onProfileClick}
            className="sm:hidden w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 overflow-hidden"
          >
            <img src={profile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.user_id}`} alt="Avatar" className="w-full h-full object-cover opacity-60" />
          </button>
        </div>
      </div>
    </header>
  );
};
