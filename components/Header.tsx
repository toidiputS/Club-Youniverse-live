import React, { useContext, useEffect, useState } from "react";
import type { View, Profile } from "../types";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { getBroadcastManager } from "../services/globalBroadcastManager";

interface HeaderProps {
  onNavigate: (view: View) => void;
  onSignOut: () => void;
  profile: Profile;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, onSignOut, profile }) => {
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
    <header className="relative flex flex-col w-full pointer-events-none px-2 pt-2 sm:px-4 sm:pt-4 pb-0 gap-2">
      {/* SINGLE TOP ROW */}
      <div className="flex justify-between items-center w-full gap-2 lg:gap-6 pointer-events-auto">

        {/* 1. Branding (Left) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
<div
            className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-white/5 cursor-pointer hover:border-purple-500/50 transition-all relative overflow-hidden group shadow-inner"
            onClick={() => onNavigate("club")}
            style={{ boxShadow: `0 0 ${pulse * 30}px rgba(168, 85, 247, 0.2)` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 opacity-40 group-hover:opacity-100 transition-opacity" />
            <img src="/icons/favicon.svg" alt="Youniverse" className="relative w-5 h-5 sm:w-6 sm:h-6 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="hidden sm:flex flex-col group cursor-default">
            <h1 className="text-[11px] font-black text-white/40 tracking-[0.4em] leading-none uppercase group-hover:text-white transition-colors">Club Youniverse</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_purple]" />
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">Live Active</span>
            </div>
          </div>

        </div>



        {/* 2. HUD Space Control (Center) - Placeholder for visual balance */}
        <div className="flex-grow flex justify-center items-center pointer-events-none">
          {/* Main HUD (NowPlay / TheBox) is positioned here in Radio.tsx layout */}
        </div>



        {/* 3. Controls & Profile (Right) */}
        <div className="flex items-center gap-2 lg:gap-4 shrink-0 justify-end flex-grow md:flex-grow-0 ml-auto border-l border-white/5 pl-2 lg:pl-4">

          {/* Lyrical VJ Toggle */}
          <button
            onClick={() => setVjEnabled(!vjEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all shrink-0 ${vjEnabled 
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
              : 'bg-black/40 border-white/5 text-zinc-600'}`}
            title="Toggle Lyrical VJ Visuals"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${vjEnabled ? 'bg-purple-400 animate-pulse' : 'bg-zinc-800'}`} />
            <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">VJ</span>
          </button>

          {/* Volume Controls (Hidden on mobile) */}

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full border border-white/5 transition-all w-28 shrink-0">
            <button onClick={() => context.setMuted(!context.isMuted)} className="text-zinc-500 hover:text-white transition-colors">
              {context.isMuted || context.volume === 0 ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              )}
            </button>
            <div className="w-full h-1 bg-zinc-800 rounded-full relative overflow-hidden">
              <input type="range" min="0" max="1" step="0.01" value={context.volume} onChange={(e) => context.setVolume(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="absolute inset-y-0 left-0 bg-purple-500 transition-all" style={{ width: `${context.volume * 100}%` }} />
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate("dj-booth")}
              className="px-2 py-1.5 sm:px-4 sm:py-2 bg-white text-black rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] hover:bg-purple-500 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] whitespace-nowrap"
            >
              DJ Booth ⚡
            </button>

            <button
              onClick={handleInvite}
              className="relative px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-600 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer border border-white/50 whitespace-nowrap overflow-hidden group shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:shadow-[0_0_30px_rgba(217,70,239,0.7)] hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {inviteText.toUpperCase()}
                {inviteText.toLowerCase() === "invite" && <span className="animate-bounce">✨</span>}
              </span>
            </button>
          </div>


          {/* User Profile */}
          <div
            className="hidden sm:flex items-center gap-2 group cursor-pointer border-l border-white/5 pl-2 lg:pl-4 transition-all hover:bg-white/5 pr-2 rounded-r-xl"
            onClick={() => onNavigate("profile")}
          >
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[8px] sm:text-[9px] font-black text-white/40 tracking-wider uppercase group-hover:text-white transition-colors truncate max-w-[80px] sm:max-w-[120px] text-right">{profile.name}</span>
              <button onClick={(e) => { e.stopPropagation(); onSignOut(); }} className="text-[6px] sm:text-[7px] font-black text-red-500/30 uppercase tracking-widest hover:text-red-500 transition-colors">Terminate</button>
            </div>
            <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-white/5 overflow-hidden transition-all shrink-0" style={{ borderColor: `rgba(168, 85, 247, ${pulse * 0.5})` }}>
              <img src={profile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.user_id}`} alt="Avatar" className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
            </div>
          </div>

        </div>
      </div>

    </header>
  );
};
