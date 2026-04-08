/**
 * @file Global Broadcast Manager - Singleton service for managing radio state
 * This service ensures continuous 24/7 playback by managing audio state outside
 * the React component lifecycle. It connects to the 'broadcasts' table in Supabase
 * to ensure all clients stay synchronized (Global Pulse).
 */

import { supabase } from "./supabaseClient";
import { Song, RadioState } from "../types";
import { PersistentRadioService } from "./PersistentRadioService";
import { LyricService } from "./LyricService";

type EventCallback = (...args: any[]) => void;

const QUERY = "*, current_song:songs!current_song_id(*), next_song:songs!next_song_id(*)";

interface BroadcastState {
  nowPlaying: Song | null;
  nextSong: Song | null;
  radioState: RadioState;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  leaderId: string | null;
  djBanter: string;
}

/**
 * GlobalBroadcastManager - Singleton class for managing the radio stream
 */
export class GlobalBroadcastManager {
  private static instance: GlobalBroadcastManager | null = null;

  private audioElement: HTMLAudioElement;
  private eventListeners: Map<string, Set<EventCallback>>;
  private state: BroadcastState;
  private timeUpdateInterval: number | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getDataArray(): Uint8Array | null {
    return this.dataArray;
  }

  // Leader Election
  private userId: string | null = null;
  private isLeaderLocal: boolean = false;
  private heartbeatInterval: number | null = null;
  private conductorInterval: number | null = null;
  private lastCommandId: string | null = null;
  private releasedAt: number = 0; // Timestamp of last voluntary release
  private siteCommandChannel: any = null; // Dedicated broadcast channel for ephemeral commands

  private constructor() {
    // CRITICAL: Check if there's already an audio element playing from a leaked instance
    // (Happens during Vite HMR/Hot Reloads)
    const existingAudio = (globalThis as any).__CLUB_YOUNIVERSE_AUDIO__;
    if (existingAudio) {
      console.log("🛑 GlobalBroadcastManager: Cleaning up leaked audio instance...");
      existingAudio.pause();
      existingAudio.src = "";
      existingAudio.load();
    }

    // Clean up leaked intervals from previous HMR sessions to prevent duplicate Conductor skips
    if ((globalThis as any).__CLUB_YOUNIVERSE_HEARTBEAT__) clearInterval((globalThis as any).__CLUB_YOUNIVERSE_HEARTBEAT__);
    if ((globalThis as any).__CLUB_YOUNIVERSE_CONDUCTOR__) clearInterval((globalThis as any).__CLUB_YOUNIVERSE_CONDUCTOR__);
    if ((globalThis as any).__CLUB_YOUNIVERSE_TIME_UPDATE__) clearInterval((globalThis as any).__CLUB_YOUNIVERSE_TIME_UPDATE__);

    // Create the audio element
    this.audioElement = new Audio();
    this.audioElement.preload = "auto";
    // REMOVED: crossOrigin = "anonymous" for maximum compatibility until needed
    (globalThis as any).__CLUB_YOUNIVERSE_AUDIO__ = this.audioElement;

    // Initialize event listeners map
    this.eventListeners = new Map();

    // Load INITIAL local state (volume/mute only)
    this.state = this.loadLocalState();

    // Set up audio element event handlers
    this.setupAudioHandlers();

    // Start time update interval
    this.startTimeUpdates();

    // Initialize connection to Global State (DB)
    this.initializeGlobalState();

    // Start Leader Election Process
    this.initLeaderElection();

    console.log("🎙️ GlobalBroadcastManager initialized");
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): GlobalBroadcastManager {
    // During HMR, the static 'instance' might be lost if the module is re-executed,
    // but globalThis persists.
    if (!(globalThis as any).__GLOBAL_BROADCAST_MANAGER_INSTANCE__) {
      (globalThis as any).__GLOBAL_BROADCAST_MANAGER_INSTANCE__ = new GlobalBroadcastManager();
    }
    GlobalBroadcastManager.instance = (globalThis as any).__GLOBAL_BROADCAST_MANAGER_INSTANCE__;
    return GlobalBroadcastManager.instance!;
  }

  private async initLeaderElection() {
    // 1. Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      this.userId = user.id;
      console.log("👤 Authorized as:", this.userId);
      this.startElectionLoop();
    } else {
      // Wait for auth? simple retry for now or listen to auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user && !this.userId) {
          this.userId = session.user.id;
          console.log("👤 Auth recovered:", this.userId);
          this.startElectionLoop();
        }
      });
    }
  }

  private startElectionLoop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    // Check for leadership more frequently (2s) to ensure fast recovery
    this.heartbeatInterval = window.setInterval(async () => {
      if (!this.userId) return;
      await this.tryClaimLeadership();
    }, 2000);

    (globalThis as any).__CLUB_YOUNIVERSE_HEARTBEAT__ = this.heartbeatInterval;

    // Run immediately
    this.tryClaimLeadership();
  }

  public getLeaderId() {
    return this.state.leaderId;
  }

  public async claimLeadership(force: boolean = false, previousLeaderId: string | null = null) {
    if (!this.userId) return false;
    this.releasedAt = 0; // Clear any release cooldown
    const now = new Date();

    // Atomic update: If not forcing, we only update if the leader is still who we thought it was
    let query = supabase
      .from("broadcasts")
      .update({
        leader_id: this.userId,
        last_heartbeat: now.toISOString(),
      })
      .eq("id", "00000000-0000-0000-0000-000000000000");

    if (!force && previousLeaderId !== undefined) {
      if (previousLeaderId === null) {
        query = query.is("leader_id", null);
      } else {
        query = query.eq("leader_id", previousLeaderId);
      }
    }

    const { error, data } = await query.select();

    // If data is empty, it means the condition failed (someone else won the race)
    if (!error && data && data.length > 0) {
      // console.debug("👑 Leadership claimed successfully.");
      this.isLeaderLocal = true;
      this.state.leaderId = this.userId;
      this.emit("leaderIdChanged", this.userId);
      this.emit("leaderChanged", true);
      
      // Ensure we only have ONE loop
      this.stopConductorLoop();
      this.startConductorLoop();
      
      await this.fetchAndSync();
      return true;
    } else {
      console.log("📉 Leadership claim failed (race condition lost).");
      return false;
    }
  }

  public async releaseLeadership() {
    if (!this.isLeaderLocal || !this.userId) return;
    const { error } = await supabase
      .from("broadcasts")
      .update({
        leader_id: null,
      })
      .eq("leader_id", this.userId);

    if (!error) {
      console.log("👑 Leadership released voluntarily.");
      this.isLeaderLocal = false;
      this.releasedAt = Date.now(); // Prevent auto-reclaim for a cooldown period
      this.state.leaderId = null;
      this.stopConductorLoop();
      this.emit("leaderIdChanged", null);
      this.emit("leaderChanged", false);
      await this.fetchAndSync();
    }
  }

  private async tryClaimLeadership() {
    try {
      // 1. Fetch current leader status
      const { data, error } = await supabase
        .from("broadcasts")
        .select("leader_id, last_heartbeat")
        .limit(1)
        .single();

      if (error) return;

      const remoteLeaderId = data.leader_id;
      const lastHeartbeat = data.last_heartbeat ? new Date(data.last_heartbeat).getTime() : 0;
      const isLeaderDead = !remoteLeaderId || (Date.now() - lastHeartbeat > 10000);

      if (this.state.leaderId !== remoteLeaderId) {
        this.state.leaderId = remoteLeaderId;
        this.emit("leaderIdChanged", remoteLeaderId);
      }

      const amILeader = remoteLeaderId === this.userId;

      // AUTO-CLAIM: If there is no leader, or the leader is dead, try to claim it
      // But skip if we just voluntarily released (15s cooldown)
      const releaseCooldown = Date.now() - this.releasedAt < 15000;
      if (isLeaderDead && this.userId && !releaseCooldown) {
        // console.debug("🔦 Leader is missing or dead. Attempting auto-claim...");
        // Auto-claim passes the previousLeaderId to prevent race conditions
        await this.claimLeadership(false, remoteLeaderId);
        return; // Next interval will pick up the change
      }

      if (amILeader) {
        if (!this.isLeaderLocal) {
          // console.debug("👑 I am now the Global Leader.");
          this.isLeaderLocal = true;
          this.emit("leaderChanged", true);
          this.startConductorLoop();

          // RE-CHECK TRIGGERS: If I just became leader, check if there's a trigger waiting
          this.fetchAndSync();
        }
        await supabase
          .from("broadcasts")
          .update({ last_heartbeat: new Date().toISOString() })
          .eq("leader_id", this.userId);
      } else if (this.isLeaderLocal) {
        // I thought I was leader, but DB says otherwise
        console.log("📉 Leadership lost to:", remoteLeaderId);
        this.isLeaderLocal = false;
        this.stopConductorLoop();
        this.emit("leaderChanged", false);
      }
    } catch (e) {
      console.error("Election error:", e);
    }
  }

  private startConductorLoop() {
    if (this.conductorInterval) clearInterval(this.conductorInterval);
    console.log("👑 GlobalBroadcastManager: Starting Conductor Loop...");

    this.conductorInterval = window.setInterval(async () => {
      if (!this.isLeaderLocal) return;

      try {
        // 1. Health Check (Zombie / Silence Prevention)
        const nextSong = await PersistentRadioService.checkRadioHealth(this.state.nowPlaying);
        if (nextSong) {
          console.log("🛠️ Conductor: Kickstarted station with:", nextSong.title);
          await this.setNowPlaying(nextSong);
        }

        // 2. Voting Simulation
        await PersistentRadioService.runSimulationStep();
      } catch (e) {
        console.error("Conductor error:", e);
      }
    }, 10000); // 10s check

    (globalThis as any).__CLUB_YOUNIVERSE_CONDUCTOR__ = this.conductorInterval;
  }

  private stopConductorLoop() {
    if (this.conductorInterval) {
      console.log("🛑 GlobalBroadcastManager: Stopping Conductor Loop.");
      clearInterval(this.conductorInterval);
      this.conductorInterval = null;
    }
  }

  /**
   * Load volume/mute prefs from localStorage
   */
  private loadLocalState(): BroadcastState {
    let volume = 1;
    let isMuted = false;
    try {
      const stored = localStorage.getItem("club-youniverse-broadcast-state");
      if (stored) {
        const parsed = JSON.parse(stored);
        volume = parsed.volume ?? 1;
        isMuted = parsed.isMuted ?? false;
      }
    } catch (e) {
      console.error(e);
    }

    return {
      nowPlaying: null,
      nextSong: null,
      radioState: "POOL",
      currentTime: 0,
      volume,
      isMuted,
      isPlaying: false,
      leaderId: null,
      djBanter: "",
    };
  }


  /**
   * Connect to Supabase for the Source of Truth
   */
  private async initializeGlobalState() {
    console.log("🌍 Initializing Global Broadcast Connection...");

    // 1. Fetch initial state with joined song data
    const { data, error } = await supabase
      .from("broadcasts")
      .select(QUERY)
      .limit(1)
      .single();

    if (data) {
      this.syncStateFromRemote(data);
    } else if (error) {
      console.error("❌ Failed to fetch broadcast state:", error);
    }

    // 2. Subscribe to Realtime DB changes (for state, songs, leadership)
    supabase
      .channel("public:broadcasts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "broadcasts" },
        (_payload) => {
          // console.log('📡 Global Trigger:', payload.new);
          this.fetchAndSync();
        },
      )
      .subscribe((status) => {
        console.log("📡 Broadcast Subscription Status:", status);
      });

    // 3. Subscribe to dedicated Broadcast channel for ephemeral site commands
    this.siteCommandChannel = supabase
      .channel("site-commands")
      .on("broadcast", { event: "site_command" }, (payload: any) => {
        const cmd = payload.payload;
        console.log("📡 Site Command received via broadcast channel:", cmd);
        if (cmd && cmd.id && cmd.id !== this.lastCommandId) {
          this.lastCommandId = cmd.id;
          
          if (cmd.type === "dj_banter") {
            this.state.djBanter = cmd.payload?.text || "";
          }

          this.emit("siteCommandReceived", cmd);
          
          // LEADER ACTION: Handle global commands
          if (this.isLeaderLocal && cmd.type === "skip") {
              console.log("👑 Leader: Direct Skip Received via command.");
              this.handleStateTrigger('POOL');
          }
        }
      })
      .subscribe((status: string) => {
        console.log("📡 Site Command Channel Status:", status);
      });
  }

  private async fetchAndSync() {
    const { data } = await supabase
      .from("broadcasts")
      .select(QUERY)
      .limit(1)
      .single();

    if (data) this.syncStateFromRemote(data);
  }

  private syncStateFromRemote(data: any) {
    const remoteSong = data.current_song
      ? PersistentRadioService.mapDbToApp(data.current_song)
      : null;
    const nextSong = data.next_song
      ? PersistentRadioService.mapDbToApp(data.next_song)
      : null;
    const remoteState = data.radio_state as RadioState;

    // Sync Radio State
    const actionStates: RadioState[] = ['POOL', 'THE_BOX', 'BOX_WIN', 'REBOOT'];
    const isActionState = actionStates.includes(remoteState);

    if (this.state.radioState !== remoteState || isActionState) {
      if (this.state.radioState !== remoteState) {
        console.log(
          `📻 Global State Update: ${this.state.radioState} -> ${remoteState}`,
        );
        this.state.radioState = remoteState;
        this.emit("radioStateChanged", remoteState);
      }

      // LEADER ACTION: If a trigger state is detected, perform the action
      // DEDUPLICATION: Only process if the update is NEWER than our last processed action
      // or if it's the first time we're seeing an action state.
      const remoteUpdatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
      const alreadyProcessed = (globalThis as any).__LAST_ACTION_TIMESTAMP__ >= remoteUpdatedAt;

      if (this.isLeaderLocal && isActionState && !alreadyProcessed) {
        console.log(`👑 Leader: Processing new action trigger (${remoteState}) at ${data.updated_at}`);
        (globalThis as any).__LAST_ACTION_TIMESTAMP__ = remoteUpdatedAt;
        this.handleStateTrigger(remoteState);
      }
    }

    // Sync Next Song
    if (nextSong?.id !== this.state.nextSong?.id) {
      this.state.nextSong = nextSong;
      this.emit("nextSongChanged", nextSong);
    }

    // Sync Now Playing
    if (remoteSong?.id !== this.state.nowPlaying?.id) {
      // console.log(`🎵 Global Song Update: ${data.current_song?.title || 'Unknown'}`);
      const mappedSong = data.current_song ? PersistentRadioService.mapDbToApp(data.current_song) : null;
      const offset = this.calculateOffset(data.song_started_at);
      this.setNowPlaying(mappedSong, offset);
    } else {
      // Check for drift > 2 seconds
      const expectedTime = this.calculateOffset(data.song_started_at);

      // Secondary check: if the song started 5 minutes ago and it's a 3 min song, don't just sync, let watchdog handle it.
      // But for drift:
      const drift = Math.abs(this.audioElement.currentTime - expectedTime);

      if (drift > 2 && this.state.isPlaying) {
        this.audioElement.currentTime = expectedTime;
      }
    }

    // Sync Site Commands
    if (data.site_command && data.site_command.id && data.site_command.id !== this.lastCommandId) {
      this.lastCommandId = data.site_command.id;

      // Prevent stale commands from re-triggering on initial load
      const isStale = data.site_command.timestamp && (Date.now() - data.site_command.timestamp > 10000);
      if (!isStale) {
        if (data.site_command.type === "dj_banter") {
          this.state.djBanter = data.site_command.payload?.text || "";
        }
        this.emit("siteCommandReceived", data.site_command);
      } else {
        console.log("📡 Ignored stale site command from DB:", data.site_command.type);
      }
    }
  }

  /**
   * handleStateTrigger - Executes logic for Admin Triggers
   */
  private async handleStateTrigger(state: RadioState) {
    console.log(`⚡ Triggering Action: ${state}`);

    switch (state) {
      case 'POOL': // Cycle (Btn P)
      case 'BOX_WIN': // Force Win (Btn W)
        console.log("🎬 Cycle/Win Triggered");
        const nextSong = await PersistentRadioService.handleSongEnded(this.state.nowPlaying);
        if (nextSong) {
          await this.setNowPlaying(nextSong);
        } else {
          // If fallback fails, return to NOW_PLAYING to stop loop
          await this.setRadioState('NOW_PLAYING');
        }
        break;

      case 'THE_BOX': // Refresh Box (Btn B)
        console.log("♻️ Refresh Box Triggered");
        await PersistentRadioService.forceRefreshBox();
        // Return to NOW_PLAYING state after action
        await this.setRadioState('NOW_PLAYING');
        break;

      case 'REBOOT': // Force Nuke (Btn N)
        console.log("☢️ Hard Reset Triggered");
        await PersistentRadioService.hardReset();
        // hardReset sets DB state to POOL, which starts the cycle fresh
        break;

      case 'DJ_TALKING': // Mic Over (Btn M)
        // No action needed besides state change (UI handles overlay)
        break;

      default:
        // Normal states (NOW_PLAYING) don't trigger anything
        break;
    }
  }

  private calculateOffset(startedAt: string): number {
    if (!startedAt) return 0;
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    // Return seconds elapsed
    return Math.max(0, (now - start) / 1000);
  }

  /**
   * Save local preferences
   */
  private saveState(): void {
    try {
      const toSave = {
        volume: this.state.volume,
        isMuted: this.state.isMuted,
      };
      localStorage.setItem(
        "club-youniverse-broadcast-state",
        JSON.stringify(toSave),
      );
    } catch (error) {
      console.error("Failed to save broadcast state", error);
    }
  }

  /**
   * Setup audio listeners
   */
  private setupAudioHandlers(): void {
    this.audioElement.addEventListener("play", () => {
      this.state.isPlaying = true;
      this.emit("playbackStateChanged", true);
    });
    this.audioElement.addEventListener("pause", () => {
      this.state.isPlaying = false;
      this.emit("playbackStateChanged", false);
    });
    this.audioElement.addEventListener("ended", async () => {
      this.state.isPlaying = false;
      this.emit("songEnded", this.state.nowPlaying);

      // LEADER LOGIC: Handle song end and transition
      if (this.isLeaderLocal) {
        console.log("👑 Leader: Song ended. Transitioning...");

        // 1. Get next song by completing current cycle
        const nextSong = await PersistentRadioService.handleSongEnded(this.state.nowPlaying);

        // 2. Clear current state locally to ensure clean transition
        this.state.nowPlaying = null;
        this.emit("nowPlayingChanged", null);

        // 3. Play the winner
        if (nextSong) {
          await this.setNowPlaying(nextSong);
        }
      }
    });
    this.audioElement.addEventListener("error", (e) => {
      const errorDetails = this.audioElement.error;
      console.error("❌ Audio Error Event:", errorDetails ? `Code: ${errorDetails.code}, Message: ${errorDetails.message}` : "Unknown error");

      if (this.isLeaderLocal) {
        console.log("⚠️ Leader: Audio failed to load. Skipping corrupted track in 3s...");
        setTimeout(() => {
          this.handleStateTrigger('POOL');
        }, 3000);
      }
      this.emit("audioError", e);
    });

    this.audioElement.volume = this.state.volume;
    this.audioElement.muted = this.state.isMuted;
    
    // MOBILE FIX: Ensure playsinline for standard compliance
    this.audioElement.setAttribute("playsinline", "true");
    this.audioElement.setAttribute("webkit-playsinline", "true");

    // Initialize Media Session metadata if supported
    this.updateMediaSession();
  }

  private updateMediaSession() {
    if ('mediaSession' in navigator && this.state.nowPlaying) {
      const song = this.state.nowPlaying;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artistName,
        album: 'Club Youniverse',
        artwork: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/social-cover.png', sizes: '1200x630', type: 'image/png' }
        ]
      });

      // Unified handlers for lock screen controls: Mute instead of Pause for live show
      navigator.mediaSession.setActionHandler('play', () => {
        this.setMuted(false);
        this.play().catch(console.error);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.setMuted(true);
      });
      
      // Explicitly disable skipping from lock screen to maintain live show integrity
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    }
  }

  /**
   * Time updates for progress bar
   */
  private startTimeUpdates(): void {
    if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.state.isPlaying && this.state.nowPlaying) {
        this.state.currentTime = this.audioElement.currentTime;
        this.emit("timeUpdate", this.audioElement.currentTime);
      }
    }, 1000);

    (globalThis as any).__CLUB_YOUNIVERSE_TIME_UPDATE__ = this.timeUpdateInterval;
  }

  // --- PUBLIC API ---

  public get isLeader() {
    return this.isLeaderLocal;
  }

  public async setNowPlaying(
    song: Song | null,
    startOffset: number = 0,
  ): Promise<void> {
    // Optimistic update
    this.state.nowPlaying = song;

    // Consistency: If a song is set, we should be in NOW_PLAYING or DJ_TALKING state
    if (song && this.state.radioState !== 'NOW_PLAYING' && this.state.radioState !== 'DJ_TALKING') {
      this.state.radioState = 'NOW_PLAYING';
      this.emit("radioStateChanged", 'NOW_PLAYING');
    }
    if (!song) {
      this.audioElement.pause();
      this.audioElement.removeAttribute("src");
      this.audioElement.load(); // Required to reset the element and stop it from complaining
      this.emit("nowPlayingChanged", null);

      // CRITICAL FIX: If we are clearing the song, we must also reset the state
      // This prevents "NOW_PLAYING" with no song
      if (this.isLeaderLocal) {
        await this.persistBroadcastState(false); // Force update to remove song ID
      }
      return;
    }

    if (!song.audioUrl) {
      console.error("❌ CRITICAL: Attempting to play song with NO AUDIO URL:", song.title);
      return;
    } else {
      // console.log(`🎵 Ready to play: ${song.title} -> ${song.audioUrl}`);
    }

    // CHECK: Is this the same song?
    // We check both the ID and the actual audio source
    const hasCorrectSrc = this.audioElement.src === song.audioUrl;
    const isSameId = this.state.nowPlaying?.id === song.id;

    if (!hasCorrectSrc) {
      console.log(`🎵 Setting audio source for: ${song.title}`);
      this.audioElement.src = song.audioUrl;

      // SYNC FIX: Wait for metadata before seeking to the offset
      const onMetadataLoaded = () => {
        if (startOffset > 0) {
          console.log(`➡️ Syncing to global time: +${startOffset.toFixed(1)}s`);
          this.audioElement.currentTime = startOffset;
        }
        this.audioElement.removeEventListener("loadedmetadata", onMetadataLoaded);
      };
      this.audioElement.addEventListener("loadedmetadata", onMetadataLoaded);

      // Try to autoplay with robust fallback
      this.play().catch((e) => {
        // BROADEN: Catch more than just NotAllowedError, especially on iOS
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError' || this.audioElement.paused) {
          console.warn("🚫 Autoplay blocked or failed. User interaction required.");
          this.emit("autoplayBlocked", true);
        } else {
          console.warn("Initial playback failed, forcing reload:", e);
          this.audioElement.load();
          this.play().catch(e3 => {
            console.error("Force play (new song) failed:", e3);
            // Final fallback: show the overlay
            this.emit("autoplayBlocked", true);
          });
        }
      });
    } else {
      // console.log(`🔄 Updating metadata for current song: ${song.title}`);

      // FIX: Ensure it's actually playing!
      if (this.audioElement.paused) {
        console.log(`▶️ Attempting to resume playback...`);
        this.play().catch((e) => {
          if (e.name === 'NotAllowedError') {
            this.emit("autoplayBlocked", true);
          } else {
            console.warn("Simple resume failed, forcing reload:", e);
            this.audioElement.load();
            this.play().catch((e2) => console.error("Force play failed:", e2));
          }
        });
      }
      // If we're already playing, just check for drift
      const expectedTime = startOffset;
      if (
        expectedTime > 0 &&
        Math.abs(this.audioElement.currentTime - expectedTime) > 2
      ) {
        console.log(`🕒 Drift detected, re-syncing: ${this.audioElement.currentTime.toFixed(1)} -> ${expectedTime.toFixed(1)}`);
        this.audioElement.currentTime = expectedTime;
      }
    }

    this.emit("nowPlayingChanged", song);
    
    // Sync with OS Media Session (Lock Screen)
    this.updateMediaSession();

    // PERSIST TO GLOBAL STATE (Only if Leader)
    if (this.isLeaderLocal) {
      // Auto-update Radio State to NOW_PLAYING if we are playing a song
      if (song && this.state.radioState !== 'NOW_PLAYING') {
        this.state.radioState = 'NOW_PLAYING';
        this.emit("radioStateChanged", 'NOW_PLAYING');
      }
      await this.persistBroadcastState(!hasCorrectSrc || !isSameId);
      
      // TRIGGER LYRIC GENERATION:
      // If we are leader, and this song has no lyrics, start processing them async.
      // This ensures all users see lyrics eventually without blocking the start of the song.
      const hasLyrics = song.lyrics && (Array.isArray(song.lyrics) ? song.lyrics.length > 0 : String(song.lyrics).trim().length > 0);
      if (!hasLyrics) {
          console.log(`🎤 Leader: Song "${song.title}" missing lyrics. Initializing VJ Engine...`);
          LyricService.processMissingLyrics(song).catch(e => console.error("VJ Init Error:", e));
      }
    }
  }

  private async persistBroadcastState(newSongStartedAt: boolean = false) {
    // GATEKEEPER: Only Leader can write to DB State!
    if (!this.isLeaderLocal) {
      // console.log("🔒 Not leader. Skipping DB persist.");
      return;
    }

    try {
      const payload: any = {
        current_song_id: this.state.nowPlaying?.id || null,
        next_song_id: this.state.nextSong?.id || null,
        radio_state: this.state.radioState,
        updated_at: new Date().toISOString(),
      };

      if (newSongStartedAt) {
        payload.song_started_at = new Date().toISOString();
      }

      // Using the '000...000' ID from the SQL setup or generic update
      await supabase
        .from("broadcasts")
        .update(payload)
        .eq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.error("Failed to persist broadcast state:", e);
    }
  }

  public async setRadioState(state: RadioState) {
    const actionStates: RadioState[] = ['POOL', 'THE_BOX', 'BOX_WIN', 'REBOOT'];
    const isActionState = actionStates.includes(state);

    if (this.state.radioState !== state || isActionState) {
      this.state.radioState = state;
      this.emit("radioStateChanged", state);
      if (this.isLeaderLocal && isActionState) {
          this.handleStateTrigger(state);
      }
      await this.persistBroadcastState();
    }
  }

  public getNowPlaying() {
    return this.state.nowPlaying;
  }

  public async sendSiteCommand(type: string, payload: any) {
    const commandId = Math.random().toString(36).substring(2, 15);
    const cmd = { type, payload, timestamp: Date.now(), id: commandId };

    // Fire locally immediately for the sender
    this.lastCommandId = commandId;
    this.emit("siteCommandReceived", cmd);

    try {
      // PRIMARY: Send via Supabase Broadcast channel (instant, ephemeral)
      if (this.siteCommandChannel) {
        await this.siteCommandChannel.send({
          type: "broadcast",
          event: "site_command",
          payload: cmd,
        });
        console.log("📡 Site command sent via broadcast channel:", type);
      }

      // SECONDARY: Also persist to DB as fallback
      await supabase.from("broadcasts").update({
        site_command: cmd
      }).eq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.error("Site Command Failed:", e);
    }
  }
  public getDjBanter() {
    return this.state.djBanter;
  }
  public getNextSong() {
    return this.state.nextSong;
  }
  public async setNextSong(song: Song | null) {
    this.state.nextSong = song;
    this.emit("nextSongChanged", song);
    if (this.isLeaderLocal) {
      await this.persistBroadcastState();
    }
  }
  public getRadioState() {
    return this.state.radioState;
  }
  public getCurrentTime() {
    return this.audioElement.currentTime;
  }
  public isPlaying() {
    return !this.audioElement.paused;
  }

  public getVolume() {
    return this.state.volume;
  }
  public isMuted() {
    return this.state.isMuted;
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      try {
        console.log("🎙️ Initializing AudioContext for visualization...");
        // REMOVED: CORS/Reload logic for now
        
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        // TEMPORARY: Commenting out hijacking to debug silence
        /*
        const source = this.audioContext.createMediaElementSource(this.audioElement);
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        */
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        console.log("✅ AudioContext & Analyser established");
      } catch (e) {
        console.warn("AudioContext initialization failed:", e);
      }
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn("Failed to resume context:", e);
      }
    }
  }

  public async resumeAudioContext() {
    await this.ensureAudioContext();
  }

  public async play() {
    if (this.state.nowPlaying) {
      // SHIFT: Don't initialize AudioContext here. Keep it raw for mobile landing page.
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      try {
        // Force load logic
        if (this.audioElement.readyState === 0 && this.audioElement.src) {
          console.log("📥 Loading audio source...");
          this.audioElement.load();
        }
        
        // Force volume and unmuted for debug
        this.audioElement.volume = 1;
        this.audioElement.muted = false;
        
        await this.audioElement.play();
        this.state.isPlaying = true;
        this.emit("playbackStateChanged", true);
        this.updateMediaSession(); // Refresh handlers on state change
      } catch (e: any) {
        console.error("❌ play() failed:", e.name, e.message);
        
        // BROADEN: Detect any block
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError' || this.audioElement.paused) {
          console.warn("🚫 GlobalBroadcastManager: Play blocked. Emitting autoplayBlocked.");
          this.emit("autoplayBlocked", true);
        }
        throw e;
      }
    }
  }

  public getBassIntensity(): number {
    if (!this.analyser || !this.dataArray || this.audioElement.paused) {
      // If we are playing but analyser isn't ready, try to prime it
      if (!this.audioElement.paused && !this.analyser) {
        this.ensureAudioContext();
      }
      return 0;
    }
    this.analyser.getByteFrequencyData(this.dataArray as any);
    // Focus on the first few bins (bass)
    const bassSum = this.dataArray[0] + this.dataArray[1] + this.dataArray[2];
    return bassSum / 765; // Normalize to 0-1
  }

  public pause() {
    if (!this.audioElement.paused) {
      this.audioElement.pause();
      this.state.isPlaying = false;
      this.emit("playbackStateChanged", false);
    }
  }

  public async togglePlay() {
    if (this.audioElement.paused) await this.play();
    else this.pause();
  }

  public seekTo(time: number) {
    this.audioElement.currentTime = time;
  }

  public setVolume(vol: number) {
    this.state.volume = Math.max(0, Math.min(1, vol));
    this.audioElement.volume = this.state.volume;
    this.saveState();
    this.emit("volumeChanged", this.state.volume);
  }

  public setMuted(muted: boolean) {
    this.state.isMuted = muted;
    this.audioElement.muted = muted;
    this.saveState();
    this.emit("mutedChanged", muted);
  }

  public on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event))
      this.eventListeners.set(event, new Set());
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.delete(callback);
  }

  private emit(event: string, ...args: any[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  public destroy() {
    if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.audioElement.pause();
    this.eventListeners.clear();
    GlobalBroadcastManager.instance = null;
  }
}

export const getBroadcastManager = () => GlobalBroadcastManager.getInstance();
