/**
 * @file Ticker Component - The breaking news marquee for Club Youniverse.
 */

import React, { useContext } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";

export const Ticker: React.FC = () => {
  const context = useContext(RadioContext);
  if (!context) return null;

  const { tickerText, djBanter } = context;

  return (
    <>
      {/* 2. THE DUAL TICKER CONTAINER */}
      <div className="relative w-full flex flex-col z-[50]">

        {/* Top Ticker: DJ Banter (Fast, Colorful, Playful) */}
        <div className="w-full bg-purple-900/50 backdrop-blur-md border-t border-purple-500/20 h-6 flex items-center overflow-hidden">
          <div className="flex-shrink-0 bg-purple-600/20 px-3 h-full flex items-center justify-center border-r border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <span className="text-[8px] font-black text-purple-300 uppercase tracking-[0.3em] whitespace-nowrap">DJ Python</span>
          </div>
          <div className="flex-grow items-center relative">
            <div className="whitespace-nowrap flex gap-16 sm:gap-48 animate-marquee-fast absolute top-1/2 -translate-y-1/2">
              <span className="text-[10px] font-bold text-white tracking-tight uppercase drop-shadow-md">{djBanter}</span>
              <span className="text-[10px] font-bold text-white tracking-tight uppercase drop-shadow-md">{djBanter}</span>
              <span className="text-[10px] font-bold text-white tracking-tight uppercase drop-shadow-md">{djBanter}</span>
            </div>
          </div>
        </div>

        {/* Bottom Ticker: Club Knowledge (Slow, Technical, Zinc) */}
        <div className="w-full bg-black/60 backdrop-blur-xl border-t border-white/5 h-8 flex items-center overflow-hidden">
          <div className="flex-shrink-0 bg-white/5 px-3 h-full flex items-center justify-center border-r border-white/5">
            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">System Feed</span>
          </div>
          <div className="flex-grow items-center relative">
            <div className="whitespace-nowrap flex gap-16 sm:gap-48 animate-marquee-slow absolute top-1/2 -translate-y-1/2">
              <span className="text-[10px] font-bold text-zinc-500 tracking-tight uppercase">{tickerText}</span>
              <span className="text-[10px] font-bold text-zinc-500 tracking-tight uppercase">{tickerText}</span>
              <span className="text-[10px] font-bold text-zinc-500 tracking-tight uppercase">{tickerText}</span>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes marquee {
            0% { transform: translate(0, -50%); }
            100% { transform: translate(-33.33%, -50%); }
        }
        .animate-marquee-slow {
            animation: marquee 80s linear infinite;
            display: inline-flex;
            width: max-content;
        }
        .animate-marquee-fast {
            animation: marquee 40s linear infinite;
            display: inline-flex;
            width: max-content;
        }
      `}</style>
    </>
  );
};
