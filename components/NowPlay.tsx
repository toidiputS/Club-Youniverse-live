/**
 * @file NowPlay Component - The administrative playback HUD.
 * High-fidelity, ultra-compact administrative ribbon.
 */

import React, { useContext, useState } from 'react';
import { RadioContext } from '../contexts/AudioPlayerContext';
import { motion } from 'framer-motion';
import { 
    Zap, 
    Heart, 
    Activity, 
    Star
} from 'lucide-react';
import { SongCardPopOut } from './SongCardPopOut';
import { VolumeControl } from './VolumeControl';

export const NowPlay: React.FC = () => {
    const context = useContext(RadioContext);
    const [isFavorited, setIsFavorited] = useState(false);
    const [showPopOut, setShowPopOut] = useState(false);

    if (!context || !context.nowPlaying) return null;

    const { nowPlaying, liveRating, castVote } = context;

    const handleVote = (stars: number) => {
        castVote(stars);
    };

    const toggleFavorite = () => setIsFavorited(!isFavorited);

    return (
        <div className="w-full bg-black/95 border-y border-purple-500/20 backdrop-blur-xl relative overflow-hidden flex items-center py-0.5 px-2 shadow-2xl">
            {/* 1. Administrative Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                <div className="w-full h-px bg-white animate-scanline" />
            </div>

            {/* Song Progress Bar - Flush Center Strip */}
            <div className="absolute left-[20%] right-[35%] top-1/2 -translate-y-1/2 h-px bg-white/5 pointer-events-none z-0">
                <motion.div 
                    className="h-full bg-linear-to-r from-purple-500 via-pink-500 to-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (context.currentTime / (context.duration || 1)) * 100)}%` }}
                    transition={{ type: "tween", ease: "linear", duration: 0.5 }}
                />
            </div>

            <div className="flex-1 flex items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-3 group/card cursor-pointer" onClick={() => setShowPopOut(true)}>
                    <div className="relative group">
                        <img 
                            src={nowPlaying.coverArtUrl || `https://picsum.photos/seed/${nowPlaying.id}/100`}
                            alt={nowPlaying.title}
                            className="w-8 h-8 rounded-lg object-cover border border-white/10 group-hover:border-purple-500/50 transition-all shadow-lg"
                        />
                        <div className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <Activity size={10} className="text-white animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-white uppercase tracking-wider truncate max-w-[180px]">
                                {nowPlaying.title}
                            </span>
                            {nowPlaying.sunoUrl && (
                                <a 
                                    href={nowPlaying.sunoUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[9px] font-black text-[#fe6d00] border border-[#fe6d00]/30 px-1 rounded hover:bg-[#fe6d00] hover:text-white transition-all uppercase"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    SUNO
                                </a>
                            )}
                        </div>
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter truncate">
                            {nowPlaying.artistName}
                        </span>
                    </div>
                </div>

                {/* 2. Rating & Telemetry Sector (Center) */}
                <div className="hidden sm:flex items-center gap-8">
                    {/* Voting Grid - Direct interaction */}
                    <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                                const isVoted = (nowPlaying.userRating || 0) >= star;
                                const icon = isVoted ? <Zap size={9} fill="currentColor" /> : <Star size={9} />;
                                const colorClass = isVoted 
                                    ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' 
                                    : 'text-zinc-700 hover:text-zinc-500';

                                return (
                                    <button
                                        key={star}
                                        onClick={(e) => { e.stopPropagation(); handleVote(star); }}
                                        className="transition-all hover:scale-125 hover:rotate-6 active:scale-95"
                                    >
                                        <span className={colorClass}>{icon}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[7px] font-black text-zinc-500 uppercase">
                                <Activity size={7} />
                                <span>{nowPlaying.stars || 0} GALAXY RATING</span>
                            </div>
                            {liveRating.count > 0 && (
                                <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-1 rounded">
                                    AVG: {(liveRating.sum / liveRating.count).toFixed(1)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Utility Segment (Right) */}
                <div className="flex items-center gap-2">
                    <div className="scale-75 origin-right flex items-center gap-2">
                        <div className="bg-white/5 px-1.5 py-1 rounded-lg border border-white/10 flex items-center shadow-inner group/vol transition-all hover:bg-white/10">
                            <VolumeControl />
                        </div>
                    </div>
                    
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all active:scale-95 ${isFavorited ? 'bg-pink-500 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-white/5 border-white/10 text-zinc-600 hover:text-white'}`}
                    >
                        <Heart size={12} fill={isFavorited ? "currentColor" : "none"} />
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
