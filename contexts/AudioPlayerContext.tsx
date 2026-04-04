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
  djBanter: string;
  vjEnabled: boolean;
  danceFloorEnabled: boolean;


  // Actions
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  togglePlay: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  setTickerText: (text: string) => void;
  setDjBanter: (text: string) => void;
  setVjEnabled: (enabled: boolean) => void;
  setDanceFloorEnabled: (enabled: boolean) => void;


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
  const [djBanter, setDjBanter] = useState("DJ Python is loading up the decks... Please stand by.");
  const [vjEnabled, setVjEnabled] = useState(true);
  const [danceFloorEnabled, setDanceFloorEnabledLocal] = useState(false);

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
  }, []);

  const setRadioState = useCallback((state: RadioState) => {
    broadcastManager.setRadioState(state);
  }, [broadcastManager]);

  const setDanceFloorEnabled = useCallback((enabled: boolean) => {
    setDanceFloorEnabledLocal(enabled);
    broadcastManager.sendSiteCommand("dance_floor", { enabled });
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
      }
    });

    // Initial Sync
    setNowPlayingState(broadcastManager.getNowPlaying());
    setNextSongState(broadcastManager.getNextSong());
    setRadioStateLocal(broadcastManager.getRadioState());
    setIsPlaying(broadcastManager.isPlaying());
    setIsLeader(broadcastManager.isLeader);

    return () => {
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
    vjEnabled,
    setVjEnabled,
    danceFloorEnabled,
    setDanceFloorEnabled,
    claimLeadership: () => broadcastManager.claimLeadership(),

    releaseLeadership: () => broadcastManager.releaseLeadership(),
  }), [
    nowPlaying, nextSong, radioState, isLeader, isPlaying,
    currentTime, volume, isMuted, chatMessages, profile, tickerText, djBanter,
    setVolume, setMuted, togglePlay, addChatMessage, setProfile, setTickerText, setDjBanter,
    setTickerText, setRadioState, setNowPlaying, setNextSong, leaderId,
    vjEnabled, setVjEnabled,
    danceFloorEnabled, setDanceFloorEnabled
  ]);


  return (
    <RadioContext.Provider value={value}>
      {children}
    </RadioContext.Provider>
  );
};
