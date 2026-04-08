/**
 * @file SiteEffects Component - Handles global visual and audio effects triggered by the DJ.
 */

import React, { useEffect, useState, useRef } from "react";
import { getBroadcastManager } from "../services/globalBroadcastManager";

export const SiteEffects: React.FC = () => {
    const [activeFx, setActiveFx] = useState<string | null>(null);
    const broadcastManager = useRef(getBroadcastManager()).current;

    useEffect(() => {
        const handleCommand = (cmd: any) => {
            console.log("🌌 SiteEffects: Received command", cmd);

            if (cmd.type === "trigger_fx") {
                // Secondary check for stale commands
                const isStale = cmd.timestamp && (Date.now() - cmd.timestamp > 5000);
                if (isStale) {
                    console.log("🌌 SiteEffects: Ignored stale FX command");
                    return;
                }

                const fx = cmd.payload?.fx;
                setActiveFx(fx);

                // Auto-clear FX after duration
                setTimeout(() => {
                    setActiveFx(null);
                }, 5000);
            }

            if (cmd.type === "tts") {
                const { text, voice } = cmd.payload || {};
                if (text) {
                    playTts(text, voice);
                }
            }
        };

        broadcastManager.on("siteCommandReceived", handleCommand);
        return () => broadcastManager.off("siteCommandReceived", handleCommand);
    }, [broadcastManager]);

    const playTts = (text: string, _voice?: string) => {
        // Basic browser TTS for now, could be upgraded to ElevenLabs API call
        console.log("🎙️ Playing TTS:", text);
        const utterance = new SpeechSynthesisUtterance(text);

        // Attempt to find a cool voice
        const voices = window.speechSynthesis.getVoices();
        const deepVoice = voices.find(v => v.name.includes("Male") || v.name.includes("Deep")) || voices[0];
        if (deepVoice) utterance.voice = deepVoice;

        utterance.pitch = 0.8;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <>
            {/* Glitch Overlay */}
            {activeFx === "Glitch" && (
                <div className="fixed inset-0 z-100 pointer-events-none mix-blend-difference animate-glitch-active bg-purple-500/20" />
            )}

            {/* Shake Effect */}
            {activeFx === "Shake" && (
                <div className="fixed inset-0 z-100 pointer-events-none mix-blend-difference bg-white/5 backdrop-blur-[1px] animate-shake" />
            )}

            {/* Confetti (Simple CSS version) */}
            {activeFx === "Confetti" && (
                <div className="fixed inset-0 z-100 pointer-events-none">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full animate-confetti-fall"
                            style={{
                                left: `${Math.random() * 100}%`,
                                backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
                                animationDelay: `${Math.random() * 3}s`,
                                top: `-10px`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Pulse Effect */}
            {activeFx === "Pulse" && (
                <div className="fixed inset-0 z-100 pointer-events-none mix-blend-screen bg-purple-500/20 animate-pulse-fx" />
            )}

            {/* Static Effect */}
            {activeFx === "Static" && (
                <div className="fixed inset-0 z-100 pointer-events-none opacity-30 mix-blend-overlay animate-static-fx"
                    style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'4\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
                    }}
                />
            )}

            {/* Invert Effect */}
            {activeFx === "Invert" && (
                <div className="fixed inset-0 z-100 pointer-events-none backdrop-invert animate-pulse-fx-fast" />
            )}

            {/* Hue Rotate Effect */}
            {activeFx === "Hue" && (
                <div className="fixed inset-0 z-100 pointer-events-none backdrop-hue-rotate-180 transition-all duration-1000" />
            )}

            {/* Blur Effect */}
            {activeFx === "Blur" && (
                <div className="fixed inset-0 z-100 pointer-events-none backdrop-blur-md animate-pulse-fx-slow" />
            )}

            {/* Pixel Effect */}
            {activeFx === "Pixel" && (
                <div className="fixed inset-0 z-100 pointer-events-none backdrop-blur-[2px] backdrop-contrast-200"
                    style={{ imageRendering: 'pixelated' }} />
            )}

            {/* Neon Effect */}
            {activeFx === "Neon" && (
                <div className="fixed inset-0 z-100 pointer-events-none mix-blend-color-dodge bg-linear-to-tr from-cyan-500/30 via-purple-500/30 to-pink-500/30 animate-pulse-fx-fast" />
            )}

            <style>{`
        @keyframes glitch-active {
            0% { transform: translate(0); }
            20% { transform: translate(-5px, 5px); clip-path: inset(10% 0 30% 0); }
            40% { transform: translate(5px, -5px); clip-path: inset(40% 0 10% 0); }
            60% { transform: translate(-5px, 0); clip-path: inset(0 0 50% 0); }
            100% { transform: translate(0); }
        }
        
        @keyframes shake {
            0%, 100% { transform: translate(0, 0); }
            10%, 30%, 50%, 70%, 90% { transform: translate(-10px, 0); }
            20%, 40%, 60%, 80% { transform: translate(10px, 0); }
        }

        @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0); }
            100% { transform: translateY(110vh) rotate(720deg); }
        }

        @keyframes pulse-fx {
            0%, 100% { opacity: 0; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
        }

        @keyframes static-fx {
            0% { transform: translateX(0) translateY(0); }
            10% { transform: translateX(-5px) translateY(5px); filter: contrast(120%) brightness(110%); }
            20% { transform: translateX(5px) translateY(-5px); filter: contrast(110%) brightness(120%); }
            30% { transform: translateX(-5px) translateY(-5px); filter: contrast(130%) brightness(90%); }
            40% { transform: translateX(5px) translateY(5px); filter: contrast(90%) brightness(130%); }
            50% { transform: translateX(-2px) translateY(2px); filter: contrast(150%) brightness(100%); }
            60% { transform: translateX(2px) translateY(-2px); filter: contrast(100%) brightness(150%); }
            70% { transform: translateX(-2px) translateY(-2px); filter: contrast(80%) brightness(110%); }
            80% { transform: translateX(2px) translateY(2px); filter: contrast(110%) brightness(80%); }
            90% { transform: translateX(-1px) translateY(1px); filter: contrast(120%) brightness(120%); }
            100% { transform: translateX(0) translateY(0); }
        }
        
        .animate-glitch-active { animation: glitch-active 0.2s infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out infinite; }
        .animate-confetti-fall { animation: confetti-fall 3s linear forwards; }
        .animate-pulse-fx { animation: pulse-fx 1s ease-in-out infinite; }
        .animate-pulse-fx-fast { animation: pulse-fx 0.5s ease-in-out infinite; }
        .animate-pulse-fx-slow { animation: pulse-fx 2s ease-in-out infinite; }
        .animate-static-fx { animation: static-fx 0.1s linear infinite; }
      `}</style>
        </>
    );
};
