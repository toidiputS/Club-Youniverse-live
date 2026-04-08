/**
 * @file TheChat Component - Emotion-reactive Live Chat for Club Youniverse
 * Integrated with UNI's CGEI (Conversational Generative Emotion Interface)
 */

import React, { useContext, useState, useEffect, useRef } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import { ChatMoodBubble, SystemMessage, SystemPromo } from "./ChatMoodBubble";
import { ChatAtmosphere } from "./ChatAtmosphere";
import type { ChatMessage, Profile } from "../types";

interface TheChatProps {
    profile: Profile;
    transparent?: boolean;
    onFeedbackClick?: () => void;
}

export const TheChat: React.FC<TheChatProps> = ({ profile, transparent, onFeedbackClick }) => {
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
                isAdmin: profile.is_admin
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
                    <div className="mt-auto flex flex-col space-y-2 pt-2 pb-4 items-end">
                        {onFeedbackClick && (
                            <SystemPromo 
                                title="Get 1 Month Free" 
                                subtitle="Help us build the club by sharing feedback." 
                                actionLabel="Claim Reward" 
                                onClick={onFeedbackClick} 
                            />
                        )}

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

                {/* Input Area */}
                <form onSubmit={handleSend} className={`p-2 border-t border-white/3 ${transparent ? 'bg-black/10 backdrop-blur-md' : 'bg-black/30 backdrop-blur-sm'}`}>
                    <div className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="@dj..."
                            className="grow bg-zinc-900/60 border border-zinc-700/30 rounded-lg py-2 px-3 pr-10 text-[10px] text-white/80 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className={`
                                absolute right-2 p-1.5 rounded-md transition-all
                                ${input.trim() 
                                    ? 'bg-purple-600/80 hover:bg-purple-500 text-white' 
                                    : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                                }
                            `}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Quick mood hints */}
                    <div className="flex gap-1 mt-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                        {['❤️', '🔥', '😂', '😮', '✨', '🎵'].map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => setInput(prev => prev + emoji)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/40 hover:bg-zinc-700/50 transition-colors"
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

