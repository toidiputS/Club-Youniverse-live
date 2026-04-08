/**
 * @file TheChat Component - Emotion-reactive Live Chat for Club Youniverse
 * Integrated with UNI's CGEI (Conversational Generative Emotion Interface)
 */

import React, { useContext, useState, useEffect, useRef } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import { ChatMoodBubble, SystemMessage } from "./ChatMoodBubble";
import { ChatAtmosphere } from "./ChatAtmosphere";
import type { ChatMessage, Profile } from "../types";

interface TheChatProps {
    profile: Profile & { is_admin?: boolean };
    transparent?: boolean;
}

const DJ_BANTER = [
    "Yo! Help us build the club by sharing feedback. You might even land 1 MONTH FREE! 🎁",
    "DROP A VIBE IN THE CHAT TO INFLUENCE THE LIGHTS ✨",
    "ENJOYING THE SESSION? TYPE /YOUNIVERSE TO SYNC UP 🎶",
    "Stay YOUNIVERSAL. The broadcast is flowing. 🛸",
    "WHO'S ON THE FLOOR? DROP A ❤️ IF YOU'RE VIBING.",
    "New wave in the pool. Stay tuned. 🎧",
    "Visuals reacting to the mood... What's the frequency? 🌊"
];

export const TheChat: React.FC<TheChatProps> = ({ profile, transparent }) => {
    const context = useContext(RadioContext);
    if (!context) return null;

    const { chatMessages, addChatMessage } = context;
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // Subscribe to live chat messages
    useEffect(() => {
        const channel = supabase.channel('club-chat')
            .on('broadcast', { event: 'new_message' }, ({ payload }) => {
                addChatMessage(payload);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [addChatMessage]);

    // Automated DJ Banter
    useEffect(() => {
        if (!profile.is_admin) return; // Only admins trigger the bot to avoid duplication

        const sendBanter = async () => {
            const banter = DJ_BANTER[Math.floor(Math.random() * DJ_BANTER.length)];
            const message: ChatMessage = {
                id: `dj-bot-${Date.now()}`,
                user: {
                    name: "DJ Python",
                    isDj: true,
                    isAdmin: true
                },
                text: banter,
                timestamp: Date.now()
            };

            await supabase.channel('club-chat').send({
                type: 'broadcast',
                event: 'new_message',
                payload: message
            });
            addChatMessage(message);
        };

        // Send a message every 3-5 minutes
        const timer = setInterval(() => {
            if (Math.random() > 0.5) sendBanter();
        }, 180000 + Math.random() * 120000);

        return () => clearInterval(timer);
    }, [profile.is_admin, addChatMessage]);

    // Handle sending a message
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Slash command handling
        const cmd = input.trim().toLowerCase();
        if (cmd === "/youniversal" || cmd === "/youniverse") {
            if (profile.is_admin) {
                // Administrators can toggle the game directly
                context.setDanceFloorEnabled(!context.danceFloorEnabled);
                setInput("");
                return;
            } else {
                // Users can "vibe" to request it or just have it trigger if already enabled
                // But for now, let's treat it as a trigger for everyone if specified
                context.setDanceFloorEnabled(true);
                setInput("");
                return;
            }
        }

        const message: ChatMessage = {
            id: Date.now().toString(),
            user: {
                name: profile.name || "Anonymous",
                isAdmin: !!profile.is_admin
            },
            text: input,
            timestamp: Date.now()
        };

        // Broadcast to all listeners
        await supabase.channel('club-chat').send({
            type: 'broadcast',
            event: 'new_message',
            payload: message
        });

        // Also add locally
        addChatMessage(message);
        setInput("");
    };

    // System Alert for Empty Pool
    useEffect(() => {
        if (profile.is_admin && context.radioState === 'POOL' && context.chatMessages.length > 0) {
            const hasAlert = context.chatMessages.some(m => m.text.includes("RADIO POOL DEPLETED"));
            if (!hasAlert) {
                addChatMessage({
                    id: 'system-alert',
                    user: { name: "SYSTEM PROTOCOL", isDj: true },
                    text: "RADIO POOL DEPLETED. RESURRECT STORAGE NODES IN DJ BOOTH.",
                    timestamp: Date.now()
                });
            }
        }
    }, [context.radioState, profile.is_admin, context.chatMessages.length, addChatMessage]);

    // Determine if message is from current user
    const isCurrentUser = (msg: ChatMessage) => {
        return msg.user.name === profile.name;
    };

    // Check if message is a system message
    const isSystemMessage = (msg: ChatMessage) => {
        return msg.user.name === "SYSTEM PROTOCOL" || msg.user.name === "DJ Python" || msg.id === 'system-alert';
    };

    return (
        <ChatAtmosphere 
            messages={chatMessages.map(m => ({ text: m.text }))}
            showMoodBadge={true}
            showParticles={true}
        >
            <div className="flex flex-col h-full overflow-hidden transition-all select-none">
                {/* Chat Messages */}
                <div
                    ref={scrollRef}
                    className="flex flex-col grow overflow-y-auto px-3 scrollbar-hide min-h-0"
                    style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20px)' }}
                >
                    <div className="mt-auto flex flex-col space-y-2 pt-2 pb-4 items-stretch">
                        {chatMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                                <span className="text-lg mb-2">🎵</span>
                                <span className="text-[10px] font-medium uppercase tracking-wider">
                                    The chat is quiet...
                                </span>
                                <span className="text-[8px] text-zinc-700 mt-1">
                                    Be the first to drop a vibe
                                </span>
                            </div>
                        )}
                        
                        {chatMessages.map((msg) => {
                            if (isSystemMessage(msg)) {
                                return (
                                    <SystemMessage 
                                        key={msg.id} 
                                        message={msg.text} 
                                        timestamp={msg.timestamp}
                                    />
                                );
                            }

                            return (
                                <ChatMoodBubble
                                    key={msg.id}
                                    message={msg.text}
                                    username={msg.user.name}
                                    isAdmin={msg.user.isAdmin || msg.user.isDj}
isCurrentUser={isCurrentUser(msg)}
                                    timestamp={msg.timestamp}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Input Area - Floating Glass Pill */}
                <form 
                    onSubmit={handleSend} 
                    className="pt-1 pb-3 px-3 bg-transparent pointer-events-none"
                >
                    <div className="relative flex items-center gap-2 max-w-md mx-auto pointer-events-auto">
                        <div className="grow relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="@dj..."
                                className={`w-full ${transparent ? 'bg-black/40' : 'bg-black/60'} backdrop-blur-xl border border-white/10 rounded-full py-2.5 px-4 pr-12 text-[11px] text-white/90 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50 shadow-2xl transition-all`}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className={`
                                    absolute right-1.5 p-1.5 rounded-full transition-all
                                    ${input.trim() 
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/40' 
                                        : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                                    }
                                `}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    {/* Quick mood hints - Floating Pill Style */}
                    <div className="flex justify-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide pointer-events-auto">
                        {['❤️', '🔥', '😂', '😮', '✨', '🎵'].map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => setInput(prev => prev + emoji)}
                                className="text-[10px] px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/5 hover:bg-zinc-800/50 transition-colors text-white/70"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </form>
            </div>
        </ChatAtmosphere>
    );
};

export default TheChat;

