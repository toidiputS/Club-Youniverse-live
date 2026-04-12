import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';

export const BillboardCounter: React.FC = () => {
    const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);
    const [isFree, setIsFree] = useState(true);

    useEffect(() => {
        const fetchSpots = async () => {
            const { data, error } = await supabase.rpc('get_first_100_remaining');
            if (!error && data !== null) {
                setSpotsRemaining(data);
                setIsFree(data > 0);
            } else {
                // Fallback for dev/missing RPC
                const { count } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_first_100', true);
                
                const remaining = 100 - (count || 0);
                setSpotsRemaining(remaining);
                setIsFree(remaining > 0);
            }
        };

        fetchSpots();
        
        // Subscribe to profile changes to update counter in real-time
        const channel = supabase
            .channel('first-100-counter')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, fetchSpots)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const digit = spotsRemaining !== null ? String(spotsRemaining).padStart(3, '0') : '---';

    return (
        <div className="relative group perspective-1000">
            {/* Industrial Frame */}
            <div className="bg-[#1a1a1a] border-4 border-[#333] rounded-lg p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(255,255,255,0.05)] overflow-hidden">
                
                {/* LED Screen Grid Overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none opacity-20" 
                     style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }} />

                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-baseline gap-1">
                        {/* Status Light */}
                        <div className={`w-2 h-2 rounded-full ${isFree ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
                        <span className="text-[10px] font-black tracking-widest text-[#444] uppercase">
                            FOUNDER STATUS
                        </span>
                    </div>

                    <div className="bg-black/80 rounded px-6 py-2 border border-white/5 relative">
                        {/* Glow effect */}
                        <div className={`absolute inset-0 blur-xl opacity-20 ${isFree ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        
                        <div className="relative z-20 flex flex-col items-center">
                            <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.3em] mb-1">
                                {isFree ? 'Spots Remaining' : 'Spots Exhausted'}
                            </span>
                            
                            <div className="flex gap-2 font-mono text-5xl sm:text-7xl font-bold leading-none">
                                {digit.split('').map((d, i) => (
                                    <motion.span 
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={isFree ? 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.7)]' : 'text-zinc-800'}
                                    >
                                        {d}
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="w-full flex justify-between items-center px-2 mt-2">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">System Output</span>
                            <div className="text-[9px] font-mono text-zinc-400">00101-LIFETIME-FREE</div>
                        </div>
                        <div className="h-4 w-px bg-zinc-800 mx-4" />
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">Availability</span>
                            <div className={`text-[9px] font-mono ${isFree ? 'text-emerald-500' : 'text-red-500'}`}>
                                {isFree ? 'OPEN' : 'CLOSED'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Industrial Hardware Accents */}
                <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-inner" />
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-inner" />
                <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-inner" />
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-inner" />
            </div>

            {/* Support Struts */}
            <div className="absolute -bottom-4 left-1/4 w-1 h-4 bg-zinc-800" />
            <div className="absolute -bottom-4 right-1/4 w-1 h-4 bg-zinc-800" />
        </div>
    );
};
