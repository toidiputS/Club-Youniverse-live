import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { PersistentRadioService } from "../services/PersistentRadioService";
import type { Song } from "../types";

export const ThePool: React.FC = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPool = async () => {
            const { data } = await supabase
                .from("songs")
                .select("*")
                .eq("status", "pool")
                .order("created_at", { ascending: false })
                .limit(20);

            if (data) {
                setSongs(data.map(PersistentRadioService.mapDbToApp));
            }
            setLoading(false);
        };

        fetchPool();
        const interval = setInterval(fetchPool, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && songs.length === 0) return null;

    return (
        <div className="flex flex-col w-full gap-3 py-4">
            <header className="flex justify-between items-center px-2">
                <div className="flex flex-col">
                    <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40">Node Archive</h2>
                    <span className="text-[12px] font-black text-purple-400 uppercase italic">THE POOL</span>
                </div>
                <div className="h-px flex-grow mx-6 bg-gradient-to-r from-purple-500/20 to-transparent" />
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-2">
                {songs.map(song => (
                    <div key={song.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 relative">
                            <img src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`} className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all scale-110" alt="" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-white/60 group-hover:text-white uppercase truncate">{song.title}</span>
                            <span className="text-[8px] font-bold text-zinc-600 uppercase truncate">{song.artistName}</span>
                        </div>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-black text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase">Staged</span>
                        </div>
                    </div>
                ))}
            </div>
            
            {songs.length === 0 && (
                <div className="py-10 flex flex-col items-center justify-center opacity-20 border border-dashed border-white/10 rounded-2xl mx-2">
                    <span className="text-[9px] font-black uppercase tracking-widest">Pool Empty // Standby</span>
                </div>
            )}
        </div>
    );
};
