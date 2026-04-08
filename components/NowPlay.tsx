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
    const [showPopOut, setShowPopOut] = useState(false);
    const [liveRating, setLiveRating] = useState({ 
        sum: nowPlaying?.liveStarsSum || 0, 
        count: nowPlaying?.liveStarsCount || 0 
    });

    useEffect(() => {
        if (!nowPlaying?.id) return;

        const checkFavorite = async () => {
            if (!profile?.user_id) return;
            const { data } = await supabase
                .from('user_favorites')
                .select('song_id')
                .eq('user_id', profile.user_id)
                .eq('song_id', nowPlaying.id)
                .maybeSingle();
            setIsFavorited(!!data);
        };
        checkFavorite();

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
            <div className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Station Offline</span>
            </div>
        );
    }

    const progress = (currentTime / (nowPlaying.durationSec || 1)) * 100;

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
        <div className="flex flex-col gap-2 select-none">
            {/* Stars & Progress & Rating */}
            <div className="flex items-center gap-3 px-1 mt-auto bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-white/5 mx-2">
                <div className="flex gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleStarVote(star)}
                            className={`text-[10px] transition-all hover:scale-125 active:scale-150 ${votedStar === star ? 'scale-150 relative z-10' : ''}`}
                        >
                            <span className={votedStar >= star ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-zinc-700'}>⭐</span>
                        </button>
                    ))}
                </div>
                
                <div className="grow flex items-center gap-3">
                    <div className="grow h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    
                    <span className="text-[9px] font-black text-white/60 tracking-tighter whitespace-nowrap">
                        {(liveRating.count > 0 ? (liveRating.sum / liveRating.count).toFixed(1) : (nowPlaying.stars || 0).toString())}/10
                    </span>
                    
                    {/* Favorite */}
                    <button
                        onClick={toggleFavorite}
                        className="text-sm transition-transform hover:scale-110 active:scale-95 px-1"
                    >
                        {isFavorited ? '❤️' : '🤍'}
                    </button>
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
