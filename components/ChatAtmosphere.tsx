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
    const particleCount = 70; // High density for 'CGEI' immersion
    
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
      
      // Determine particle type based on mood
      let type: 'circle' | 'heart' | 'rain' | 'emoji' = 'circle';
      let content = '';
      
      if (displayMood === 'love' && Math.random() > 0.3) type = 'heart';
      else if (displayMood === 'sad' && Math.random() > 0.4) type = 'rain';
      else if (['happy', 'playful', 'excited'].includes(displayMood) && Math.random() > 0.6) {
        type = 'emoji';
        const emojis = displayMood === 'happy' ? ['😊', '✨', '⭐'] : 
                      displayMood === 'playful' ? ['🎮', '🎈', '🍭'] : ['🔥', '⚡', '🎉'];
        content = emojis[Math.floor(Math.random() * emojis.length)];
      }

      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: type === 'rain' ? Math.random() * 4 + 2 : Math.random() * 4 + 1,
        speedY: type === 'rain' ? Math.random() * 2 + 3 : Math.random() * 0.4 + 0.1, // Rain falls fast
        speedX: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        type,
        content
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
      type: 'circle' | 'heart' | 'rain' | 'emoji';
      content?: string;
    }

    const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      // top left curve
      ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
      // bottom left curve
      ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
      // bottom right curve
      ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
      // top right curve
      ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        // Move particle
        // Rain falls down, others float up
        if (p.type === 'rain') {
           p.y += p.speedY * (1 + moodState.intensity);
           p.x += p.speedX + (moodState.intensity * 0.5); // Slanted rain
        } else {
           p.y -= p.speedY * (1 + moodState.intensity * 2);
           p.x += p.speedX;
        }
        
        p.pulse += 0.02;
        
        // Wrap around
        if (p.y < -20) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
        } else if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        
        // Final opacity
        const alpha = p.opacity * (0.4 + moodState.intensity * 0.6);
        ctx.fillStyle = p.color.replace('1)', `${alpha})`);
        
        // Draw based on type
        if (p.type === 'heart') {
          drawHeart(ctx, p.x, p.y, p.size * 3);
        } else if (p.type === 'rain') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 2, p.y + p.size * 4);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = p.color.replace('1)', `${alpha * 0.5})`);
          ctx.stroke();
        } else if (p.type === 'emoji' && p.content) {
          ctx.font = `${p.size * 5}px Arial`;
          ctx.fillText(p.content, p.x, p.y);
        } else {
          const pulseSize = p.size + Math.sin(p.pulse) * 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Glow effect for all but rain
        if (p.type !== 'rain') {
          ctx.shadowBlur = moodState.intensity * 15;
          ctx.shadowColor = p.color;
        }
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
      
      {/* Vignette Effect - lightened to allow more dance floor visibility */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)'
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
  // Lowered default opacity from 0.3 to 0.1 to allow dance floor to shine through
  const opacityFactor = Math.min(1, 0.1 + intensity * 0.4);

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
