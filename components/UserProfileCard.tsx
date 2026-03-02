import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Profile, Song } from '../types';

interface UserProfileCardProps {
    userId: string;
    onClose: () => void;
    isCurrentUser: boolean;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ userId, onClose }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [uploads, setUploads] = useState<Song[]>([]);
    const [favorites, setFavorites] = useState<Song[]>([]);
    const [activeTab, setActiveTab] = useState<'uploads' | 'favorites'>('uploads');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            setIsLoading(true);

            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (profileData) setProfile(profileData);

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

        fetchUserData();
    }, [userId]);

    if (isLoading) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-16 h-16 border-4 border-dashed border-purple-500/50 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profile) return null;

    const totalVotes = uploads.reduce((sum, song) => sum + (song.upvotes || 0), 0);

    return (
        <div className="absolute inset-0 z-50 flex flex-col bg-zinc-950 pb-20 md:pb-0">
            <div className="flex-none p-4 md:p-8 bg-gradient-to-b from-purple-900/20 to-zinc-950 border-b border-white/5 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white"
                >
                    ✕
                </button>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 max-w-4xl mx-auto pt-8 md:pt-0">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] shrink-0 bg-zinc-900">
                        <img
                            src={profile.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userId}`}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex flex-col items-center md:items-start flex-grow text-center md:text-left">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{profile.name}</h1>
                            {profile.is_admin && (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded border border-red-500/30 tracking-widest">
                                    Admin
                                </span>
                            )}
                        </div>

                        <p className="text-sm font-bold text-zinc-400 max-w-md mb-6">{"No bio set. Probably making beats in the basement."}</p>

                        <div className="flex gap-4 md:gap-8">
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-black text-white">{uploads.length}</span>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Uploads</span>
                            </div>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-black text-purple-400">{totalVotes}</span>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Votes Received</span>
                            </div>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-black text-red-400">{favorites.length}</span>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Favorites</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-none border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex gap-6 px-4">
                    <button
                        onClick={() => setActiveTab('uploads')}
                        className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'uploads' ? 'border-purple-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Uploads ({uploads.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'favorites' ? 'border-red-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Favorites ({favorites.length})
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'uploads' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {uploads.length === 0 ? (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No tracks uploaded yet.</span>
                                </div>
                            ) : (
                                uploads.map(song => (
                                    <div key={song.id} className="bg-zinc-900 border border-white/5 rounded-xl p-3 flex gap-4 items-center group hover:bg-zinc-800 transition-colors">
                                        <img src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`} alt="" className="w-16 h-16 rounded-lg object-cover bg-zinc-950" />
                                        <div className="flex-grow min-w-0">
                                            <h3 className="text-sm font-black text-white truncate uppercase">{song.title}</h3>
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase truncate mt-0.5">{song.artistName}</p>
                                            <div className="flex gap-2 mt-2">
                                                {song.genre && <span className="text-[8px] font-black px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">{song.genre}</span>}
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded border border-white/10">👍 {song.upvotes || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'favorites' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {favorites.length === 0 ? (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No favorites yet.</span>
                                </div>
                            ) : (
                                favorites.map(song => (
                                    <div key={song.id} className="bg-zinc-900 border border-red-500/10 rounded-xl p-3 flex gap-4 items-center group hover:bg-zinc-800 transition-colors">
                                        <img src={song.coverArtUrl || `https://picsum.photos/seed/${song.id}/100`} alt="" className="w-16 h-16 rounded-lg object-cover bg-zinc-950" />
                                        <div className="flex-grow min-w-0">
                                            <h3 className="text-sm font-black text-white truncate uppercase">{song.title}</h3>
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase truncate mt-0.5">{song.artistName}</p>
                                            <div className="flex gap-2 mt-2">
                                                {song.genre && <span className="text-[8px] font-black px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">{song.genre}</span>}
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded border border-white/10">👍 {song.upvotes || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
