import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { PersistentRadioService } from "../services/PersistentRadioService";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { EditSongModal } from "./EditSongModal";
import { AnimatePresence } from "framer-motion";
import { 
    Trash2, 
    Edit3, 
    Zap, 
    Music, 
    Upload, 
    Download, 
    RefreshCw, 
    Plus,
    Search,
    Database,
    Skull,
    Wind
} from "lucide-react";
import type { Song } from "../types";

export const ThePool: React.FC = () => {
    const context = React.useContext(RadioContext);
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'pool' | 'graveyard'>('pool');
    const [searchQuery, setSearchQuery] = useState("");
    const [editingSong, setEditingSong] = useState<Song | null>(null);

    const isAdmin = context?.profile?.is_admin;
    const isPremium = context?.profile?.is_premium || isAdmin;

    const fetchPool = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("songs")
            .select("*")
            .eq("status", view)
            .order("created_at", { ascending: false })
            .limit(100);

        if (data) {
            setSongs(data.map(PersistentRadioService.mapDbToApp));
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPool();
    }, [view]);

    const handleAction = async (songId: string, action: 'bury' | 'resurrect' | 'air' | 'box') => {
        if (!context) return;
        
        if (action === 'air') {
            const song = songs.find(s => s.id === songId);
            if (song) await context.setNowPlaying(song);
            return;
        }

        const newStatus = action === 'bury' ? 'graveyard' : (action === 'box' ? 'in_box' : 'pool');
        const { error } = await supabase
            .from("songs")
            .update({ 
                status: newStatus, 
                upvotes: action === 'box' ? 1 : 0,
                is_dsw: false 
            })
            .eq("id", songId);

        if (!error) {
            fetchPool();
        }
    };

    const handleMassResurrections = async () => {
        if (!confirm("RESTORE ALL NODES FROM THE GRAVEYARD?")) return;
        const { error } = await supabase
            .from("songs")
            .update({ status: 'pool', stars: 5, is_dsw: false })
            .eq("status", 'graveyard');
        
        if (!error) fetchPool();
    };

    if (loading && songs.length === 0) return (
        <div className="h-full flex items-center justify-center opacity-20">
             <span className="text-[10px] font-black uppercase animate-pulse">Scanning Nodes...</span>
        </div>
    );

    return (
        <div className="flex flex-col w-full h-full gap-0 overflow-hidden bg-zinc-950 text-zinc-100">
            {/* High-Density Admin Header */}
            <header className="flex flex-col gap-1.5 p-2 border-b border-white/5 bg-black/40">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                            <Database size={14} className="text-purple-400" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-[7px] font-black tracking-[0.3em] uppercase text-white/30 whitespace-nowrap leading-none mb-0.5">System Vault</h2>
                            <span className="text-[10px] font-black text-white uppercase italic tracking-wider flex items-center gap-1.5 whitespace-nowrap leading-none">
                                {view === 'pool' ? 'ACTIVE POOL' : 'THE GRAVEYARD'}
                                {view === 'graveyard' && <Skull size={10} className="text-red-500" />}
                            </span>
                        </div>
                    </div>

                    {isPremium && (
                        <button 
                            onClick={() => setEditingSong({ 
                                id: 'new-' + Date.now(), 
                                title: '', 
                                artistName: '', 
                                status: 'pool', 
                                stars: 5, 
                                lyrics: '',
                                audioUrl: '',
                                uploaderId: context?.profile?.user_id || 'system'
                            } as any)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
                        >
                            <Plus size={14} />
                            <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">DEPLOY</span>
                        </button>
                    )}
                </div>

                {/* Search & Tabs Segment */}
                <div className="flex gap-2">
                    <div className="flex-1 flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5">
                        <button 
                            onClick={() => setView('pool')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all ${view === 'pool' ? 'bg-zinc-800 text-white border border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <Music size={12} />
                            <span className="text-[8px] font-black uppercase">Active</span>
                        </button>
                        <button 
                            onClick={() => setView('graveyard')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all ${view === 'graveyard' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <Skull size={12} />
                            <span className="text-[8px] font-black uppercase">Graveyard</span>
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="OPERATIONAL SEARCH..."
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-lg pl-8 pr-4 py-1.5 text-[10px] text-white/80 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-mono placeholder:text-zinc-700"
                    />
                </div>

                {isAdmin && view === 'graveyard' && songs.length > 0 && (
                    <button 
                        onClick={handleMassResurrections}
                        className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={12} />
                        Mass Resurrection
                    </button>
                )}
            </header>

            {/* Song Grid / List */}
            <div className="grow overflow-y-auto custom-scrollbar p-2 pb-20">
                <div className="grid gap-1">
                    {songs.filter(s => 
                        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        s.artistName.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(song => (
                        <div 
                            key={song.id} 
                            className={`flex flex-col p-1 rounded-lg border transition-all ${
                                view === 'graveyard' ? 'bg-zinc-950/20 border-white/5' : 'bg-zinc-900/40 border-white/5 hover:border-purple-500/40'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded shrink-0 bg-zinc-950 border border-white/5 relative overflow-hidden">
                                    <img 
                                        src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`} 
                                        className={`w-full h-full object-cover transition-all ${view === 'graveyard' ? 'opacity-20 grayscale' : 'opacity-60'}`} 
                                        alt="" 
                                    />
                                    {song.isDsw && (
                                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                            <Skull size={10} className="text-red-500" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col min-w-0 grow">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[9px] font-black uppercase truncate tracking-tight ${view === 'graveyard' ? 'text-zinc-600' : 'text-white/80'}`}>{song.title}</span>
                                        <span className="text-[7px] font-black text-purple-400 shrink-0">★{song.stars || 0}</span>
                                    </div>
                                    <span className="text-[6px] font-bold text-zinc-600 uppercase truncate tracking-tighter">{song.artistName}</span>
                                </div>

                                {isPremium && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        {song.sunoUrl && (
                                            <a href={song.sunoUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-orange-400 hover:bg-orange-400 hover:text-white rounded transition-all">
                                                <Music size={10} />
                                            </a>
                                        )}
                                        {song.audioUrl && (
                                            <a href={song.audioUrl} download={`${song.title}.mp3`} className="p-1 text-blue-400 hover:bg-blue-400 hover:text-white rounded transition-all">
                                                <Download size={10} />
                                            </a>
                                        )}
                                        {isAdmin && (
                                            <>
                                                <button onClick={() => handleAction(song.id, 'air')} className="p-1 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded transition-all">
                                                    <Zap size={10} />
                                                </button>

                                                {view === 'pool' ? (
                                                    <>
                                                        <button onClick={() => handleAction(song.id, 'box')} className="p-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white rounded transition-all">
                                                            <Upload size={10} />
                                                        </button>
                                                        <button onClick={() => handleAction(song.id, 'bury')} className="p-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-all">
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleAction(song.id, 'resurrect')} className="p-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded transition-all">
                                                        <Wind size={10} />
                                                    </button>
                                                )}
                                                {(isAdmin || (isPremium && song.uploaderId === context?.profile?.user_id)) && (
                                                    <button onClick={() => setEditingSong(song)} className="p-1 bg-zinc-800 text-zinc-500 hover:bg-white hover:text-black rounded transition-all">
                                                        <Edit3 size={10} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {!loading && songs.length === 0 && (
                    <div className="py-10 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-black/40">
                        <Database size={20} className="text-white/10 mb-2" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10">Empty</span>
                    </div>
                )}
            </div>
            
            <AnimatePresence mode="wait">
                {editingSong && (
                    <EditSongModal 
                        song={editingSong} 
                        onClose={() => setEditingSong(null)} 
                        onSave={() => {
                            fetchPool();
                            setEditingSong(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
