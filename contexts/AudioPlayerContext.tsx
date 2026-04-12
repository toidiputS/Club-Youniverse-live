/**
 * @file RadioContext - Managing the persistent radio state for Club Youniverse
 */

import React, {
  createContext,
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { getBroadcastManager } from "../services/globalBroadcastManager";
import { PersistentRadioService } from "../services/PersistentRadioService";
import type {
  Song,
  RadioState,
  ChatMessage,
  Profile,
} from "../types";

interface RadioContextType {
  nowPlaying: Song | null;
  nextSong: Song | null;
  radioState: RadioState;
  isLeader: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  chatMessages: ChatMessage[];
  profile: Profile | null;
  tickerText: string;
  leaderboardText: string;
  djBanter: string;
  danceFloorEnabled: boolean;
  sentimentBurst: string | null;
  twitchChannel: string | null;
  vjEnabled: boolean;
  setVjEnabled: (enabled: boolean) => void;
  liveRating: { sum: number; count: number };
  castVote: (stars: number) => void;

  // Actions
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  togglePlay: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  setTickerText: (text: string) => void;
  setDjBanter: (text: string) => void;
  setDanceFloorEnabled: (enabled: boolean) => void;
  setTwitchChannel: (channel: string | null) => void;


  // Admin/System Actions (Leader only)
  setRadioState: (state: RadioState) => void;
  setNowPlaying: (_song: Song | null) => void;
  setNextSong: (_song: Song | null) => void;
  downloadSong: (song: Song) => void;
  leaderId: string | null;
  claimLeadership: () => Promise<boolean>;
  releaseLeadership: () => Promise<void>;
}

export const RadioContext = createContext<RadioContextType | null>(null);

export const RadioProvider: React.FC<{
  children: React.ReactNode;
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}> = ({ children, profile, setProfile }) => {
  const broadcastManager = useRef(getBroadcastManager()).current;

  const [nowPlaying, setNowPlayingState] = useState<Song | null>(null);
  const [nextSong, setNextSongState] = useState<Song | null>(null);
  const [radioState, setRadioStateLocal] = useState<RadioState>("POOL");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLeader, setIsLeader] = useState(broadcastManager.isLeader);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(broadcastManager.getVolume());
  const [isMuted, setIsMutedState] = useState(broadcastManager.isMuted());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [tickerText, setTickerText] = useState("Welcome to Club Youniverse. Vote in The Box to help shape the station.");
  const [leaderboardText, setLeaderboardText] = useState("🏆 LEADERBOARD: INITIALIZING STANDINGS...");
  const [djBanter, setDjBanter] = useState("DJ Python is loading up the decks... Please stand by.");
  const [danceFloorEnabled, setDanceFloorEnabledLocal] = useState(false);
  const [sentimentBurst, setSentimentBurst] = useState<string | null>(null);
  const [twitchChannel, setTwitchChannelLocal] = useState<string | null>(null);
  const [vjEnabled, setVjEnabled] = useState(true);

  const [leaderId, setLeaderId] = useState<string | null>(broadcastManager.getLeaderId());

  const togglePlay = useCallback(() => {
    broadcastManager.togglePlay();
  }, [broadcastManager]);

  const setVolume = useCallback((vol: number) => {
    broadcastManager.setVolume(vol);
    setVolumeState(vol);
  }, [broadcastManager]);

  const setMuted = useCallback((muted: boolean) => {
    broadcastManager.setMuted(muted);
    setIsMutedState(muted);
  }, [broadcastManager]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg].slice(-50));
    
    // Keyword Burst Detection
    const text = msg.text.toLowerCase();
    if (text.includes('love') || text.includes('heart')) setSentimentBurst('love');
    else if (text.includes('fire') || text.includes('lit')) setSentimentBurst('fire');
    else if (text.includes('cosmic') || text.includes('youniverse')) setSentimentBurst('cosmic');
    
    // Auto-clear burst
    setTimeout(() => setSentimentBurst(null), 5000);
  }, []);

  const setRadioState = useCallback((state: RadioState) => {
    broadcastManager.setRadioState(state);
  }, [broadcastManager]);

  const setDanceFloorEnabled = useCallback((enabled: boolean) => {
    setDanceFloorEnabledLocal(enabled);
    broadcastManager.sendSiteCommand("dance_floor", { enabled });
  }, [broadcastManager]);

  const setTwitchChannel = useCallback((channel: string | null) => {
    setTwitchChannelLocal(channel);
    broadcastManager.sendSiteCommand("twitch", { channel });
  }, [broadcastManager]);

  const setNowPlaying = useCallback((song: Song | null) => {
    broadcastManager.setNowPlaying(song);
  }, [broadcastManager]);

  const setNextSong = useCallback((song: Song | null) => {
    broadcastManager.setNextSong(song);
  }, [broadcastManager]);

  useEffect(() => {
    broadcastManager.on("nowPlayingChanged", setNowPlayingState);
    broadcastManager.on("nextSongChanged", setNextSongState);
    broadcastManager.on("radioStateChanged", setRadioStateLocal);
    broadcastManager.on("playbackStateChanged", setIsPlaying);
    broadcastManager.on("leaderChanged", setIsLeader);
    broadcastManager.on("timeUpdate", setCurrentTime);
    broadcastManager.on("volumeChanged", setVolumeState);
    broadcastManager.on("mutedChanged", setIsMutedState);
    broadcastManager.on("leaderIdChanged", setLeaderId);
    broadcastManager.on("siteCommandReceived", (cmd: any) => {
      if (cmd?.type === "ticker") {
        setTickerText(cmd.payload?.text || "");
      } else if (cmd?.type === "dj_banter") {
        setDjBanter(cmd.payload?.text || "");
      } else if (cmd?.type === "tts" && cmd.payload?.text) {
        // High fidelity TTS broadcast
        const utterance = new SpeechSynthesisUtterance(cmd.payload.text);
        utterance.rate = 0.9;
        utterance.pitch = 0.8; // Cyberpunk/Fenrir vibe
        window.speechSynthesis.speak(utterance);
      } else if (cmd?.type === "chat" && cmd.payload) {
        // Assume payload is a ChatMessage object
        setChatMessages(prev => [...prev, cmd.payload].slice(-50));
      } else if (cmd?.type === "dance_floor") {
        setDanceFloorEnabledLocal(!!cmd.payload?.enabled);
      } else if (cmd?.type === "news_brief") {
        setTickerText("📡 CONNECTING TO GLOBAL NEWS RECEPTORS... ANALYZING RSS FEEDS...");
        setDjBanter("DJ Python is aggregating local cluster data for a news brief. Stand by.");
      } else if (cmd?.type === "twitch") {
        setTwitchChannelLocal(cmd.payload?.channel || null);
      }
    });

    // Initial Sync
    setNowPlayingState(broadcastManager.getNowPlaying());
    setNextSongState(broadcastManager.getNextSong());
    setRadioStateLocal(broadcastManager.getRadioState());
    setIsPlaying(broadcastManager.isPlaying());
    setIsLeader(broadcastManager.isLeader);

    // Ticker Logic (Dynamic System Feed)
    let tickerIndex = 0;
    const hints = [
      "/YOUNIVERSAL : Toggle the cosmic game",
      "/DJ-BOOTH : Access the command sector",
      "VOTE IN THE BOX TO BOOST GLOBAL INFLUENCE",
      "ALL SONGS GENERATED VIA SUNO PRO ACCOUNTS"
    ];

    const updateSystemTicker = async () => {
      let nextText = "";
      const currentNowPlaying = broadcastManager.getNowPlaying();
      
      // Rotate through information types
      const cycle = tickerIndex % 4;
      if (cycle === 0) {
        nextText = await PersistentRadioService.getBoxStatusSummary();
      } else if (cycle === 1 && currentNowPlaying) {
        nextText = PersistentRadioService.getNowPlayingFact(currentNowPlaying);
      } else if (cycle === 2) {
        nextText = await PersistentRadioService.getLeaderboardSummary();
      } else {
        nextText = `SYSTEM HINT: ${hints[Math.floor(Math.random() * hints.length)]}`;
      }
      
      setTickerText(nextText);
      tickerIndex++;
    };

    const updateDjTicker = () => {
      const currentNowPlaying = broadcastManager.getNowPlaying();
      const currentBanter = broadcastManager.getDjBanter() || "";
      
      if (currentBanter && !currentBanter.includes("DJ Python is loading")) {
         setDjBanter(currentBanter);
      } else if (currentNowPlaying) {
         const mins = Math.floor(currentNowPlaying.durationSec / 60);
         const secs = Math.floor(currentNowPlaying.durationSec % 60).toString().padStart(2, '0');
         setDjBanter(`NOW TRANSMITTING: ${currentNowPlaying.title.toUpperCase()} BY ${currentNowPlaying.artistName.toUpperCase()} [${mins}:${secs}]`);
      }
    };

    const tickerInterval = window.setInterval(() => {
        updateSystemTicker();
        updateDjTicker();
    }, 20000);
    updateSystemTicker();
    updateDjTicker();

    return () => {
      clearInterval(tickerInterval);
      broadcastManager.off("nowPlayingChanged", setNowPlayingState);
      broadcastManager.off("nextSongChanged", setNextSongState);
      broadcastManager.off("radioStateChanged", setRadioStateLocal);
      broadcastManager.off("playbackStateChanged", setIsPlaying);
      broadcastManager.off("leaderChanged", setIsLeader);
      broadcastManager.off("timeUpdate", setCurrentTime);
      broadcastManager.off("volumeChanged", setVolumeState);
      broadcastManager.off("mutedChanged", setIsMutedState);
      broadcastManager.off("leaderIdChanged", setLeaderId);
    };
  }, [broadcastManager]);

  const value = useMemo(() => ({
    nowPlaying,
    nextSong,
    radioState,
    isLeader,
    isPlaying,
    currentTime,
    duration: nowPlaying?.durationSec || 0,
    volume,
    isMuted,
    chatMessages,
    profile,
    tickerText,
    leaderboardText,
    djBanter,
    setVolume,
    setMuted,
    togglePlay,
    addChatMessage,
    setProfile,
    downloadSong: (song: Song) => {
      const link = document.createElement('a');
      link.href = song.audioUrl;
      link.target = '_blank';
      link.download = `${song.title} - ${song.artistName}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    setTickerText,
    setDjBanter,
    setRadioState,
    setNowPlaying,
    setNextSong,
    leaderId,
    twitchChannel,
    setTwitchChannel,
    danceFloorEnabled,
    setDanceFloorEnabled,
    sentimentBurst,
    vjEnabled, 
    setVjEnabled,
    liveRating: {
      sum: nowPlaying?.liveStarsSum || 0,
      count: nowPlaying?.liveStarsCount || 0
    },
    castVote: (stars: number) => broadcastManager.castVote(stars),
    claimLeadership: () => broadcastManager.claimLeadership(),
    releaseLeadership: () => broadcastManager.releaseLeadership(),
  }), [
    nowPlaying, nextSong, radioState, isLeader, isPlaying,
    tickerText,
    leaderboardText,
    djBanter,
    setVolume, setMuted, togglePlay, addChatMessage, setProfile, setTickerText, setDjBanter,
    setTickerText, setRadioState, setNowPlaying, setNextSong, leaderId,
    twitchChannel, setTwitchChannel,
    danceFloorEnabled, setDanceFloorEnabled,
    sentimentBurst,
    vjEnabled, setVjEnabled
  ]);


  return (
    <RadioContext.Provider value={value}>
      {children}
    </RadioContext.Provider>
  );
};
