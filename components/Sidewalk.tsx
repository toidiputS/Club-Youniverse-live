/**
 * @file Sidewalk Component - The Curb Landing Page
 * Free tier experience: Listen to music, chat with other listeners
 * Gritty, urban, underground club vibes
 */

import React, { useState, useEffect, useRef } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { supabase } from "../services/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Users, Music, Lock, ChevronRight, Sparkles } from "lucide-react";

interface ChatMessage {
  id: string;
  text: string;
  username: string;
  timestamp: number;
}

const ANONYMOUS_NAMES = [
  "StreetWalker", "NightOwl", "BeatChaser", "NeonDreams", "SynthWave",
  "MidnightRider", "GlowSticks", "BassDrop", "VinylSoul", "DJShadow",
  "CosmicDust", "Starlight", "PulseBeat", "EchoChamber", "NightMarket",
  "ConcreteJungle", "NeonSigns", "GraffitiSoul", "SubwayTiles", "BrickWalls"
];

const SAMPLE_CHAT = [
  { username: "StreetWalker_42", text: "this track is absolutely fire 🔥" },
  { username: "NeonDreams", text: "been out here for an hour not going anywhere" },
  { username: "BeatChaser", text: "how do i get my invite to the inside tho?" },
  { username: "SynthWave", text: "the AI dj been going OFF tonight" },
  { username: "MidnightRider", text: "who made this song?? generated or what" },
  { username: "GlowSticks", text: "yall ever notice the bass on this system" },
  { username: "NightOwl", text: "247 people outside rn thats crazy" },
];

export const Sidewalk: React.FC = () => {
  const context = React.useContext(RadioContext);
  const [isMuted, setIsMuted] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [listenerCount] = useState(Math.floor(Math.random() * 200) + 150);
  const chatRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate anonymous username
  const [myUsername] = useState(() => {
    const name = ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];
    const num = Math.floor(Math.random() * 100) + 1;
    return `${name}_${num}`;
  });

  // Load sample chat on mount
  useEffect(() => {
    const initial: ChatMessage[] = SAMPLE_CHAT.map((msg, i) => ({
      id: `init-${i}`,
      username: msg.username,
      text: msg.text,
      timestamp: Date.now() - (SAMPLE_CHAT.length - i) * 5000
    }));
    setChatMessages(initial);

    // Simulate incoming messages
    const interval = setInterval(() => {
      const msgs = [
        "this bass is hitting different rn",
        "who else waiting for that drop",
        "yo someone tell me what genre this is",
        "the vibes out here are immaculate",
        "been listening for 2 hours straight",
        "love how every song is AI generated",
        "the velvet rope is real yall",
        "someone get me an invite code 🙏",
        "AI dj said some wild stuff last night",
        "this is literally the future of radio"
      ];
      const names = [...ANONYMOUS_NAMES, "Anonymous", "Listener", "Wanderer", "Raver"];
      const name = names[Math.floor(Math.random() * names.length)];
      const num = Math.floor(Math.random() * 100) + 1;
      
      setChatMessages(prev => [...prev.slice(-20), {
        id: `live-${Date.now()}`,
        username: `${name}_${num}`,
        text: msgs[Math.floor(Math.random() * msgs.length)],
        timestamp: Date.now()
      }]);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(() => {});
        setIsMuted(false);
      } else {
        audioRef.current.pause();
        setIsMuted(true);
      }
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages(prev => [...prev.slice(-20), {
      id: `user-${Date.now()}`,
      username: myUsername,
      text: chatInput.trim(),
      timestamp: Date.now()
    }]);
    setChatInput("");
  };

  const enterClub = () => {
    // Redirect to main app (will check premium status)
    window.location.href = "/club";
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: "#0A0A0F" }}>
      {/* Gritty Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Brick texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Fog overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Vignette */}
        <div 
          className="absolute inset-0"
style={{
            background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.7) 100%)"
          }}
        />
        
        {/* Neon glow spots */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[150px] opacity-20" style={{ background: "#FF2D55" }} />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-[120px] opacity-15" style={{ background: "#00F5FF" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Header / Graffiti Tag */}
        <motion.div 
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Graffiti-style tag */}
          <div className="relative inline-block mb-4">
            <span 
              className="text-xs md:text-sm font-mono tracking-[0.5em] uppercase opacity-40"
              style={{ color: "#8888AA" }}
            >
              est. 2025
            </span>
          </div>
          
          {/* Main Title - Neon Style */}
          <div className="relative">
            <h1 
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-2"
              style={{
                fontFamily: "'Permanent Marker', cursive",
                color: "#FF2D55",
                textShadow: `
                  0 0 10px #FF2D55,
                  0 0 20px #FF2D55,
                  0 0 40px #FF2D55,
                  0 0 80px #FF2D55
                `
              }}
            >
              CLUB
            </h1>
            <h1 
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight"
              style={{
                fontFamily: "'Permanent Marker', cursive",
                color: "#00F5FF",
                textShadow: `
                  0 0 10px #00F5FF,
                  0 0 20px #00F5FF,
                  0 0 40px #00F5FF,
                  0 0 80px #00F5FF
                `
              }}
            >
              YOUNIVERSE
            </h1>
            
            {/* Neon flicker effect */}
            <div 
              className="absolute inset-0 animate-pulse"
              style={{ opacity: 0.03 }}
            />
          </div>
          
          <p 
            className="mt-4 text-lg md:text-xl font-medium tracking-wide"
            style={{ color: "#8888AA" }}
          >
            THE CURB IS WHERE WE VIBE.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          
          {/* LEFT COLUMN - Now Playing */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Now Playing Card */}
            <div 
              className="rounded-2xl p-6 mb-4 border"
              style={{
                background: "linear-gradient(145deg, #1A1A24 0%, #0F0F18 100%)",
                borderColor: "rgba(255, 45, 85, 0.3)"
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-4 h-4" style={{ color: "#FF2D55" }} />
                <span 
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: "#FF2D55" }}
                >
                  Now Playing Outside
                </span>
              </div>
              
              {/* Album Art */}
              <div className="relative mb-4">
                <div 
                  className="aspect-square rounded-xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #FF2D55 0%, #00F5FF 100%)"
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-20 h-20 opacity-30 text-white" />
                  </div>
                </div>
                {/* Glow effect */}
                <div 
                  className="absolute inset-0 rounded-xl -z-10 blur-xl opacity-50"
                  style={{ background: "linear-gradient(135deg, #FF2D55 0%, #00F5FF 100%)" }}
                />
              </div>
              
              {/* Track Info */}
              <div className="text-center mb-4">
                <h3 
                  className="text-xl font-bold mb-1"
                  style={{ color: "#FFFFFF" }}
                >
                  {context?.nowPlaying?.title || "Midnight Protocol"}
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: "#8888AA" }}
                >
                  {context?.nowPlaying?.artistName || "Neon Dreamers"}
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div 
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: "#1A1A24" }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: context?.nowPlaying ? `${(context.currentTime / context.duration) * 100}%` : "45%",
                      background: "linear-gradient(90deg, #FF2D55, #00F5FF)"
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs" style={{ color: "#8888AA" }}>
                  <span>{context?.nowPlaying ? formatTime(context.currentTime) : "1:52"}</span>
                  <span>{context?.nowPlaying ? formatTime(context.duration) : "4:12"}</span>
                </div>
              </div>
              
              {/* Play Button */}
              <button
                onClick={toggleAudio}
                className="w-full py-4 rounded-xl font-bold text-lg tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: isMuted 
                    ? "linear-gradient(135deg, #FF2D55 0%, #CC0033 100%)"
                    : "linear-gradient(135deg, #00F5FF 0%, #00CCDD 100%)",
                  color: "#FFFFFF",
                  boxShadow: isMuted
                    ? "0 0 30px rgba(255, 45, 85, 0.4)"
                    : "0 0 30px rgba(0, 245, 255, 0.4)"
                }}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-5 h-5" />
                    JOIN THE FREQUENCY
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    LISTENING...
                  </>
                )}
              </button>
              
              {/* Listener Count */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#00F5FF" }}
                />
                <span className="text-sm" style={{ color: "#8888AA" }}>
                  <span className="font-bold" style={{ color: "#FFFFFF" }}>{listenerCount}</span> souls vibing outside
                </span>
              </div>
            </div>

            {/* Up Next */}
            <div 
              className="rounded-2xl p-4 border"
              style={{
                background: "#1A1A24",
                borderColor: "rgba(0, 245, 255, 0.2)"
              }}
            >
              <h4 
                className="text-xs font-bold tracking-widest uppercase mb-3"
                style={{ color: "#00F5FF" }}
              >
                Tonight's Rotation
              </h4>
              <div className="space-y-2">
                {[
                  { title: "Cyber Heart", artist: "Void Walker", status: "next" },
                  { title: "Synthwave Rebellion", artist: "Digital Ghost", status: "queue" },
                  { title: "Binary Sunset", artist: "Chrome Dreams", status: "queue" },
                ].map((track, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg transition-colors"
                    style={{ background: "#0F0F18" }}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold" style={{ background: track.status === "next" ? "#00F5FF" : "#1A1A24", color: track.status === "next" ? "#0A0A0F" : "#8888AA" }}>
                      {i + 2}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#FFFFFF" }}>{track.title}</p>
                      <p className="text-xs truncate" style={{ color: "#8888AA" }}>{track.artist}</p>
                    </div>
                    {track.status === "next" && (
                      <span className="text-xs font-bold uppercase" style={{ color: "#00F5FF" }}>Up Next</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-center text-xs mt-3" style={{ color: "#8888AA" }}>
                +847 more songs in the box
              </p>
            </div>
          </motion.div>

          {/* RIGHT COLUMN - Chat & CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4"
          >
            
            {/* Free Chat */}
            <div 
              className="rounded-2xl flex flex-col overflow-hidden border"
              style={{
                background: "#1A1A24",
                borderColor: "rgba(136, 136, 170, 0.2)"
              }}
            >
              <div 
                className="px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: "rgba(136, 136, 170, 0.2)" }}
              >
                <Users className="w-4 h-4" style={{ color: "#FFE600" }} />
                <span 
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: "#FFE600" }}
                >
                  The Curb - Chat With The Outside
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00F5FF" }} />
                  <span className="text-xs" style={{ color: "#8888AA" }}>{listenerCount}</span>
                </div>
              </div>
              
              {/* Messages */}
              <div 
                ref={chatRef}
                className="flex-grow p-3 space-y-2 overflow-y-auto"
                style={{ maxHeight: "280px", minHeight: "200px" }}
              >
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: msg.username === myUsername ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-sm ${msg.username === myUsername ? "opacity-80" : ""}`}
                  >
                    <span 
                      className="font-bold"
                      style={{ color: msg.username === myUsername ? "#00F5FF" : "#FF2D55" }}
                    >
                      {msg.username}:
                    </span>{" "}
                    <span style={{ color: "#FFFFFF" }}>{msg.text}</span>
                  </motion.div>
                ))}
              </div>
              
              {/* Input */}
              <form 
                onSubmit={sendChat}
                className="p-3 border-t"
                style={{ borderColor: "rgba(136, 136, 170, 0.2)" }}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Drop a vibe..."
                    className="flex-grow px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                    style={{
                      background: "#0F0F18",
                      border: "1px solid rgba(136, 136, 170, 0.2)",
                      color: "#FFFFFF",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all disabled:opacity-50"
                    style={{ background: "#FF2D55", color: "#FFFFFF" }}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>

            {/* Velvet Rope CTA */}
            <div 
              className="rounded-2xl p-6 border relative overflow-hidden"
              style={{
                background: "linear-gradient(145deg, #1A1A24 0%, #0F0F18 100%)",
                borderColor: "rgba(255, 230, 0, 0.3)"
              }}
            >
              {/* Rope graphic */}
              <div className="absolute top-0 left-0 right-0 h-2 flex">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <div 
                    key={i}
                    className="flex-grow"
                    style={{ background: i % 2 === 0 ? "#8B6914" : "#FFE600" }}
                  />
                ))}
              </div>
              
              <div className="text-center pt-2">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Lock className="w-5 h-5" style={{ color: "#FFE600" }} />
                  <span 
                    className="text-lg font-bold tracking-wider uppercase"
                    style={{ color: "#FFE600" }}
                  >
                    The Velvet Rope
                  </span>
                </div>
                
                <p className="text-sm mb-6" style={{ color: "#8888AA" }}>
                  Out here you can listen and vibe.<br />
                  <span className="font-bold" style={{ color: "#FFFFFF" }}>Inside:</span> you decide what plays.
                </p>
                
                {/* Benefits */}
                <div className="space-y-2 mb-6">
                  {[
                    "Vote on what plays next",
                    "Play Youniversal on the dance floor",
                    "Upload your own AI-generated tracks",
                    "Access the DJ booth",
                    "Full chat with all members"
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "#FFE600" }} />
                      <span style={{ color: "#FFFFFF" }}>{benefit}</span>
                    </div>
                  ))}
                </div>
                
                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-black" style={{ color: "#FFFFFF" }}>$19.99</span>
                  <span className="text-sm" style={{ color: "#8888AA" }}>/month</span>
                </div>
                
                {/* CTA Button */}
                <button
                  onClick={enterClub}
                  className="w-full py-4 rounded-xl font-bold text-lg tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #FFE600 0%, #FFB800 100%)",
                    color: "#0A0A0F",
                    boxShadow: "0 0 30px rgba(255, 230, 0, 0.4)"
                  }}
                >
                  <Lock className="w-5 h-5" />
                  ENTER THE CLUB
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                <p className="text-xs mt-3" style={{ color: "#8888AA" }}>
                  Or{" "}
                  <button 
                    className="underline font-bold"
                    style={{ color: "#00F5FF" }}
                    onClick={() => window.location.href = "/club"}
                  >
                    sign in
                  </button>
                  {" "}if you're already a member
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs" style={{ color: "#8888AA" }}>
            © 2025 Club Youniverse | Open Source Music Pool
          </p>
          <p className="text-xs mt-1" style={{ color: "#666688" }}>
            All tracks AI-generated | Made with{" "}
            <span style={{ color: "#FF2D55" }}>♥</span>{" "}
            by the YNVRSE
          </p>
        </motion.div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} loop>
        <source src={context?.nowPlaying?.audioUrl || ""} type="audio/mp3" />
      </audio>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default Sidewalk;
