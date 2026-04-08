import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Profile, Song } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Edit2, Check, Globe, 
    Music, Heart, BarChart3, Shield,
    HardDrive, Zap, 
    AtSign // Fallback for Twitter
} from 'lucide-react';

interface UserProfileCardProps {
    userId: string;
    onClose: () => void;
    isCurrentUser: boolean;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ userId, onClose, isCurrentUser }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [uploads, setUploads] = useState<Song[]>([]);
    const [favorites, setFavorites] = useState<Song[]>([]);
    const [activeTab, setActiveTab] = useState<'uploads' | 'favorites' | 'stats'>('uploads');
    const [isLoading, setIsLoading] = useState(true);
    
    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        tagline: '',
        bio: '',
        website_url: '',
        twitter_handle: ''
    });

    const fetchUserData = async () => {
        setIsLoading(true);
        // 1. Fetch Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (profileData) {
            setProfile(profileData);
            setEditForm({
                name: profileData.name || '',
                tagline: profileData.tagline || '',
                bio: profileData.bio || '',
                website_url: profileData.website_url || '',
                twitter_handle: profileData.twitter_handle || ''
            });
        }

        // 2. Fetch Uploads
        const { data: uploadData } = await supabase
            .from('songs')
            .select('*')
            .eq('uploader_id', userId)
            .order('created_at', { ascending: false });

        if (uploadData) setUploads(uploadData as Song[]);

        // 3. Fetch Favorites
        const { data: favData } = await supabase
            .from('user_favorites')
            .select(`
                song_id,
                songs (*)
            `)
            .eq('user_id', userId);

        if (favData) {
            const favSongs = favData.map((f: any) => f.songs).filter(Boolean);
            setFavorites(favSongs as Song[]);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        fetchUserData();
    }, [userId]);

    const handleSaveProfile = async () => {
        if (!profile) return;
        
        const { error } = await supabase
            .from('profiles')
            .update({
                name: editForm.name,
                tagline: editForm.tagline,
                bio: editForm.bio,
                website_url: editForm.website_url,
                twitter_handle: editForm.twitter_handle,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating profile:', error);
            return;
        }

        setProfile({
            ...profile,
            ...editForm
        });
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black backdrop-blur-3xl">
                <div className="relative w-24 h-24">
                   <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
                   <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
                </div>
                <span className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Synchronizing Identity</span>
            </div>
        );
    }

    if (!profile) return null;

    const totalVotes = uploads.reduce((sum, song) => sum + (song.upvotes || 0), 0);
    const averageRating = uploads.length > 0 ? (uploads.reduce((sum, song) => sum + (song.stars || 0), 0) / uploads.length).toFixed(1) : '0.0';

    return (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#050505] overflow-y-auto custom-scrollbar">
            {/* Animated Background Mesh */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-linear-to-br from-purple-600/20 to-transparent blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-linear-to-br from-blue-600/20 to-transparent blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Header / Layout Wrapper */}
            <div className="relative z-10 flex flex-col min-h-full max-w-6xl mx-auto w-full pb-20">
                
                {/* 1. PREMIUM COVER AREA */}
                <div className="relative h-48 md:h-64 overflow-hidden rounded-b-[40px] border-b border-white/10 group">
                    <div className="absolute inset-0 bg-linear-to-br from-purple-900 via-zinc-950 to-blue-900 opacity-60" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30 group-hover:scale-105 transition-transform duration-[20s] linear" />
                    
                    {/* Floating Particles/Atmosphere */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-500 rounded-full blur-sm animate-pulse" />
                        <div className="absolute top-3/4 left-1/2 w-1 h-1 bg-blue-400 rounded-full blur-[1px] animate-ping" />
                        <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-purple-400/20 rounded-full blur-md" />
                    </div>

                    {/* TOP BAR OVERLAY */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
                        <div className="flex items-center gap-2">
                             <div className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white/60">
                                 Node ID: {userId.slice(0, 8)}
                             </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white/40 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/20 transition-all active:scale-95 group/close"
                        >
                            <X size={18} className="group-hover/close:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                <div className="px-6 md:px-12 -mt-20 relative z-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        
                        {/* LEFT: Avatar & Main Bio */}
                        <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
                            <div className="relative group">
                                <div className="w-48 h-48 rounded-[40px] overflow-hidden border-4 border-[#050505] shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-zinc-900 relative">
                                    <img
                                        src={profile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userId}`}
                                        alt={profile.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                        <Edit2 size={24} className="text-white drop-shadow-lg" />
                                    </div>
                                </div>
                                {/* Live Badge */}
                                <div className="absolute -top-2 -left-2 px-3 py-1 bg-green-500 rounded-full flex items-center gap-1.5 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    <span className="text-[8px] font-black text-white uppercase tracking-tighter">Live Node</span>
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-zinc-950 border-2 border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                                    <Shield size={24} className={profile.is_admin ? "text-red-500" : "text-purple-500"} />
                                </div>
                            </div>

                            <div className="space-y-4 w-full">
                                <div>
                                    {isEditing ? (
                                        <input 
                                            value={editForm.name}
                                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                                            className="w-full bg-white/5 border border-purple-500/50 rounded-xl px-4 py-2 text-2xl font-black uppercase text-white focus:outline-none"
                                        />
                                    ) : (
                                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{profile.name}</h1>
                                    )}
                                    
                                    {isEditing ? (
                                        <input 
                                            placeholder="Add a tagline..."
                                            value={editForm.tagline}
                                            onChange={e => setEditForm({...editForm, tagline: e.target.value})}
                                            className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-purple-400 focus:outline-none"
                                        />
                                    ) : (
                                        <p className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] mt-2">
                                            {profile.tagline || "Frequency Tuner"}
                                        </p>
                                    )}
                                </div>

                                {isEditing ? (
                                    <textarea 
                                        placeholder="Write your transmission history..."
                                        value={editForm.bio}
                                        onChange={e => setEditForm({...editForm, bio: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-zinc-400 h-32 focus:outline-none focus:border-purple-500/50 resize-none"
                                    />
                                ) : (
                                    <p className="text-sm font-medium text-zinc-400 leading-relaxed max-w-sm">
                                        {profile.bio || "No bio set. Probably making beats in the basement."}
                                    </p>
                                )}

                                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                                    {isEditing ? (
                                        <div className="w-full space-y-2">
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                                                <Globe size={14} className="text-zinc-500" />
                                                <input 
                                                    placeholder="Website URL"
                                                    value={editForm.website_url}
                                                    onChange={e => setEditForm({...editForm, website_url: e.target.value})}
                                                    className="bg-transparent border-none text-[11px] text-white focus:outline-none grow"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                                                <AtSign size={14} className="text-zinc-500" />
                                                <input 
                                                    placeholder="@twitter"
                                                    value={editForm.twitter_handle}
                                                    onChange={e => setEditForm({...editForm, twitter_handle: e.target.value})}
                                                    className="bg-transparent border-none text-[11px] text-white focus:outline-none grow"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {profile.website_url && (
                                                <a href={profile.website_url} target="_blank" rel="noreferrer" className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                                    <Globe size={16} className="text-zinc-400" />
                                                </a>
                                            )}
                                            {profile.twitter_handle && (
                                                <a href={`https://twitter.com/${profile.twitter_handle.replace('@', '')}`} target="_blank" rel="noreferrer" className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                                    <AtSign size={16} className="text-blue-400" />
                                                </a>
                                            )}
                                        </>
                                    )}
                                </div>

                                {isCurrentUser && (
                                    <div className="pt-4">
                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleSaveProfile}
                                                    className="grow py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-900/20"
                                                >
                                                    <Check size={14} /> Commit Changes
                                                </button>
                                                <button 
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Abort
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                            >
                                                <Edit2 size={14} /> Update Identity
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Stats & Content Tabs */}
                        <div className="lg:col-span-8 space-y-8 min-h-0 flex flex-col">
                            
                            {/* STATS STRIP */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Transmissions', val: uploads.length, icon: Music, color: 'text-white' },
                                    { label: 'Reputation', val: totalVotes, icon: Zap, color: 'text-yellow-400' },
                                    { label: 'Favorites', val: favorites.length, icon: Heart, color: 'text-red-400' },
                                    { label: 'Station Rating', val: averageRating, icon: BarChart3, color: 'text-purple-400' },
                                ].map((s, i) => (
                                    <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-1 group hover:bg-white/10 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <s.icon size={12} className="text-white/20" />
                                            <div className="w-1 h-1 rounded-full bg-white/10 group-hover:bg-purple-500 transition-colors" />
                                        </div>
                                        <span className={`text-2xl font-black ${s.color}`}>{s.val}</span>
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{s.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* TABS Navigation */}
                            <div className="flex border-b border-white/5 gap-8">
                                {[
                                    { id: 'uploads', label: 'Nodes', icon: HardDrive },
                                    { id: 'favorites', label: 'Signals', icon: Heart },
                                    { id: 'stats', label: 'Analytics', icon: BarChart3 },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t.id as any)}
                                        className={`py-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                                            activeTab === t.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        <t.icon size={12} />
                                        <span>{t.label}</span>
                                        {activeTab === t.id && (
                                            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 rounded-t-full" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* TAB CONTENT */}
                            <div className="grow pr-2 pb-12">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'uploads' && (
                                        <motion.div 
                                            key="uploads"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                        >
                                            {uploads.length === 0 ? (
                                                 <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
                                                    <Music size={40} className="mb-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">No spectral data detected</span>
                                                 </div>
                                            ) : (
                                                uploads.map(song => (
                                                    <div key={song.id} className="group bg-[#080808] border border-white/5 rounded-2xl p-4 flex gap-4 items-center hover:bg-zinc-900 transition-all cursor-pointer relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-linear-to-r from-purple-500/0 to-purple-500/5 transition-all" />
                                                        <img src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`} alt="" className="w-20 h-20 rounded-xl object-cover bg-zinc-950 z-10 shadow-lg shadow-black" />
                                                        <div className="grow min-w-0 z-10 flex flex-col gap-1">
                                                            <h3 className="text-xs font-black text-white truncate uppercase tracking-tight">{song.title}</h3>
                                                            <p className="text-[9px] font-bold text-zinc-500 uppercase truncate mb-2">{song.artistName}</p>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                                                                    <span className="text-[9px] font-black text-yellow-500">⭐ {song.stars || 0}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                                                                    <span className="text-[9px] font-black text-purple-400">PLAYS {song.playCount || 0}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'favorites' && (
                                        <motion.div 
                                            key="favorites"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                        >
                                            {favorites.length === 0 ? (
                                                 <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
                                                    <Heart size={40} className="mb-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Signal source unknown</span>
                                                 </div>
                                            ) : (
                                                favorites.map(song => (
                                                    <div key={song.id} className="group bg-[#080808] border border-red-500/5 rounded-2xl p-4 flex gap-4 items-center hover:bg-zinc-900 transition-all cursor-pointer relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-linear-to-r from-red-500/0 to-red-500/5 transition-all" />
                                                        <img src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`} alt="" className="w-20 h-20 rounded-xl object-cover bg-zinc-950 z-10 shadow-lg shadow-black" />
                                                        <div className="grow min-w-0 z-10 flex flex-col gap-1">
                                                            <h3 className="text-xs font-black text-white truncate uppercase tracking-tight">{song.title}</h3>
                                                            <p className="text-[9px] font-bold text-zinc-500 uppercase truncate mb-2">{song.artistName}</p>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
                                                                    <Heart size={10} fill="currentColor" />
                                                                    <span className="text-[9px] font-black uppercase">Stored</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'stats' && (
                                        <motion.div 
                                            key="stats"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-6"
                                        >
                                            <div className="bg-white/5 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                                                    <Shield size={32} className="text-purple-400" />
                                                </div>
                                                <h3 className="text-xl font-black text-white uppercase mb-2">Social Hub COMING SOON</h3>
                                                <p className="text-sm text-zinc-500 max-w-sm mb-8">Detailed listener analytics, achievement badges, and global rank tracking are currently calibrating.</p>
                                                <div className="flex gap-2">
                                                    {[1,2,3,4,5].map(i => (
                                                        <div key={i} className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5" />
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
