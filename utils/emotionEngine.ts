/**
 * @file EmotionEngine - Mood detection and sentiment analysis for Club Youniverse chat
 * Based on UNI's CGEI (Conversational Generative Emotion Interface) principles
 */

export type MoodType = 'happy' | 'sad' | 'angry' | 'excited' | 'love' | 'playful' | 'cosmic' | 'neutral';

export interface MoodState {
  primary: MoodType;
  intensity: number; // 0-1
  blendFactor: number; // For gradual transitions
}

// Mood detection keywords from UNI sentiment analysis
const MOOD_KEYWORDS: Record<MoodType, string[]> = {
  happy: [
    'love', 'loved', 'loving', 'yay', 'joy', 'happy', 'happiness', 'great', 'awesome',
    'wonderful', 'amazing', 'sweet', 'kiss', 'hugs', 'hug', 'sunshine', 'grateful', 'smile', 'smiling',
    'laughter', 'lol', 'haha', 'hehe', 'xoxo', 'proud', 'blessed', 'excited', 'stoked',
    ':)', ':-)', '❤️', '😊', '😍', 'fire', '🔥', 'lit', 'banging', 'slaps', 'vibes'
  ],
  sad: [
    'sad', 'sorrow', 'cry', 'crying', 'tears', 'tearful', 'lonely', 'miss', 'missing', 'broken',
    'hurt', 'blue', 'down', 'depressed', 'grief', 'unhappy', 'upset', 'mourning', 'sigh', 'tired',
    'exhausted', 'anxious', 'worry', 'worried', 'hopeless', 'melancholy', 'downcast',
    ':(', ':-(', '😢', '😞', '💔', 'ugh', 'damn', 'nooo', 'miss you'
  ],
  angry: [
    'angry', 'mad', 'furious', 'rage', 'annoyed', 'pissed', 'hate', 'argument', 'argue', 'fight',
    'irritated', 'fuming', 'grrr', 'yelling', 'shouting', 'frustrated', 'frustration', 'ticked',
    'conflict', 'blame', 'jealous', 'resent', 'snapped', 'snippy', 'rude', 'hostile',
    '!!!', '???', '😡', '🤬', 'wtf', 'ugh', 'seriously', 'stupid'
  ],
  excited: [
    'excited', 'omg', 'omfg', 'OMG', 'OMG!', '!!!', 'cant wait', 'lets go', 'yes yes', 'yes!',
    'insane', 'crazy', 'wild', 'pumped', 'hyped', ' Electrifying', '🎉', '🎊', 'woohoo', 'yasss',
    'screaming', 'yelling', 'bouncing', 'jumping'
  ],
  love: [
    'love', 'loved', 'loving', 'heart', 'honey', 'sweetie', 'baby', 'dear', 'angel', 'darling',
    'romantic', 'miss you', 'missed', '想你', '愛', 'amour', 'xo', 'xoxo', '❤️', '💕', '💖',
    'kiss', 'hug', 'hugs', 'forever', 'soulmate', '❤️', '💗', '🥰', '😍', '💋'
  ],
  playful: [
    'lol', 'lmao', 'rofl', 'haha', 'hehe', 'jk', 'just kidding', 'sike', 'silly', 'funny',
    'joke', 'prank', 'mischief', 'tease', 'playful', 'wink', '😜', '😏', '😋', '😛',
    'bromance', 'frienda', 'dance', 'party', 'celebrate', 'yolo', 'carpe diem'
  ],
  cosmic: [
    'universe', 'stars', 'space', 'cosmic', 'galaxy', 'infinite', 'eternal', 'astronomical',
    'quantum', 'dimension', 'void', 'nebula', 'supernova', 'black hole', 'astral', 'celestial',
    '✨', '🌌', '⭐', '🌟', '🔮', 'mystical', 'magical', 'spiritual', 'transcend'
  ],
  neutral: []
};

/**
 * Detect mood from text input
 */
export function detectMood(text: string): MoodState {
  if (!text || text.trim().length === 0) {
    return { primary: 'neutral', intensity: 0, blendFactor: 0 };
  }

  const lowerText = text.toLowerCase();
  let bestMood: MoodType = 'neutral';
  let bestScore = 0;

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (mood === 'neutral') continue;
    
    const score = keywords.filter(keyword => lowerText.includes(keyword)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMood = mood as MoodType;
    }
  }

  // Calculate intensity based on score and text length
  const intensity = Math.min(1, (bestScore * 0.3) + (text.length > 50 ? 0.3 : 0));

  return {
    primary: bestMood,
    intensity,
    blendFactor: intensity > 0.5 ? 1 : 0.5
  };
}

/**
 * Get mood from chat message array (analyzes last few messages)
 */
export function getChatMood(messages: { text: string }[]): MoodState {
  if (messages.length === 0) {
    return { primary: 'neutral', intensity: 0, blendFactor: 0 };
  }

  // Analyze last 5 messages for recent mood
  const recentMessages = messages.slice(-5);
  const moodScores: Record<MoodType, number> = {
    happy: 0, sad: 0, angry: 0, excited: 0,
    love: 0, playful: 0, cosmic: 0, neutral: 0
  };

  recentMessages.forEach(msg => {
    const mood = detectMood(msg.text);
    if (mood.intensity > 0.2) {
      moodScores[mood.primary] += mood.intensity;
    }
  });

  // Find dominant mood
  let dominantMood: MoodType = 'neutral';
  let maxScore = 0;
  
  for (const [mood, score] of Object.entries(moodScores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantMood = mood as MoodType;
    }
  }

  const totalIntensity = Object.values(moodScores).reduce((a, b) => a + b, 0);

  return {
    primary: dominantMood,
    intensity: Math.min(1, totalIntensity / recentMessages.length),
    blendFactor: maxScore > 2 ? 1 : 0.5
  };
}

/**
 * Get mood colors for UI styling
 */
export function getMoodColors(mood: MoodType): { bg: string; border: string; glow: string; text: string } {
  const colorMap: Record<MoodType, { bg: string; border: string; glow: string; text: string }> = {
    happy: {
      bg: 'from-amber-500/20 to-yellow-400/10',
      border: 'border-amber-400/50',
      glow: 'shadow-amber-500/30',
      text: 'text-amber-100'
    },
    sad: {
      bg: 'from-blue-600/20 to-indigo-500/10',
      border: 'border-blue-400/50',
      glow: 'shadow-blue-500/30',
      text: 'text-blue-100'
    },
    angry: {
      bg: 'from-red-600/25 to-orange-500/10',
      border: 'border-red-400/60',
      glow: 'shadow-red-500/40',
      text: 'text-red-100'
    },
    excited: {
      bg: 'from-pink-500/25 to-purple-400/15',
      border: 'border-pink-400/60',
      glow: 'shadow-pink-500/40',
      text: 'text-pink-100'
    },
    love: {
      bg: 'from-rose-500/25 to-pink-400/15',
      border: 'border-rose-400/60',
      glow: 'shadow-rose-500/40',
      text: 'text-rose-100'
    },
    playful: {
      bg: 'from-green-500/20 to-teal-400/10',
      border: 'border-green-400/50',
      glow: 'shadow-green-500/30',
      text: 'text-green-100'
    },
    cosmic: {
      bg: 'from-violet-600/25 to-purple-500/15',
      border: 'border-violet-400/60',
      glow: 'shadow-violet-500/40',
      text: 'text-violet-100'
    },
    neutral: {
      bg: 'from-zinc-600/20 to-zinc-500/10',
      border: 'border-zinc-500/40',
      glow: 'shadow-zinc-500/20',
      text: 'text-zinc-200'
    }
  };

  return colorMap[mood] || colorMap.neutral;
}

/**
 * Get atmosphere video for mood
 */
export function getMoodAtmosphere(mood: MoodType): string | null {
  // Map moods to atmosphere folders in UNI
  const atmosphereMap: Partial<Record<MoodType, string>> = {
    happy: '/atmosphere/happy',
    excited: '/atmosphere/excited',
    love: '/atmosphere/love',
    playful: '/atmosphere/playful',
    angry: '/atmosphere/angry',
    cosmic: '/atmosphere/cosmic',
    sad: '/atmosphere/neutral', // Sad uses neutral as fallback
    neutral: '/atmosphere/neutral'
  };

  return atmosphereMap[mood] || null;
}

/**
 * Get mood display name with emoji
 */
export function getMoodLabel(mood: MoodType): string {
  const labels: Record<MoodType, string> = {
    happy: 'Happy Vibes',
    sad: 'Melancholy',
    angry: 'Stormy',
    excited: 'Electric',
    love: 'Loving',
    playful: 'Playful',
    cosmic: 'Cosmic',
    neutral: 'Chill'
  };
  return labels[mood] || 'Chill';
}
