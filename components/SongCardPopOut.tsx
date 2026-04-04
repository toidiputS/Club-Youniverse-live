import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Song } from '../types';

interface SongCardPopOutProps {
    song: Song;
    isOpen: boolean;
    onClose: () => void;
}

export const SongCardPopOut: React.FC<SongCardPopOutProps> = ({ song, isOpen, onClose }) => {
    if (!song) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] cursor-pointer"
                    />

                    {/* Card Content Wrapper: Global Center */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-6"
                    >
                        <div className="w-full max-w-[420px] pointer-events-auto">
                        <div className="w-full bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-auto relative group">
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />

                            {/* Large Cover Art Section */}
                            <div className="relative aspect-square w-full overflow-hidden p-6">
                                <motion.img 
                                    src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/600`}
                                    alt={song.title}
                                    className="w-full h-full object-cover rounded-[2rem] shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                                    layoutId={`song-art-${song.id}`}
                                />
                                
                                {/* Dynamic Overlay Stats */}
                                <div className="absolute top-10 right-10 flex flex-col gap-2">
                                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                        <span className="text-[10px] font-black tracking-widest text-white uppercase">{song.playCount || 0} PLAYS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="px-10 pb-12 pt-4 flex flex-col items-center text-center">
                                <motion.h2 
                                    className="text-2xl font-black text-white uppercase tracking-[0.1em] mb-1 line-clamp-2 leading-tight"
                                    layoutId={`song-title-${song.id}`}
                                >
                                    {song.title}
                                </motion.h2>
                                <p className="text-purple-400 font-bold uppercase tracking-[0.3em] text-[10px] opacity-60 mb-6">{song.artistName}</p>

                                {/* Rating Matrix */}
                                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                    <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Global Merit</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-black text-white">{song.stars?.toFixed(1) || '0.0'}</span>
                                            <span className="text-[10px] text-purple-500/60 font-black tracking-widest">/ 10</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">VJ Protocol</span>
                                        <span className="text-[10px] font-black text-white/60 tracking-wider">
                                            {song.lyrics ? 'CHOREOGRAPHED' : 'PROCEDURAL'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex w-full gap-3">
                                    <button 
                                        onClick={onClose}
                                        className="flex-grow py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-purple-500 hover:text-white transition-all shadow-xl active:scale-95"
                                    >
                                        Return to Club
                                    </button>
                                </div>
                            </div>

                            {/* Close Button Trigger */}
                            <button 
                                onClick={onClose}
                                className="absolute top-6 left-6 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
