/**
 * @file ChatMoodBubble - Borderless emotion-reactive chat bubble
 * Morphs colors based on sentiment, blends with atmosphere background
 */

import React, { useEffect, useState } from 'react';
import { detectMood, type MoodType, getMoodColors } from '../utils/emotionEngine';
import { motion, AnimatePresence } from 'framer-motion';

// --- Particle Definitions ---
const KEYWORD_MAP: Record<string, string> = {
  love: '❤️',
  heart: '💖',
  fire: '🔥',
  lit: '💥',
  dope: '⚡',
  wow: '✨',
  legend: '👑',
  hack: '🛸',
  glitch: '👾',
};

interface ChatMoodBubbleProps {
  message: string;
  username: string;
  isAdmin?: boolean;
  isDj?: boolean;
  isCurrentUser?: boolean;
  timestamp?: number;
}

/**
 * ChatMoodBubble - Borderless, atmosphere-blending bubbles
 * Features:
 * - No visible borders
 * - Soft gradients that blend with background
 * - Subtle glow based on mood intensity
 * - Text-only clean design
 */
export const ChatMoodBubble: React.FC<ChatMoodBubbleProps> = ({
  message,
  username,
  isAdmin = false,
  isDj = false,
  isCurrentUser = false,
  timestamp
}) => {
  const [currentMood, setCurrentMood] = useState<MoodType>('neutral');
  
  // Detect mood when message changes
  useEffect(() => {
    const detected = detectMood(message);
    setCurrentMood(detected.primary);
  }, [message]);

  const colors = getMoodColors(currentMood);
  const isMention = message.toLowerCase().includes('@dj');

  const isDjOrAdmin = isAdmin || isDj || username === "DJ Python" || username === "SYSTEM PROTOCOL";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="w-full flex flex-col pointer-events-none mb-1"
    >
      <div className={`flex flex-col gap-0.5 w-fit max-w-[85%] pointer-events-auto ${isDjOrAdmin ? 'items-end ml-auto' : 'items-start mr-auto'}`}>
        {/* Username */}
        <div className={`flex items-center gap-2 px-1 w-full ${isDjOrAdmin ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[7px] font-bold uppercase tracking-wider ${isDjOrAdmin ? 'text-purple-400/80' : 'text-zinc-500'}`}>
            {username}
          </span>
          {timestamp && (
            <span className="text-[6px] text-white/20 font-mono">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {/* Mood indicator dot - subtle */}
          <div className={`w-1 h-1 rounded-full ${currentMood === 'neutral' ? 'bg-zinc-600' : 'bg-current'}`} 
               style={{ color: colors.text.replace('text-', '') }} />
        </div>

        <div
          className={`
            relative px-2 py-1 w-fit min-w-[24px] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
            bg-black/20 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5
            ${isCurrentUser 
              ? 'border-l-purple-500/30' 
              : isMention
                ? 'border-r-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.3)]'
                : `border-r-white/10`
            }
            group overflow-hidden
          `}
          style={{
            boxShadow: currentMood !== 'neutral' 
              ? `0 0 40px ${getMoodColorHex(currentMood)}30` 
              : '0 4px 20px rgba(0,0,0,0.4)',
            borderRadius: isDjOrAdmin ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            background: currentMood !== 'neutral' 
              ? `linear-gradient(135deg, rgba(0,0,0,0.2) 0%, ${getMoodColorHex(currentMood)}15 100%)`
              : 'rgba(0,0,0,0.2)',
          }}
        >
          {/* 1. GENERATIVE NOISE LAYER */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay">
             <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <filter id={`noise-${username}`}>
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                </filter>
                <rect width="100%" height="100%" filter={`url(#noise-${username})`} />
             </svg>
          </div>

          {/* 2. REACTIVE PARTICLES */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <AnimatePresence mode="popLayout">
                {Object.entries(KEYWORD_MAP).map(([kw, emoji]) => (
                   message.toLowerCase().includes(kw) && (
                      <motion.div
                         key={kw}
                         initial={{ y: 20, opacity: 0, scale: 0 }}
                         animate={{ 
                           y: [-10, -40], 
                           x: Math.random() * 40 - 20,
                           opacity: [0, 0.8, 0], 
                           scale: [0.5, 1.2, 0.8],
                           rotate: Math.random() * 40 - 20 
                         }}
                         transition={{ 
                           duration: 3, 
                           repeat: Infinity, 
                           delay: Math.random() * 2 
                         }}
                         className="absolute bottom-2 left-1/2 text-[12px] filter blur-[0.5px]"
                      >
                         {emoji}
                      </motion.div>
                   )
                ))}
             </AnimatePresence>
          </div>

          {/* THE COLOR SHADOW / AURA */}
          {currentMood !== 'neutral' && (
            <div 
              className="absolute inset-0 rounded-[inherit] opacity-60 animate-pulse pointer-events-none blur-xl"
              style={{ 
                background: `radial-gradient(circle at center, ${getMoodColorHex(currentMood)}50, transparent 80%)`,
                boxShadow: `0 0 35px ${getMoodColorHex(currentMood)}40`
              }}
            />
          )}

          {/* Message Text */}
          <div className={`relative z-10 text-[11px] font-black leading-snug tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${isDjOrAdmin ? 'text-right text-purple-200' : 'text-left text-zinc-100'}`}>
            {message}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * SystemMessage - Minimal divider style
 */
export const SystemMessage: React.FC<{ message: string; timestamp?: number }> = ({
  message,
  timestamp
}) => {
  return (
    <div className="flex items-center justify-center gap-3 py-2 animate-in fade-in duration-300 opacity-60">
      <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-600 to-transparent" />
      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest px-2 flex flex-col items-center">
        {message}
        {timestamp && (
          <span className="text-[6px] text-zinc-600 mt-1 font-mono tracking-normal">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </span>
      <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-600 to-transparent" />
    </div>
  );
};



/**
 * Helper to get mood color hex
 */
function getMoodColorHex(mood: MoodType): string {
  const colorMap: Record<MoodType, string> = {
    happy: '#f59e0b',
    sad: '#3b82f6',
    angry: '#ef4444',
    excited: '#ec4899',
    love: '#f43f5e',
    playful: '#10b981',
    cosmic: '#8b5cf6',
    neutral: '#52525b'
  };
  return colorMap[mood] || colorMap.neutral;
}

export default ChatMoodBubble;
