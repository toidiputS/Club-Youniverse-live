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
            // Only include top 2 losers that have votes
            const losers = boxSongs.slice(1, 3).filter(l => (l.upvotes || 0) > 0);

            // Only announce if winner has votes or there's real competition
            const hasVotes = (winner.upvotes || 0) > 0;
            
            if (hasVotes || losers.length > 0) {
                console.log(`🏆 Winner: ${winner.title} (${winner.upvotes} votes)`);

                // AI BANTER: Generate speech for the winner
                try {
                    const banter = await LocalAiService.generateDJSpeech(winner, losers);
                    console.log("🎙️ DJ Banter:", banter);

                    // Broadcast banter to all clients via Supabase Realtime
                    await supabase.channel('club-chat').send({
                        type: 'broadcast',
                        event: 'new_message',
                        payload: {
                            id: `dj-${Date.now()}`,
                            user: { name: "THE ARCHITECT", isAdmin: true },
                            text: banter,
                            timestamp: Date.now()
                        } as ChatMessage
                    });
                } catch (e) {
                    console.warn("AI Banter generation failed", e);
                }
            } else {
                console.log(`🏆 Winner: ${winner.title} (no votes - skipping banter)`);
            }

            // Process Winner
            let winnerStars = Math.min(10, (winner.stars || 5) + 1);
            let winnerDsw = winner.is_dsw;

            await supabase
                .from("songs")
                .update({
                    stars: winnerDsw ? 0 : winnerStars,
                    status: "next_play", // Move to next_play so the broadcast manager can pick it up
                    upvotes: 0 // Reset votes for next time
                })
                .eq("id", winner.id);

            // Process Losers (only those with votes)
            const losersToProcess = boxSongs.slice(1).filter(l => (l.upvotes || 0) > 0);
            for (const loser of losersToProcess) {
                console.log(`💀 Loser: ${loser.title} returning to pool.`);
                let loserStars = Math.max(0, (loser.stars || 5) - 1);
                let loserDsw = loser.is_dsw || (loserStars <= 0); // Becomes DSW if it hits 0
                loserStars = loserDsw ? 0 : loserStars;

                await supabase
                    .from("songs")
                    .update({
                        status: "pool",
                        stars: loserStars,
                        is_dsw: loserDsw,
                        upvotes: 0
                    })
                    .eq("id", loser.id);
            }
        } else {

            console.log("⚠️ No songs in the box to pick from.");
        }

        // 4. Populate a new box immediately
        await this.populateTheBox();

        // 5. Return the winner so it can be played immediately
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

            let newStars = currSong.stars;
            let nextStatus = "pool";
            let isDsw = currSong.is_dsw;

            if (currSong.live_stars_count > 0) {

                // If it's DSW, its base stars are 0, meaning any vote helps. But a song starts its rating scale at 1, technically.
                // Actually the math `sum - count * stars` works beautifully: 
                // A DSW has 0 stars. If it gets a 5 star vote, delta = 5 - (1 * 0) = +5. New Stars = 5! A pardon!
                const delta = Math.round(currSong.live_stars_sum - (currSong.live_stars_count * currSong.stars));
                newStars = Math.min(10, Math.max(0, currSong.stars + delta));
                console.log(`⭐ Live Rating Math for ${currSong.title}: Old Stars: ${currSong.stars}, Delta: ${delta}, New Stars: ${newStars}`);
            }


            if (currSong.is_dsw) {

                // It was a Dead Song Walking. Did it get pardoned?
                if (newStars > 0) {

                    console.log(`🕊️ THE PARDON! ${currSong.title} survived its farewell play with ${newStars} stars!`);
                    isDsw = false;
                    nextStatus = "pool";
                } else {

                    console.log(`🪦 Farewell, ${currSong.title}. Sending to Graveyard.`);
                    nextStatus = "graveyard";
                }
            } else {

                if (newStars <= 0) {

                    isDsw = true;
                    newStars = 0; // Lock at 0
                    console.log(`🧟 ${currSong.title} has become a Dead Song Walking.`);
                }
            }

            // Retire it
            await supabase
                .from("songs")
                .update({
                    status: nextStatus,
                    stars: newStars,
                    is_dsw: isDsw,
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


            // AI VJ: Pre-generate lyrics if missing
            if (!nextUpSong.lyrics) {
               this.prepareLyricsInBg(nextUpSong.id, nextUpSong.title, nextUpSong.artist_name, nextUpSong.duration_sec);
            }

            return this.mapDbToApp({ ...nextUpSong, status: 'now_playing' });
        } else {

            console.log("🎲 No next_play. Picking random from pool...");
            // If no next_play, pick RANDOM from pool directly (failsafe)
            // We fetch a larger batch and pick one randomly locally to avoid complex PG random SQL
            const { data: poolSongs } = await supabase
                .from("songs")
                .select("*")
                .eq("status", "pool")
                .limit(20);

if (poolSongs && poolSongs.length > 0) {

                const randomSong = poolSongs[Math.floor(Math.random() * poolSongs.length)];
                await supabase
                    .from("songs")
                    .update({
                        status: "now_playing",
                        last_played_at: new Date().toISOString()
                    })
                    .eq("id", randomSong.id);


                // AI VJ: Pre-generate lyrics if missing
                if (!randomSong.lyrics) {
                   this.prepareLyricsInBg(randomSong.id, randomSong.title, randomSong.artist_name, randomSong.duration_sec);
                }

                return this.mapDbToApp({ ...randomSong, status: 'now_playing' });
            }

        }
        return null;
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
                    weekly_stars: (current.weekly_stars || 0) + extraVotes,
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
        return `NODE DATA: ${song.title.toUpperCase()} // PLAYS: ${plays} // INFLUENCE: ${influence}/10`;
    }
}
