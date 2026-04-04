import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChoreographedLine, AnimationType } from '../types';

interface LyricStageProps {
  currentLine: ChoreographedLine | null;
  nextLine: ChoreographedLine | null;
  previousLine: ChoreographedLine | null;
  intensity?: number;
}

type TransitionType = 'glitch' | 'wipe' | 'flash' | null;

const getFontClass = (font: string | undefined) => {
  switch (font) {
    case 'marker': return 'font-marker';
    case 'tech': return 'font-tech';
    default: return 'font-sans font-black';
  }
};

const getPerpetualAnimation = (type: AnimationType | undefined) => {
  switch (type) {
    case AnimationType.BOUNCE: return 'animate-bounce';
    case AnimationType.SHAKE: return 'animate-shake';
    case AnimationType.GLITCH: return 'animate-glitch';
    case AnimationType.SLIDE: return 'animate-float';
    case AnimationType.EXPLODE: return 'animate-pulse-fast';
    default: return '';
  }
};

export const LyricStage: React.FC<LyricStageProps> = ({ currentLine, nextLine, previousLine, intensity = 0 }) => {
  
  // Transition State
  const [transitionType, setTransitionType] = useState<TransitionType>(null);

  // Trigger transition effect when line ID changes
  useEffect(() => {
    if (currentLine?.id) {
      // Pick a random transition for variety
      const effects: TransitionType[] = ['glitch', 'wipe', 'flash', 'glitch']; 
      const randomEffect = effects[Math.floor(Math.random() * effects.length)];
      
      setTransitionType(randomEffect);
      
      // Reset after animation duration
      const timer = setTimeout(() => {
        setTransitionType(null);
      }, 400); // 400ms matches max duration of css animations
      
      return () => clearTimeout(timer);
    }
  }, [currentLine?.id]);

  // Memoize word data to generate stable random values for each word
  const wordData = useMemo(() => {
    if (!currentLine?.text) return [];
    const sentiment = currentLine.meta?.sentiment || 'bright';
    
    return currentLine.text.split(' ').map((word: string, i: number) => {
      // Deterministic "randomness" based on word content and index
      const seed = word.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + i;
      
      let animation: { initial: any; animate: any };
      
      // Sentiment-based animation logic
      if (sentiment === 'energetic') {
        animation = { initial: { opacity: 0, scale: 0, rotate: -45 }, animate: { opacity: 1, scale: 1, rotate: 0 } };
      } else if (sentiment === 'calm') {
        animation = { initial: { opacity: 0, filter: 'blur(10px)' }, animate: { opacity: 1, filter: 'blur(0px)' } };
      } else if (sentiment === 'dark') {
        animation = { initial: { opacity: 0, y: -20, scale: 1.2 }, animate: { opacity: 1, y: 0, scale: 1 } };
      } else { // bright
        animation = { initial: { opacity: 0, y: 20, scale: 0.8 }, animate: { opacity: 1, y: 0, scale: 1 } };
      }

      // Add some extra variety even within sentiment
      const variety = [
        {}, // No change
        { x: (seed % 2 === 0 ? -10 : 10) }, // Slight horizontal shift
        { rotate: (seed % 10) - 5 }, // Slight rotation
      ][seed % 3];

      return {
        text: word,
        rotation: (Math.random() - 0.5) * 12,
        animation: {
          initial: { ...animation.initial, ...variety },
          animate: { ...animation.animate, ...variety }
        }
      };
    });
  }, [currentLine]);

  // Determine font size based on character length to prevent overflow
  const getAdaptiveSize = (text: string) => {
    const len = text.length;
    if (len < 5) return 'text-4xl md:text-6xl lg:text-8xl'; // Short words -> Huge
    if (len < 15) return 'text-3xl md:text-5xl lg:text-7xl'; // Medium phrases -> Big
    if (len < 25) return 'text-2xl md:text-4xl lg:text-5xl'; // Longer -> Medium
    if (len < 40) return 'text-xl md:text-3xl lg:text-4xl'; // Sentences -> Small
    return 'text-base md:text-lg lg:text-xl'; // Paragraphs -> Smallest
  };

  if (!currentLine) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse font-tech tracking-widest text-sm md:text-base">
        WAITING FOR SIGNAL...
      </div>
    );
  }

  const { meta } = currentLine;
  const isGlitch = meta?.animation === AnimationType.GLITCH;
  const fontClass = getFontClass(meta?.fontFamily);
  const perpetualClass = getPerpetualAnimation(meta?.animation);
  const sizeClass = getAdaptiveSize(currentLine.text);

  // Helper to render the word set
  const renderWords = (isReflection = false) => {
    const baseDelay = 0.12 - (intensity * 0.08); 
    const lengthModifier = wordData.length > 5 ? 0.5 : 1;
    const staggerDelay = Math.max(0.02, baseDelay * lengthModifier);

    return (
      <div 
        className="flex flex-wrap justify-center items-center gap-y-1"
        style={{
          columnGap: 'calc(0.3em + var(--audio-mid, 0) * 0.8em)'
        }}
      >
        {wordData.map((item: any, i: number) => (
          <motion.span 
            key={`${currentLine.id}-${i}-${isReflection ? 'ref' : 'main'}`} 
            className="inline-block origin-bottom"
            initial={item.animation.initial}
            animate={item.animation.animate}
            transition={{
              duration: 0.6,
              delay: i * staggerDelay,
              ease: [0.2, 0.8, 0.2, 1]
            }}
          >
            <span 
              className="inline-block"
              style={{ transform: `rotate(${item.rotation}deg)` }}
            >
              <span 
                className={`inline-block ${perpetualClass}`}
                style={{
                  animationDelay: meta?.animation === AnimationType.BOUNCE ? `${i * 0.1}s` : '0s'
                } as any}
              >
                {item.text}
              </span>
            </span>
          </motion.span>
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden perspective-1000 p-8 md:p-12">
        
      {/* Transition Effects Layer (Overlay) */}
      {transitionType === 'wipe' && (
        <div className="absolute left-0 w-full h-1/4 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent animate-scanline-wipe z-50 pointer-events-none blur-md" />
      )}

      {transitionType === 'flash' && (
         <div className="absolute inset-0 bg-white animate-flash-fade z-50 pointer-events-none mix-blend-overlay" />
      )}

      {/* Background Echo / Secondary Text */}
      <AnimatePresence mode="wait">
        {meta?.secondaryText && (
          <motion.div 
            key={`echo-${currentLine.id}`}
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 0.1, scale: 1.5, y: 0 }}
            exit={{ opacity: 0, scale: 2, y: -50 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute text-4xl md:text-6xl font-black select-none pointer-events-none whitespace-nowrap blur-sm"
            style={{ 
              color: meta.color,
              top: '20%',
              transform: `rotate(${-1 * (meta.rotation || 0)}deg)`
            }}
          >
            {meta.secondaryText.toUpperCase()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previous Line - Ghost Zoom Out */}
      <AnimatePresence>
        {previousLine && (
          <motion.div 
            key={`prev-${previousLine.id}`}
            initial={{ opacity: 0.3, scale: 1.1, y: 0, filter: 'blur(0px)' }}
            animate={{ opacity: 0, scale: 0.6, y: -100, filter: 'blur(10px)' }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          >
            <div 
               className={`text-center font-bold ${getFontClass(previousLine.meta?.fontFamily)}`} 
               style={{ 
                 fontSize: 'clamp(2rem, 6vw, 6rem)', 
                 color: previousLine.meta?.color,
                 transform: `rotate(${previousLine.meta?.rotation || 0}deg)`,
               }}
            >
               {previousLine.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Lyric Wrapper - Handles Glitch Transition */}
      <div className={`w-full flex justify-center items-center ${transitionType === 'glitch' ? 'animate-glitch-snap' : ''}`}>
          
        {/* Main Lyric Display */}
        <motion.div 
          key={currentLine.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full flex justify-center items-center max-w-[90%]"
          style={{
            transform: `scale(${ (meta?.scale || 1) * (1 + (typeof window !== 'undefined' ? 0.05 : 0)) }) rotate(${meta?.rotation || 0}deg)`,
          }}
        >
          {/* Inner wrapper for audio reactivity */}
            <div style={{
               transform: 'scale(calc(1 + var(--audio-bass, 0) * 0.12))',
               transition: 'transform 0.04s ease-out'
            }}>
              <div 
                className={`leading-tight text-center ${fontClass} ${sizeClass}`}
                style={{ 
                  color: isGlitch ? 'white' : meta?.color,
                  textShadow: isGlitch 
                    ? `2px 0 red, -2px 0 blue` 
                    : `0 0 10px ${meta?.color || 'white'}, 0 0 calc(20px + var(--audio-bass, 0) * 120px) ${meta?.color || 'white'}`,
                  filter: 'saturate(calc(120% + var(--audio-bass, 0) * 180%)) brightness(calc(100% + var(--audio-treble, 0) * 80%))'
                }}
              >
                {renderWords(false)}
              </div>
            </div>
            
          {/* Mirror Reflection Effect */}
            <div 
              className={`absolute left-0 right-0 top-[90%] transform -scale-y-100 pointer-events-none select-none text-center ${fontClass} ${sizeClass} leading-tight`}
              style={{ 
                color: meta?.color,
                opacity: 'calc(0.2 + var(--audio-mid, 0) * 0.7)',
                filter: 'blur(calc(1px + var(--audio-mid, 0) * 12px)) saturate(calc(150% + var(--audio-bass, 0) * 150%))'
              }}
            >
              {renderWords(true)}
            </div>
        </motion.div>
      </div>

      {/* Next Line - Preview */}
      <div className="absolute bottom-6 opacity-40 transform translate-y-4 scale-90 transition-all duration-500 max-w-[80%] text-center">
        <p className="text-[10px] md:text-xs text-gray-300 font-sans tracking-wide truncate">
          {nextLine?.text ? `>> ${nextLine.text}` : ''}
        </p>
      </div>

    </div>
  );
};
