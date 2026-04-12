import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Upload } from 'lucide-react';
import type { Song } from '../types';

interface EditSongModalProps {
    song: Song;
    onClose: () => void;
    onSave: (updatedSong: Partial<Song>) => void;
}

export const EditSongModal: React.FC<EditSongModalProps> = ({ song, onClose, onSave }) => {
    const [title, setTitle] = useState(song.title);
    const [artistName, setArtistName] = useState(song.artistName || '');
    const [genre, setGenre] = useState(song.genre || 'Other');
    const [lyrics, setLyrics] = useState(song.lyrics as string || '');
    const [coverArtFile, setCoverArtFile] = useState<File | null>(null);
    const [sunoUrl, setSunoUrl] = useState(song.sunoUrl || '');
    const [downloadUrl, setDownloadUrl] = useState(song.downloadUrl || '');
    const [audioUrl, setAudioUrl] = useState(song.audioUrl || '');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            let finalCoverArtUrl = song.coverArtUrl;
            let finalAudioUrl = audioUrl;

            // 1. Upload new cover art if provided
            if (coverArtFile) {
                const fileExt = coverArtFile.name.split('.').pop();
                const fileName = `${song.id}_cover_${Date.now()}.${fileExt}`;
                const filePath = `covers/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('songs')
                    .upload(filePath, coverArtFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('songs')
                    .getPublicUrl(filePath);

                finalCoverArtUrl = publicUrl;
            }

            // 1b. Upload new audio if provided
            if (audioFile) {
                const fileExt = audioFile.name.split('.').pop();
                const fileName = `${song.id}_audio_${Date.now()}.${fileExt}`;
                const filePath = `nodes/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('songs')
                    .upload(filePath, audioFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('songs')
                    .getPublicUrl(filePath);

                finalAudioUrl = publicUrl;
            }

            // 2. Upsert Database Record
            const dataToSave = {
                id: song.id.startsWith('new-') ? undefined : song.id,
                title,
                artist_name: artistName,
                genre,
                lyrics,
                audio_url: finalAudioUrl,
                cover_art_url: finalCoverArtUrl,
                suno_url: sunoUrl,
                // download_url: downloadUrl, // TODO: Add download_url column to Supabase 'songs' table
                status: song.status || 'pool',
                uploader_id: song.uploaderId || 'system'
            };

            const { error, data: savedData } = await supabase
                .from('songs')
                .upsert(dataToSave, { onConflict: 'id' })
                .select()
                .single();

            if (error) throw error;

            // 3. Notify Parent Component
            onSave(savedData as any);
            onClose();

        } catch (error: any) {
            console.error("Failed to update song:", error);
            alert(`Error updating song: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
                className="w-full max-w-md bg-zinc-950 border border-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/5 bg-white/2">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">Edit Node</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Configure metadata and visual assets</p>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Cover Art Preview & Upload */}
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden relative group">
                            {coverArtFile ? (
                                <img src={URL.createObjectURL(coverArtFile)} alt="Preview" className="w-full h-full object-cover" />
                            ) : song.coverArtUrl ? (
                                <img src={song.coverArtUrl} alt="Existing Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700">No Image</div>
                            )}

                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Change</span>
                                <input
                                    type="file"
                                    accept="image/*,video/mp4"
                                    onChange={(e) => setCoverArtFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        <div className="grow min-w-0 flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Visual Asset Upload</span>
                            <span className="text-[8px] text-zinc-600">Supports JPG, PNG, and MP4 (Max 10s Video)</span>
                            {coverArtFile && (
                                <span className="text-[8px] text-purple-400 mt-2 truncate bg-purple-500/10 px-2 py-1 rounded w-fit border border-purple-500/20">
                                    Selected: {coverArtFile.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/5" />

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Track Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                    placeholder="Track Title"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Artist / Identity</label>
                                <input
                                    type="text"
                                    value={artistName}
                                    onChange={(e) => setArtistName(e.target.value)}
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                    placeholder="Artist"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Audio Source URL (MP3/WAV)</label>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={audioUrl}
                                    onChange={(e) => setAudioUrl(e.target.value)}
                                    className="grow bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-emerald-400 text-xs font-bold focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                                    placeholder="https://cdn.com/song.mp3"
                                />
                                <label className="shrink-0 cursor-pointer bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all group">
                                    <Upload size={14} className="group-hover:scale-110 transition-transform" />
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            {audioFile && (
                                <p className="text-[8px] text-emerald-400 mt-2 ml-1 animate-pulse">✓ Ready to sync: {audioFile.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Suno / External Meta Link</label>
                            <input
                                type="url"
                                value={sunoUrl}
                                onChange={(e) => setSunoUrl(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-purple-400 text-xs font-bold focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                placeholder="https://suno.com/song/..."
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                                Download Node Link <span className="text-zinc-600">(Requires Schema Update)</span>
                            </label>
                            <input
                                type="url"
                                value={downloadUrl}
                                onChange={(e) => setDownloadUrl(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-blue-400 text-xs font-bold focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                                placeholder="Direct .mp3 Link"
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Sector Class</label>
                            <select
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-purple-400 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer font-mono"
                            >
                                <option value="House">House</option>
                                <option value="Techno">Techno</option>
                                <option value="Synthwave">Synthwave</option>
                                <option value="Cyberpunk">Cyberpunk</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Synchronized Lyrics / Protocol</label>
                            <textarea
                                value={lyrics}
                                onChange={(e) => setLyrics(e.target.value)}
                                placeholder="Paste lyrics here for the VJ engine to synchronize..."
                                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-[11px] font-bold focus:outline-none focus:border-purple-500/50 transition-all resize-none shadow-inner custom-scrollbar"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5 mt-6 pb-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-3 border border-white/10 rounded-xl text-[10px] font-black text-zinc-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest flex-1 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50"
                        >
                            {isSaving ? 'Syncing...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
