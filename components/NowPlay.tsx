/**
 * @file NowPlay Component - Shows what's currently playing in the Club.
 */

import React, { useContext, useEffect, useState } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";

export const NowPlay: React.FC = () => {
    const context = useContext(RadioContext);
    if (!context) return null;

    const { nowPlaying, currentTime, isPlaying, profile } = context;
    const [isFavorited, setIsFavorited] = useState(false);

    useEffect(() => {
        const checkFavorite = async () => {
            if (!profile?.user_id || !nowPlaying?.id) return;
            const { data } = await supabase
                .from('user_favorites')
                .select('song_id')
                .eq('user_id', profile.user_id)
                .eq('song_id', nowPlaying.id)
                .single();

            setIsFavorited(!!data);
        };
        checkFavorite();
    }, [nowPlaying?.id, profile?.user_id]);

    const toggleFavorite = async () => {
        if (!profile?.user_id || !nowPlaying?.id) return;

        if (isFavorited) {
            setIsFavorited(false);
            await supabase.from('user_favorites').delete().eq('user_id', profile.user_id).eq('song_id', nowPlaying.id);
        } else {
            setIsFavorited(true);
            await supabase.from('user_favorites').insert({ user_id: profile.user_id, song_id: nowPlaying.id });
        }
    };

    if (!nowPlaying) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-white/10">
                <div className="text-zinc-500 animate-pulse text-lg">Station Offline... Waiting for the Drop</div>
            </div>
        );
    }

    const progress = (currentTime / (nowPlaying.durationSec || 1)) * 100;

    return (
        <div className="relative overflow-hidden bg-black/60 backdrop-blur-3xl rounded-3xl border border-white/10 p-4 shadow-2xl transition-all hover:border-white/20 group">
            {/* Minimal Progress Bar (Top) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex gap-4 items-center">
                {/* Compact Cover Art */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                    <img
                        src={nowPlaying.coverArtUrl || `https://picsum.photos/seed/${nowPlaying.id}/200`}
                        alt={nowPlaying.title}
                        className={`w-full h-full object-cover ${!isPlaying ? 'grayscale opacity-50' : 'animate-pulse-slow'}`}
                    />
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                <span className="text-[8px]">⏸</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Compact Info */}
                <div className="flex flex-col min-w-0 flex-grow">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">On Air</span>
                        {isPlaying && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-white leading-none truncate tracking-tight">{nowPlaying.title}</h2>
                        <button
                            onClick={toggleFavorite}
                            className={`text-sm transition-all transform hover:scale-110 ${isFavorited ? 'text-red-500 hover:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-zinc-600 hover:text-red-500/50'}`}
                            title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                        >
                            {isFavorited ? '❤️' : '🤍'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-400 font-bold text-xs truncate uppercase tracking-tighter">{nowPlaying.artistName}</p>
                        {nowPlaying.genre && (
                            <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase">
                                {nowPlaying.genre}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Indicator */}
                {!isPlaying && (
                    <div className="px-2 py-1 bg-white/5 rounded-md border border-white/10">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">Paused</span>
                    </div>
                )}
            </div>
        </div>
    );
};
