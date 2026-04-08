/**
 * @file ChatAtmosphere - Mood-reactive background component for chat
 * Inspired by UNI's BackgroundCanvas - morphs backgrounds based on chat mood
 */

import React, { useEffect, useState, useRef } from 'react';
import { type MoodType, getChatMood, type MoodState } from '../utils/emotionEngine';

interface ChatAtmosphereProps {
  messages: { text: string }[];
  /** Show the mood indicator badge */
  showMoodBadge?: boolean;
  /** Show floating particles */
  showParticles?: boolean;
  children?: React.ReactNode;
}

/**
 * ChatAtmosphere - Provides mood-reactive atmospheric background for chat
 * Features:
 * - Smooth gradient transitions between moods
 * - Floating particle effects
 * - Mood state indicator
 * - Subtle animations tied to mood intensity
 */
export const ChatAtmosphere: React.FC<ChatAtmosphereProps> = ({
  messages,
  showMoodBadge = true,
  showParticles = true,
  children
}) => {
  const [moodState, setMoodState] = useState<MoodState>({
    primary: 'neutral',
    intensity: 0,
    blendFactor: 0
  });
  const [displayMood, setDisplayMood] = useState<MoodType>('neutral');
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  // Analyze chat mood periodically
  useEffect(() => {
    if (messages.length > 0) {
      const newMood = getChatMood(messages);
      setMoodState(newMood);
      
      // Gradual transition for display mood
      const transitionTimer = setTimeout(() => {
        setDisplayMood(newMood.primary);
      }, 500);
      
      return () => clearTimeout(transitionTimer);
    }
  }, [messages]);

  // Particle animation
  useEffect(() => {
    if (!showParticles) return;
    
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const particleCount = 45; // Increased significantly for 'CGEI intensity'
    
    // Initialize particles
    const initParticles = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle(canvas.width, canvas.height));
      }
    };

    const createParticle = (w: number, h: number): Particle => {
      const colors = getMoodParticleColors(displayMood);
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 3 + 1,
        speedY: Math.random() * 0.3 + 0.1,
        speedX: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2
      };
    };

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      color: string;
      opacity: number;
      pulse: number;
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        // Move particle
        p.y -= p.speedY * (1 + moodState.intensity * 2);
        p.x += p.speedX;
        p.pulse += 0.02;
        
        // Wrap around
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        
        // Draw with pulse effect
        const pulseSize = p.size + Math.sin(p.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace('1)', `${p.opacity * (0.5 + moodState.intensity * 0.5)})`);
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    initParticles();
    animate();

    const handleResize = () => initParticles();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [showParticles, displayMood, moodState.intensity]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Gradient Background - Transitions smoothly between moods */}
      <MoodGradient mood={displayMood} intensity={moodState.intensity} />
      
      {/* Particle Canvas */}
      {showParticles && (
        <canvas 
          ref={particleCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
          style={{ mixBlendMode: 'screen' }}
        />
      )}
      
      {/* Vignette Effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)'
        }}
      />
      
      {/* Content Layer */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
      
      {/* Mood Badge */}
      {showMoodBadge && moodState.intensity > 0.2 && (
        <MoodBadge mood={displayMood} intensity={moodState.intensity} />
      )}
    </div>
  );
};

/**
 * MoodGradient - Animated gradient background that morphs with mood
 */
const MoodGradient: React.FC<{ mood: MoodType; intensity: number }> = ({ mood, intensity }) => {
  const gradientMap: Record<MoodType, { from: string; to: string; accent: string }> = {
    happy: { from: 'from-amber-900/30', to: 'to-yellow-800/20', accent: '#f59e0b' },
    sad: { from: 'from-blue-900/40', to: 'to-indigo-900/30', accent: '#3b82f6' },
    angry: { from: 'from-red-950/50', to: 'to-orange-900/30', accent: '#ef4444' },
    excited: { from: 'from-pink-900/40', to: 'to-purple-900/30', accent: '#ec4899' },
    love: { from: 'from-rose-900/40', to: 'to-pink-900/30', accent: '#f43f5e' },
    playful: { from: 'from-emerald-900/30', to: 'to-teal-900/20', accent: '#10b981' },
    cosmic: { from: 'from-violet-950/50', to: 'to-purple-950/40', accent: '#8b5cf6' },
    neutral: { from: 'from-zinc-900/30', to: 'to-zinc-950/20', accent: '#52525b' }
  };

  const gradient = gradientMap[mood] || gradientMap.neutral;
  const opacityFactor = Math.min(1, 0.3 + intensity * 0.5);

  return (
    <div 
      className={`absolute inset-0 bg-linear-to-b ${gradient.from} ${gradient.to} transition-all duration-1000 ease-out`}
      style={{ opacity: opacityFactor }}
    >
      {/* Animated shimmer overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(${45 + Math.sin(Date.now() / 3000) * 10}deg, transparent 30%, ${gradient.accent}22 50%, transparent 70%)`,
          animation: 'shimmer 8s ease-in-out infinite'
        }}
      />
    </div>
  );
};

/**
 * MoodBadge - Shows current detected mood
 */
const MoodBadge: React.FC<{ mood: MoodType; intensity: number }> = ({ mood, intensity }) => {
  const moodEmoji: Record<MoodType, string> = {
    happy: '☀️',
    sad: '🌧️',
    angry: '⚡',
    excited: '🎉',
    love: '💕',
    playful: '🎮',
    cosmic: '✨',
    neutral: '💫'
  };

  const moodLabel: Record<MoodType, string> = {
    happy: 'Happy',
    sad: 'Melancholy',
    angry: 'Stormy',
    excited: 'Electric',
    love: 'Loving',
    playful: 'Playful',
    cosmic: 'Cosmic',
    neutral: 'Chill'
  };

  return (
    <div 
      className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-md bg-black/30 border border-white/10 transition-all duration-500"
      style={{ opacity: Math.min(1, intensity * 2) }}
    >
      <span className="text-[10px]">{moodEmoji[mood]}</span>
      <span className="text-[8px] font-bold uppercase tracking-wider text-white/80">
        {moodLabel[mood]}
      </span>
      {/* Intensity indicator */}
      <div className="w-8 h-1 rounded-full bg-black/30 overflow-hidden">
        <div 
          className="h-full rounded-full bg-linear-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${intensity * 100}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Helper to get particle colors based on mood
 */
function getMoodParticleColors(mood: MoodType): string[] {
  const colorMap: Record<MoodType, string[]> = {
    happy: ['rgba(251, 191, 36, 1)', 'rgba(245, 158, 11, 1)'],
    sad: ['rgba(96, 165, 250, 1)', 'rgba(59, 130, 246, 1)'],
    angry: ['rgba(248, 113, 113, 1)', 'rgba(239, 68, 68, 1)'],
    excited: ['rgba(236, 72, 153, 1)', 'rgba(192, 132, 252, 1)'],
    love: ['rgba(244, 63, 94, 1)', 'rgba(251, 113, 133, 1)'],
    playful: ['rgba(52, 211, 153, 1)', 'rgba(16, 185, 129, 1)'],
    cosmic: ['rgba(139, 92, 246, 1)', 'rgba(167, 139, 250, 1)'],
    neutral: ['rgba(161, 161, 170, 1)', 'rgba(113, 113, 122, 1)']
  };
  return colorMap[mood] || colorMap.neutral;
};

export default ChatAtmosphere;
