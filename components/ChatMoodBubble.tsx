/**
 * @file ChatMoodBubble - Borderless emotion-reactive chat bubble
 * Morphs colors based on sentiment, blends with atmosphere background
 */

import React, { useEffect, useState } from 'react';
import { detectMood, type MoodType, getMoodColors } from '../utils/emotionEngine';

interface ChatMoodBubbleProps {
  message: string;
  username: string;
  isAdmin?: boolean;
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
  isCurrentUser = false
}) => {
  const [currentMood, setCurrentMood] = useState<MoodType>('neutral');
  
  // Detect mood when message changes
  useEffect(() => {
    const detected = detectMood(message);
    setCurrentMood(detected.primary);
  }, [message]);

  const colors = getMoodColors(currentMood);
  const isMention = message.toLowerCase().includes('@dj');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex flex-col gap-0.5 w-fit max-w-[85%]">
        {/* Username */}
        <div className="flex items-center gap-2 px-1">
          <span className={`text-[7px] font-bold uppercase tracking-wider ${isAdmin ? 'text-purple-400/80' : 'text-zinc-500'}`}>
            {username}
          </span>
          {/* Mood indicator dot - subtle */}
          <div className={`w-1 h-1 rounded-full ${currentMood === 'neutral' ? 'bg-zinc-600' : 'bg-current'}`} 
               style={{ color: colors.text.replace('text-', '') }} />
        </div>

        {/* Message - Frosted Mood Shard Style */}
        <div
          className={`
            relative px-3 py-1.5 w-fit min-w-[24px] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
            bg-white/[0.08] backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.3)]
            ${isCurrentUser 
              ? 'border-r-2 border-white/20' 
              : isMention
                ? 'border-l-2 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.3)]'
                : `border-l-2 border-white/5`
            }
            group hover:scale-[1.04] active:scale-95
          `}
          style={{
            boxShadow: currentMood !== 'neutral' 
              ? `0 0 50px ${getMoodColorHex(currentMood)}40` 
              : '0 4px 20px rgba(0,0,0,0.4)',
            borderRadius: isCurrentUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            background: currentMood !== 'neutral' 
              ? `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, ${getMoodColorHex(currentMood)}15 100%)`
              : 'rgba(255,255,255,0.08)',
            transform: 'scale(calc(1 + var(--audio-bass, 0) * 0.02))',
            transition: 'transform 0.1s ease-out'
          }}
        >
          {/* THE COLOR SHADOW / AURA - INTENSIFIED */}
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
          <div className={`relative z-10 text-[11px] font-black leading-snug tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${isCurrentUser ? 'text-white' : isMention ? 'text-purple-200' : 'text-zinc-100'}`}>
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * SystemMessage - Minimal divider style
 */
export const SystemMessage: React.FC<{ message: string }> = ({
  message
}) => {
  return (
    <div className="flex items-center justify-center gap-3 py-2 animate-in fade-in duration-300 opacity-60">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest px-2">
        {message}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
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
