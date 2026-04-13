import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../services/supabaseClient';
import { RadioContext } from '../contexts/AudioPlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile } from '../types';

interface AlertMessage {
    id: string;
    userId: string;
    name: string;
    role?: string;
    avatarUrl?: string;
    action: 'JOIN' | 'LEAVE';
    isSmoke?: boolean;
    timestamp: number;
}

export const PresenceAlerts: React.FC<{ profile: Profile }> = ({ profile }) => {
    const [alerts, setAlerts] = useState<AlertMessage[]>([]);
    const lastAlertTime = React.useRef<Record<string, number>>({});
    const context = useContext(RadioContext);

    useEffect(() => {
        if (!context) return;

        // 1. Create the Presence channel
        const channel = supabase.channel('club-presence', {
            config: {
                presence: {
                    key: profile.user_id,
                },
            },
        });

        const smokers = new Set<string>();

        const chatChannel = supabase.channel('presence-helper')
            .on('broadcast', { event: 'status' }, ({ payload }) => {
                if (payload.type === 'smoke') {
                    smokers.add(payload.user);
                    setAlerts((prev) => [
                        ...prev.filter(a => a.name !== payload.user || !a.isSmoke),
                        {
                            id: `smoke-${payload.user}-${Date.now()}`,
                            userId: payload.userId || 'unknown',
                            name: payload.user,
                            action: 'LEAVE' as any,
                            isSmoke: true,
                            timestamp: Date.now(),
                        },
                    ]);
                    setTimeout(() => smokers.delete(payload.user), 5000);
                }
            })
            .subscribe();

        let isInitialSync = true;
        
        channel
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                if (isInitialSync) return;
                newPresences.forEach((presence: any) => {
                    if (presence.user_id === profile.user_id) return;

                    const name = presence.name || "A Listener";
                    const key = `join-${presence.user_id}`;
                    const now = Date.now();
                    
                    // Throttle repeated joins from same user (30s)
                    if (lastAlertTime.current[key] && now - lastAlertTime.current[key] < 30000) return;
                    lastAlertTime.current[key] = now;
                    
                    setAlerts((prev) => {
                        // Deduplicate: Remove old alerts for this user to avoid stacking
                        const filtered = prev.filter(a => a.userId !== presence.user_id);
                        return [
                            ...filtered,
                            {
                                id: `${presence.presence_ref}-join-${now}`,
                                userId: presence.user_id,
                                name: name,
                                role: presence.role,
                                avatarUrl: presence.avatar_url,
                                action: 'JOIN',
                                timestamp: now,
                            },
                        ];
                    });
                });
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                leftPresences.forEach((presence: any) => {
                    if (presence.user_id === profile.user_id) return;

                    const name = presence.name || "A Listener";
                    if (smokers.has(name)) return;

                    const key = `leave-${presence.user_id}`;
                    const now = Date.now();
                    
                    // Throttle repeated leaves from same user (30s)
                    if (lastAlertTime.current[key] && now - lastAlertTime.current[key] < 30000) return;
                    lastAlertTime.current[key] = now;

                    setAlerts((prev) => {
                        const filtered = prev.filter(a => a.userId !== presence.user_id);
                        return [
                            ...filtered,
                            {
                                id: `${presence.presence_ref}-leave-${now}`,
                                userId: presence.user_id,
                                name: name,
                                role: presence.role,
                                avatarUrl: presence.avatar_url,
                                action: 'LEAVE',
                                timestamp: now,
                            },
                        ];
                    });
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    setTimeout(() => { isInitialSync = false; }, 2000);
                    
                    const presenceData: any = {
                        user_id: profile.user_id,
                        name: profile.name,
                        avatar_url: profile.avatar_url,
                        role: profile.role,
                        presence_ref: '',
                    };
                    await channel.track(presenceData);
                }
            });

        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            setAlerts((prev) => prev.filter((a) => now - a.timestamp < 5000));
        }, 1000);

        return () => {
            clearInterval(cleanupInterval);
            supabase.removeChannel(channel);
            supabase.removeChannel(chatChannel);
        };
    }, [profile.user_id, profile.name, profile.avatar_url, profile.role]); 

    if (alerts.length === 0) return null;

    return (
        <div className="fixed bottom-24 sm:bottom-32 left-6 z-50 flex flex-col gap-3 pointer-events-none max-w-[80vw] sm:max-w-xs">
            <AnimatePresence mode="popLayout">
                {alerts.map((alert) => (
                    <motion.div
                        key={alert.id}
                        layout
                        initial={{ opacity: 0, x: -30, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, x: -50 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="
                            relative overflow-hidden
                            bg-zinc-950/40 backdrop-blur-2xl border border-white/10 
                            rounded-2xl p-3 flex items-center gap-4 shadow-[0_30px_60px_rgba(0,0,0,0.6)]
                            group
                        "
                    >
                        {/* Status aura */}
                        <div className={`absolute -inset-2 opacity-[0.08] blur-2xl group-hover:opacity-20 transition-opacity ${
                            alert.isSmoke ? 'bg-purple-500' : alert.action === 'JOIN' ? 'bg-green-500' : 'bg-red-500'
                        }`} />

                        <div className="relative w-10 h-10 rounded-[14px] bg-black border border-white/10 overflow-hidden shrink-0 shadow-2xl">
                            <img
                                src={alert.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${alert.userId}`}
                                alt="Avatar"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            />
                        </div>

                        <div className="relative flex flex-col min-w-0 pr-1 gap-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-white truncate uppercase tracking-tight drop-shadow-md">
                                    {alert.name}
                                </span>
                                {alert.role && alert.role !== 'listener' && (
                                    <span className={`text-[6px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                        alert.role === 'owner' ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]' :
                                        alert.role === 'bouncer' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>
                                        {alert.role}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none ${
                                alert.isSmoke ? 'text-purple-400' :
                                alert.action === 'JOIN' ? 'text-emerald-400' : 'text-rose-500'
                            }`}>
                                {alert.isSmoke ? 'Smoke break' : alert.action === 'JOIN' ? 'Entered' : 'Left the club'}
                            </span>
                        </div>

                        {/* Lifecycle progress bar */}
                        <motion.div 
                            initial={{ width: "100%" }}
                            animate={{ width: 0 }}
                            transition={{ duration: 5, ease: "linear" }}
                            className={`absolute bottom-0 left-0 h-[2.5px] opacity-60 ${
                                alert.isSmoke ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 
                                alert.action === 'JOIN' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                                'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                            }`}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
