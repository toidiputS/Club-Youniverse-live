/**
 * @file Ticker Component - The breaking news marquee for Club Youniverse.
 * Merged into a single-row Universal Marquee to maximize dance floor visibility.
 */

import React, { useContext } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { NowPlay } from "./NowPlay";

export const Ticker: React.FC = () => {
    const context = useContext(RadioContext);
    if (!context) return null;

    const { tickerText, leaderboardText, djBanter } = context;

    // Combine all feeds into one long continuous stream
    const universalFeed = `${tickerText} • ${leaderboardText} • ${djBanter} • [STATION STATUS: OPTIMAL] • [SEASON OF SOUND: ACTIVE]`;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
            {/* 1. HUD ROW - Perspectives persist on top */}
            <div className="pointer-events-auto">
                <NowPlay />
            </div>

            {/* 2. UNIVERSAL MARQUEE - Single row for everything */}
            <div className="h-5 bg-black/95 backdrop-blur-md border-t border-purple-500/30 flex items-center pointer-events-auto relative overflow-hidden">
                {/* Visual Accent: Left Side Data Label */}
                <div className="absolute left-0 top-0 bottom-0 bg-purple-600/20 px-2 flex items-center border-r border-purple-500/20 z-10 transition-colors">
                    <span className="text-[8px] font-black tracking-tighter text-purple-400 uppercase">UNIV_FEED</span>
                </div>

                {/* Scrolling Stream */}
                <div className="flex h-full items-center whitespace-nowrap px-4 pl-16">
                    <div className="animate-marquee inline-block">
                        <span className="text-[10px] font-black tracking-widest text-white uppercase italic opacity-80 py-1">
                            {universalFeed}
                        </span>
                        <span className="text-[10px] font-black tracking-widest text-white uppercase italic opacity-80 ml-[20vw] py-1">
                            {universalFeed}
                        </span>
                    </div>
                </div>

                {/* Visual Accent: Right Side Status */}
                <div className="absolute right-0 top-0 bottom-0 px-3 flex items-center bg-black/50 border-l border-white/5 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-emerald-500 tracking-widest uppercase">LIVE</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    display: inline-block;
                    animation: marquee 40s linear infinite;
                    will-change: transform;
                }
            `}</style>
        </div>
    );
};
