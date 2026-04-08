import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Profile } from '../types';

interface AlertMessage {
    id: string;
    userId: string;
    name: string;
    avatarUrl?: string;
    action: 'JOIN' | 'LEAVE';
    timestamp: number;
}

export const PresenceAlerts: React.FC<{ profile: Profile }> = ({ profile }) => {
    const [alerts, setAlerts] = useState<AlertMessage[]>([]);

    useEffect(() => {
        // 1. Create the Presence channel
        const channel = supabase.channel('club-presence', {
            config: {
                presence: {
                    key: profile.user_id,
                },
            },
        });

        // 2. Listen for Presence changes (Join / Leave)
        channel
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                newPresences.forEach((presence: any) => {
                    // Don't alert for ourselves
                    if (presence.user_id === profile.user_id) return;

                    setAlerts((prev) => [
                        ...prev,
                        {
                            id: `${presence.presence_ref}-join-${Date.now()}`,
                            userId: presence.user_id,
                            name: presence.name,
                            avatarUrl: presence.avatar_url,
                            action: 'JOIN',
                            timestamp: Date.now(),
                        },
                    ]);
                });
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                leftPresences.forEach((presence: any) => {
                    // Don't alert if we are the ones leaving (we shouldn't see it anyway)
                    if (presence.user_id === profile.user_id) return;

                    setAlerts((prev) => [
                        ...prev,
                        {
                            id: `${presence.presence_ref}-leave-${Date.now()}`,
                            userId: presence.user_id,
                            name: presence.name,
                            avatarUrl: presence.avatar_url,
                            action: 'LEAVE',
                            timestamp: Date.now(),
                        },
                    ]);
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // 3. Announce ourselves to the channel
                    const presenceData: any = {
                        user_id: profile.user_id,
                        name: profile.name,
                        avatar_url: profile.avatar_url,
                        // Supabase auto-assigns presence_ref, but we include it in the type
                        presence_ref: '',
                    };
                    await channel.track(presenceData);
                }
            });

        // Timeout loop to clean up old alerts (keep for 5 seconds)
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            setAlerts((prev) => prev.filter((a) => now - a.timestamp < 5000));
        }, 1000);

        return () => {
            clearInterval(cleanupInterval);
            supabase.removeChannel(channel);
        };
    }, [profile.user_id, profile.name, profile.avatar_url]);

    if (alerts.length === 0) return null;

    return (
        <div className="fixed bottom-24 sm:bottom-32 left-4 z-50 flex flex-col gap-2 pointer-events-none max-w-[80vw] sm:max-w-xs">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className="animate-slide-in-up bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl p-2 flex items-center gap-3 shadow-2xl"
                >
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-white/5 overflow-hidden shrink-0">
                        <img
                            src={alert.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${alert.userId}`}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col min-w-0 pr-2 pb-0.5">
                        <span className="text-[10px] font-black text-white truncate uppercase tracking-wider leading-tight">
                            {alert.name}
                        </span>
                        <span className={`text-[8px] font-bold uppercase tracking-widest leading-none ${alert.action === 'JOIN' ? 'text-green-400' : 'text-red-400'}`}>
                            {alert.action === 'JOIN' ? 'Entered the club' : 'Left the club'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};
