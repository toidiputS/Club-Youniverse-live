import React, { useContext, useState } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import type { View } from "../types";
import { supabase } from "../services/supabaseClient";
import { TheChat } from "./TheChat";
import { Radio as FloorView } from "./Radio";
import { PersistentRadioService } from "../services/PersistentRadioService";
import { getBroadcastManager } from "../services/globalBroadcastManager";

interface DjBoothProps {
  onNavigate: (view: View) => void;
}

export const DjBooth: React.FC<DjBoothProps> = ({ onNavigate }) => {
  const context = useContext(RadioContext);
  if (!context || !context.profile) return null;

  const { profile, radioState } = context;
  const [ttsInput, setTtsInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSunoConfirmed, setIsSunoConfirmed] = useState(false);

  // Library & Upload State
  const [songs, setSongs] = useState<any[]>([]);
  const [orphans, setOrphans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [visualFile, setVisualFile] = useState<File | null>(null);

  // Voting State
  const [voteCooldowns, setVoteCooldowns] = useState<Record<string, boolean>>({});

  const boxCount = songs.filter(s => s.status === 'in_box').length;

  // Fetch Library
  const fetchLibrary = async () => {
    console.log("🔍 DJ Booth: Fetching Library...");

    // DEBUG: Log current user info to check session/RLS
    const { data: { session } } = await supabase.auth.getSession();
    console.log("👤 DJ Booth Auth Session:", session?.user?.id || "None", session?.user?.email || "N/A");

    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ DJ Booth: Fetch Error:", error);
    }

    console.log(`🎵 DJ Booth: Raw Fetch Result:`, data);

    if (data) {
      console.log(`🎵 DJ Booth: Loaded ${data.length} songs. Statuses:`, [...new Set(data.map(s => s.status))]);
      setSongs(data);
    }

    // Scan for Orphans (Files in storage not in DB)
    try {
      console.log("🔍 DJ Booth: Scanning for orphans in storage...");
      // 1. List root to find all folders (like UUIDs or user_uploads)
      const { data: rootItems } = await supabase.storage.from('songs').list('');
      let allFiles: any[] = [];

      if (rootItems) {
        console.log(`📂 DJ Booth: Found ${rootItems.length} items in bucket root.`);
        for (const item of rootItems) {
          if (item.name === '.emptyFolderPlaceholder') continue;

          if (!item.name.endsWith('.mp3')) {
            // It's likely a folder, list its contents
            console.log(`📁 DJ Booth: Scanning folder: ${item.name}`);
            const { data: folderFiles } = await supabase.storage.from('songs').list(item.name);
            if (folderFiles) {
              console.log(`   📄 DJ Booth: Found ${folderFiles.length} items in ${item.name}`);
              for (const subItem of folderFiles) {
                if (subItem.name === '.emptyFolderPlaceholder') continue;

                if (!subItem.name.endsWith('.mp3')) {
                  // DEPTH 2: It's a subfolder (e.g., user_uploads/<uuid>)
                  console.log(`      📁 DJ Booth: Scanning sub-folder: ${item.name}/${subItem.name}`);
                  const { data: deepFiles } = await supabase.storage.from('songs').list(`${item.name}/${subItem.name}`);
                  if (deepFiles) {
                    console.log(`         📄 DJ Booth: Found ${deepFiles.length} files in ${item.name}/${subItem.name}. Mapping...`);
                    allFiles.push(...deepFiles.map(file => {
                      const fullPath = `${item.name}/${subItem.name}/${file.name}`;
                      console.log(`            📌 DJ Booth: Found file: ${file.name} (fullPath: ${fullPath})`);
                      return { ...file, fullPath };
                    }));
                  }
                } else {
                  // DEPTH 1: It's a file in a top-level folder
                  const fullPath = `${item.name}/${subItem.name}`;
                  console.log(`   📌 DJ Booth: Found file (D1): ${subItem.name} (fullPath: ${fullPath})`);
                  allFiles.push({ ...subItem, fullPath });
                }
              }
            }
          } else {
            // It's a file at root
            console.log(`📌 DJ Booth: Found file (Root): ${item.name}`);
            allFiles.push({ ...item, fullPath: item.name });
          }
        }
      }

      console.log(`🔎 DJ Booth: Final allFiles list (${allFiles.length} items):`, allFiles.map(f => f.fullPath));

      const existingUrls = new Set(data?.map(s => s.audio_url) || []);
      console.log(`🔎 DJ Booth: Existing URLs in DB (${existingUrls.size} items):`, [...existingUrls]);

      const foundOrphans = allFiles.filter(f => {
        const isMp3 = f.name.toLowerCase().endsWith('.mp3');
        if (!isMp3) console.log(`⏩ DJ Booth: Skipping non-mp3: ${f.name}`);
        return isMp3;
      }).filter(f => {
        const { data: { publicUrl } } = supabase.storage.from('songs').getPublicUrl(f.fullPath);
        const isOrphan = !existingUrls.has(publicUrl);
        if (isOrphan) {
          console.log(`🕵️ DJ Booth: Found Orphan: ${f.name} (Url: ${publicUrl})`);
        } else {
          console.log(`✅ DJ Booth: File already in DB: ${f.name}`);
        }
        return isOrphan;
      });

      console.log(`✨ DJ Booth: Total Orphans Filtered: ${foundOrphans.length}`);
      setOrphans(foundOrphans);
    } catch (e) {
      console.warn("Orphan scan failed:", e);
    }
  };

  const recoverSongs = async () => {
    if (!orphans.length || !profile.user_id) return;
    setIsUploading(true);
    let count = 0;

    let targetUploaderId = profile.user_id;

    // Handle god-mode-admin (non-UUID) by finding the first real admin in DB
    if (targetUploaderId === "god-mode-admin") {
      console.log("🛠️ DJ Booth: God-mode detected. Finding real admin for attribution...");
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('is_admin', true)
        .limit(1)
        .single();

      if (adminProfile) {
        targetUploaderId = adminProfile.user_id;
        console.log(`🛠️ DJ Booth: Attributing to real admin: ${targetUploaderId}`);
      } else {
        console.error("❌ DJ Booth: No real admin found in DB. Cannot recover songs.");
        setIsUploading(false);
        alert("Recovery failed: No valid admin users found in the database to attribute the songs to.");
        return;
      }
    }

    console.log(`🚀 DJ Booth: Starting recovery of ${orphans.length} songs...`);

    for (const orphan of orphans) {
      const { data: { publicUrl } } = supabase.storage.from('songs').getPublicUrl(orphan.fullPath);
      const { error } = await supabase.from('songs').insert({
        uploader_id: targetUploaderId,
        title: orphan.name.replace('.mp3', '').replace(/_\d+$/, ''),
        artist_name: profile.name || "Resurrected Artist",
        source: "upload",
        audio_url: publicUrl,
        duration_sec: 180,
        status: "pool"
      });

      if (error) {
        console.error(`❌ DJ Booth: Failed to recover ${orphan.name}:`, error);
      } else {
        count++;
      }
    }

    setOrphans([]);
    await fetchLibrary();
    setIsUploading(false);
    alert(`Successfully resurrected ${count} songs from storage!`);
  };

  const hardResetRadio = async () => {
    if (!profile.is_admin) return;
    if (!confirm("⚠️ This will KICK EVERYONE and reset ALL songs to the pool. Proceed?")) return;
    await forceNextState('REBOOT');
    alert("Station reboot command sent.");
  };

  React.useEffect(() => {
    fetchLibrary();
  }, []);

  const filteredSongs = songs.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.artist_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = profile.is_admin;
  const isCurrentDJ = context.leaderId === profile.user_id;
  const canControl = isAdmin || isCurrentDJ;

  const sendSiteCommand = async (type: string, payload: any) => {
    if (!canControl) return;
    try {
      const bm = getBroadcastManager();
      await bm.sendSiteCommand(type, payload);
    } catch (e) {
      console.error("Site Command Failed:", e);
    }
  };

  const clearBroadcast = async () => {
    if (!canControl) return;
    await supabase.from("broadcasts").update({
      current_song_id: null,
      radio_state: "IDLE",
      song_started_at: null
    }).eq("id", "00000000-0000-0000-0000-000000000000");
  };

  const pushToNow = async (song: any) => {
    if (!canControl) return;
    // Set song to pool if it was in review
    if (song.status === 'review') {
      await pushToBox(song.id, 'pool');
    }

    await supabase.from("broadcasts").update({
      current_song_id: song.id,
      radio_state: "NOW_PLAYING",
      song_started_at: new Date().toISOString()
    }).eq("id", "00000000-0000-0000-0000-000000000000");
  };

  const rejectSong = async (songId: string) => {
    if (!canControl) return;
    await supabase.from("songs").update({ status: "graveyard" }).eq("id", songId);
    await fetchLibrary();
  }

  const handleVote = async (songId: string, currentVotes: number) => {
    if (voteCooldowns[songId]) return;
    setVoteCooldowns(prev => ({ ...prev, [songId]: true }));

    const newVotes = (currentVotes || 0) + 1;
    // Optimistic UI updates
    setSongs(s => s.map(song => song.id === songId ? { ...song, upvotes: newVotes } : song));

    await supabase.from("songs").update({ upvotes: newVotes }).eq("id", songId);

    // Cooldown prevents spamming, wait 5 seconds
    setTimeout(() => {
      setVoteCooldowns(prev => ({ ...prev, [songId]: false }));
    }, 5000);
  };

  const pushToBox = async (songId: string, status: 'in_box' | 'pool' = 'in_box') => {
    if (!canControl) return;
    await supabase.from("songs").update({ status }).eq("id", songId);
    await fetchLibrary();
  };

  const handleDelete = async (songId: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to permanently delete this node from the database?")) return;
    await supabase.from("songs").delete().eq("id", songId);
    await fetchLibrary();
  };

  const handleStarVote = async (stars: number) => {
    if (!context.nowPlaying) return;
    if (voteCooldowns[context.nowPlaying.id]) return;

    setVoteCooldowns(prev => ({ ...prev, [context.nowPlaying!.id]: true }));

    const { data: song } = await supabase.from("songs").select("live_stars_sum, live_stars_count").eq("id", context.nowPlaying.id).single();
    if (song) {
      await supabase.from("songs").update({
        live_stars_sum: (song.live_stars_sum || 0) + stars,
        live_stars_count: (song.live_stars_count || 0) + 1
      }).eq("id", context.nowPlaying.id);
    }
  };

  const handleTtsSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canControl || !ttsInput.trim() || isSending) return;
    setIsSending(true);
    await sendSiteCommand("tts", { text: ttsInput, voice: "Fenrir" });
    setTtsInput("");
    setIsSending(false);
  };

  const forceNextState = async (state: string) => {
    if (!isCurrentDJ) return;
    setIsSending(true);
    try {
      const bm = getBroadcastManager();
      await bm.setRadioState(state as any); // cast as any since RadioState isn't exported in the same way, or use the type if imported
    } catch (e) {
      console.error("Force state transition failed:", e);
    }
    setIsSending(false);
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio(objectUrl);
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.round(audio.duration));
        URL.revokeObjectURL(objectUrl);
      });
      audio.addEventListener('error', () => {
        resolve(180); // fallback
        URL.revokeObjectURL(objectUrl);
      });
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Removed isAdmin restriction so Yousers can upload
    const file = e.target.files?.[0];
    if (!file || !profile.user_id) return;
    // if (!isSunoConfirmed) return; // Optional: Enforce checkbox check

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const duration = await getAudioDuration(file);
      const fileExt = file.name.split('.').pop();
      const cleanName = file.name.replace(`.${fileExt}`, "").replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
      const filePath = `${profile.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('songs')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;
      setUploadProgress(50);

      const { data: { publicUrl } } = supabase.storage.from('songs').getPublicUrl(filePath);

      let canvasUrl = undefined;
      let isCanvas = false;

      if (visualFile) {
        // Check filesize (max 15MB)
        if (visualFile.size > 15 * 1024 * 1024) {
          alert("Canvas is too large! Maximum size is 15MB.");
        } else {
          setUploadProgress(75);
          const visExt = visualFile.name.split('.').pop();
          const visCleanName = visualFile.name.replace(`.${visExt}`, "").replace(/[^a-zA-Z0-9]/g, "_");
          const visFileName = `v_${Date.now()}_${visCleanName}.${visExt}`;
          const visPath = `${profile.user_id}/${visFileName}`;

          const isMp4 = visualFile.type.includes('mp4');
          const bucketName = isMp4 ? 'videos' : 'covers';
          isCanvas = isMp4;

          const { error: visError } = await supabase.storage
            .from(bucketName)
            .upload(visPath, visualFile, { cacheControl: '3600', upsert: true });

          if (!visError) {
            const { data: { publicUrl: vUrl } } = supabase.storage.from(bucketName).getPublicUrl(visPath);
            canvasUrl = vUrl;
          } else {
            console.error("Visual upload failed:", visError);
          }
        }
      }

      await supabase.from('songs').insert({
        uploader_id: profile.user_id,
        title: file.name.replace(`.${fileExt}`, ""),
        artist_name: profile.name || "Anonymous DJ",
        source: "upload",
        audio_url: publicUrl,
        duration_sec: duration,
        status: canControl ? "pool" : "review",
        cover_art_url: canvasUrl,
        is_canvas: isCanvas
      });

      setUploadProgress(100);
      await fetchLibrary();
      if (!canControl) {
        alert("Song uploaded and pending DJ review!");
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); setVisualFile(null); }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white/90 font-mono overflow-hidden flex flex-col z-[100] selection:bg-purple-500/30">

      {/* 1. BACKGROUND FLOOR RE-RENDER (Silent View) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none grayscale">
        <FloorView onNavigate={() => { }} onSignOut={() => { }} profile={profile} />
      </div>

      {/* 2. TOP TECHNICAL HUD */}
      <div className="relative z-50 md:h-14 py-2 md:py-0 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between px-4 md:px-6 gap-4 md:gap-0 shrink-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 w-full md:w-auto">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-xs font-black tracking-[0.4em] uppercase text-white">Club Deck v5</h1>
            <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-0.5">Authorized Node: {profile.user_id?.slice(0, 8)}</span>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 items-center border-t md:border-t-0 md:border-l border-white/5 pt-2 md:pt-0 md:pl-6 w-full md:w-auto">
            <div className="flex gap-1 md:gap-2 items-baseline">
              <span className="text-[8px] font-black uppercase text-zinc-500">Status:</span>
              <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest">{radioState}</span>
            </div>
            <div className="flex gap-1 md:gap-2 items-baseline border-l border-white/5 pl-4 md:pl-6">
              <span className="text-[8px] font-black uppercase text-zinc-500">DB:</span>
              <span className="text-[10px] font-black uppercase text-green-400">{songs.length}</span>
            </div>
            <div className="flex gap-1 md:gap-2 items-baseline border-l border-white/5 pl-4 md:pl-6">
              <span className="text-[8px] font-black uppercase text-zinc-500">Box:</span>
              <span className="text-[10px] font-black uppercase text-purple-400">{boxCount}</span>
            </div>
            <div className="flex gap-1 md:gap-2 items-baseline border-l border-white/5 pl-4 md:pl-6">
              <span className="text-[8px] font-black uppercase text-zinc-500">Role:</span>
              <span className="text-[10px] font-black uppercase text-blue-400">{profile.is_admin ? "ADMIN" : "DJ"}</span>
            </div>
            <button
              onClick={fetchLibrary}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
              title="Force List Refresh"
            >
              <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 w-full md:w-auto">
          {isCurrentDJ ? (
            <button
              onClick={context.releaseLeadership}
              className="flex-1 md:flex-none px-4 md:px-6 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.2em] rounded-full text-center"
            >
              Release Deck
            </button>
          ) : (
            <button
              onClick={context.claimLeadership}
              className="flex-1 md:flex-none px-4 md:px-6 py-2 bg-purple-600 text-white hover:bg-purple-500 transition-all text-[9px] font-black uppercase tracking-[0.2em] rounded-full animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.3)] text-center"
            >
              Take Deck
            </button>
          )}

          {isAdmin && (
            <button
              onClick={hardResetRadio}
              className="px-3 md:px-4 py-2 bg-red-900/20 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white transition-all text-[8px] font-black uppercase tracking-[0.2em] rounded-full"
            >
              Reset Radio
            </button>
          )}

          <button
            onClick={() => onNavigate("club")}
            className="flex-1 md:flex-none px-4 md:px-6 py-2 bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.2em] rounded-full text-center"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* 3. CORE INTERFACE (Dense overlay) */}
      <div className="relative z-10 flex-grow flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden gap-2 bg-black/60 p-2">

        {/* === COL 1: SYSTEM, INTAKE, DEPLOYMENT (w-72) === */}
        <div className="w-full md:w-72 bg-zinc-950/80 border border-white/5 rounded-xl flex flex-col p-3 gap-3 shrink-0 overflow-y-auto custom-scrollbar">

          <div className="space-y-4 mb-4">
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em] mb-4 block">System Triggers</span>
            <div className="grid grid-cols-1 gap-px bg-white/5 border border-white/5 rounded-lg overflow-hidden">
              {[
                { id: 'POOL', icon: 'P', label: 'Cycle' },
                { id: 'THE_BOX', icon: 'B', label: 'Refresh Box' },
                { id: 'DJ_TALKING', icon: 'M', label: 'Mic Over' },
                { id: 'BOX_WIN', icon: 'W', label: 'Force Win' },
                { id: 'REBOOT', icon: 'N', label: 'Force Nuke', color: 'text-red-500' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => forceNextState(btn.id)}
                  disabled={!isCurrentDJ}
                  className={`flex items-center justify-between px-4 py-3 transition-all group ${btn.id === radioState ? 'bg-purple-950/20' : 'bg-zinc-950 hover:bg-zinc-900'} ${!isCurrentDJ ? 'opacity-30 cursor-not-allowed filter grayscale' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black border border-white/10 w-5 h-5 flex items-center justify-center rounded ${btn.id === radioState ? 'border-purple-500/50 text-purple-400' : 'text-zinc-600'}`}>{btn.icon}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${btn.color || 'text-zinc-400 group-hover:text-white'}`}>{btn.label}</span>
                  </div>
                  {btn.id === radioState && <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse shadow-[0_0_5px_purple]" />}
                </button>
              ))}
            </div>
          </div>

          {/* SQUAD / YOUSER DJ REVIEW BOX */}
          <div className="flex-grow border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-3 flex flex-col min-h-[150px] shrink-0">
            <span className="text-[8px] font-bold text-yellow-500 uppercase block mb-2 tracking-widest leading-tight">Youser Intake</span>
            <div className="flex-grow divide-y divide-white/5 overflow-y-auto pr-1 flex flex-col gap-2">
              {songs.filter(s => s.status === 'review').map(song => (
                <div key={song.id} className="p-2 bg-black/40 rounded border border-white/5 flex flex-col gap-2 transition-all hover:bg-black/60">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[9px] font-black text-white truncate uppercase" title={song.title}>{song.title}</span>
                      <span className="text-[7px] text-zinc-500 font-bold truncate uppercase">{song.artist_name}</span>
                    </div>
                  </div>
                  {canControl && (
                    <div className="flex justify-between mt-1 pt-1 border-t border-white/5">
                      <button onClick={() => pushToNow(song)} className="text-[7px] font-black uppercase tracking-tight text-purple-400 hover:text-white transition-colors">Play</button>
                      <button onClick={() => pushToBox(song.id, 'pool')} className="text-[7px] font-black uppercase tracking-tight text-green-400 hover:text-white transition-colors">Pool</button>
                      <button onClick={() => rejectSong(song.id)} className="text-[7px] font-black uppercase tracking-tight text-red-400 hover:text-white transition-colors">Reject</button>
                    </div>
                  )}
                </div>
              ))}
              {songs.filter(s => s.status === 'review').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 mt-4">
                  <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest text-center leading-tight">No tracks pending review</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 mb-4 mt-4">
            <div className="p-3 bg-zinc-900/40 rounded-lg border border-white/5">
              <span className="text-[8px] font-bold text-zinc-600 uppercase block mb-2 tracking-widest">Suno Deployment</span>
              <label className="flex items-center gap-2 cursor-pointer mb-3 opacity-60 hover:opacity-100 transition-opacity">
                <input type="checkbox" checked={isSunoConfirmed} onChange={e => setIsSunoConfirmed(e.target.checked)} className="w-3 h-3 bg-black rounded border-white/10 text-purple-600 focus:ring-0" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Monetization Sync</span>
              </label>

              <div className={`mb-3 transition-opacity ${isSunoConfirmed ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-purple-400 transition-colors">Attach (IMG/MP4)</span>
                  <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[10px] text-zinc-500 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">+</div>
                  <input type="file" accept="image/*,video/mp4" onChange={e => setVisualFile(e.target.files?.[0] || null)} className="hidden" disabled={!isSunoConfirmed} />
                </label>
                {visualFile && (
                  <div className="mt-2 text-[8px] text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 truncate">
                    {visualFile.name}
                  </div>
                )}
              </div>

              <label className={`block py-3 text-center border-2 border-dashed rounded-lg transition-all ${isSunoConfirmed ? 'border-purple-500/40 cursor-pointer hover:bg-purple-500/10 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]' : 'border-white/5 opacity-50 select-none'}`}>
                <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" disabled={!isSunoConfirmed || isUploading} />
                <span className="text-[9px] font-black uppercase tracking-widest">{isUploading ? `Syncing ${uploadProgress}%` : 'Deploy Node Audio'}</span>
              </label>
            </div>
          </div>

          {/* ORPHAN RECOVERY UI - ADMIN ONLY */}
          {isAdmin && orphans.length > 0 && (
            <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl animate-pulse shrink-0">
              <span className="text-[8px] font-black text-purple-400 uppercase block mb-1 tracking-[0.2em]">🚨 Dead Nodes</span>
              <button
                onClick={recoverSongs}
                disabled={isUploading}
                className="w-full py-1.5 bg-purple-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-purple-500 transition-all"
              >
                {isUploading ? 'Resurrecting...' : 'Resurrect All'}
              </button>
            </div>
          )}

        </div>

        {/* === COL 2: THE POOL & THE CHAT (flex-grow) === */}
        <div className="flex-grow min-w-[300px] bg-zinc-950/80 border border-white/5 rounded-xl flex flex-col shrink-0 md:shrink overflow-hidden gap-2 p-2">

          <div className="flex-grow flex flex-col border border-white/5 rounded-lg overflow-hidden bg-black/40 min-h-[300px]">
            <div className="p-3 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-black/40 gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em]">Node Archive</span>
              </div>
              <div className="flex gap-4 items-center">
                {isAdmin && (
                  <button onClick={clearBroadcast} className="text-[8px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-tighter transition-colors">Terminate Signal</button>
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Scan Nodes..."
                  className="bg-white/5 border border-white/5 rounded-lg py-1 px-3 text-[9px] text-zinc-400 placeholder-zinc-800 focus:outline-none focus:border-purple-500/20 w-full sm:w-48"
                />
              </div>
            </div>

            <div className="flex-grow overflow-y-auto px-4 py-2 divide-y divide-white/[0.02]">
              {filteredSongs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                  <div className="w-12 h-12 border-2 border-dashed border-white/20 rounded-full animate-spin mb-4" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-white">Scanning for nodes...</span>
                </div>
              ) : (
                filteredSongs.map(song => (
                  <div key={song.id} className="py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:bg-white/[0.02] -mx-4 px-4 transition-all gap-2 sm:gap-4">
                    <div className="w-full sm:w-auto min-w-0 flex-grow flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex-shrink-0 overflow-hidden relative">
                        {song.is_canvas && song.cover_art_url ? (
                          <video src={song.cover_art_url} muted loop playsInline autoPlay className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all pointer-events-none" />
                        ) : (
                          <img src={song.cover_art_url || `https://picsum.photos/seed/${song.id}/100`} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-[10px] font-black text-white/50 group-hover:text-white truncate uppercase transition-colors max-w-full">{song.title}</h4>
                          {(song.status === 'in_box' || song.status === 'pool') && (song.upvotes > 0 || song.status === 'in_box') && (
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 flex items-center gap-1 ${song.status === 'in_box' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'}`}>
                              🗳️ {song.upvotes || 0} Votes
                            </span>
                          )}
                          {song.status === 'now_playing' && (
                            <span className="text-[7px] font-black bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">📡 Active</span>
                          )}
                        </div>
                        <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-tight group-hover:text-purple-400/50 transition-colors truncate block max-w-full">{song.artist_name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">★ {song.stars}/10</span>
                          {song.is_dsw && (
                            <span className="text-[7px] font-black bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-red-500/30 animate-pulse">
                              DEAD SONG WALKING
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-2 flex-shrink-0 w-full sm:w-auto pl-12 sm:pl-0">
                      <button
                        onClick={() => handleVote(song.id, song.upvotes)}
                        disabled={voteCooldowns[song.id] || song.status === 'now_playing'}
                        className={`text-[7px] font-black border px-3 py-1.5 sm:px-2 sm:py-1 rounded transition-all uppercase flex-grow sm:flex-none text-center ${voteCooldowns[song.id] ? 'border-zinc-800 text-zinc-600 cursor-not-allowed' : 'border-purple-500/30 text-purple-400 hover:text-white hover:bg-purple-500/20'}`}
                      >
                        VOTE
                      </button>
                      <button
                        onClick={() => context.downloadSong(PersistentRadioService.mapDbToApp(song))}
                        className="text-[7px] font-black border border-white/5 px-3 py-1.5 sm:px-2 sm:py-1 rounded text-zinc-600 hover:text-white hover:bg-white/5 transition-all uppercase flex-grow sm:flex-none text-center"
                      >
                        DL
                      </button>
                      {canControl && (
                        <>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(song.id)}
                              className="text-[7px] font-black border border-red-500/20 px-3 py-1.5 sm:px-2 sm:py-1 rounded text-red-500 hover:text-white hover:bg-red-600 transition-all uppercase flex-grow sm:flex-none text-center"
                            >
                              DEL
                            </button>
                          )}
                          <button
                            onClick={() => pushToNow(song)}
                            className="text-[7px] font-black border border-purple-500/20 px-3 py-1.5 sm:px-2 sm:py-1 rounded text-purple-400 hover:text-white hover:bg-purple-600 transition-all uppercase flex-grow sm:flex-none text-center"
                          >
                            {song.status === 'now_playing' ? 'Restart' : 'Play'}
                          </button>
                          <button
                            onClick={() => pushToBox(song.id, song.status === 'in_box' ? 'pool' : 'in_box')}
                            className={`text-[7px] font-black border px-3 py-1.5 sm:px-2 sm:py-1 rounded uppercase transition-all flex-grow sm:flex-none text-center ${song.status === 'in_box' ? 'border-purple-500/50 text-purple-400 bg-purple-500/10' : 'border-white/10 text-zinc-500 hover:text-white hover:border-white/30'}`}
                          >
                            {song.status === 'in_box' ? 'Boxed' : 'Box'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="h-64 sm:h-96 shrink-0 border border-white/5 rounded-lg overflow-hidden bg-zinc-950 relative">
            <TheChat profile={profile} />
          </div>

        </div>

        {/* === COL 3: THE BOX, LIVE, PAYLOAD & FX (STACKED) (w-80) === */}
        <div className="w-full md:w-80 flex flex-col gap-2 shrink-0 overflow-y-auto pr-1 custom-scrollbar">

          <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl flex flex-col items-center gap-4 relative overflow-hidden group">
            <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-purple-500/20 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
              {context.nowPlaying?.audioUrl ? (
                <img src={`https://picsum.photos/seed/${context.nowPlaying.id}/100`} className="w-full h-full object-cover animate-pulse" alt="" />
              ) : (
                <div className="text-zinc-800 text-xl font-black">?</div>
              )}
            </div>

            <div className="flex flex-col min-w-0 text-center items-center w-full">
              <span className="text-[8px] font-black text-purple-400 uppercase tracking-[0.3em] mb-1">On Air Monitor</span>
              <h2 className="text-xl font-black text-white truncate uppercase tracking-tight max-w-full">
                {context.nowPlaying?.title || "Station Idle"}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{context.nowPlaying?.artistName || "No Payload"}</span>
                {context.nowPlaying && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping shadow-[0_0_10px_green]" />}
              </div>
            </div>

            {context.nowPlaying && (
              <div className="w-full flex flex-col items-center gap-2 mt-2">
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-purple-500 transition-all duration-1000 shadow-[0_0_15px_purple]"
                    style={{ width: `${(context.currentTime / (context.nowPlaying.durationSec || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                    <button
                      key={star}
                      onClick={() => handleStarVote(star)}
                      disabled={voteCooldowns[context.nowPlaying!.id]}
                      className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black border transition-all ${voteCooldowns[context.nowPlaying!.id] ? 'border-zinc-800 text-zinc-700 bg-zinc-900 cursor-not-allowed' : 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-black hover:scale-110'}`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-xl flex flex-col gap-3 min-h-[300px]">
            <div className="flex items-center justify-between pointer-events-none mb-2 border-b border-white/5 pb-2">
              <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Box Analytics</span>
              <div className="flex items-center gap-1.5 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                <span className="text-[7px] font-black uppercase text-purple-400">Live</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto">
              {songs.filter(s => s.status === 'in_box').sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).map((song, i) => {
                const totalVotes = songs.filter(s => s.status === 'in_box').reduce((acc, curr) => acc + (curr.upvotes || 0), 0) || 1;
                const percentage = Math.round(((song.upvotes || 0) / totalVotes) * 100);

                return (
                  <div key={song.id} className={`p-3 rounded-lg border ${i === 0 ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5 bg-black/40'} transition-all`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className={`text-[9px] font-black truncate uppercase ${i === 0 ? 'text-white' : 'text-zinc-300'}`}>{song.title}</span>
                        <span className="text-[7px] font-bold text-zinc-500 truncate uppercase mt-0.5">{song.artist_name}</span>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <span className={`text-[11px] font-black ${i === 0 ? 'text-purple-400' : 'text-zinc-500'}`}>{song.upvotes || 0}</span>
                          <span className="text-[7px] font-bold text-zinc-700 uppercase mt-0.5">Votes</span>
                        </div>
                        {i === 0 && <span className="text-[6px] font-black text-purple-600 uppercase tracking-tighter">Winning</span>}
                      </div>
                    </div>
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full ${i === 0 ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-zinc-600'} transition-all duration-1000`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {songs.filter(s => s.status === 'in_box').length === 0 && (
                <div className="py-8 flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/20">
                  <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest opacity-40 text-center">Empty Box</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Narrator Payload</span>
            </div>
            <textarea
              value={ttsInput}
              onChange={e => setTtsInput(e.target.value)}
              placeholder="Type protocol command..."
              className="w-full min-h-[60px] bg-black/60 border border-white/5 rounded-lg p-3 text-[11px] text-white/80 placeholder-zinc-800 focus:outline-none focus:border-purple-500/20 transition-all font-mono resize-none shadow-inner"
            />
            <button
              onClick={handleTtsSend}
              disabled={isSending || !ttsInput.trim()}
              className="w-full py-2.5 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center rounded-lg shadow-sm"
            >
              {isSending ? 'Sending...' : 'Transmit Payload'}
            </button>
          </div>

          <div className="p-4 border border-white/5 bg-zinc-950/80 rounded-xl flex flex-col shrink-0">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-4 block">Pulse Monitor</span>
            <div className="w-full h-24 flex items-center justify-center relative border border-white/5 rounded-xl bg-black overflow-hidden mb-2">
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-[0.03] pointer-events-none">
                {Array.from({ length: 36 }).map((_, i) => <div key={i} className="border border-white" />)}
              </div>
              <div className="z-10 grid grid-cols-5 gap-2 w-full px-2">
                {["Confetti", "Glitch", "Shake", "Pulse", "Static", "Invert", "Hue", "Blur", "Pixel", "Neon"].map(fx => (
                  <button
                    key={fx}
                    onClick={() => sendSiteCommand("trigger_fx", { fx })}
                    disabled={!canControl}
                    className={`px-1 py-1.5 bg-zinc-900/50 border rounded text-[6px] font-black uppercase transition-all ${canControl
                      ? 'border-white/5 hover:border-purple-500/50 hover:bg-purple-900/20 hover:text-white text-zinc-400'
                      : 'border-white/5 opacity-30 cursor-not-allowed text-zinc-600'
                      }`}
                  >
                    {fx.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 4. DENSE GRID OVERLAY SIDES */}
      <div className="absolute inset-0 z-40 border-[20px] border-white/0 pointer-events-none border-l-white/[0.01] border-r-white/[0.01]" />
    </div>
  );
};

export default DjBooth;
