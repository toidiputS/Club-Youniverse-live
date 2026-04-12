/**
 * @file DjHud Component - Admin Station Controls
 * Modularly controlled by the Radio component's side tabs.
 */

import React, { useContext, useState, useEffect } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, 
    SkipForward, 
    Mic2, 
    Globe, 
    Music, 
    Zap, 
    Monitor,
    Video,
    ShieldAlert,
    Activity,
    Cpu,
    Radio as RadioIcon,
    Terminal,
    ChevronRight,
    Wifi
} from "lucide-react";
import { getBroadcastManager } from "../services/globalBroadcastManager";
import { VolumeControl } from "./VolumeControl";
import { ThePool } from "./ThePool";

interface DjHudProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export const DjHud: React.FC<DjHudProps> = ({ isOpen, setIsOpen }) => {
    const context = useContext(RadioContext);
    if (!context || !context.profile?.is_admin) return null;

    const { 
        radioState, 
        danceFloorEnabled, 
        setDanceFloorEnabled,
        twitchChannel,
        setTwitchChannel,
        nowPlaying
    } = context;

    const [activeTab, setActiveTab] = useState<'controls' | 'library' | 'nodes'>('controls');
    const [ttsInput, setTtsInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [tempTwitch, setTempTwitch] = useState(twitchChannel || "");
    const [signalStrength, setSignalStrength] = useState(98);

    useEffect(() => {
        setTempTwitch(twitchChannel || "");
    }, [twitchChannel]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSignalStrength(Math.floor(Math.random() * 5) + 95);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleSkip = async () => {
        if (!confirm("INITIATE GLOBAL SKIP PROTOCOL?")) return;
        const bm = getBroadcastManager();
        await bm.sendSiteCommand("skip", {});
    };

    const handleTtsSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ttsInput.trim() || isSending) return;
        setIsSending(true);
        const bm = getBroadcastManager();
        await bm.sendSiteCommand("tts", { text: ttsInput, voice: "Fenrir" });
        setTtsInput("");
        setIsSending(false);
    };

    const updateTwitch = () => {
        setTwitchChannel(tempTwitch || null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-200"
                    />

                    {/* HUD Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-[420px] bg-[#050505] z-201 border-l border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden pb-ticker"
                    >
                        {/* Scanline Effect Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-size-[100%_2px,3px_100%]" />

                        {/* Top Security Banner */}
                        <div className="bg-red-600/10 border-b border-red-500/20 py-1.5 px-4 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={10} className="text-red-500 animate-pulse" />
                                <span className="text-[8px] font-black text-red-500/80 uppercase tracking-[0.2em]">Authorized Personnel Only // Session Active</span>
                            </div>
                            <span className="text-[8px] font-mono text-red-500/50 uppercase">ID: {context.profile?.user_id?.slice(0, 8)}</span>
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 bg-linear-to-b from-white/5 to-transparent border-b border-white/5 pt-safe-top shrink-0">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-[14px] font-black text-white flex items-center gap-3 uppercase tracking-wider">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7] animate-pulse" />
                                    Station Control
                                </h2>
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em] ml-5">V8.2.0-BOOTH // STABLE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex px-2 py-1 bg-black/40 rounded-full border border-white/10 items-center shadow-inner">
                                     <VolumeControl />
                                 </div>
                                <button onClick={() => setIsOpen(false)} className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95 border border-white/5 group">
                                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="grow overflow-y-auto custom-scrollbar relative">
                            <AnimatePresence mode="wait">
                                {activeTab === 'controls' && (
                                    <motion.div 
                                        key="controls"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="p-6 space-y-10"
                                    >
                                        {/* Status Bar */}
                                        <div className="grid grid-cols-3 gap-1.5">
                                             <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-2 flex flex-col gap-0.5 shadow-sm">
                                                 <span className="text-[6px] font-black text-zinc-500 uppercase">Signal</span>
                                                 <div className="flex items-center gap-1">
                                                     <Wifi size={8} className="text-emerald-500" />
                                                     <span className="text-[9px] font-mono text-emerald-400 font-black">{signalStrength}%</span>
                                                 </div>
                                             </div>
                                             <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-2 flex flex-col gap-0.5 shadow-sm">
                                                 <span className="text-[6px] font-black text-zinc-500 uppercase">TX State</span>
                                                 <div className="flex items-center gap-1">
                                                     <RadioIcon size={8} className="text-purple-400" />
                                                     <span className="text-[9px] font-mono text-purple-300 font-black uppercase truncate">{radioState || 'IDLE'}</span>
                                                 </div>
                                             </div>
                                             <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-2 flex flex-col gap-0.5 shadow-sm">
                                                 <span className="text-[6px] font-black text-zinc-500 uppercase">Uptime</span>
                                                 <div className="flex items-center gap-1">
                                                     <Activity size={8} className="text-cyan-400" />
                                                     <span className="text-[9px] font-mono text-cyan-300 font-black">247:12:04</span>
                                                 </div>
                                             </div>
                                         </div>

                                        {/* Transmission Module */}
                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2 border-l-2 border-purple-500 pl-3">
                                                Primary Protocol
                                            </h3>
                                            
                                            <div className="grid gap-3">
                                                <div className="relative group">
                                                    <div className="absolute -inset-0.5 bg-linear-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                                                    <button 
                                                        onClick={handleSkip}
                                                        className="relative w-full flex items-center justify-between px-6 py-5 bg-black border border-red-900/40 rounded-2xl text-red-500 hover:bg-red-900 hover:text-white transition-all overflow-hidden group/btn"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-red-950/20 flex items-center justify-center border border-red-500/20 group-hover/btn:border-red-400 shadow-inner">
                                                                <SkipForward size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                                            </div>
                                                            <div className="flex flex-col items-start">
                                                                <span className="text-[12px] font-black uppercase tracking-widest">Global Skip</span>
                                                                <span className="text-[8px] font-bold text-red-500/50 uppercase">Emergency Transmission Cut</span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="opacity-20 group-hover/btn:opacity-100" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <button 
                                                        onClick={() => setDanceFloorEnabled(!danceFloorEnabled)}
                                                        className={`flex flex-col items-center gap-3 py-6 rounded-2xl border transition-all relative overflow-hidden group/arena ${
                                                            danceFloorEnabled 
                                                            ? 'bg-cyan-500/5 border-cyan-400/30 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]' 
                                                            : 'bg-zinc-900/40 border-white/5 text-zinc-600 grayscale'
                                                        }`}
                                                    >
                                                        {danceFloorEnabled && <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />}
                                                        <Monitor size={22} className={danceFloorEnabled ? "animate-pulse" : ""} />
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Arena Flow</span>
                                                            <span className={`text-[8px] font-bold uppercase ${danceFloorEnabled ? 'text-cyan-400/60' : 'text-zinc-700'}`}>
                                                                {danceFloorEnabled ? 'ACTIVE CONNECTION' : 'ENGINE DISABLED'}
                                                            </span>
                                                        </div>
                                                    </button>

                                                    <div className="flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-zinc-900/20 p-4 gap-2 shadow-inner">
                                                        <Cpu size={22} className="text-purple-400/40" />
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">State Engine</span>
                                                            <span className="text-[11px] font-mono text-purple-300 font-black uppercase tracking-tighter truncate px-2 bg-purple-500/5 border border-purple-500/10 rounded">
                                                                {radioState}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Video Module */}
                                        <section className="space-y-4">
                                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                   <Video size={10} className="text-indigo-400" /> External Feed
                                                </h3>
                                                <span className="text-[8px] font-mono text-indigo-400/40">TWITCH INTEGRATION</span>
                                            </div>
                                            
                                            <div className="p-1 bg-linear-to-br from-indigo-500/20 to-purple-500/20 rounded-[22px]">
                                                <div className="bg-[#0a0a0a] rounded-[20px] p-5 space-y-5 border border-white/5">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center px-1">
                                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Channel Uplink</label>
                                                            {twitchChannel && (
                                                                <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1">
                                                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                                                                    Connected
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="relative grow">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/20" />
                                                                <input 
                                                                    type="text" 
                                                                    value={tempTwitch}
                                                                    onChange={(e) => setTempTwitch(e.target.value)}
                                                                    placeholder="ENTER CHANNEL..."
                                                                    className="w-full bg-black border border-white/5 rounded-xl pl-8 pr-4 py-3 text-[12px] text-white font-mono placeholder:text-zinc-800 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all"
                                                                />
                                                            </div>
                                                            <button 
                                                                onClick={updateTwitch}
                                                                className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95"
                                                            >Sync</button>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={async () => {
                                                            const bm = getBroadcastManager();
                                                            await bm.sendSiteCommand("news_brief", {});
                                                        }}
                                                        className="w-full flex items-center justify-between px-5 py-3.5 bg-zinc-900 border border-white/5 rounded-xl text-white/50 hover:text-white hover:bg-zinc-800 transition-all group/news"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Globe size={14} className="group-hover/news:text-indigo-400 group-hover/news:rotate-12 transition-all" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Generate Site Brief</span>
                                                        </div>
                                                        <ChevronRight size={14} className="opacity-0 group-hover/news:opacity-100 -translate-x-2 group-hover/news:translate-x-0 transition-all" />
                                                    </button>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Voice Protocol Module */}
                                        <section className="space-y-4 pb-12">
                                            <div className="flex justify-between items-center bg-black/40 border border-white/5 rounded-xl px-4 py-2">
                                                <div className="flex items-center gap-3">
                                                    <Mic2 size={12} className="text-purple-500" />
                                                    <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Neural Override</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {[1,2,3,4].map(i => <div key={i} className={`w-1 h-3 rounded-full ${isSending ? 'bg-purple-500 animate-[bounce_0.6s_infinite_'+i*0.1+'s]' : 'bg-white/10'}`} />)}
                                                </div>
                                            </div>

                                            <form onSubmit={handleTtsSend} className="space-y-4">
                                                <div className="relative group">
                                                    <div className="absolute top-2 left-2 text-[8px] font-mono text-purple-500/40 z-10 select-none">SITE_MOD_VOICE_GATEWAY</div>
                                                    <div className="absolute bottom-2 right-4 text-[8px] font-mono text-purple-500/20 z-10 select-none">READY_FOR_INPUT</div>
                                                    <textarea
                                                        value={ttsInput}
                                                        onChange={(e) => setTtsInput(e.target.value)}
                                                        placeholder="Type voice transmission..."
                                                        className="w-full h-32 bg-black border border-purple-500/10 rounded-[20px] p-6 text-[12px] text-purple-100 focus:outline-none focus:border-purple-500/40 focus:bg-purple-500/5 transition-all font-mono custom-scrollbar shadow-inner placeholder:text-zinc-800 scroll-p-2"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isSending}
                                                    className={`relative w-full py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] transition-all overflow-hidden group/voice shadow-2xl ${
                                                        isSending 
                                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                                        : 'bg-purple-600 text-white hover:bg-purple-500 hover:scale-[1.01] active:scale-95'
                                                    }`}
                                                >
                                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/voice:translate-x-full transition-transform duration-1000 ease-in-out" />
                                                    {isSending ? (
                                                        <div className="flex items-center justify-center gap-3">
                                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                            ENCRYPTING...
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Zap size={14} className="fill-current" />
                                                            BROADCAST VOICE
                                                        </div>
                                                    )}
                                                </button>
                                            </form>
                                        </section>
                                    </motion.div>
                                )}

                                {activeTab === 'library' && (
                                    <motion.div 
                                        key="library"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="h-full relative"
                                    >
                                        <div className="h-full">
                                            <ThePool />
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'nodes' && (
                                    <motion.div 
                                        key="nodes"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="p-6 space-y-8"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-[11px] font-black text-white/40 uppercase tracking-widest">Global Node Matrix</h3>
                                                <div className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[8px] font-mono text-zinc-500">TPS: 12.4k</div>
                                            </div>
                                            
                                            <div className="grid gap-2">
                                                {[
                                                    { name: "Broadcast Master", status: "ONLINE", icon: <Globe size={14}/>, color: "text-emerald-400" },
                                                    { name: "Audio Engine", status: "SYNCED", icon: <Music size={14}/>, color: "text-purple-400" },
                                                    { name: "Neural VJ", status: "STREAMING", icon: <Zap size={14}/>, color: "text-cyan-400" },
                                                    { name: "Chat Protocol", status: "READY", icon: <Mic2 size={14}/>, color: "text-indigo-400" },
                                                    { name: "Atmosphere Engine", status: "IDLE", icon: <Activity size={14}/>, color: "text-zinc-600" }
                                                ].map(node => (
                                                    <div key={node.name} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-white/10 transition-colors group/node shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2 bg-white/5 rounded-xl ${node.color} group-hover/node:scale-110 transition-transform`}>
                                                                {node.icon}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black text-white/90 uppercase tracking-wider">{node.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-1 h-1 rounded-full ${node.status === 'ONLINE' || node.status === 'SYNCED' ? 'bg-emerald-500 shadow-[0_0_5px_emerald]' : 'bg-zinc-700'}`} />
                                                                    <span className="text-[8px] font-bold text-zinc-600 uppercase">Load: {Math.floor(Math.random() * 20) + 10}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest transition-all ${
                                                            node.status === 'ONLINE' || node.status === 'SYNCED' || node.status === 'STREAMING'
                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                            : 'bg-zinc-800 border-white/5 text-zinc-500'
                                                        }`}>
                                                            {node.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="relative overflow-hidden p-6 bg-linear-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-3xl space-y-4 shadow-2xl">
                                            <Terminal className="absolute -bottom-4 -right-4 w-24 h-24 text-purple-500/5 rotate-12" />
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                                    <Cpu size={14} className="text-purple-400" />
                                                </div>
                                                <h4 className="text-[11px] font-black text-white/90 uppercase tracking-widest">Protocol Architecture</h4>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-tight">
                                                Nodes are the synchronized heart of Youniverse. Every asset, profile, and event instance is a distinct packet in our persistent global network.
                                            </p>
                                            <div className="pt-2 flex items-center gap-2 text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] bg-purple-500/5 p-2 rounded-lg border border-purple-500/10 w-fit">
                                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]" />
                                                Full Synchronization Active
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Navigation Footer */}
                        <div className="p-4 border-t border-white/5 bg-black/60 backdrop-blur-3xl shrink-0">
                            <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                                <button 
                                    onClick={() => setActiveTab('controls')}
                                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all group/nav ${activeTab === 'controls' ? 'bg-purple-600 text-white shadow-lg overflow-hidden' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    {activeTab === 'controls' && <motion.div layoutId="nav-bg" className="absolute inset-0 bg-purple-600 z-0" />}
                                    <Zap size={15} className="relative z-10 group-hover/nav:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-tight relative z-10">System</span>
                                </button>
                                <button 
                                    onClick={() => setActiveTab('library')}
                                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all group/nav ${activeTab === 'library' ? 'bg-purple-600 text-white shadow-lg overflow-hidden' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    {activeTab === 'library' && <motion.div layoutId="nav-bg" className="absolute inset-0 bg-purple-600 z-0" />}
                                    <Music size={15} className="relative z-10 group-hover/nav:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-tight relative z-10">Library</span>
                                </button>
                                <button 
                                    onClick={() => setActiveTab('nodes')}
                                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all group/nav ${activeTab === 'nodes' ? 'bg-purple-600 text-white shadow-lg overflow-hidden' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    {activeTab === 'nodes' && <motion.div layoutId="nav-bg" className="absolute inset-0 bg-purple-600 z-0" />}
                                    <Globe size={15} className="relative z-10 group-hover/nav:scale-110 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-tight relative z-10">Matrix</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
