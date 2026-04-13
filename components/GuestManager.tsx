import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    User, 
    AlertTriangle, 
    Clock, 
    UserX, 
    MessageSquare, 
    Shield, 
    Search,
    ChevronRight,
    SearchX
} from 'lucide-react';
import { Profile } from '../types';
import { supabase } from '../services/supabaseClient';
import { RadioContext } from '../contexts/AudioPlayerContext';
import { getBroadcastManager } from '../services/globalBroadcastManager';

interface GuestManagerProps {
    isOpen: boolean;
    onClose: () => void;
    adminProfile: Profile;
}

export const GuestManager: React.FC<GuestManagerProps> = ({ isOpen, onClose, adminProfile }) => {
    const context = useContext(RadioContext);
    const isAdmin = adminProfile?.is_admin || adminProfile?.role === 'owner' || adminProfile?.role === 'admin' || adminProfile?.role === 'bouncer' || adminProfile?.email === 'itstraderbaby@gmail.com';
    const [guests, setGuests] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedGuest, setSelectedGuest] = useState<Profile | null>(null);
    const [dmText, setDmText] = useState("");

    const fetchGuests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            setGuests(data || []);
        } catch (err) {
            console.error("Error fetching guests:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchGuests();
        }
    }, [isOpen]);

    const handleAction = async (type: 'warning' | 'timeout' | 'kick' | 'ban', guest: Profile) => {
        const bm = getBroadcastManager();
        
        if (type === 'warning') {
            await bm.sendSiteCommand("chat", {
                id: Date.now().toString(),
                user: { name: "SYSTEM", isAdmin: true },
                text: `⚠️ WARNING: @${guest.name}, please follow club rules.`,
                timestamp: Date.now()
            });
        } else if (type === 'timeout') {
            // Send specific command for this user
            await bm.sendSiteCommand("user_action", {
                userId: guest.user_id,
                action: 'timeout',
                duration: 600 // 10 mins
            });
            alert(`TIMED OUT ${guest.name} for 10 minutes.`);
        } else if (type === 'kick') {
            await bm.sendSiteCommand("user_action", {
                userId: guest.user_id,
                action: 'kick'
            });
            alert(`KICKED ${guest.name}.`);
        } else if (type === 'ban') {
            const { error } = await supabase
                .from('profiles')
                .update({ role: 'banned' })
                .eq('user_id', guest.user_id);
            
            if (!error) {
                await bm.sendSiteCommand("user_action", {
                    userId: guest.user_id,
                    action: 'kick'
                });
                alert(`${guest.name} HAS BEEN BANNED.`);
                fetchGuests();
            }
        }
    };


    const handleSendDM = async () => {
        if (!selectedGuest || !dmText.trim()) return;
        
        const bm = getBroadcastManager();
        await bm.sendSiteCommand("user_action", {
            userId: selectedGuest.user_id,
            action: 'dm',
            from: adminProfile.name,
            text: dmText
        });
        
        setDmText("");
        alert(`MESSAGE SENT TO ${selectedGuest.name}`);
    };

    const filteredGuests = guests.filter(g => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        g.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-400"
                    />
                    <motion.div 
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-[420px] bg-[#050505] z-401 border-l border-white/5 shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-linear-to-b from-red-500/10 to-transparent">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-[14px] font-black text-white flex items-center gap-3 uppercase tracking-wider">
                                    <Shield size={16} className="text-red-500" />
                                    Guest Management
                                </h2>
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest ml-7">Security Protocol Active</span>
                            </div>
                            <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-6 pb-0 shrink-0">
                            <div className="relative group">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH GUESTS..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black border border-white/5 rounded-xl pl-12 pr-4 py-3.5 text-[11px] text-white font-mono placeholder:text-zinc-800 focus:outline-none focus:border-red-500/30 focus:bg-white/5 transition-all"
                                />
                            </div>
                        </div>

                        {/* Guest List */}
                        <div className="grow overflow-y-auto px-6 py-8 custom-scrollbar space-y-3">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Scanning Network...</span>
                                </div>
                            ) : filteredGuests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                                    <SearchX size={40} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">No Guests Detected</span>
                                </div>
                            ) : (
                                filteredGuests.map(guest => (
                                    <motion.div 
                                        key={guest.user_id}
                                        layout
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                                            selectedGuest?.user_id === guest.user_id 
                                            ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                                            : 'bg-zinc-900/30 border-white/5 hover:border-white/10'
                                        }`}
                                        onClick={() => setSelectedGuest(selectedGuest?.user_id === guest.user_id ? null : guest)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-black border border-white/5 overflow-hidden shrink-0">
                                                <img src={guest.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${guest.user_id}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="grow min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-white uppercase tracking-wider truncate">{guest.name}</span>
                                                    {guest.role && (
                                                        <span className={`text-[6px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                            guest.role === 'owner' ? 'bg-purple-500/20 text-purple-400' : 
                                                            guest.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                                                            guest.role === 'bouncer' ? 'bg-orange-500/20 text-orange-400' :
                                                            guest.role === 'vip' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-zinc-800 text-zinc-500'
                                                        }`}>
                                                            {guest.role}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[7px] font-mono text-zinc-600 uppercase tracking-tighter truncate">
                                                    ID: {guest.user_id.slice(0,16)}...
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className={`text-zinc-700 transition-transform ${selectedGuest?.user_id === guest.user_id ? 'rotate-90 text-red-500' : ''}`} />
                                        </div>

                                        <AnimatePresence>
                                            {selectedGuest?.user_id === guest.user_id && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden mt-4 pt-4 border-t border-white/5 space-y-4"
                                                >
                                                    {/* Action Buttons */}
                                                    {isAdmin && (
                                                        <div className="grid grid-cols-4 gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleAction('warning', guest); }}
                                                                className="flex flex-col items-center gap-2 p-3 bg-zinc-950 rounded-xl border border-white/5 hover:border-amber-500/40 text-amber-500/60 hover:text-amber-400 transition-all group/btn"
                                                            >
                                                                <AlertTriangle size={14} />
                                                                <span className="text-[6px] font-black uppercase">Warn</span>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleAction('timeout', guest); }}
                                                                className="flex flex-col items-center gap-2 p-3 bg-zinc-950 rounded-xl border border-white/5 hover:border-orange-500/40 text-orange-500/60 hover:text-orange-400 transition-all group/btn"
                                                            >
                                                                <Clock size={14} />
                                                                <span className="text-[6px] font-black uppercase">10m</span>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleAction('kick', guest); }}
                                                                className="flex flex-col items-center gap-2 p-3 bg-zinc-950 rounded-xl border border-white/5 hover:border-red-500/40 text-red-500/60 hover:text-red-400 transition-all group/btn"
                                                            >
                                                                <UserX size={14} />
                                                                <span className="text-[6px] font-black uppercase">Kick</span>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleAction('ban', guest); }}
                                                                className="flex flex-col items-center gap-2 p-3 bg-zinc-950 rounded-xl border border-red-950/40 text-red-800 hover:bg-red-950/20 hover:text-red-600 transition-all group/btn"
                                                            >
                                                                <Shield size={14} />
                                                                <span className="text-[6px] font-black uppercase">Ban</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* DM Input */}
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                                                            <MessageSquare size={10} /> Direct Transmission
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text" 
                                                                placeholder="TYPE PRIVATE MESSAGE..." 
                                                                value={dmText}
                                                                onChange={(e) => setDmText(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="grow bg-black border border-white/5 rounded-lg px-3 py-2 text-[10px] text-zinc-300 font-mono focus:outline-none focus:border-red-500/30"
                                                            />
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleSendDM(); }}
                                                                className="px-4 bg-red-600 hover:bg-red-500 text-white text-[8px] font-black uppercase rounded-lg transition-all"
                                                            >SEND</button>
                                                        </div>
                                                    </div>

                                                    {/* Profile Stats Mini */}
                                                    <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[6px] font-bold text-zinc-600 uppercase">Joined</span>
                                                            <span className="text-[8px] font-mono text-zinc-400">{new Date(guest.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[6px] font-bold text-zinc-600 uppercase">Votes</span>
                                                            <span className="text-[8px] font-mono text-zinc-400">{guest.stats?.votes_cast || 0} PKTS</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer Status */}
                        <div className="p-4 bg-black border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Master Control Feed</span>
                            </div>
                            <span className="text-[7px] font-mono text-zinc-700">GUESTS_LOADED: {guests.length}</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
