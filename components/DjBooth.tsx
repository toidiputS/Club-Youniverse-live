import React, { useContext, useState, useEffect } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import type { View } from "../types";
import { supabase } from "../services/supabaseClient";
import { PersistentRadioService } from "../services/PersistentRadioService";
import { LyricService } from "../services/LyricService";
import { TheChat } from "./TheChat";
import { Radio as FloorView } from "./Radio";
import { getBroadcastManager } from "../services/globalBroadcastManager";
import { TheBox } from "./TheBox";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Download, Music, MessageSquare, ChevronRight, Settings } from "lucide-react";

interface DjBoothProps {
  onNavigate: (view: View) => void;
}

export const DjBooth: React.FC<DjBoothProps> = ({ onNavigate }) => {
  const context = useContext(RadioContext);
  if (!context || !context.profile) return null;

  const { profile, radioState, vjEnabled, setVjEnabled, danceFloorEnabled, leaderId } = context;
  const [ttsInput, setTtsInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Library & Upload State
  const [songs, setSongs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'pool' | 'review' | 'graveyard' | 'leaderboard'>('pool');

  const [editingSong, setEditingSong] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ title: '', artist_name: '', lyrics: '', coverArtUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  
  const isAdmin = profile.is_admin;
  const isCurrentDJ = leaderId === profile.user_id;
  const canControl = isAdmin || isCurrentDJ;

  // Mobile Drawer State
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  // Media Upload Handler
  const handleFileUpload = async (file: File, type: 'cover' | 'audio' = 'cover') => {
    if (!canControl || !editingSong) return;
    setIsUploading(true);
    try {
        let currentId = editingSong.id;
        if (currentId === 'new') {
            const { data: newRow, error: createError } = await supabase
                .from('songs')
                .insert([{ title: editFormData.title || 'Draft Transmission', artist_name: editFormData.artist_name || 'Anonymous', status: 'pool', stars: 5 }])
                .select().single();
            if (createError) throw createError;
            currentId = newRow.id;
            setEditingSong(PersistentRadioService.mapDbToApp(newRow));
        }

        const fileExt = file.name.split('.').pop();
        const folder = type === 'cover' ? 'covers' : 'user_uploads';
        const fileName = `${currentId}_${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error } = await supabase.storage.from('songs').upload(filePath, file);
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('songs').getPublicUrl(filePath);

        if (type === 'cover') {
            setEditFormData(p => ({ ...p, coverArtUrl: publicUrl }));
            await updateSong(currentId, { coverArtUrl: publicUrl });
        } else {
            await updateSong(currentId, { song_url: publicUrl });
            alert("Audio broadcast signal established.");
        }
        await fetchLibrary();
    } catch (error: any) {
        alert("Upload failed: " + error.message);
    } finally {
        setIsUploading(false);
    }
  };

  // Fetch Library
  const fetchLibrary = async () => {
    const { data } = await supabase
      .from("songs")
      .select("*")
      .order("stars", { ascending: false });

    if (data) {
      const mapped = data.map((s: any) => PersistentRadioService.mapDbToApp(s));
      setSongs(mapped);
      // Logic for graveyard check: songs with 0 or fewer stars move there automatically
      mapped.forEach(async (s: any) => {
        if (s.stars <= 0 && s.status !== 'graveyard') {
            await updateSong(s.id, { status: 'graveyard' });
        }
      });
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleTtsSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canControl || !ttsInput.trim() || isSending) return;
    setIsSending(true);
    const bm = getBroadcastManager();
    await bm.sendSiteCommand("tts", { text: ttsInput, voice: "Fenrir" });
    setTtsInput("");
    setIsSending(false);
  };

  const forceNextState = async (state: string) => {
    if (!canControl) return;
    setIsSending(true);
    try {
      const bm = getBroadcastManager();
      await bm.setRadioState(state as any);
    } catch (e) {
      console.error("Force state transition failed:", e);
    }
    setIsSending(false);
  };

  const handleSkip = async () => {
    if (!canControl) return;
    const bm = getBroadcastManager();
    await bm.sendSiteCommand("skip", {});
  };

  const handleDanceFloorToggle = async () => {
    if (!canControl) return;
    const newState = !danceFloorEnabled;
    const bm = getBroadcastManager();
    await bm.sendSiteCommand("dance_floor", { enabled: newState });
  };

  const pushToNow = async (song: any) => {
    if (!canControl) return;
    await supabase.from("broadcasts").update({
      current_song_id: song.id,
      radio_state: "NOW_PLAYING",
      song_started_at: new Date().toISOString()
    }).eq("id", "00000000-0000-0000-0000-000000000000");
  };

  const updateSong = async (id: string, updates: any) => {
    if (!canControl) return;
    
    if (id === 'new') {
        // This case is usually handled by the specific uploaders creating the row first,
        // but if someone just clicks "Synchronize" without a file, we should handle it.
        const { data: newSong, error: createError } = await supabase
            .from('songs')
            .insert([{ ...updates, status: 'pool', stars: 5 }])
            .select()
            .single();
        if (createError) throw createError;
        id = newSong.id;
    } else {
        await supabase.from("songs").update(updates).eq("id", id);
    }
    
    await fetchLibrary();
    
    // Deep state consistency for open edit modal
    if (editingSong?.id === id || editingSong?.id === 'new') {
        const updated = PersistentRadioService.mapDbToApp({ id, ...updates });
        setEditingSong((prev: any) => prev ? ({ ...prev, ...updated }) : null);
    }
  };

  const setSongStatus = async (id: string, status: string) => {
      await updateSong(id, { status });
  };

  const voteForBox = async (song: any) => {
    if (!canControl) return;
    await supabase.from("songs").update({ status: 'in_box' }).eq("id", song.id);
    await fetchLibrary();
  };

  const deleteSong = async (id: string) => {
    if (!canControl || !confirm("Delete this node?")) return;
    await supabase.from("songs").delete().eq("id", id);
    await fetchLibrary();
  };

  const handleFixLyrics = async (song: any) => {
    if (!canControl) return;
    setIsSending(true);
    try {
        const result = await LyricService.processMissingLyrics(song);
        if (result) {
            const plain = LyricService.choreographyToPlain(result);
            setEditFormData(prev => ({ ...prev, lyrics: plain, title: song.title, artist_name: song.artistName, coverArtUrl: song.coverArtUrl }));
        }
        await fetchLibrary();
    } catch (e) {
        console.error("Fix Lyrics failed:", e);
    } finally {
        setIsSending(false);
    }
  };

  const openEditModal = (song: any) => {
    setEditingSong(song);
    // Convert to plain text for the simple editor view
    const plain = LyricService.choreographyToPlain(song.lyrics);
    setEditFormData({
        title: song.title,
        artist_name: song.artistName,
        lyrics: plain,
        coverArtUrl: song.coverArtUrl || ''
    });
  };

  const filteredSongs = (activeTab === 'leaderboard' 
    ? [...songs].sort((a, b) => (b.weekly_stars || b.stars || 0) - (a.weekly_stars || a.stars || 0)).slice(0, 20)
    : songs.filter(s => (activeTab === 'pool' ? (s.status === 'pool' || s.status === 'in_box') : s.status === activeTab))
  ).filter(s =>
    (s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     s.artistName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-[#050505] text-white/90 font-mono overflow-hidden flex flex-col z-100 selection:bg-purple-500/30">
      
      {/* 1. BACKGROUND FLOOR RE-RENDER (Silent View) */}
      <div className="absolute inset-0 z-[-1] opacity-10 pointer-events-none grayscale select-none">
        <FloorView onNavigate={() => { }} onSignOut={() => { }} profile={profile} minimal={true} />
      </div>

      {/* 2. TOP TECHNICAL HUD */}
      <div className="relative z-50 h-14 border-b border-white/5 bg-black/60 backdrop-blur-2xl flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_purple]" />
                <span className="text-[10px] font-black tracking-[0.4em] uppercase">DJ BOOTH // COMMAND SECTOR</span>
            </div>
            <div className="hidden md:flex items-center gap-4 border-l border-white/10 pl-6">
                <div className="flex flex-col">
                    <span className="text-[8px] text-white/30 uppercase tracking-widest">Operator</span>
                    <span className="text-[10px] font-bold text-white/60 truncate max-w-[120px]">{profile.name}</span>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-4">
                    <span className="text-[8px] text-white/30 uppercase tracking-widest">Authority</span>
                    <span className={`text-[10px] font-bold ${isAdmin ? 'text-purple-400' : 'text-zinc-500'}`}>
                        {isAdmin ? 'SYSTEM ADMIN' : 'LEVEL 1'}
                    </span>
                </div>
            </div>
        </div>
        
        <button 
          onClick={() => onNavigate("club")}
          className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all group"
        >
          <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-purple-400 transition-colors">Return to Floor</span>
          <span className="text-[12px]">⎋</span>
        </button>
      </div>

      {/* MOBILE HEADER - Fixed on small screens */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-black border-b border-white/10 z-100 pt-safe-top">
        <button 
          onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
          className="p-2 text-white/50 hover:text-white transition-colors"
        >
          <Settings size={20} />
        </button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Club Youniverse</span>
            <span className="text-[8px] font-bold text-white/40 uppercase">DJ Booth v1.2</span>
        </div>
        <button 
          onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
          className="p-2 text-white/50 hover:text-white transition-colors relative"
        >
          <MessageSquare size={20} />
        </button>
      </div>

      <main className="relative z-10 grow grid grid-cols-1 lg:grid-cols-12 bg-white/5 overflow-hidden">
        
        {/* COLUMN 1: SYSTEM CONTROLS (Left Sidebar) */}
        <div className={`
          absolute lg:relative inset-y-0 left-0 w-80 lg:w-auto lg:col-span-3 
          bg-[#050505] lg:bg-transparent border-r border-white/5 overflow-hidden flex flex-col z-80 lg:z-10
          transition-transform duration-300 ease-in-out
          ${leftDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile close handle */}
          <button 
            onClick={() => setLeftDrawerOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-white/20 hover:text-white z-50"
          >
            <X size={20} />
          </button>
            <div className="p-6 space-y-8">
                {/* section: State override */}
                <section>
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <span className="w-1 h-3 bg-purple-500/40" /> Transmission Controls
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => handleSkip()}
                            className={`relative group px-4 py-3 rounded-xl border transition-all duration-500 overflow-hidden bg-red-500/5 border-red-500/20 hover:bg-red-500 hover:border-red-500`}
                        >
                            <div className="relative z-10 flex flex-col items-center gap-1">
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-red-500 group-hover:text-white`}>Skip Song</span>
                                <span className={`text-[6px] font-bold uppercase tracking-widest text-red-500/40 group-hover:text-white/40`}>Force Transition</span>
                            </div>
                        </button>
                        {['NOW_PLAYING', 'IDLE', 'THE_BOX', 'REBOOT'].map(state => {
                            const subText = state === 'NOW_PLAYING' ? 'Set Active/Broadcast' : 
                                            state === 'IDLE' ? 'Pause Auto-Play' :
                                            state === 'THE_BOX' ? 'Voting Sequence' :
                                            state === 'REBOOT' ? 'Clear & Restart' : '';
                            return (
                                <button
                                    key={state}
                                    onClick={() => forceNextState(state as any)}
                                    className={`relative group px-4 py-3 rounded-xl border transition-all duration-500 overflow-hidden ${
                                        radioState === state 
                                        ? 'bg-purple-600 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                >
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                                            radioState === state ? 'text-white' : 'text-white/60 group-hover:text-white'
                                        }`}>
                                            {state.replace('_', ' ')}
                                        </span>
                                        <span className={`text-[6px] font-bold uppercase tracking-widest ${
                                            radioState === state ? 'text-white/40' : 'text-white/20 group-hover:text-white/40'
                                        }`}>
                                            {subText}
                                        </span>
                                    </div>
                                    {radioState === state && (
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/40 animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <div className="grid grid-cols-2 gap-2">
                    <section className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Lyrical VJ</span>
                            <div className={`w-2 h-2 rounded-full ${vjEnabled ? 'bg-purple-400 animate-pulse shadow-[0_0_8px_purple]' : 'bg-zinc-800'}`} />
                        </div>
                        <button
                            onClick={() => setVjEnabled(!vjEnabled)}
                            className={`w-full py-2.5 rounded-xl border font-black text-[10px] transition-all ${
                                vjEnabled 
                                ? 'bg-purple-600/20 border-purple-500/40 text-purple-400' 
                                : 'bg-zinc-950 border-white/10 text-zinc-500'
                            }`}
                        >
                            {vjEnabled ? 'ACTIVE' : 'OFFLINE'}
                        </button>
                    </section>

                    <section className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Dance Floor</span>
                            <div className={`w-2 h-2 rounded-full ${danceFloorEnabled ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_cyan]' : 'bg-zinc-800'}`} />
                        </div>
                        <button
                            onClick={() => handleDanceFloorToggle()}
                            className={`w-full py-2.5 rounded-xl border font-black text-[10px] transition-all ${
                                danceFloorEnabled 
                                ? 'bg-cyan-600/20 border-cyan-500/40 text-cyan-400' 
                                : 'bg-zinc-950 border-white/10 text-zinc-500'
                            }`}
                        >
                            {danceFloorEnabled ? 'ONLINE' : 'OFFLINE'}
                        </button>
                    </section>
                </div>

                <section>
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Voice Override</h3>
                    <form onSubmit={handleTtsSend} className="space-y-2">
                        <textarea
                            value={ttsInput}
                            onChange={(e) => setTtsInput(e.target.value)}
                            placeholder="Type transmission..."
                            className="w-full h-24 bg-white/5 border border-white/5 rounded-xl p-3 text-[11px] focus:outline-none focus:border-purple-500/50 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={isSending || !canControl}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black tracking-widest transition-all"
                        >
                            {isSending ? 'TRANSMITTING...' : 'SEND VOICE COMMAND'}
                        </button>
                    </form>
                </section>
                
                {isAdmin && (
                    <section className="pt-8 border-t border-white/5">
                        <h3 className="text-[9px] font-black text-red-500/40 uppercase tracking-[0.3em] mb-4">Maintenance</h3>
                        <button 
                            onClick={async () => {
                                if (confirm("Emergency Reset Protocol?")) {
                                    await forceNextState('REBOOT');
                                }
                            }}
                            className="w-full py-3 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-500 rounded-xl text-[9px] font-black tracking-widest transition-all"
                        >
                            FORCE STATION REBOOT
                        </button>
                    </section>
                )}
            </div>
        </div>

        {/* Overlay when drawers are open */}
        <AnimatePresence>
          {(leftDrawerOpen || rightDrawerOpen) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setLeftDrawerOpen(false); setRightDrawerOpen(false); }}
              className="lg:hidden absolute inset-0 bg-black/60 backdrop-blur-sm z-70"
            />
          )}
        </AnimatePresence>

        {/* COLUMN 2: MAIN STACK (Center) */}
        <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col h-full bg-[#000000] overflow-hidden relative z-10 w-full mb-safe-bottom">
            <div className="h-[40vh] bg-[#000000] flex flex-col overflow-hidden relative border-b border-white/10 shrink-0 z-20 pointer-events-none">
                <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase animate-pulse">Live Broadcast</div>
                    <span className="text-[10px] font-bold text-white/70 uppercase">Monitor</span>
                </div>
                <div className="grow relative">
                   <FloorView onNavigate={() => {}} onSignOut={() => {}} profile={profile} minimal={true} />
                </div>
            </div>

            <div className="grow bg-[#050505] flex flex-col overflow-hidden relative z-30 pointer-events-auto">
                <header className="px-6 py-4 bg-zinc-950 border-b border-white/5 shrink-0 flex items-center justify-between">
                    <div className="flex gap-4">
                        {(['pool', 'review', 'graveyard', 'leaderboard'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                    activeTab === tab 
                                    ? 'bg-purple-600/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                                    : 'bg-transparent border-white/5 text-white/30 hover:bg-white/5'
                                }`}
                            >
                                {tab === 'leaderboard' ? '💎 Leaderboard' : tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Node IDs..."
                            className="w-48 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-purple-500/50"
                        />
                        <button 
                            onClick={() => openEditModal({ id: 'new', title: '', artistName: '', status: 'pool', stars: 5, lyrics: '[]' })}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        >
                            Deploy New Node
                        </button>
                    </div>
                </header>

                <div className="grow overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredSongs.map(song => (
                            <div 
                                key={song.id} 
                                className="group p-4 bg-white/3 hover:bg-white/6 rounded-2xl border border-white/5 transition-all flex flex-col gap-4"
                            >
                                <div className="flex items-start gap-4 relative">
                                    {activeTab === 'leaderboard' && (() => {
                                        const rank = songs.sort((a,b) => (b.weekly_stars||b.stars||0) - (a.weekly_stars||a.stars||0)).findIndex(s => s.id === song.id) + 1;
                                        return (
                                            <div className={`absolute -top-2 -left-2 z-10 w-6 h-6 border font-black rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-125 ${
                                                rank === 1 ? 'bg-yellow-500 border-yellow-300 text-black shadow-yellow-500/50' :
                                                rank === 2 ? 'bg-zinc-300 border-white text-black shadow-white/50' :
                                                rank === 3 ? 'bg-orange-600 border-orange-400 text-white shadow-orange-600/50' :
                                                'bg-purple-600 border-purple-400 text-white shadow-purple-500/50'
                                            }`}>
                                                <div className="absolute -top-4 text-[12px]">
                                                    {rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''}
                                                </div>
                                                <span className="text-[10px]">{rank}</span>
                                            </div>
                                        );
                                    })()}
                                    <div 
                                        className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 relative bg-zinc-900 cursor-pointer"
                                        onClick={() => openEditModal(song)}
                                    >
                                        <img src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="text-[10px] font-black uppercase">Edit</span>
                                        </div>
                                    </div>
                                    <div className="grow min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-[11px] font-black text-white uppercase truncate tracking-tight">{song.title}</span>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                                                <span className="text-[10px]">⭐</span>
                                                <span className="text-[11px] font-black text-yellow-500">{Math.min(10, song.stars || 0)}/10</span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate">{song.artistName}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-1 pt-3 border-t border-white/5">
                                    <button onClick={() => pushToNow(song)} className="py-1.5 rounded-lg bg-green-500/10 text-green-500 text-[8px] font-black hover:bg-green-500 hover:text-white transition-all uppercase">Air</button>
                                    <button onClick={() => voteForBox(song)} className="py-1.5 rounded-lg bg-purple-500/10 text-purple-500 text-[8px] font-black hover:bg-purple-500 hover:text-white transition-all uppercase">Vote</button>
                                    <button onClick={() => setSongStatus(song.id, activeTab === 'graveyard' ? 'pool' : 'graveyard')} className="py-1.5 rounded-lg bg-red-950/20 text-red-500 text-[8px] font-black hover:bg-red-600 hover:text-white transition-all uppercase">Bury</button>
                                    <a href={song.song_url} download className="py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[8px] font-black hover:bg-blue-500 hover:text-white transition-all uppercase flex items-center justify-center">File</a>
                                    <button onClick={() => deleteSong(song.id)} className="py-1.5 rounded-lg bg-red-950/20 text-red-500 text-[8px] font-black hover:bg-red-600 hover:text-white transition-all uppercase">Del</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* COLUMN 3: CHAT + THE BOX (Right Sidebar) */}
        <div className={`
          absolute lg:relative inset-y-0 right-0 w-80 lg:w-auto lg:col-span-3 
          bg-[#050505] lg:bg-[#0a0a0a]/40 lg:backdrop-blur-3xl border-l border-white/5 overflow-hidden flex flex-col z-80 lg:z-50
          transition-transform duration-300 ease-in-out
          ${rightDrawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile close handle */}
          <button 
            onClick={() => setRightDrawerOpen(false)}
            className="lg:hidden absolute top-4 left-4 p-2 text-white/20 hover:text-white"
          >
            <ChevronRight size={24} />
          </button>
            <div className="grow overflow-hidden">
                <TheChat profile={profile} transparent={true} />
            </div>
            
            <div className="flex-none p-4 border-t border-white/5 bg-black/40">
                <TheBox />
            </div>
        </div>
        {/* Global Drawer Overlay */}
        {(leftDrawerOpen || rightDrawerOpen) && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-70 transition-opacity animate-in fade-in"
            onClick={() => {
              setLeftDrawerOpen(false);
              setRightDrawerOpen(false);
            }}
          />
        )}
      </main>

      <footer className="relative z-50 h-8 bg-black border-t border-white/5 flex items-center justify-between px-6 shrink-0 bg-linear-to-r from-purple-900/10 to-transparent">
        <span className="text-[7px] font-black text-white/40 uppercase">HYDRA v1.2</span>
        <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.2em]">© Club Youniverse Ops</span>
      </footer>

      {/* POP-OUT EDIT CARD MODAL */}
      <AnimatePresence>
        {editingSong && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-200 flex items-center justify-center p-20 bg-black/80 backdrop-blur-md"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-[#0a0a0a] border border-white/10 rounded-[32px] w-full max-w-4xl max-h-full overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col lg:flex-row relative"
                >
                    <button onClick={() => setEditingSong(null)} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white z-20 transition-colors">
                        <X size={20} />
                    </button>

                    <div className="lg:w-1/2 bg-black relative border-r border-white/10 flex flex-col">
                        <div className="grow flex items-center justify-center p-8 relative group/cover">
                            {editFormData.coverArtUrl?.endsWith('.mp4') ? (
                                <video 
                                    src={editFormData.coverArtUrl} 
                                    autoPlay muted loop 
                                    className="w-full h-full object-contain shadow-2xl rounded-2xl" 
                                />
                            ) : (
                                <img 
                                    src={editFormData.coverArtUrl || `https://picsum.photos/seed/${editingSong.id}/400`} 
                                    className="w-full h-full object-contain shadow-2xl rounded-2xl"
                                    alt=""
                                />
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all backdrop-blur-sm" onClick={() => document.getElementById('cover-file-upload')?.click()}>
                                <Upload size={32} className="mb-4 text-purple-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{isUploading ? 'Uploading...' : 'Update Visual Asset'}</span>
                            </div>
                            <input id="cover-file-upload" type="file" accept="image/*,video/mp4" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }} />
                        </div>

                        <div className="p-8 bg-zinc-950/50">
                            <div className="flex items-center justify-between px-6 py-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl shadow-inner">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Global Influence</span>
                                    <span className="text-[8px] text-white/20 uppercase font-black">Score: {Math.min(10, editingSong.stars || 0)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => updateSong(editingSong.id, { stars: Math.max(0, (editingSong.stars || 0) - 1) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center font-black">－</button>
                                    <button onClick={() => updateSong(editingSong.id, { stars: Math.min(10, (editingSong.stars || 0) + 1) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center font-black">＋</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/2 p-12 space-y-8 overflow-y-auto custom-scrollbar">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em]">Node Metadata</label>
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">{editingSong.id === 'new' ? 'New Node' : 'Config'}</h2>
                                <div className="flex gap-2">
                                    <button onClick={() => document.getElementById('audio-file-upload')?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                        <Music size={12} /> {isUploading ? 'SYNCING...' : 'Upload Audio'}
                                    </button>
                                    <input id="audio-file-upload" type="file" accept="audio/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file, 'audio');
                                    }} />
                                    <button onClick={() => handleFixLyrics(editingSong)} disabled={isSending} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-purple-600 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                        {isSending ? 'PROCESSING...' : 'Auto-Choreograph'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* NEW: Suno Integration Slot */}
                            <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Suno Node Link</label>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="pro-check" className="w-3 h-3 rounded bg-zinc-800 border-white/10 text-purple-500 focus:ring-purple-500/40" />
                                        <label htmlFor="pro-check" className="text-[8px] font-bold text-white/40 uppercase">Attest Pro Account Rights</label>
                                    </div>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="https://suno.com/song/..." 
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-[10px] focus:outline-none focus:border-purple-500/50" 
                                />
                                <p className="text-[7px] text-zinc-500 leading-relaxed uppercase tracking-widest">
                                    Pasting a Suno link helps track generation history. You must still upload the .mp3 file manually to ensure full broadcast quality and 24/7 availability.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Song Identification</label>
                                <input type="text" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} placeholder="Song Title" className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-purple-500" />
                                <input type="text" value={editFormData.artist_name} onChange={(e) => setEditFormData({ ...editFormData, artist_name: e.target.value })} placeholder="Artist / Source" className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-purple-500" />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Song Lyrics (Plain Text)</label>
                                    <div className="flex gap-4">
                                        <button className="text-[8px] font-black text-green-400 hover:text-white uppercase flex items-center gap-1"><Upload size={10} /> Load .txt</button>
                                        <button className="text-[8px] font-black text-blue-400 hover:text-white uppercase flex items-center gap-1"><Download size={10} /> Save .txt</button>
                                    </div>
                                </div>
                                <textarea 
                                    value={editFormData.lyrics}
                                    onChange={(e) => setEditFormData({ ...editFormData, lyrics: e.target.value })}
                                    placeholder="Paste clean lyrics here. Each line will be choreographed automatically."
                                    className="w-full h-48 bg-white/5 border border-white/5 rounded-2xl p-4 text-[11px] leading-relaxed resize-none focus:outline-none focus:border-purple-500"
                                />
                            </div>

                            <button 
                                onClick={async () => {
                                    let finalLyrics = editFormData.lyrics;
                                    const choreographed = LyricService.plainToChoreography(editFormData.lyrics, editingSong.durationSec || 180);
                                    finalLyrics = JSON.stringify(choreographed);
                                    await updateSong(editingSong.id, { ...editFormData, lyrics: finalLyrics });
                                    setEditingSong(null);
                                }}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-purple-900/40"
                            >Synchronize Updates</button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
