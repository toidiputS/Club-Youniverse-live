/**
 * @file TuneInOverlay - A full-screen overlay to handle browser autoplay restrictions.
 */

import React, { useEffect, useState } from "react";
import { getBroadcastManager } from "../services/globalBroadcastManager";

export const TuneInOverlay: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const broadcastManager = getBroadcastManager();

    useEffect(() => {
        const handleBlocked = () => {
            console.log("🚫 TuneInOverlay: Autoplay blocked event received.");
            setIsVisible(true);
        };

        broadcastManager.on("autoplayBlocked", handleBlocked);
        return () => broadcastManager.off("autoplayBlocked", handleBlocked);
    }, [broadcastManager]);

    const handleTuneIn = async () => {
        console.log("🔊 Tuning in...");
        try {
            // CRITICAL: Resume AudioContext explicitly in the same call stack as the user gesture
            await broadcastManager.resumeAudioContext();
            await broadcastManager.play();
            setIsVisible(false);
        } catch (e) {
            console.error("Tune in failed:", e);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-500">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/30 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-600/20 blur-[100px] rounded-full" />

            <div className="relative z-10 text-center flex flex-col items-center gap-10 max-w-md px-6">
                <div className="w-24 h-24 bg-linear-to-br from-purple-500 to-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-purple-500/40 animate-bounce">
                    <span className="text-white text-5xl">📡</span>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Club Youniverse</h1>
                    <p className="text-zinc-400 font-medium leading-relaxed">
                        Browser blocked the signal. Tap below to connect to the 24/7 live AI broadcast.
                    </p>
                </div>

                <button
                    onClick={handleTuneIn}
                    className="group relative px-12 py-5 bg-white text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                >
                    <span className="relative z-10">Connect to Stream</span>
                    <div className="absolute inset-0 bg-linear-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl" />
                </button>

                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Audio Connection Required</p>
            </div>
        </div>
    );
};
