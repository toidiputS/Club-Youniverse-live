/**
 * @file TheChat Component - Simplified Live Chat for Club Youniverse.
 */

import React, { useContext, useState, useEffect, useRef } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import type { ChatMessage, Profile } from "../types";

interface TheChatProps {
    profile: Profile;
}

export const TheChat: React.FC<TheChatProps> = ({ profile }) => {
    const context = useContext(RadioContext);
    if (!context) return null;

    const { chatMessages, addChatMessage } = context;
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    useEffect(() => {
        const channel = supabase.channel('club-chat')
            .on('broadcast', { event: 'new_message' }, ({ payload }) => {
                addChatMessage(payload);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [addChatMessage]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Detect mention if needed for future logic, but currently unused

        const message: ChatMessage = {
            id: Date.now().toString(),
            user: {
                name: profile.name || "Anonymous",
                isAdmin: profile.is_admin
            },
            text: input,
            timestamp: Date.now()
        };

        await supabase.channel('club-chat').send({
            type: 'broadcast',
            event: 'new_message',
            payload: message
        });

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
                    user: { name: "SYSTEM PROTOCOL", isAdmin: true },
                    text: "⚠️ RADIO POOL DEPLETED. RESURRECT STORAGE NODES IN DJ BOOTH.",
                    timestamp: Date.now()
                });
            }
        }
    }, [context.radioState, profile.is_admin]);

    return (
        <div className="flex flex-col h-full overflow-hidden transition-all select-none">
            {/* Chat Messages */}
            <div
                ref={scrollRef}
                className="flex flex-col flex-grow overflow-y-auto px-3 scrollbar-hide min-h-0"
                style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20px)' }}
            >
                <div className="mt-auto flex flex-col space-y-2 pt-2 pb-4">
                    {chatMessages.map((msg) => {
                        const isMention = msg.text.toLowerCase().includes("@dj");
                        return (
                            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${msg.user.isAdmin ? 'text-purple-400' : 'text-zinc-600'}`}>
                                            {msg.user.name}
                                        </span>
                                    </div>
                                    <div className={`text-[10px] font-medium leading-[1.3] ${isMention
                                        ? 'text-purple-300 border-l border-purple-500/30 pl-2 bg-purple-500/5 py-0.5'
                                        : 'text-zinc-400'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tight Input Area */}
            <form onSubmit={handleSend} className="p-2 border-t border-white/[0.03]">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="@dj..."
                    className="w-full bg-black/40 border-none rounded-lg py-2 px-3 text-[10px] text-white/80 placeholder-zinc-800 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-all"
                />
            </form>
        </div>
    );
};
