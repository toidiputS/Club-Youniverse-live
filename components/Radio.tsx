import React, { useContext } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import type { View, Profile } from "../types";
import { Header } from "./Header";
import { TheBox } from "./TheBox";
import { TheChat } from "./TheChat";

interface RadioProps {
  onNavigate: (view: View) => void;
  onSignOut: () => void;
  profile: Profile;
}

export const Radio: React.FC<RadioProps> = ({ onNavigate, onSignOut, profile }) => {
  const context = useContext(RadioContext);
  if (!context) return null;

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col pointer-events-none select-none">

      {/* 1. TOP HUB: Integrated Header */}
      <div className="relative z-50 pointer-events-auto w-full animate-in fade-in slide-in-from-top-4 duration-1000 shrink-0">
        <Header onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} />
      </div>

      {/* 2. CENTER: THE FLOOR (Open Space for Visuals) */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 bg-black overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-[50vh] bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />

        {context.nowPlaying?.coverArtUrl ? (
          context.nowPlaying.is_canvas ? (
            <video
              src={context.nowPlaying.coverArtUrl}
              autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-70 animate-in fade-in duration-1000"
            />
          ) : (
            <>
              <img src={context.nowPlaying.coverArtUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-125" alt="" />
              <img src={context.nowPlaying.coverArtUrl} className="z-20 w-11/12 max-w-2xl aspect-square object-cover opacity-80 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-xl border border-white/10 animate-in zoom-in-95 fade-in duration-1000" alt="Album Cover" />
            </>
          )
        ) : (
          <div className="absolute inset-0 bg-zinc-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black opacity-50 pulse" />
        )}
      </div>

      {/* 3. SIDE COLUMN: Chat & Voting Stack (Mobile First layout) */}
      <div className="relative z-[60] flex flex-col w-full flex-grow xl:flex-none xl:fixed xl:right-4 xl:bottom-0 xl:top-24 xl:w-80 pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-1000 overflow-hidden xl:overflow-visible min-h-0 pb-0">
        <div className="flex-grow min-h-0 px-2 sm:px-4 flex flex-col pt-4">
          <TheChat profile={profile} />
        </div>
        <div className="flex-shrink-0 px-2 xl:px-0 pb-4 pt-2 shrink-0">
          <TheBox />
        </div>

        {/* 5. GRADIENT COVER TO FADE THE BOX CARDS */}
        {/* Softly fades the bottom of the column before it hits the Ticker */}
        <div className="absolute bottom-16 left-0 w-full h-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none -z-10 xl:hidden" />
      </div>
    </div>
  );
};
