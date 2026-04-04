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
  const [activeTab, setActiveTab] = useState<'pool' | 'review' | 'graveyard'>('pool');

  const [editingSong, setEditingSong] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ title: '', artist_name: '', lyrics: '', coverArtUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingSong, setUploadingSong] = useState<{ title: string; artist: string; file: File | null }>({ title: '', artist: '', file: null });
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const isAdmin = profile.is_admin;
  const isCurrentDJ = leaderId === profile.user_id;
  const canControl = isAdmin || isCurrentDJ;

  // Media Upload Handler
  const handleFileUpload = async (file: File) => {
    if (!canControl || !editingSong) return;
    setIsUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${editingSong.id}_${Math.random()}.${fileExt}`;
        const filePath = `covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('songs')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('songs')
            .getPublicUrl(filePath);

        setEditFormData(prev => ({ ...prev, coverArtUrl: publicUrl }));
        await updateSong(editingSong.id, { coverArtUrl: publicUrl });
    } catch (error: any) {
        alert("Upload failed: " + error.message);
    } finally {
        setIsUploading(false);
    }
  };

  // Upload NEW song
  const handleUploadNewSong = async () => {
    if (!uploadingSong.file || !uploadingSong.title.trim()) {
      alert("Please select an audio file and enter a title");
      return;
    }
    setIsUploading(true);
    try {
      const file = uploadingSong.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
      const audioPath = `audio/${fileName}`;

      // Upload audio
      const { error: uploadError } = await supabase.storage
        .from('songs')
        .upload(audioPath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl: audioUrl } } = supabase.storage
        .from('songs')
        .getPublicUrl(audioPath);

      // Create song record
      const { data: newSong, error: insertError } = await supabase
        .from('songs')
        .insert([{
          title: uploadingSong.title,
          artist_name: uploadingSong.artist || profile.name,
          audio_url: audioUrl,
          uploader_id: profile.user_id,
          status: 'pool',
          stars: 0,
          upvotes: 0,
          play_count: 0
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Get duration using audio element
      const audio = new Audio(audioUrl);
      await new Promise(resolve => { audio.onloadedmetadata = resolve; });
      const durationSec = audio.duration;

      await supabase.from('songs').update({ duration_sec: durationSec }).eq('id', newSong.id);

      setShowUploadModal(false);
      setUploadingSong({ title: '', artist: '', file: null });
      await fetchLibrary();
      alert("Song uploaded successfully!");
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
      const mapped = data.map(s => PersistentRadioService.mapDbToApp(s));
      setSongs(mapped);
      // Logic for graveyard check: songs with 0 or fewer stars move there automatically
      mapped.forEach(async (s) => {
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
    await supabase.from("songs").update(updates).eq("id", id);
    await fetchLibrary();
    
    // Deep state consistency for open edit modal
    if (editingSong?.id === id) {
        setEditingSong((prev: any) => prev ? ({ ...prev, ...updates }) : null);
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
            setEditFormData(prev => ({ ...prev, lyrics: plain }));
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

  const filteredSongs = songs.filter(s =>
    (activeTab === 'pool' ? (s.status === 'pool' || s.status === 'in_box') : s.status === activeTab) &&
    (s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     s.artistName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-[#050505] text-white/90 font-mono overflow-hidden flex flex-col z-[100] selection:bg-purple-500/30">
      
      {/* 1. BACKGROUND FLOOR RE-RENDER (Silent View) */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none grayscale">
        <FloorView onNavigate={() => { }} onSignOut={() => { }} profile={profile} />
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

      <main className="relative z-10 flex-grow grid grid-cols-1 lg:grid-cols-12 bg-white/5 overflow-hidden">
        
        {/* COLUMN 1: SYSTEM CONTROLS (Left - 2 Units) - ORDER 4 ON MOBILE */}
        <div className="lg:col-span-2 order-4 lg:order-1 bg-[#050505] flex flex-col min-h-0 overflow-y-auto custom-scrollbar border-r border-white/5">
            <div className="p-6 space-y-8">
                {/* section: State override */}
                <section>
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <span className="w-1 h-3 bg-purple-500/40" /> Transmission Controls
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => handleSkip()}
                            className={`relative group px-4 py-8 rounded-2xl border transition-all duration-500 overflow-hidden bg-red-500/5 border-red-500/20 hover:bg-red-500 hover:border-red-500`}
                        >
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] text-red-500 group-hover:text-white`}>Skip Song</span>
                                <span className={`text-[7px] font-bold uppercase tracking-widest text-red-500/40 group-hover:text-white/40`}>Force Transition</span>
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
                                    className={`relative group px-4 py-8 rounded-2xl border transition-all duration-500 overflow-hidden ${
                                        radioState === state 
                                        ? 'bg-purple-600 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                >
                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                                            radioState === state ? 'text-white' : 'text-white/60 group-hover:text-white'
                                        }`}>
                                            {state.replace('_', ' ')}
                                        </span>
                                        <span className={`text-[7px] font-bold uppercase tracking-widest ${
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

                {/* section: Lyrical VJ Toggle */}
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

                {/* section: TTS / Voice Synth */}
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
                
                {/* section: Station Maintenance */}
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

        {/* COLUMN 2: MAIN STACK (Center - 8 Units) - MONITOR (Row 1), POOL (Row 2) */}
        <div className="lg:col-span-8 order-1 lg:order-2 lg:grid lg:grid-rows-12 flex flex-col h-full bg-[#000000] overflow-hidden">
            
            {/* TOP: LIVE MONITOR (Row span 6) - ORDER 1 ON MOBILE */}
            <div className="row-span-6 order-1 bg-[#000000] flex flex-col min-h-[40vh] lg:min-h-0 overflow-hidden relative border-b border-white/10">
                <div className="absolute top-4 left-4 z-[40] flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase animate-pulse">Live Broadcast</div>
                    <span className="text-[10px] font-bold text-white/70 uppercase">Monitor</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <FloorView onNavigate={() => {}} onSignOut={() => {}} profile={profile} minimal={true} />
                </div>
            </div>

            {/* BOTTOM: NODE ARCHIVE / THE POOL (Row span 6) - ORDER 3 ON MOBILE */}
            <div className="row-span-6 order-3 bg-[#050505] flex flex-col min-h-[50vh] lg:min-h-0 overflow-hidden">
                 {/* Library Header */}
                <header className="px-6 py-4 bg-zinc-950 border-b border-white/5 shrink-0 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
                        {(['pool', 'review', 'graveyard'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                                    activeTab === tab 
                                    ? 'bg-purple-600/20 border-purple-500/40 text-purple-400' 
                                    : 'bg-transparent border-white/5 text-white/30 hover:bg-white/5'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 lg:gap-4 w-full sm:w-auto">
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="flex-grow sm:w-48 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-purple-500/50"
                        />
                        <button 
                            onClick={() => setShowUploadModal(true)}
                            className="px-4 py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-lg shrink-0"
                        >
                            + Node
                        </button>
                    </div>
                </header>

                {/* Node Grid */}
                <div className="flex-grow overflow-y-auto custom-scrollbar p-4 lg:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredSongs.map(song => (
                            <div 
                                key={song.id} 
                                className="group p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl border border-white/5 transition-all flex flex-col gap-4 relative overflow-hidden"
                            >
                                <div className="flex items-start gap-4">
                                    <div 
                                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 relative bg-zinc-900 cursor-pointer"
                                        onClick={() => openEditModal(song)}
                                    >
                                        {song.coverArtUrl?.endsWith('.mp4') ? (
                                            <video src={song.coverArtUrl} autoPlay loop muted playsInline className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                        ) : (
                                            <img src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="text-[10px] font-black uppercase">Edit</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-grow">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-[11px] font-black text-white uppercase truncate tracking-tight">{song.title}</span>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                                                <span className="text-[10px]">⭐</span>
                                                <span className="text-[11px] font-black text-yellow-500">{Math.min(10, song.stars || 0)}/10</span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate">{song.artistName}</span>
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] text-white/30 font-black uppercase tracking-widest border border-white/5">{song.status}</span>
                                            <span className="text-[8px] text-zinc-700 font-bold">{Math.floor(song.durationSec / 60)}:{(song.durationSec % 60).toString().padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* MINI MENU OPTIONS */}
                                <div className="grid grid-cols-5 gap-1 pt-4 border-t border-white/5">
                                    <button 
                                        onClick={() => pushToNow(song)}
                                        className="py-2.5 rounded-lg bg-green-500/10 text-green-500 text-[8px] sm:text-[9px] font-black hover:bg-green-500 hover:text-white transition-all uppercase"
                                    >Air</button>
                                    <button 
                                        onClick={() => voteForBox(song)}
                                        className="py-2.5 rounded-lg bg-purple-500/10 text-purple-500 text-[8px] sm:text-[9px] font-black hover:bg-purple-500 hover:text-white transition-all uppercase"
                                    >Vote</button>
                                    <button 
                                        onClick={() => setSongStatus(song.id, activeTab === 'graveyard' ? 'pool' : 'graveyard')}
                                        className={`py-2.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase transition-all ${
                                            activeTab === 'graveyard' 
                                            ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white' 
                                            : 'bg-red-950/20 text-red-500 hover:bg-red-500 hover:text-white'
                                        }`}
                                    >{activeTab === 'graveyard' ? 'Awake' : 'Bury'}</button>
                                    <a 
                                        href={song.song_url} 
                                        download 
                                        className="py-2.5 rounded-lg bg-blue-500/10 text-blue-500 text-[8px] sm:text-[9px] font-black hover:bg-blue-500 hover:text-white transition-all uppercase flex items-center justify-center underline-none"
                                    >File</a>
                                    <button 
                                        onClick={() => deleteSong(song.id)}
                                        className="py-2.5 rounded-lg bg-red-950/20 text-red-500 text-[8px] sm:text-[9px] font-black hover:bg-red-600 hover:text-white transition-all uppercase"
                                    >Del</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* COLUMN 4: CHAT + THE BOX (Far Right - 2 Units) - ORDER 2 ON MOBILE */}
        <div className="lg:col-span-2 order-2 lg:order-3 bg-[#0a0a0a]/40 backdrop-blur-3xl flex flex-col min-h-[30vh] lg:min-h-0 border-l border-white/5 scrollbar-hide">
            <div className="flex-grow overflow-hidden">
                <TheChat profile={profile} transparent={true} />
            </div>
            
            {/* THE BOX DOCK */}
            <div className="flex-none p-4 border-t border-white/5 bg-black/40">
                <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">The Box</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_purple]" />
                </div>
                <TheBox />
            </div>
        </div>
      </main>

      {/* 4. FOOTER STATUS BAR */}
      <footer className="relative z-50 h-8 bg-black border-t border-white/5 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-gradient-to-r from-purple-900/10 to-transparent">
        <div className="flex gap-4 sm:gap-6 items-center">
            <div className="flex items-center gap-2">
                <span className="text-[7px] text-zinc-600 font-bold hidden sm:inline uppercase tracking-widest">Protocol</span>
                <span className="text-[7px] font-black text-white/40">HYDRA v1.2</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
             <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.2em] hidden sm:inline">© Club Youniverse Ops</span>
        </div>
      </footer>

      {/* POP-OUT EDIT CARD MODAL */}
      {editingSong && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-20 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[32px] w-full max-w-4xl max-h-full overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col lg:flex-row relative">
                
                {/* Close Button */}
                <button 
                    onClick={() => setEditingSong(null)}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center z-10 transition-all active:scale-90"
                >
                    <span className="text-xl">✕</span>
                </button>

                {/* Left: cover / video preview */}
                <div className="lg:w-1/2 bg-black relative border-r border-white/10 flex flex-col min-h-[400px]">
                    <div className="flex-grow flex items-center justify-center p-4 relative group/cover">
                        {editFormData.coverArtUrl?.endsWith('.mp4') || editFormData.coverArtUrl?.includes('video') ? (
                            <video 
                                src={editFormData.coverArtUrl} 
                                autoPlay loop muted playsInline 
                                className="w-full h-full max-h-[450px] object-contain shadow-2xl rounded-2xl"
                            />
                        ) : (
                            <img 
                                src={editFormData.coverArtUrl || `https://picsum.photos/seed/${editingSong.id}/400`} 
                                className="w-full h-full max-h-[450px] object-contain shadow-2xl rounded-2xl transition-all"
                                alt=""
                            />
                        )}
                        
                        {/* THE UPLOAD OVERLAY */}
                        <div 
                            onClick={() => document.getElementById('cover-file-upload')?.click()}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all backdrop-blur-sm"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/20">
                                <span className="text-2xl">{isUploading ? '⌛' : '📤'}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isUploading ? 'Uploading...' : 'Update Visual Asset'}</span>
                            <span className="text-[8px] text-white/40 mt-2">JPG, PNG, or MP4 (8s max)</span>
                        </div>

                        <input 
                            id="cover-file-upload"
                            type="file"
                            accept="image/*,video/mp4"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                        />
                    </div>

                    <div className="p-8 space-y-4 bg-zinc-950/50">
                        <div className="flex items-center gap-4">
                            <div className="flex-grow px-6 py-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between shadow-inner">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Global Influence</span>
                                    <span className="text-[8px] text-white/20 uppercase">Station-Wide Merit Score</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <button 
                                        onClick={() => updateSong(editingSong.id, { stars: Math.max(0, (editingSong.stars || 0) - 1) })} 
                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                                    >－</button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{Math.min(10, editingSong.stars || 0)}</span>
                                        <span className="text-[8px] text-white/40 uppercase font-black">Score</span>
                                    </div>
                                    <button 
                                        onClick={() => updateSong(editingSong.id, { stars: Math.min(10, (editingSong.stars || 0) + 1) })} 
                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                                    >＋</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Data inputs */}
                <div className="lg:w-1/2 p-8 lg:p-12 space-y-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em]">Node Metadata</label>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Configuration Mode</h2>
                            <button 
                                onClick={() => handleFixLyrics(editingSong)}
                                disabled={isSending}
                                className="px-4 py-2 bg-white/10 hover:bg-purple-600 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                {isSending ? 'PROCESSING...' : 'Fix Lyrics / Choreograph'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Song Identification</label>
                            <div className="grid gap-2">
                                <input 
                                    type="text"
                                    value={editFormData.title}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    placeholder="Song Title"
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-purple-500/50"
                                />
                                <input 
                                    type="text"
                                    value={editFormData.artist_name}
                                    onChange={(e) => setEditFormData({ ...editFormData, artist_name: e.target.value })}
                                    placeholder="Artist / Source"
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Song Lyrics (Plain Text)</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = '.txt';
                                            input.onchange = (e: any) => {
                                                const file = e.target.files[0];
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    const text = e.target?.result as string;
                                                    setEditFormData(prev => ({ ...prev, lyrics: text }));
                                                };
                                                reader.readAsText(file);
                                            };
                                            input.click();
                                        }}
                                        className="text-[8px] font-bold text-green-400 hover:text-white transition-colors"
                                    >Load .txt</button>
                                    <button 
                                        onClick={() => {
                                            const plainText = LyricService.choreographyToPlain(editFormData.lyrics);
                                            const blob = new Blob([plainText], { type: 'text/plain' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `${editFormData.title}_lyrics.txt`;
                                            a.click();
                                        }}
                                        className="text-[8px] font-bold text-blue-400 hover:text-white transition-colors"
                                    >Download .txt</button>
                                </div>
                            </div>
                            <textarea 
                                value={editFormData.lyrics}
                                onChange={(e) => setEditFormData({ ...editFormData, lyrics: e.target.value })}
                                placeholder="Paste clean lyrics here. Each line will be choreographed automatically."
                                className="w-full h-48 bg-white/5 border border-white/5 rounded-2xl p-4 text-[11px] leading-relaxed resize-none focus:outline-none focus:border-purple-500/50"
                            />
                            <p className="text-[8px] text-zinc-600 font-bold uppercase">System will auto-choreograph on save.</p>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button 
                                onClick={async () => {
                                    // If the input is plain text, convert to choreography
                                    let finalLyrics = editFormData.lyrics;
                                    let isJson = false;
                                    try {
                                        const trimmed = editFormData.lyrics.trim();
                                        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                                            const parsed = JSON.parse(trimmed);
                                            if (Array.isArray(parsed)) isJson = true;
                                        }
                                    } catch (e) {}
                                    
                                    if (!isJson) {
                                        const choreographed = LyricService.plainToChoreography(editFormData.lyrics, editingSong.durationSec || 180);
                                        finalLyrics = JSON.stringify(choreographed);
                                    }

                                    await updateSong(editingSong.id, { ...editFormData, lyrics: finalLyrics });
                                    setEditingSong(null);
                                }}
                                className="flex-grow py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-900/40 transition-all active:scale-95"
                            >
                                Synchronize Updates
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      )}
    </div>
  );
};
