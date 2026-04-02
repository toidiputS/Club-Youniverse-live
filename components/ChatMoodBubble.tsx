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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex flex-col gap-0.5 max-w-[85%]">
        {/* Username */}
        <div className="flex items-center gap-2 px-1">
          <span className={`text-[7px] font-bold uppercase tracking-wider ${isAdmin ? 'text-purple-400/80' : 'text-zinc-500'}`}>
            {username}
          </span>
          {/* Mood indicator dot - subtle */}
          <div className={`w-1 h-1 rounded-full ${currentMood === 'neutral' ? 'bg-zinc-600' : 'bg-current'}`} 
               style={{ color: colors.text.replace('text-', '') }} />
        </div>

        {/* Message - Borderless, gradient background */}
        <div
          className={`
            relative px-3 py-2 max-w-full transition-all duration-500 ease-out
            ${isCurrentUser 
              ? 'bg-gradient-to-r from-purple-600/40 to-pink-500/30' 
              : isMention
                ? 'bg-gradient-to-r from-purple-900/40 to-indigo-900/30'
                : `bg-gradient-to-r ${colors.bg}`
            }
            ${currentMood !== 'neutral' ? 'shadow-lg' : ''}
          `}
          style={{
            boxShadow: currentMood !== 'neutral' 
              ? `0 0 20px ${getMoodColorHex(currentMood)}30` 
              : 'none',
            borderRadius: '12px 12px 12px 4px' // Rounded except bottom-left
          }}
        >
          {/* Message Text */}
          <div className={`text-[10px] font-medium leading-[1.4] ${isCurrentUser ? 'text-white/90' : isMention ? 'text-purple-200' : colors.text}`}>
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
export const SystemMessage: React.FC<{ message: string; timestamp?: number }> = ({
  message,
  timestamp
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
