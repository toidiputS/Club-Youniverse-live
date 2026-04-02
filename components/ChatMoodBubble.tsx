/**
 * @file ChatMoodBubble - Emotion-reactive chat bubble component
 * Inspired by UNI's BubbleMorph - morphs colors based on message sentiment
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
 * ChatMoodBubble - Morphs based on message sentiment
 * Features:
 * - Gradual color transitions (morph effect)
 * - Glow effects based on mood intensity
 * - Smooth animations on sentiment change
 */
export const ChatMoodBubble: React.FC<ChatMoodBubbleProps> = ({
  message,
  username,
  isAdmin = false,
  isCurrentUser = false,
  timestamp
}) => {
  const [currentMood, setCurrentMood] = useState<MoodType>('neutral');
  const [moodTransitioning, setMoodTransitioning] = useState(false);
  
  // Detect mood when message changes
  useEffect(() => {
    const detected = detectMood(message);
    
    if (detected.primary !== currentMood) {
      setMoodTransitioning(true);
      
      // Small delay for transition effect
      const timer = setTimeout(() => {
        setCurrentMood(detected.primary);
        setMoodTransitioning(false);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [message]);

  const colors = getMoodColors(currentMood);
  const isMention = message.toLowerCase().includes('@dj');
  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
      <div className={`flex flex-col gap-0.5 ${isMention ? 'pl-1' : ''}`}>
        {/* Username & Time */}
        <div className="flex items-center gap-2 px-1">
          <span className={`text-[8px] font-black uppercase tracking-widest ${isAdmin ? 'text-purple-400' : 'text-zinc-600'}`}>
            {username}
          </span>
          {timeStr && (
            <span className="text-[6px] text-zinc-700 font-medium">
              {timeStr}
            </span>
          )}
          {/* Mood indicator dot */}
          <MoodIndicator mood={currentMood} isAdmin={isAdmin} />
        </div>

        {/* Message Bubble */}
        <div
          className={`
            relative rounded-lg px-3 py-2 max-w-[85%] transition-all duration-300 ease-out
            ${isCurrentUser 
              ? 'ml-auto bg-gradient-to-br from-purple-600/40 to-pink-500/20 border border-purple-500/30' 
              : isMention
                ? 'bg-gradient-to-br from-purple-900/40 to-indigo-900/20 border border-purple-400/30'
                : `bg-gradient-to-br ${colors.bg} border ${colors.border}`
            }
            ${moodTransitioning ? 'scale-[0.98] opacity-90' : 'scale-100 opacity-100'}
            ${currentMood !== 'neutral' ? `shadow-lg ${colors.glow} shadow-lg` : 'shadow-md shadow-black/20'}
            ${isMention ? 'ring-1 ring-purple-500/20' : ''}
          `}
        >
          {/* Glow effect overlay for high intensity moods */}
          {currentMood !== 'neutral' && (
            <div 
              className={`
                absolute inset-0 rounded-lg opacity-30 
                bg-gradient-to-r ${colors.bg}
                blur-sm animate-pulse
                -z-10
              `}
            />
          )}
          
          {/* Message Text */}
          <div className={`text-[10px] font-medium leading-[1.4] ${isCurrentUser ? 'text-white/90' : isMention ? 'text-purple-200' : colors.text}`}>
            {message}
          </div>

          {/* Mood accent - small colored bar for sentiment */}
          {currentMood !== 'neutral' && (
            <div 
              className={`
                absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full
                bg-gradient-to-r ${colors.bg}
                opacity-60
              `}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * MoodIndicator - Small dot that shows the detected mood
 */
const MoodIndicator: React.FC<{ mood: MoodType; isAdmin?: boolean }> = ({ mood, isAdmin }) => {
  const colorMap: Record<MoodType, string> = {
    happy: 'bg-amber-400',
    sad: 'bg-blue-400',
    angry: 'bg-red-500',
    excited: 'bg-pink-500',
    love: 'bg-rose-500',
    playful: 'bg-green-400',
    cosmic: 'bg-violet-400',
    neutral: 'bg-zinc-500'
  };

  if (isAdmin) return null;

  return (
    <div className="flex items-center gap-1">
      <div 
        className={`
          w-1.5 h-1.5 rounded-full 
          ${colorMap[mood]}
          ${mood !== 'neutral' ? 'animate-pulse' : ''}
        `}
        title={`Mood: ${mood}`}
      />
    </div>
  );
};

/**
 * SystemMessage - For DJ/system announcements
 */
export const SystemMessage: React.FC<{ message: string; timestamp?: number }> = ({
  message,
  timestamp
}) => {
  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  
  return (
    <div className="flex items-center justify-center gap-2 py-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="h-px w-8 bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider px-2">
        {message}
      </span>
      <div className="h-px w-8 bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
      {timeStr && <span className="text-[6px] text-zinc-600">{timeStr}</span>}
    </div>
  );
};

export default ChatMoodBubble;
