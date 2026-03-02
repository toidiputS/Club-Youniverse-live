import React, { useContext, useEffect, useState } from "react";
import type { View, Profile } from "../types";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { getBroadcastManager } from "../services/globalBroadcastManager";
import { supabase } from "../services/supabaseClient";

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
  const { nowPlaying, isPlaying } = context;

  const [inviteText, setInviteText] = useState("Invite 🔗");

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
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText("https://clubyouniverse.live");
        setInviteText("Copied! ✨");
        setTimeout(() => setInviteText("Invite 🔗"), 2000);
      } catch (err) {
        console.error("Failed to copy", err);
      }
    }
  };

  return (
    <header className="relative flex flex-col w-full pointer-events-none px-2 pt-2 sm:px-4 sm:pt-4 pb-0 gap-3">
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

        {/* 2. Now Playing (Center-Left) */}
        {nowPlaying && (
          <div className="hidden md:flex flex-grow items-center gap-3 border-l border-white/5 pl-4 sm:pl-6 opacity-60 hover:opacity-100 transition-opacity cursor-default overflow-hidden">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/5 shadow-inner shrink-0">
              <img
                src={nowPlaying.coverArtUrl || `https://picsum.photos/seed/${nowPlaying.id}/100`}
                className="w-full h-full object-cover grayscale opacity-50 transition-all duration-700 hover:grayscale-0 hover:opacity-100"
                style={{ transform: `scale(${1 + pulse * 0.1})` }}
                alt="Art"
              />
            </div>
            <div className="flex flex-col min-w-0 pr-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                {isPlaying && <div className="w-1 h-1 rounded-full bg-green-500/50 animate-pulse" />}
                <span className="text-[8px] font-black uppercase tracking-widest text-purple-400/80">On Air</span>
              </div>
              <h2 className="text-[10px] sm:text-[11px] font-black text-white/80 leading-none uppercase tracking-tighter truncate">{nowPlaying.title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter truncate">{nowPlaying.artistName}</h3>
                <div className="flex items-center gap-0.5" title={`${nowPlaying.stars ?? 5}/10 Stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={async () => {
                        const newStars = star * 2;
                        await supabase.from('songs').update({ stars: newStars }).eq('id', nowPlaying.id);
                      }}
                      className="hover:scale-125 transition-transform"
                    >
                      <svg
                        className={`w-2.5 h-2.5 ${(nowPlaying.stars ?? 5) >= star * 2 ? 'text-yellow-400' : 'text-zinc-700'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Controls & Profile (Right) */}
        <div className="flex items-center gap-2 lg:gap-4 shrink-0 justify-end flex-grow md:flex-grow-0 ml-auto border-l border-white/5 pl-2 lg:pl-4">

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
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-black rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] hover:bg-purple-500 hover:text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] whitespace-nowrap"
            >
              Song Pool ⚡
            </button>
            <button
              onClick={handleInvite}
              className="relative px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-600 text-white rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all cursor-pointer border border-white/20 whitespace-nowrap overflow-hidden group shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:shadow-[0_0_25px_rgba(217,70,239,0.8)] hover:scale-105"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative z-10 flex items-center justify-center gap-1.5 mix-blend-overlay">
                {inviteText}
                {inviteText === "Invite 🔗" && <span className="animate-pulse">✨</span>}
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
