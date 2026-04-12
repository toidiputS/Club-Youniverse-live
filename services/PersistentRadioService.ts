/**
 * @file PersistentRadioService - Handles the Core Radio Cycle: Pool -> Box -> Play
 */

import { supabase } from "./supabaseClient";
import type { Song, ChatMessage } from "../types";
import { LocalAiService } from "./LocalAiService";
import { LyricService } from "./LyricService";

export class PersistentRadioService {
    private static lastCheck: number = 0;

    /**
     * Watchdog: Ensures the radio is healthy.
     */
    static async checkRadioHealth(nowPlaying: Song | null): Promise<Song | null> {
        const now = Date.now();
        if (now - this.lastCheck < 10000) return null; // Throttle to 10s
        this.lastCheck = now;
        // 1. Ensure Box is populated
        await this.populateTheBox();

        // 2. Fetch the broadcast source of truth
        const { data: broadcast } = await supabase
            .from("broadcasts")
            .select("song_started_at")
            .eq("id", "00000000-0000-0000-0000-000000000000")
            .single();

        // 3. If nothing is playing in DB, kickstart
        if (!broadcast?.song_started_at) {
            console.log("🛠️ Watchdog: No song playing in DB. Attempting kickstart...");
            return await this.cycleNextToNow();
        }

        // 4. "ZOMBIE PREVENTION": If current song should be finished by now, force transition
        if (nowPlaying && nowPlaying.durationSec) {
            const startedAt = new Date(broadcast.song_started_at).getTime();
            const now = Date.now();
            const elapsed = (now - startedAt) / 1000;

            // Legacy uploads were all hardcoded to 180s. Give them a 3 min margin to avoid cutting them off early.
            // Otherwise, standard 45s margin for clock drift or buffering pauses.
            const margin = nowPlaying.durationSec === 180 ? 180 : 45;

            if (elapsed > nowPlaying.durationSec + margin) {
                console.log(`🧟 Watchdog: Zombie detected! (${elapsed.toFixed(1)}s elapsed for ${nowPlaying.durationSec}s song). Force transitioning...`);
                return await this.handleSongEnded(nowPlaying);
            }
        }

        return null;
    }

    /**
     * Called by the Leader when a song ends.
     * 1. Returns current song to pool.
     * 2. Picks the winner from the box.
     * 3. Moves winner to 'now_playing'.
     * 4. Penalizes losers.
     * 5. Populates a new box.
     */
    static async handleSongEnded(currentSong: Song | null): Promise<Song | null> {
        console.log("🎬 PersistentRadioService: Handling end of song...");

        // 1. Return current song to pool (if it exists)
        if (currentSong) {
            console.log(`📡 Returning ${currentSong.title} to pool.`);
            await supabase
                .from("songs")
                .update({
                    status: "pool",
                    last_played_at: new Date().toISOString(),
                    play_count: (currentSong.playCount || 0) + 1
                })
                .eq("id", currentSong.id);
        }

        // 2. Identify the winner from 'in_box'
        const { data: boxSongs } = await supabase
            .from("songs")
            .select("*")
            .eq("status", "in_box")
            .order("upvotes", { ascending: false });

        if (boxSongs && boxSongs.length > 0) {
            const winner = boxSongs[0];
            const losers = boxSongs.slice(1);

            console.log(`🏆 Winner: ${winner.title} (${winner.upvotes} votes)`);

            // 3. Announce via DJ Banter (Ticker only)
            if ((winner.upvotes || 0) > 0) {
                try {
                    const banter = await LocalAiService.generateDjBanter(
                        `A new song has won the vote: "${winner.title}" by ${winner.artist_name}. Welcome it to the airwaves!`
                    );
                    // We need a BroadcastManager reference. Since this is static, we'll use a site command via the broadcast channel directly.
                    await supabase.channel('site_commands').send({
                        type: 'broadcast',
                        event: 'siteCommandReceived',
                        payload: {
                            type: 'dj_banter',
                            timestamp: Date.now(),
                            payload: { text: banter }
                        }
                    });
                } catch (e) { console.warn("Winner announcement failed", e); }
            }

            // Process Winner
            let winnerStars = (winner.stars || 0) + 1;
            await supabase
                .from("songs")
                .update({
                    stars: winnerStars,
                    status: "next_play",
                    upvotes: 0
                })
                .eq("id", winner.id);

            // Process Losers
            for (const loser of losers) {
                if ((loser.upvotes || 0) > 0) {
                    let loserStars = Math.max(0, (loser.stars || 0) - 1);
                    await supabase
                        .from("songs")
                        .update({ status: "pool", stars: loserStars, upvotes: 0 })
                        .eq("id", loser.id);
                } else {
                    await supabase
                        .from("songs")
                        .update({ status: "pool", upvotes: 0 })
                        .eq("id", loser.id);
                }
            }
        }

        await this.populateTheBox();
        return await this.cycleNextToNow();
    }

    /**
     * Clears current in_box songs and populates fresh ones.
     */
    static async forceRefreshBox() {
        console.log("♻️ PersistentRadioService: Force refreshing box...");
        // 1. Return current box songs to pool
        await supabase
            .from("songs")
            .update({ status: "pool", upvotes: 0 })
            .eq("status", "in_box");

        // 2. Populate fresh
        await this.populateTheBox();
    }

    /**
     * Resets the entire station to a clean pool state.
     */
    static async hardReset() {
        console.log("☢️ PersistentRadioService: HARD RESET triggered.");
        // 1. Move everything to pool
        await supabase
            .from("songs")
            .update({ status: "pool", upvotes: 0 })
            .in("status", ["now_playing", "next_play", "in_box", "review"]);

        // 2. Clear broadcast metadata
        await supabase
            .from("broadcasts")
            .update({
                current_song_id: null,
                next_song_id: null,
                radio_state: "POOL",
                song_started_at: null
            })
            .eq("id", "00000000-0000-0000-0000-000000000000");

        // 3. Populate fresh box to start cycle
        await this.populateTheBox();
    }

    /**
     * Ensures the 'in_box' status has exactly 2 songs.
     */
    static async populateTheBox() {
        const { count } = await supabase
            .from("songs")
            .select("*", { count: 'exact', head: true })
            .eq("status", "in_box");

        const needed = 2 - (count || 0);
        if (needed <= 0) return;

        console.log(`🛠️ Populating The Box: Picking ${needed} songs...`);

        // 1. Try to pick from 'pool' or 'review' first (Priority)
        let { data: candidates } = await supabase
            .from("songs")
            .select("*")
            .in("status", ["pool", "review"])
            .order('last_played_at', { ascending: true })
            .limit(needed);

        // 2. AGGRESSIVE FALLBACK: If we still need more, grab ANY song that isn't currently active
        const currentCount = candidates?.length || 0;
        if (currentCount < needed) {
            const stillNeeded = needed - currentCount;
            const { data: fallbackSongs } = await supabase
                .from("songs")
                .select("*")
                .not("status", "in", `("now_playing","next_play","in_box")`)
                .order('last_played_at', { ascending: true })
                .limit(stillNeeded);


            if (fallbackSongs) {

                candidates = [...(candidates || []), ...fallbackSongs];
            }
        }

        if (candidates && candidates.length > 0) {

            for (const song of candidates) {

                console.log(`📦 Adding ${song.title} to The Box.`);
                await supabase
                    .from("songs")
                    .update({
                        status: "in_box",
                        upvotes: 0,
                        box_appearance_count: (song.box_appearance_count || 0) + 1
                    })
                    .eq("id", song.id);

                // PREDICTIVE VJ: Pre-generate lyrics for Box candidates
                if (!song.lyrics) {
                    this.prepareLyricsInBg(song.id, song.title, song.artist_name, song.duration_sec);
                }
            }
        }
    }

    static async cycleNextToNow(): Promise<Song | null> {

        // 1. Fetch current now_playing to calculate stars and retire it
        const { data: currentPlaying } = await supabase
            .from("songs")
            .select("*")
            .eq("status", "now_playing")
            .limit(1);

        const currSong = currentPlaying && currentPlaying.length > 0 ? currentPlaying[0] : null;

        if (currSong) {
            let newStars = currSong.stars || 0;
            let nextStatus = "pool";
            let isDsw = currSong.is_dsw;
            let strikes = currSong.boxRoundsLost || 0;

            if (currSong.live_stars_count > 0) {
                const avgVote = currSong.live_stars_sum / currSong.live_stars_count;
                const delta = Math.round(avgVote - 5);
                newStars = Math.max(0, newStars + delta);
                console.log(`⭐ Live Rating Math for ${currSong.title}: Old Stars: ${currSong.stars}, Avg Vote: ${avgVote.toFixed(1)}, Delta: ${delta}, New Stars: ${newStars}`);
            }

            if (isDsw) {
                if (newStars > 0) {
                    console.log(`🕊️ THE PARDON! ${currSong.title} survived with ${newStars} points!`);
                    isDsw = false;
                    strikes = 0; // Reset strikes
                    nextStatus = "pool";
                } else {
                    strikes += 1; // Increment strike
                    if (strikes >= 3) {
                        console.log(`🪦 Farewell Spectacle Failed. Manual intervention required. ${currSong.title} stays in pool.`);
                        nextStatus = "pool";
                    } else {
                        console.log(`🧟 DSW Play ${strikes}/3. ${currSong.title} stays in pool.`);
                        nextStatus = "pool";
                    }
                }
            } else {
                if (newStars <= 0) {
                    console.log(`🧟 ${currSong.title} has become a Dead Song Walking.`);
                    isDsw = true;
                    strikes = 1; // First strike
                    newStars = 0;
                    nextStatus = "pool";
                }
            }

            // Update song in DB
            await supabase
                .from("songs")
                .update({
                    status: nextStatus,
                    stars: newStars,
                    is_dsw: isDsw,
                    box_rounds_lost: strikes, // Using this as strike counter
                    live_stars_sum: 0,
                    live_stars_count: 0
                })
                .eq("id", currSong.id);
        }


        const { data: nextUp } = await supabase
            .from("songs")
            .select("*")
            .eq("status", "next_play")
            .limit(1);

        const nextUpSong = nextUp && nextUp.length > 0 ? nextUp[0] : null;

        if (nextUpSong) {

            console.log(`🚀 Transitioning ${nextUpSong.title} from next_play to now_playing`);
            await supabase
                .from("songs")
                .update({
                    status: "now_playing",
                    last_played_at: new Date().toISOString()
                })
                .eq("id", nextUpSong.id);


            // Trigger Farewell Spectacle if it's the 3rd strike
            if (nextUpSong.is_dsw && (nextUpSong.box_rounds_lost || 1) >= 3) {
                await this.triggerFarewellSpectacle(nextUpSong);
            }

            return this.mapDbToApp({ ...nextUpSong, status: 'now_playing' });
        } else {

            console.log("🎲 No next_play. Picking random from pool...");
            // If no next_play, pick RANDOM from pool directly (failsafe)
            // We fetch a larger batch and pick one randomly locally to avoid complex PG random SQL
            const { data: songs } = await supabase
                .from("songs")
                .select("*")
                .in("status", ["pool", "debut"]);

            const available = songs?.filter(s => s.status === 'pool' || s.status === 'debut' || s.is_dsw) || [];
            
            // Prioritize a DSW song if it's been waiting (to give it its chance)
            const dswNode = available.find(s => s.is_dsw);
            let next: any;
            
            if (dswNode && Math.random() > 0.7) {
                next = dswNode;
            } else {
                next = available[Math.floor(Math.random() * available.length)];
            }

            if (next) {
                await supabase
                    .from("songs")
                    .update({
                        status: "now_playing",
                        last_played_at: new Date().toISOString()
                    })
                    .eq("id", next.id);


                // Trigger Farewell Spectacle if it's the 3rd strike
                if (next.is_dsw && (next.box_rounds_lost || 1) >= 3) {
                    await this.triggerFarewellSpectacle(next);
                }

                return this.mapDbToApp({ ...next, status: 'now_playing' });
            }

        }
        return null;
    }

    /**
     * Triggers the global spectacle for a song's final play.
     */
    static async triggerFarewellSpectacle(song: any) {
        console.log(`🔴 FAREWELL SPECTACLE TRIGGERED for ${song.title}`);
        
        // 1. Broadcast site command for visual effects
        await supabase.channel('club-chat').send({
            type: 'broadcast',
            event: 'siteCommandReceived',
            payload: {
                type: 'trigger_fx',
                timestamp: Date.now(),
                payload: { fx: 'Farewell' }
            }
        });

        // 2. Special AI Banter
        const banter = `Attention Club Youniverse. Node ${song.title.toUpperCase()} is officially over-indexed. The influence is zero. Go home song, you're drunk. This is your final transmission.`;
        
        await supabase.channel('club-chat').send({
            type: 'broadcast',
            event: 'new_message',
            payload: {
                id: `dsw-${Date.now()}`,
                user: { name: "THE ARCHITECT", isAdmin: true },
                text: banter,
                timestamp: Date.now()
            } as ChatMessage
        });
    }

    /**
     * AI-LYRIC VJ PREPARATION:
     * Generates and choreographs lyrics in the background to avoid blocking the radio transition.
     */
    static async prepareLyricsInBg(songId: string, title: string, artist: string, duration: number) {
        // We wrap the modern LyricService method to maintain compatibility with existing calls
        // but use the robust unified pipeline.
        const mockSong: any = { id: songId, title, artistName: artist, durationSec: duration };
        await LyricService.processMissingLyrics(mockSong);
    }

    /**
     * Helper to map DB song to App song structure
     */
    public static mapDbToApp(dbSong: any): Song {

        return {
            id: dbSong.id,
            uploaderId: dbSong.uploader_id,
            title: dbSong.title,
            artistName: dbSong.artist_name,
            source: dbSong.source,
            audioUrl: dbSong.audio_url,
            coverArtUrl: dbSong.cover_art_url,
            durationSec: dbSong.duration_sec,
            stars: dbSong.stars,
            liveStarsSum: dbSong.live_stars_sum,
            liveStarsCount: dbSong.live_stars_count,
            isDsw: dbSong.is_dsw,
            boxRoundsSeen: dbSong.box_rounds_seen,
            boxRoundsLost: dbSong.box_rounds_lost,
            boxAppearanceCount: dbSong.box_appearance_count,
            status: dbSong.status,
            lyrics: dbSong.lyrics,
            playCount: dbSong.play_count,
            upvotes: dbSong.upvotes,
            downvotes: dbSong.downvotes,
            lastPlayedAt: dbSong.last_played_at,
            sunoUrl: dbSong.suno_url,
            downloadUrl: dbSong.download_url,
            createdAt: dbSong.created_at
        };
    }

    /**
     * Simulated Votes: Robot listeners cast votes.
     * Called periodically by the leader.
     */
    static async runSimulationStep() {
        // 1. Get songs in the box
        const { data: boxSongs } = await supabase
            .from("songs")
            .select("id, upvotes")
            .eq("status", "in_box");

        if (!boxSongs || boxSongs.length === 0) return;

        // 2. Pick a random song to vote for
        const winnerIdx = Math.floor(Math.random() * boxSongs.length);
        const targetSong = boxSongs[winnerIdx];

        // 3. Add 1-5 votes (robot weight)
        const extraVotes = Math.floor(Math.random() * 5) + 1;
        
        // 4. Update the DB: handle main vote, weekly_stars, and lifetime stars
        const { data: current } = await supabase.from("songs").select("upvotes, weekly_stars, stars").eq("id", targetSong.id).single();
        if (current) {
            await supabase
                .from("songs")
                .update({ 
                    upvotes: (current.upvotes || 0) + extraVotes,
                    // Safety check: only update weekly_stars if it exists in your schema
                    // If you haven't run the migration yet, this avoids errors
                    ...( (current as any).weekly_stars !== undefined ? { weekly_stars: ((current as any).weekly_stars || 0) + extraVotes } : {} ),
                    stars: (current.stars || 0) + extraVotes
                })
                .eq("id", targetSong.id);
        }
    }
    /**
     * Ticker Data: Generates a scorecard of the current competition.
     */
    static async getBoxStatusSummary(): Promise<string> {
        try {
            const { data: boxSongs } = await supabase
                .from("songs")
                .select("title, upvotes, artist_name")
                .eq("status", "in_box")
                .order("upvotes", { ascending: false })
                .limit(3);

            if (!boxSongs || boxSongs.length === 0) return "LIBRARY OPTIMIZATION IN PROGRESS...";

            const standings = boxSongs
                .map((s, i) => `${i + 1}. ${s.title.toUpperCase()} [${s.upvotes || 0} VOTES]`)
                .join(" | ");

            return `VOTING STANDINGS: ${standings}`;
        } catch (error) {
            return "VOTING SYSTEM STANDBY...";
        }
    }

    /**
     * Node Stats: Fetches facts about the current song.
     */
    static getNowPlayingFact(song: Song): string {
        const plays = song.playCount || 0;
        const influence = song.stars || 0;
        if (song.isDsw) {
            const strikes = song.boxRoundsLost || 1;
            if (strikes >= 3) return `🔴 FAREWELL SPECTACLE: ${song.title.toUpperCase()} // FINAL CHANCE`;
            return `🧟 DEAD SONG WALKING: ${song.title.toUpperCase()} // STRIKE ${strikes}/3`;
        }
        return `NODE DATA: ${song.title.toUpperCase()} // PLAYS: ${plays} // INFLUENCE: ${influence}`;
    }

    /**
     * Leaderboard: Fetches a summary of player and song standings.
     */
    static async getLeaderboardSummary(): Promise<string> {
        try {
            const { data: topPlayers } = await supabase
                .from('youniversal_leaderboard')
                .select('name, wins')
                .order('wins', { ascending: false })
                .limit(1);
            
            const { data: topSongs } = await supabase
                .from('songs')
                .select('title, weekly_stars')
                .order('weekly_stars', { ascending: false })
                .limit(1);
                
            const player = topPlayers?.[0] ? `#1 ${topPlayers[0].name?.toUpperCase()} [${topPlayers[0].wins}]` : "NONE";
            const songTitle = topSongs?.[0]?.title?.toUpperCase() || "NONE";
            const songStars = topSongs?.[0]?.weekly_stars !== undefined ? ` [${topSongs[0].weekly_stars}]` : "";
            const song = `${songTitle}${songStars}`;

            return `TOP PLAYER: ${player} // TOP NODE: ${song}`;
        } catch (e) {
            return "SEASON OF SOUND: ARCHIVING STANDINGS...";
        }
    }
}
