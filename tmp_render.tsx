return (
    <div className="fixed inset-0 bg-black text-white/90 font-mono overflow-hidden flex flex-col z-100 selection:bg-purple-500/30">

        {/* 1. BACKGROUND FLOOR RE-RENDER (Silent View) */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none grayscale">
            <FloorView onNavigate={() => { }} onSignOut={() => { }} profile={profile} />
        </div>

        {/* 2. TOP TECHNICAL HUD */}
        <div className="relative z-50 md:h-14 py-2 md:py-0 border-b border-white/5 bg-zinc-950/90 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between px-4 md:px-6 gap-4 md:gap-0 shrink-0 shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 w-full md:w-auto">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h1 className="text-xs font-black tracking-[0.4em] uppercase text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Club Deck v6</h1>
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

        {/* 3. CORE INTERFACE (4-Column Dense Grid) */}
        <div className="relative z-10 grow flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden gap-2 bg-black/60 p-2">

            {/* === COL 1: SYSTEM & INTAKE (w-64) === */}
            <div className="w-full md:w-64 bg-zinc-950/80 border border-white/5 rounded-xl flex flex-col p-3 gap-3 shrink-0">
                <div className="shrink-0">
                    <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em] mb-2 block">System Triggers</span>
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
                                className={`flex items-center justify-between px-3 py-2 transition-all group ${btn.id === radioState ? 'bg-purple-950/20' : 'bg-zinc-950 hover:bg-zinc-900'
                                    } ${!isCurrentDJ ? 'opacity-30 cursor-not-allowed filter grayscale' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-[9px] font-black border border-white/10 w-4 h-4 flex items-center justify-center rounded ${btn.id === radioState ? 'border-purple-500/50 text-purple-400' : 'text-zinc-600'}`}>{btn.icon}</span>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${btn.color || 'text-zinc-400 group-hover:text-white'}`}>{btn.label}</span>
                                </div>
                                {btn.id === radioState && <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse shadow-[0_0_5px_purple]" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grow min-h-0 border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-2 flex flex-col">
                    <span className="text-[8px] font-bold text-yellow-500 uppercase block mb-2 tracking-widest leading-tight">Youser Intake</span>
                    <div className="grow divide-y divide-white/5 overflow-y-auto pr-1 flex flex-col gap-1">
                        {songs.filter(s => s.status === 'review').map(song => (
                            <div key={song.id} className="p-2 bg-black/40 rounded border border-white/5 flex flex-col gap-1.5 transition-all hover:bg-black/60">
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
                            <div className="h-full flex flex-col items-center justify-center opacity-30 mt-2">
                                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest text-center leading-tight">No tracks pending</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* === COL 2: DEEP LIBRARY (grow) === */}
            <div className="grow min-w-[300px] bg-zinc-950/80 border border-white/5 rounded-xl flex flex-col shrink-0 md:shrink overflow-hidden">
                <div className="p-3 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-black/40 gap-2 shrink-0">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em]">Node Archive</span>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Scan Nodes..."
                            className="bg-white/5 border border-white/5 rounded-lg py-1 px-3 text-[9px] text-zinc-400 placeholder-zinc-800 focus:outline-none focus:border-purple-500/20 w-full sm:w-48"
                        />
                        <select
                            value={filterGenre}
                            onChange={e => setFilterGenre(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-lg py-1 px-2 text-[9px] text-zinc-400 focus:outline-none focus:border-purple-500/20 w-24 sm:w-auto shrink-0"
                        >
                            <option value="All">All Genres</option>
                            <option value="House">House</option>
                            <option value="Techno">Techno</option>
                            <option value="Trance">Trance</option>
                            <option value="Drum & Bass">Drum & Bass</option>
                            <option value="Synthwave">Synthwave</option>
                            <option value="Cyberpunk">Cyberpunk</option>
                            <option value="Hip Hop">Hip Hop</option>
                            <option value="Pop">Pop</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="grow overflow-y-auto px-4 py-2 divide-y divide-white/[0.02] min-h-0">
                    {filteredSongs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                            <div className="w-10 h-10 border-2 border-dashed border-white/20 rounded-full animate-spin mb-3" />
                            <span className="text-[9px] uppercase font-black tracking-widest text-white">Scanning for nodes...</span>
                        </div>
                    ) : (
                        filteredSongs.map(song => (
                            <div key={song.id} className="py-2.5 flex flex-col xl:flex-row items-start xl:items-center justify-between group hover:bg-white/[0.02] -mx-4 px-4 transition-all gap-2">
                                <div className="w-full xl:w-auto min-w-0 grow flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex-shrink-0 overflow-hidden relative">
                                        {song.is_canvas && song.cover_art_url ? (
                                            <video src={song.cover_art_url} muted loop playsInline autoPlay className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all pointer-events-none" />
                                        ) : (
                                            <img src={song.cover_art_url || `https://picsum.photos/seed/${song.id}/100`} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="" />
                                        )}
                                    </div>
                                    <div className="grow min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-[10px] font-black text-white/50 group-hover:text-white truncate uppercase transition-colors">{song.title}</h4>
                                            {(song.status === 'in_box' || song.status === 'pool') && (song.upvotes > 0 || song.status === 'in_box') && (
                                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 flex items-center gap-1 ${song.status === 'in_box' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                                    🗳️ {song.upvotes || 0} Votes
                                                </span>
                                            )}
                                            {song.status === 'now_playing' && (
                                                <span className="text-[7px] font-black bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">📡 Active</span>
                                            )}
                                        </div>
                                        <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-tight group-hover:text-purple-400/50 transition-colors truncate block">{song.artist_name}</span>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[8px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">★ {song.stars}/10</span>
                                            {song.genre && (
                                                <span className="text-[7px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase">
                                                    {song.genre}
                                                </span>
                                            )}
                                            {song.is_dsw && (
                                                <span className="text-[7px] font-black bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-red-500/30 animate-pulse">
                                                    DEAD SONG WALKING
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 flex-shrink-0 w-full xl:w-auto pl-11 xl:pl-0">
                                    <button
                                        onClick={() => toggleFavorite(song.id)}
                                        className={`text-[12px] p-1 transition-all transform hover:scale-110 ${userFavorites.includes(song.id) ? 'text-red-500 hover:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-zinc-600 hover:text-red-500/50'}`}
                                        title={userFavorites.includes(song.id) ? "Remove from Favorites" : "Add to Favorites"}
                                    >
                                        {userFavorites.includes(song.id) ? '❤️' : '🤍'}
                                    </button>
                                    {(isAdmin || song.uploader_id === profile.user_id) && (
                                        <button
                                            onClick={() => setEditingSong(PersistentRadioService.mapDbToApp(song))}
                                            className="text-[7px] font-black border border-white/5 px-2 py-1 rounded text-zinc-600 hover:text-white hover:bg-white/5 transition-all uppercase text-center"
                                        >
                                            EDIT
                                        </button>
                                    )}
                                    <button
                                        onClick={() => context.downloadSong(PersistentRadioService.mapDbToApp(song))}
                                        className="text-[7px] font-black border border-white/5 px-2 py-1 rounded text-zinc-600 hover:text-white hover:bg-white/5 transition-all uppercase text-center"
                                    >
                                        DL
                                    </button>
                                    {canControl && (
                                        <>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(song.id)}
                                                    className="text-[7px] font-black border border-red-500/20 px-3 py-1.5 sm:px-2 sm:py-1 rounded text-red-500 hover:text-white hover:bg-red-600 transition-all uppercase grow sm:flex-none text-center"
                                                >
                                                    DEL
                                                </button>
                                            )}
                                            <button
                                                onClick={() => pushToNow(song)}
                                                className="text-[7px] font-black border border-purple-500/20 px-2 py-1 rounded text-purple-400 hover:text-white hover:bg-purple-600 transition-all uppercase text-center"
                                            >
                                                {song.status === 'now_playing' ? 'Restart' : 'Play'}
                                            </button>
                                            <button
                                                onClick={() => pushToBox(song.id, song.status === 'in_box' ? 'pool' : 'in_box')}
                                                className={`text-[7px] font-black border px-2 py-1 rounded uppercase transition-all text-center ${song.status === 'in_box' ? 'border-purple-500/50 text-purple-400 bg-purple-500/10' : 'border-white/10 text-zinc-500 hover:text-white hover:border-white/30'}`}
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

            {/* === COL 3: THE BOX & LIVE (w-80) === */}
            <div className="w-full md:w-80 flex flex-col gap-2 shrink-0">
                <div className="bg-purple-950/20 border border-white/5 rounded-xl p-4 flex flex-col relative overflow-hidden group shrink-0">
                    <div className="absolute top-0 right-0 p-2 opacity-20 hidden md:block">
                        <div className="flex gap-1">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="w-1 h-3 bg-purple-500 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-purple-500/20 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                            {context.nowPlaying?.audioUrl ? (
                                <img src={`https://picsum.photos/seed/${context.nowPlaying.id}/100`} className="w-full h-full object-cover animate-pulse" alt="" />
                            ) : (
                                <div className="text-zinc-800 text-lg font-black">?</div>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[7px] font-black text-purple-500 uppercase tracking-[0.3em] mb-0.5">On Air Monitor</span>
                            <h2 className="text-sm font-black text-white truncate uppercase tracking-tight">
                                {context.nowPlaying?.title || "Station Idle"}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest truncate">{context.nowPlaying?.artistName || "No Payload"}</span>
                                {context.nowPlaying && <div className="w-1 h-1 rounded-full bg-green-500 animate-ping shrink-0" />}
                            </div>
                        </div>
                    </div>
                    {context.nowPlaying && (
                        <div className="flex flex-col gap-2 z-10 relative">
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-500 transition-all duration-1000"
                                    style={{ width: `${(context.currentTime / (context.nowPlaying.durationSec || 1)) * 100}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-[7px] font-black uppercase text-zinc-500 block">Live Rating:</span>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => handleStarVote(star)}
                                            disabled={voteCooldowns[context.nowPlaying!.id]}
                                            className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[6px] font-black border transition-all ${voteCooldowns[context.nowPlaying!.id] ? 'border-zinc-800 text-zinc-700 bg-zinc-900 cursor-not-allowed' : 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-black hover:scale-110'}`}
                                        >
                                            {star}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-3 flex flex-col grow min-h-0">
                    <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">The Box</span>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <span className="text-[7px] font-black text-zinc-700 uppercase">Pool:</span>
                                <span className="text-[8px] font-black text-zinc-500">{songs.filter(s => s.status === 'pool').length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[7px] font-black text-zinc-700 uppercase">In Box:</span>
                                <span className="text-[8px] font-black text-purple-400">{songs.filter(s => s.status === 'in_box').length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grow overflow-y-auto flex flex-col gap-2 pr-1">
                        {songs.filter(s => s.status === 'in_box').sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).map((song, i) => {
                            const totalVotes = songs.filter(s => s.status === 'in_box').reduce((acc, curr) => acc + (curr.upvotes || 0), 0) || 1;
                            const percentage = Math.round(((song.upvotes || 0) / totalVotes) * 100);

                            return (
                                <div key={song.id} className={`p-2 rounded-lg border ${i === 0 ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5 bg-white/5'} transition-all`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <span className="text-[8px] font-black text-white truncate uppercase">{song.title}</span>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0">
                                            <div className="flex items-center gap-1">
                                                <span className={`text-[9px] font-black ${i === 0 ? 'text-purple-400' : 'text-zinc-500'}`}>{song.upvotes || 0}</span>
                                                <span className="text-[6px] font-bold text-zinc-700 uppercase mt-0.5">Votes</span>
                                            </div>
                                            {i === 0 && <span className="text-[5px] font-black text-purple-600 uppercase tracking-tighter">Winning</span>}
                                        </div>
                                    </div>
                                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${i === 0 ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-zinc-600'} transition-all duration-1000`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {songs.filter(s => s.status === 'in_box').length === 0 && (
                            <div className="h-full py-4 flex flex-center justify-center border border-dashed border-white/5 rounded-lg opacity-30 mt-2">
                                <span className="text-[7px] font-black uppercase text-zinc-500 tracking-widest text-center px-4">Box empty</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* === COL 4: PAYLOAD & FX (w-72) === */}
            <div className="w-full md:w-72 bg-zinc-950/80 border border-white/5 rounded-xl flex flex-col p-3 gap-3 shrink-0 overflow-y-auto">

                {/* Narrator Pad */}
                <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex flex-col shrink-0">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Narrator Payload</span>
                        <span className="text-[6px] font-black text-purple-400 uppercase">Fenrir.v4</span>
                    </div>
                    <textarea
                        value={ttsInput}
                        onChange={e => setTtsInput(e.target.value)}
                        placeholder="Type protocol command..."
                        className="w-full h-16 bg-black/60 border border-white/5 rounded p-2 text-[9px] text-white/80 placeholder-zinc-800 focus:outline-none focus:border-purple-500/20 transition-all font-mono resize-none mb-2"
                    />
                    <button
                        onClick={handleTtsSend}
                        disabled={isSending || !ttsInput.trim()}
                        className="w-full py-2 bg-white text-black text-[8px] font-black uppercase tracking-widest hover:invert transition-all rounded"
                    >
                        {isSending ? 'Sending...' : 'Transmit Payload'}
                    </button>
                </div>

                {/* Pulse FX Pad */}
                <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 shrink-0">
                    <span className="text-[7px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-2 block">Pulse Monitor</span>
                    <div className="relative border border-white/5 rounded bg-zinc-950/20 overflow-hidden mb-2 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-[0.03] pointer-events-none">
                            {Array.from({ length: 36 }).map((_, i) => <div key={i} className="border border-white" />)}
                        </div>
                        <div className="z-10 grid grid-cols-5 gap-1 w-full px-1">
                            {["Confetti", "Glitch", "Shake", "Pulse", "Static", "Invert", "Hue", "Blur", "Pixel", "Neon"].map(fx => (
                                <button
                                    key={fx}
                                    onClick={() => sendSiteCommand("trigger_fx", { fx })}
                                    disabled={!canControl}
                                    className={`px-0.5 py-1 bg-transparent border rounded-sm text-[5px] font-black uppercase transition-all ${canControl
                                        ? 'border-white/5 hover:border-purple-500/50 hover:bg-white/5 hover:text-white'
                                        : 'border-white/5 opacity-30 cursor-not-allowed text-zinc-600'
                                        }`}
                                >
                                    {fx.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Suno Deployment */}
                <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 shrink-0 grow">
                    <span className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5 tracking-widest">Suno Deployment</span>
                    <label className="flex items-center gap-1.5 cursor-pointer mb-2 opacity-60 hover:opacity-100 transition-opacity">
                        <input type="checkbox" checked={isSunoConfirmed} onChange={e => setIsSunoConfirmed(e.target.checked)} className="w-2.5 h-2.5 bg-black rounded border-white/10 text-purple-600 focus:ring-0" />
                        <span className="text-[7px] font-black uppercase tracking-tighter">Monetization Sync</span>
                    </label>

                    <div className={`mb-2 transition-opacity ${isSunoConfirmed ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-purple-400 transition-colors">Attach Canvas (IMG/MP4)</span>
                            <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center text-[9px] text-zinc-500 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">+</div>
                            <input type="file" accept="image/*,video/mp4" onChange={e => setVisualFile(e.target.files?.[0] || null)} className="hidden" disabled={!isSunoConfirmed} />
                        </label>
                        {visualFile && (
                            <div className="mt-1 text-[7px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 truncate">
                                {visualFile.name}
                            </div>
                        )}
                    </div>

                    <div className={`mb-2 transition-opacity ${isSunoConfirmed ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        <label className="flex flex-col gap-1">
                            <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400">Genre</span>
                            <select
                                value={uploadGenre}
                                onChange={e => setUploadGenre(e.target.value)}
                                disabled={!isSunoConfirmed}
                                className="bg-black/60 border border-white/5 rounded px-1.5 py-1 text-[7px] text-purple-400 uppercase tracking-widest focus:outline-none focus:border-purple-500/50"
                            >
                                <option value="House">House</option>
                                <option value="Techno">Techno</option>
                                <option value="Trance">Trance</option>
                                <option value="Drum & Bass">Drum & Bass</option>
                                <option value="Synthwave">Synthwave</option>
                                <option value="Cyberpunk">Cyberpunk</option>
                                <option value="Hip Hop">Hip Hop</option>
                                <option value="Pop">Pop</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>
                    </div>

                    <label className={`block mt-auto py-2 text-center border-2 border-dashed rounded transition-all ${isSunoConfirmed ? 'border-purple-500/40 cursor-pointer hover:bg-purple-500/10 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]' : 'border-white/5 opacity-50 select-none'}`}>
                        <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" disabled={!isSunoConfirmed || isUploading} />
                        <span className="text-[7px] font-black uppercase tracking-widest">{isUploading ? `Syncing ${uploadProgress}%` : 'Deploy Audio'}</span>
                    </label>
                </div>

                {/* ORPHAN RECOVERY UI - ADMIN ONLY */}
                {isAdmin && orphans.length > 0 && (
                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg animate-pulse shrink-0">
                        <span className="text-[7px] font-black text-purple-400 uppercase block mb-1 tracking-[0.2em]">🚨 Dead Nodes</span>
                        <button
                            onClick={recoverSongs}
                            disabled={isUploading}
                            className="w-full py-1.5 bg-purple-600 text-white text-[7px] font-black uppercase tracking-widest rounded hover:bg-purple-500 transition-all"
                        >
                            {isUploading ? 'Resurrecting...' : 'Resurrect All'}
                        </button>
                    </div>
                )}
            </div>

        </div>

        {/* 4. DENSE GRID OVERLAY SIDES */}
        <div className="absolute inset-0 z-40 border-[20px] border-white/0 pointer-events-none border-l-white/[0.01] border-r-white/[0.01]" />

        {/* 5. MODALS */}
        {editingSong && (
            <EditSongModal
                song={editingSong}
                onClose={() => setEditingSong(null)}
                onSave={handleEditSave}
            />
        )}
    </div>
);
