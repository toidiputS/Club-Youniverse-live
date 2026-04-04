import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import type { Song } from '../types';

interface SongCardPopOutProps {
    song: Song;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: () => void;
}

export const SongCardPopOut: React.FC<SongCardPopOutProps> = ({ song, isOpen, onClose, onEdit }) => {
    const [downloading, setDownloading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    const handleDownload = async () => {
        if (!song.audioUrl || downloaded) return;
        setDownloading(true);
        
        try {
            const response = await fetch(song.audioUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${song.artistName} - ${song.title}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setDownloaded(true);
            setTimeout(() => setDownloaded(false), 3000);
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setDownloading(false);
        }
    };

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

                    {/* Card Content */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-4 sm:p-6"
                    >
                        <div className="w-full max-w-[400px] pointer-events-auto">
                        <div className="w-full bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative">
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />

                            {/* Large Cover Art */}
                            <div className="relative aspect-square w-full overflow-hidden p-5">
                                <img 
                                    src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/600`}
                                    alt={song.title}
                                    className="w-full h-full object-cover rounded-[1.5rem] shadow-2xl"
                                />
                                
                                {/* Play Count */}
                                <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10">
                                    <span className="text-[10px] font-black tracking-widest text-white uppercase">{song.playCount || 0} Plays</span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center">
                                <h2 className="text-xl font-black text-white uppercase tracking-wide mb-1 line-clamp-2">
                                    {song.title}
                                </h2>
                                <p className="text-purple-400 font-bold uppercase tracking-widest text-[10px] opacity-70 mb-4">{song.artistName}</p>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 w-full">
                                    {/* Download Button */}
                                    <button 
                                        onClick={handleDownload}
                                        disabled={!song.audioUrl || downloading}
                                        className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all shadow-xl active:scale-95 ${
                                            downloaded 
                                                ? 'bg-green-600 text-white' 
                                                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-purple-500/30'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {downloading ? (
                                            'Downloading...'
                                        ) : downloaded ? (
                                            'Downloaded!'
                                        ) : (
                                            <>
                                                <Download size={16} />
                                                Download Track
                                            </>
                                        )}
                                    </button>

                                    {/* Edit Button */}
                                    {onEdit && (
                                        <button 
                                            onClick={onEdit}
                                            className="py-3 bg-white/10 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-wider text-white/70 hover:bg-white/20 transition-all"
                                        >
                                            Edit Song (Lyrics/Cover)
                                        </button>
                                    )}

                                    <button 
                                        onClick={onClose}
                                        className="py-3 text-white/40 font-bold text-[10px] uppercase tracking-wider hover:text-white transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* Close Button */}
                            <button 
                                onClick={onClose}
                                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"
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
