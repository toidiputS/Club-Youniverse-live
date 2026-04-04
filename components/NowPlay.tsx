/**
 * @file NowPlay Component - Shows what's currently playing in the Club.
 */

import React, { useContext, useEffect, useState } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import { SongCardPopOut } from "./SongCardPopOut";

export const NowPlay: React.FC = () => {
    const context = useContext(RadioContext);
    if (!context) return null;

    const { nowPlaying, currentTime, isPlaying, profile } = context;
    const [isFavorited, setIsFavorited] = useState(false);
    const [votedStar, setVotedStar] = useState<number>(0);
    const [hoverStar, setHoverStar] = useState<number>(0);
    const [showPopOut, setShowPopOut] = useState(false);
    const [liveRating, setLiveRating] = useState({ 
        sum: nowPlaying?.liveStarsSum || 0, 
        count: nowPlaying?.liveStarsCount || 0 
    });

    useEffect(() => {
        if (!nowPlaying?.id) return;

        const checkFavorite = async () => {
            if (!profile?.user_id) return;
            const { data, error } = await supabase
                .from('user_favorites')
                .select('song_id')
                .eq('user_id', profile.user_id)
                .eq('song_id', nowPlaying.id)
                .maybeSingle();

            if (error) console.warn("Favorite check issue:", error);
            setIsFavorited(!!data);
        };
        checkFavorite();

        // REAL-TIME RATING SYNC
        setLiveRating({ 
            sum: nowPlaying.liveStarsSum || 0, 
            count: nowPlaying.liveStarsCount || 0 
        });

        const songSub = supabase
            .channel(`live-rating-${nowPlaying.id}`)
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'songs', filter: `id=eq.${nowPlaying.id}` }, 
                (payload) => {
                    setLiveRating({ 
                        sum: payload.new.live_stars_sum || 0, 
                        count: payload.new.live_stars_count || 0 
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(songSub); };
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

    // Handle Star Vote (1-10)
    const handleStarVote = async (value: number) => {
        if (!nowPlaying?.id) return;
        setVotedStar(value);
        
        const { data: song } = await supabase.from("songs").select("live_stars_sum, live_stars_count").eq("id", nowPlaying.id).single();
        if (song) {
            await supabase.from("songs").update({ 
                live_stars_sum: (song.live_stars_sum || 0) + value,
                live_stars_count: (song.live_stars_count || 0) + 1
            }).eq("id", nowPlaying.id);
        }
    };

    return (
        <div className="flex flex-col gap-4 select-none max-w-full">
            {/* Status Indicator */}
            <div className="flex items-center gap-2 pl-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-500/80">
                    ON AIR
                </span>
                {isPlaying && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />}
            </div>

            <div className="flex items-center gap-4">
                {/* NOW PLAYING CARD PILL */}
                <div 
                    onClick={() => setShowPopOut(true)}
                    className="flex items-center gap-4 sm:gap-6 group cursor-pointer bg-black/60 hover:bg-black/40 px-6 py-4 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all duration-700 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
                >
                    {/* Cover Art (Neomorphic) */}
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 shrink-0">
                        <img 
                            src={nowPlaying.coverArtUrl || `https://picsum.photos/seed/${nowPlaying.id}/200`} 
                            className="w-full h-full object-cover rounded-2xl shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-3" 
                            alt="Now Playing" 
                        />
                        <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] pointer-events-none" />
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-2xl">
                            <span className="text-[8px] font-black text-white/80 tracking-widest">POP</span>
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="flex flex-col min-w-0 pr-4">
                        <h2 className="text-[14px] sm:text-[18px] font-black text-white leading-tight uppercase tracking-[0.1em] truncate group-hover:text-purple-400 transition-colors">
                            {nowPlaying.title}
                        </h2>
                        <div className="flex items-center gap-3 mt-1 opacity-60">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-white">
                                {nowPlaying.artistName}
                            </span>
                            <div className="w-0.5 h-2 bg-white/20" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">
                                    {(liveRating.count > 0 ? liveRating.sum / liveRating.count : nowPlaying.stars).toFixed(1)}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">RANKING</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAVORITE ACTION */}
                <button
                    onClick={toggleFavorite}
                    className={`p-3 rounded-full bg-white/5 border border-white/5 transition-all transform hover:scale-110 active:scale-95 hover:bg-white/10 ${isFavorited ? 'text-red-500' : 'text-zinc-600 hover:text-white/40'}`}
                >
                    {isFavorited ? '❤️' : '🤍'}
                </button>
            </div>

            {/* INTERACTIVE MERIT STARS (Discrete) */}
            <div className="flex items-center gap-2 pl-2">
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleStarVote(star)}
                            onMouseEnter={() => setHoverStar(star)}
                            onMouseLeave={() => setHoverStar(0)}
                            className="focus:outline-none transition-transform hover:scale-125"
                        >
                            <span className={`text-[12px] transition-colors ${(votedStar >= star || hoverStar >= star) ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-zinc-800'}`}>
                                ⭐
                            </span>
                        </button>
                    ))}
                </div>
                {/* DISCRETE PROGRESS BAR */}
                <div className="ml-4 w-24 h-[2px] bg-white/5 rounded-full overflow-hidden shrink-0">
                    <div
                        className="h-full bg-purple-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <SongCardPopOut 
                song={nowPlaying}
                isOpen={showPopOut}
                onClose={() => setShowPopOut(false)}
            />
        </div>
    );
};
