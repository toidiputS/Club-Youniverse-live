# src/components

# Lyrical VJ    1\. Install Required Dependencies

# Run this command in your project's root directory:

# npm install framer-motion lucide-react @google/genai   2\. Connect Your Real Audio Data Currently, LyricVisualizer.tsx simulates audio frequencies. To make it react to your actual music, you need to pass real frequency data from your audio player's AnalyserNode.

# In your music app, you likely have a Web Audio API setup. You should extract three key values:

* # **Bass**: Average of low frequencies (0-100Hz)

* # **Mid**: Average of mid frequencies (400-2000Hz)

* # **Treble**: Average of high frequencies (4000Hz+)

# Pass these into the LyricVisualizer via a ref or state so the particles and animations can react to the real music.

### **3\. Update Your Tailwind Configuration**

# The visualizer uses custom fonts and neon effects. Add these to your tailwind.config.js or index.css:

# 

## /\* src/index.css \*/

## @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700\&family=Permanent+Marker\&family=Space+Grotesk:wght@300;700\&display=swap');

## 

## @theme {

##   \--font-sans: "Inter", sans-serif;

##   \--font-marker: "Permanent Marker", cursive;

##   \--font-tech: "Space Grotesk", sans-serif;

## }

### **4\. Implementation Example**

# In your main player component, you would use it like this:

# 

## import { LyricVisualizer } from './components/LyricVisualizer';

## 

## const MyMusicPlayer \= () \=\> {

##   const \[currentTime, setCurrentTime\] \= useState(0);

##   const \[lyrics, setLyrics\] \= useState(myChoreographedLyrics);

## 

##   return (

##     \<div className="relative w-full h-screen bg-black"\>

##       {/\* Your Music Player Controls Here \*/}

##       

##       \<LyricVisualizer 

##         lyrics={lyrics} 

##         currentTime={currentTime} 

##         isPlaying={isPlaying}

##       /\>

##     \</div\>

##   );

## };

### **5\. Handling the AI Choreography**

# 

In your main player component, you would use it like this:

If you want to generate the visual show dynamically for any song:

1. Call generateLyrics(songTitle) to get the timed text.  
2. Call choreographLyrics(lyrics) to get the colors, animations, and sentiments.  
3. Store the result in your database or local state to drive the LyricVisualizer.

**Note on API Keys:** Ensure your GEMINI\_API\_KEY is stored securely in your environment variables (.env) and never exposed directly in client-side code if you are deploying to a public production environment.

# LyricVisualizer.tsx

src/components/LyricVisualizer.tsx

import React, { useRef, useEffect, useMemo } from 'react';  
import { ParticleBackground, AudioData } from './ParticleBackground';  
import { LyricStage } from './LyricStage';  
import { ChoreographedLine, AnimationType } from '../types';

interface LyricVisualizerProps {  
  currentTime: number; // The current playback time in seconds  
  isPlaying: boolean;  // Whether the track is playing  
  lyrics: Partial\<ChoreographedLine\>\[\]; // Can accept plain lyrics (just time/text) or fully choreographed ones  
  className?: string; // Optional styling class  
  volume?: number; // 0 to 1  
}

// Default Neon Palette for Auto-Mode  
const AUTO\_COLORS \= \['\#00f3ff', '\#ff00aa', '\#ccff00', '\#ff3333', '\#bf00ff', '\#ffffff'\];  
const AUTO\_ANIMS: AnimationType\[\] \= \[AnimationType.FADE, AnimationType.SLIDE, AnimationType.BOUNCE, AnimationType.TYPEWRITER\];

export const LyricVisualizer: React.FC\<LyricVisualizerProps\> \= ({   
  currentTime,   
  isPlaying,   
  lyrics,  
  className \= "",  
  volume \= 1  
}) \=\> {  
  const stageRef \= useRef\<HTMLDivElement\>(null);  
  const requestRef \= useRef\<number | undefined\>(undefined);  
    
  // Shared ref for audio data to sync Stage CSS vars and Particle Canvas  
  const audioDataRef \= useRef\<AudioData\>({ bass: 0, mid: 0, treble: 0 });  
    
  // State to track audio reactivity values  
  const audioMetaRef \= useRef({  
    scale: 1,  
    animation: 'fade',  
    isHighEnergy: false  
  });

  // 1\. Determine active lines based on timestamp  
  const currentIndex \= useMemo(() \=\> {  
    return lyrics.findIndex((line, i) \=\> {  
      const nextLine \= lyrics\[i \+ 1\];  
      // Basic check: Current time is after this line, but before the next  
      const time \= line.time || 0;  
      const nextTime \= nextLine?.time || Infinity;  
      return currentTime \>= time && currentTime \< nextTime;  
    });  
  }, \[currentTime, lyrics\]);

  // 2\. Process the Current Line (Apply Auto-VJ logic if meta is missing)  
  const currentLine \= useMemo((): ChoreographedLine | null \=\> {  
    if (currentIndex \=== \-1) return null;  
    const rawLine \= lyrics\[currentIndex\];

    // If we already have AI choreography, use it  
    if (rawLine.meta) {  
      return rawLine as ChoreographedLine;  
    }

    // \--- AUTO-VJ FALLBACK \---  
    // If just plain text, generate deterministic effects based on the line's ID or Text content  
    // This ensures the same line always gets the same "random" color/animation  
    const seed \= (rawLine.id || rawLine.text || "").split('').reduce((acc, char) \=\> acc \+ char.charCodeAt(0), 0);  
    const color \= AUTO\_COLORS\[seed % AUTO\_COLORS.length\];  
    const anim \= AUTO\_ANIMS\[seed % AUTO\_ANIMS.length\];  
      
    // Detect high energy keywords for auto-scaling  
    const text \= (rawLine.text || "").toUpperCase();  
    const isLoud \= text.includes('\!') || text.length \< 5; 

    return {  
      id: rawLine.id || \`auto-${currentIndex}\`,  
      time: rawLine.time || 0,  
      text: rawLine.text || "",  
      meta: {  
        color: color,  
        animation: anim,  
        scale: isLoud ? 1.5 : 1,  
        rotation: (seed % 10\) \- 5, // \-5 to 5 degrees  
        fontFamily: seed % 2 \=== 0 ? 'sans' : 'tech',  
        secondaryText: undefined  
      }  
    };  
  }, \[currentIndex, lyrics\]);

  const nextLine \= currentIndex \!== \-1 && currentIndex \+ 1 \< lyrics.length ? lyrics\[currentIndex \+ 1\] as ChoreographedLine : null;  
  const previousLine \= currentIndex \> 0 ? lyrics\[currentIndex \- 1\] as ChoreographedLine : null;

  // 3\. Sync current lyric meta to ref for the animation loop  
  useEffect(() \=\> {  
    if (currentLine?.meta) {  
      audioMetaRef.current \= {  
        scale: currentLine.meta.scale || 1,  
        animation: currentLine.meta.animation || 'fade',  
        isHighEnergy: (currentLine.meta.scale \> 1.2 || currentLine.meta.animation \=== 'explode')  
      };  
    } else {  
      audioMetaRef.current \= { scale: 0, animation: 'fade', isHighEnergy: false };  
    }  
  }, \[currentLine\]);

  // 4\. Calculate "Intensity" for ParticleBackground  
  const bgIntensity \= (isPlaying && currentLine?.meta?.scale   
    ? Math.max(0, (currentLine.meta.scale \- 0.8) / 1.5)   
    : 0\) \* volume;

  // 5\. Audio Simulation Loop  
  // This runs independently of the parent's render cycle to ensure smooth 60fps animations  
  const animate \= (time: number) \=\> {  
    if (stageRef.current && isPlaying) {  
      const t \= time / 1000;  
      const meta \= audioMetaRef.current;

      // \--- Enhanced Rhythmic Simulation (120 BPM) \---  
        
      // BASS: Kick Drum (4/4 Beat)  
      // t \* 2 means 2 beats per second \= 120 BPM  
      // Modulo 1 creates a sawtooth wave 0-\>1 every beat  
      const beatPhase \= (t \* 2\) % 1;   
      // Exponential decay: Starts at 1, drops quickly to 0\.   
      // Math.exp(-6 \* x) is a standard envelope shape for percussion  
      const kickEnvelope \= Math.exp(-6 \* beatPhase);  
      let bass \= kickEnvelope \* Math.min(meta.scale, 1.5);

      // MID: Snare & Melody  
      // Snare hits on beats 2 and 4 (offset by 0.5 in phase)  
      const snarePhase \= (t \* 2 \+ 0.5) % 1;  
      const snareEnvelope \= Math.exp(-8 \* snarePhase) \* 0.6;  
      // Melody is a slower sine wave  
      const melodyOsc \= (Math.sin(t \* 3\) \+ 1\) / 2;  
      let mid \= snareEnvelope \+ (melodyOsc \* 0.4);

      // TREBLE: Hi-Hats (16th notes)  
      // t \* 8 \= 8 hits per second  
      const hatPhase \= (t \* 8\) % 1;  
      const hatEnvelope \= Math.exp(-15 \* hatPhase); // Very sharp decay  
      let treble \= hatEnvelope \* 0.4;

      // \-- Meta Modulation \--  
      if (meta.animation \=== 'bounce') {  
        bass \*= 1.3; // Extra bouncy  
      }  
      if (meta.animation \=== 'explode') {  
        bass \= Math.max(bass, 0.7); // Sustain the bass for explosion  
        treble \*= 2.0; // Lots of high frequency noise  
      }  
      if (meta.animation \=== 'glitch') {  
        // Random spikes  
        if (Math.random() \> 0.8) {  
           treble \= 1.0;  
           mid \= 0.8;  
        }  
      }  
      if (meta.isHighEnergy) {  
        mid \*= 1.4;  
        treble \*= 1.4;  
      }

      // \--- APPLY VOLUME SCALING \---  
      bass \*= volume;  
      mid \*= volume;  
      treble \*= volume;

      // Update Shared Audio Ref for ParticleBackground  
      audioDataRef.current \= { bass, mid, treble };

      // Update CSS Variables GLOBALLY so other components (like LyricEditor) can sync  
      document.documentElement.style.setProperty('--audio-bass', bass.toFixed(3));  
      document.documentElement.style.setProperty('--audio-mid', mid.toFixed(3));  
      document.documentElement.style.setProperty('--audio-treble', treble.toFixed(3));  
        
      // Also update stageRef for scoped styles if necessary (though global covers it)  
      stageRef.current.style.setProperty('--audio-bass', bass.toFixed(3));  
      stageRef.current.style.setProperty('--audio-mid', mid.toFixed(3));  
      stageRef.current.style.setProperty('--audio-treble', treble.toFixed(3));  
        
    } else if (stageRef.current && \!isPlaying) {  
      // Reset when paused  
      document.documentElement.style.setProperty('--audio-bass', '0');  
      document.documentElement.style.setProperty('--audio-mid', '0');  
      document.documentElement.style.setProperty('--audio-treble', '0');  
        
      stageRef.current.style.setProperty('--audio-bass', '0');  
      stageRef.current.style.setProperty('--audio-mid', '0');  
      stageRef.current.style.setProperty('--audio-treble', '0');  
        
      audioDataRef.current \= { bass: 0, mid: 0, treble: 0 };  
    }

    if (isPlaying) {  
      requestRef.current \= requestAnimationFrame(animate);  
    }  
  };

  useEffect(() \=\> {  
    if (isPlaying) {  
      requestRef.current \= requestAnimationFrame(animate);  
    } else {  
      if (requestRef.current) cancelAnimationFrame(requestRef.current);  
    }  
    return () \=\> {  
      if (requestRef.current) cancelAnimationFrame(requestRef.current);  
    };  
  }, \[isPlaying\]);

  return (  
    \<div   
      ref={stageRef}  
      className={\`relative w-full h-full bg-black overflow-hidden select-none ${className}\`}  
    \>  
      {/\* Background Layer with Audio Ref Sync \*/}  
      \<ParticleBackground intensity={bgIntensity} audioRef={audioDataRef} /\>

      {/\* Lyrics Layer \- pointer-events-none ensures touches reach background \*/}  
      \<div className="absolute inset-0 z-10 pointer-events-none"\>  
        \<LyricStage   
          currentLine={currentLine}   
          nextLine={nextLine}   
          previousLine={previousLine}   
          intensity={bgIntensity}  
        /\>  
      \</div\>  
    \</div\>  
  );  
};

# LyricStage.tsx

src/components/LyricStage.tsx

import React, { useMemo, useState, useEffect } from 'react';  
import { motion, AnimatePresence } from 'framer-motion';  
import { ChoreographedLine, AnimationType } from '../types';

interface LyricStageProps {  
  currentLine: ChoreographedLine | null;  
  nextLine: ChoreographedLine | null;  
  previousLine: ChoreographedLine | null;  
  intensity?: number;  
}

type TransitionType \= 'glitch' | 'wipe' | 'flash' | null;

const getFontClass \= (font: string | undefined) \=\> {  
  switch (font) {  
    case 'marker': return 'font-marker';  
    case 'tech': return 'font-tech';  
    default: return 'font-sans font-black';  
  }  
};

const getPerpetualAnimation \= (type: AnimationType | undefined) \=\> {  
  switch (type) {  
    case AnimationType.BOUNCE: return 'animate-bounce';  
    case AnimationType.SHAKE: return 'animate-shake';  
    case AnimationType.GLITCH: return 'animate-glitch';  
    case AnimationType.SLIDE: return 'animate-float';  
    case AnimationType.EXPLODE: return 'animate-pulse-fast';  
    default: return '';  
  }  
};

export const LyricStage: React.FC\<LyricStageProps\> \= ({ currentLine, nextLine, previousLine, intensity \= 0 }) \=\> {  
    
  // Transition State  
  const \[transitionType, setTransitionType\] \= useState\<TransitionType\>(null);

  // Trigger transition effect when line ID changes  
  useEffect(() \=\> {  
    if (currentLine?.id) {  
      // Pick a random transition for variety  
      const effects: TransitionType\[\] \= \['glitch', 'wipe', 'flash', 'glitch'\];   
      const randomEffect \= effects\[Math.floor(Math.random() \* effects.length)\];  
        
      setTransitionType(randomEffect);  
        
      // Reset after animation duration  
      const timer \= setTimeout(() \=\> {  
        setTransitionType(null);  
      }, 400); // 400ms matches max duration of css animations  
        
      return () \=\> clearTimeout(timer);  
    }  
  }, \[currentLine?.id\]);

  // Memoize word data to generate stable random values for each word  
  const wordData \= useMemo(() \=\> {  
    if (\!currentLine?.text) return \[\];  
    const sentiment \= currentLine.meta?.sentiment || 'bright';  
      
    return currentLine.text.split(' ').map((word, i) \=\> {  
      // Deterministic "randomness" based on word content and index  
      const seed \= word.split('').reduce((acc, char) \=\> acc \+ char.charCodeAt(0), 0\) \+ i;  
        
      let animation;  
        
      // Sentiment-based animation logic  
      if (sentiment \=== 'energetic') {  
        animation \= { initial: { opacity: 0, scale: 0, rotate: \-45 }, animate: { opacity: 1, scale: 1, rotate: 0 } };  
      } else if (sentiment \=== 'calm') {  
        animation \= { initial: { opacity: 0, filter: 'blur(10px)' }, animate: { opacity: 1, filter: 'blur(0px)' } };  
      } else if (sentiment \=== 'dark') {  
        animation \= { initial: { opacity: 0, y: \-20, scale: 1.2 }, animate: { opacity: 1, y: 0, scale: 1 } };  
      } else { // bright  
        animation \= { initial: { opacity: 0, y: 20, scale: 0.8 }, animate: { opacity: 1, y: 0, scale: 1 } };  
      }

      // Add some extra variety even within sentiment  
      const variety \= \[  
        {}, // No change  
        { x: (seed % 2 \=== 0 ? \-10 : 10\) }, // Slight horizontal shift  
        { rotate: (seed % 10\) \- 5 }, // Slight rotation  
      \]\[seed % 3\];

      return {  
        text: word,  
        rotation: (Math.random() \- 0.5) \* 12,  
        animation: {  
          initial: { ...animation.initial, ...variety },  
          animate: { ...animation.animate, ...variety }  
        }  
      };  
    });  
  }, \[currentLine\]);

  // Determine font size based on character length to prevent overflow  
  const getAdaptiveSize \= (text: string) \=\> {  
    const len \= text.length;  
    if (len \< 5\) return 'text-4xl md:text-6xl lg:text-8xl'; // Short words \-\> Huge  
    if (len \< 15\) return 'text-3xl md:text-5xl lg:text-7xl'; // Medium phrases \-\> Big  
    if (len \< 25\) return 'text-2xl md:text-4xl lg:text-5xl'; // Longer \-\> Medium  
    if (len \< 40\) return 'text-xl md:text-3xl lg:text-4xl'; // Sentences \-\> Small  
    return 'text-base md:text-lg lg:text-xl'; // Paragraphs \-\> Smallest  
  };

  if (\!currentLine) {  
    return (  
      \<div className="flex items-center justify-center h-full text-gray-500 animate-pulse font-tech tracking-widest text-sm md:text-base"\>  
        WAITING FOR SIGNAL...  
      \</div\>  
    );  
  }

  const { meta } \= currentLine;  
  const isGlitch \= meta?.animation \=== AnimationType.GLITCH;  
  const fontClass \= getFontClass(meta?.fontFamily);  
  const perpetualClass \= getPerpetualAnimation(meta?.animation);  
  const sizeClass \= getAdaptiveSize(currentLine.text);

  // Helper to render the word set  
  const renderWords \= (isReflection \= false) \=\> {  
    const baseDelay \= 0.12 \- (intensity \* 0.08);   
    const lengthModifier \= wordData.length \> 5 ? 0.5 : 1;  
    const staggerDelay \= Math.max(0.02, baseDelay \* lengthModifier);

    return (  
      \<div   
        className="flex flex-wrap justify-center items-center gap-y-1"  
        style={{  
          // Dynamic gap based on mid frequency (melody/synths)  
          // Base gap 0.3em, expands up to \~1.1em depending on volume/intensity  
          columnGap: 'calc(0.3em \+ var(--audio-mid, 0\) \* 0.8em)'  
        }}  
      \>  
        {wordData.map((item, i) \=\> (  
          \<motion.span   
            key={\`${currentLine.id}-${i}-${isReflection ? 'ref' : 'main'}\`}   
            className="inline-block origin-bottom"  
            initial={item.animation.initial}  
            animate={item.animation.animate}  
            transition={{  
              duration: 0.6,  
              delay: i \* staggerDelay,  
              ease: \[0.2, 0.8, 0.2, 1\]  
            }}  
          \>  
            \<span   
              className="inline-block"  
              style={{ transform: \`rotate(${item.rotation}deg)\` }}  
            \>  
              \<span   
                className={\`inline-block ${perpetualClass}\`}  
                style={{  
                  animationDelay: meta?.animation \=== AnimationType.BOUNCE ? \`${i \* 0.1}s\` : '0s'  
                }}  
              \>  
                {item.text}  
              \</span\>  
            \</span\>  
          \</motion.span\>  
        ))}  
      \</div\>  
    );  
  };

  return (  
    \<div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden perspective-1000 p-8 md:p-12"\>  
        
      {/\* Transition Effects Layer (Overlay) \*/}  
      {transitionType \=== 'wipe' && (  
        \<div className="absolute left-0 w-full h-1/4 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent animate-scanline-wipe z-50 pointer-events-none blur-md" /\>  
      )}

      {transitionType \=== 'flash' && (  
         \<div className="absolute inset-0 bg-white animate-flash-fade z-50 pointer-events-none mix-blend-overlay" /\>  
      )}

      {/\* Background Echo / Secondary Text \*/}  
      \<AnimatePresence mode="wait"\>  
        {meta?.secondaryText && (  
          \<motion.div   
            key={\`echo-${currentLine.id}\`}  
            initial={{ opacity: 0, scale: 0.5, y: 50 }}  
            animate={{ opacity: 0.1, scale: 1.5, y: 0 }}  
            exit={{ opacity: 0, scale: 2, y: \-50 }}  
            transition={{ duration: 1, ease: "easeOut" }}  
            className="absolute text-4xl md:text-6xl font-black select-none pointer-events-none whitespace-nowrap blur-sm"  
            style={{   
              color: meta.color,  
              top: '20%',  
              transform: \`rotate(${-1 \* (meta.rotation || 0)}deg)\`  
            }}  
          \>  
            {meta.secondaryText.toUpperCase()}  
          \</motion.div\>  
        )}  
      \</AnimatePresence\>

      {/\* Previous Line \- Ghost Zoom Out \*/}  
      \<AnimatePresence\>  
        {previousLine && (  
          \<motion.div   
            key={\`prev-${previousLine.id}\`}  
            initial={{ opacity: 0.3, scale: 1.1, y: 0, filter: 'blur(0px)' }}  
            animate={{ opacity: 0, scale: 0.6, y: \-100, filter: 'blur(10px)' }}  
            transition={{ duration: 1.5, ease: "easeOut" }}  
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"  
          \>  
            \<div   
               className={\`text-center font-bold ${getFontClass(previousLine.meta?.fontFamily)}\`}   
               style={{   
                 fontSize: 'clamp(2rem, 6vw, 6rem)',  
                 color: previousLine.meta?.color,  
                 transform: \`rotate(${previousLine.meta?.rotation || 0}deg)\`,  
               }}  
            \>  
               {previousLine.text}  
            \</div\>  
          \</motion.div\>  
        )}  
      \</AnimatePresence\>

      {/\* Main Lyric Wrapper \- Handles Glitch Transition \*/}  
      \<div className={\`w-full flex justify-center items-center ${transitionType \=== 'glitch' ? 'animate-glitch-snap' : ''}\`}\>  
          
        {/\* Main Lyric Display \*/}  
        \<motion.div   
          key={currentLine.id}  
          initial={{ opacity: 0, scale: 0.9 }}  
          animate={{ opacity: 1, scale: 1 }}  
          transition={{ duration: 0.4 }}  
          className="relative z-10 w-full flex justify-center items-center max-w-\[90%\]"  
          style={{  
            transform: \`scale(${ (meta?.scale || 1\) \* (1 \+ (typeof window \!== 'undefined' ? 0.05 : 0)) }) rotate(${meta?.rotation || 0}deg)\`,  
          }}  
        \>  
          {/\* Inner wrapper for audio reactivity \*/}  
          \<div style={{  
             transform: 'scale(calc(1 \+ var(--audio-bass, 0\) \* 0.05))',  
             transition: 'transform 0.05s linear'  
          }}\>  
            \<div   
              className={\`leading-tight text-center ${fontClass} ${sizeClass}\`}  
              style={{   
                color: isGlitch ? 'white' : meta?.color,  
                textShadow: isGlitch   
                  ? \`2px 0 red, \-2px 0 blue\`   
                  : \`0 0 10px ${meta?.color || 'white'}, 0 0 calc(20px \+ var(--audio-bass, 0\) \* 60px) ${meta?.color || 'white'}\`,  
                filter: 'saturate(calc(100% \+ var(--audio-bass, 0\) \* 100%)) brightness(calc(100% \+ var(--audio-treble, 0\) \* 50%))'  
              }}  
            \>  
              {renderWords(false)}  
            \</div\>  
          \</div\>  
            
          {/\* Mirror Reflection Effect \*/}  
          \<div   
            className={\`absolute left-0 right-0 top-\[90%\] transform \-scale-y-100 pointer-events-none select-none text-center ${fontClass} ${sizeClass} leading-tight\`}  
            style={{   
              color: meta?.color,  
              opacity: 'calc(0.1 \+ var(--audio-mid, 0\) \* 0.4)',  
              filter: 'blur(calc(2px \+ var(--audio-mid, 0\) \* 6px)) saturate(calc(100% \+ var(--audio-bass, 0\) \* 100%))'  
            }}  
          \>  
            {renderWords(true)}  
          \</div\>  
        \</motion.div\>  
      \</div\>

      {/\* Next Line \- Preview \*/}  
      \<div className="absolute bottom-6 opacity-40 transform translate-y-4 scale-90 transition-all duration-500 max-w-\[80%\] text-center"\>  
        \<p className="text-\[10px\] md:text-xs text-gray-300 font-sans tracking-wide truncate"\>  
          {nextLine?.text ? \`\>\> ${nextLine.text}\` : ''}  
        \</p\>  
      \</div\>

    \</div\>  
  );  
};

# ParticleBackground.tsx

src/components/ParticleBackground.tsx

import React, { useRef, useEffect } from 'react';

export interface AudioData {  
  bass: number;  
  mid: number;  
  treble: number;  
}

interface Particle {  
  x: number;  
  y: number;  
  baseX: number;  
  baseY: number;  
  radius: number;  
  baseRadius: number;  
  color: string;  
  hue: number;  
  saturation: number; // Dynamic saturation state  
  vx: number;  
  vy: number;  
  angle: number;  
  ix: number; // Interactive Velocity X  
  iy: number; // Interactive Velocity Y  
}

interface ParticleBackgroundProps {  
  intensity: number;  
  audioRef?: React.MutableRefObject\<AudioData\>;  
}

export const ParticleBackground: React.FC\<ParticleBackgroundProps\> \= ({ intensity, audioRef }) \=\> {  
  const canvasRef \= useRef\<HTMLCanvasElement\>(null);  
  const mouseRef \= useRef({ x: \-1000, y: \-1000 }); // Initialize off-screen

  useEffect(() \=\> {  
    const canvas \= canvasRef.current;  
    if (\!canvas) return;  
    const parent \= canvas.parentElement;  
    if (\!parent) return;

    const ctx \= canvas.getContext('2d');  
    if (\!ctx) return;

    let particles: Particle\[\] \= \[\];  
    let animationFrameId: number;  
    let w \= 0;  
    let h \= 0;  
      
    // Hypothetical Audio Visualizer Data (Simulated)  
    const spectrumSize \= 64;  
    const spectrumData \= new Uint8Array(spectrumSize);  
    let timeStep \= 0;

    const createParticles \= (count: number) \=\> {  
      particles \= \[\];  
      for (let i \= 0; i \< count; i++) {  
        const radius \= Math.random() \* 3 \+ 1;  
        particles.push({  
          x: Math.random() \* w,  
          y: Math.random() \* h,  
          baseX: Math.random() \* w,  
          baseY: Math.random() \* h,  
          radius: radius,  
          baseRadius: radius,  
          color: '',  
          hue: Math.random() \* 60 \+ 180, // Cyan/Blue base  
          saturation: 70, // Start with neutral saturation  
          vx: (Math.random() \- 0.5) \* 1,  
          vy: (Math.random() \- 0.5) \* 1,  
          angle: Math.random() \* Math.PI \* 2,  
          ix: 0,  
          iy: 0  
        });  
      }  
    };

    // Interaction Handlers  
    const handleMove \= (clientX: number, clientY: number) \=\> {  
      const rect \= canvas.getBoundingClientRect();  
      mouseRef.current.x \= clientX \- rect.left;  
      mouseRef.current.y \= clientY \- rect.top;  
    };

    const onMouseMove \= (e: MouseEvent) \=\> handleMove(e.clientX, e.clientY);  
    const onTouchMove \= (e: TouchEvent) \=\> {  
      // Prevent scrolling while interacting with the visualizer  
      if(e.cancelable) e.preventDefault();  
      const touch \= e.touches\[0\];  
      handleMove(touch.clientX, touch.clientY);  
    };  
    const onLeave \= () \=\> {  
      mouseRef.current.x \= \-1000;  
      mouseRef.current.y \= \-1000;  
    };

    canvas.addEventListener('mousemove', onMouseMove);  
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });  
    canvas.addEventListener('mouseleave', onLeave);  
    canvas.addEventListener('touchend', onLeave);

    let globalHue \= 200; // Shared hue state

    const updateSimulatedSpectrum \= () \=\> {  
        timeStep \+= 0.05;  
          
        // Use external audio data if available (synchronized with lyrics)  
        // or fall back to internal simulation  
        const extBass \= audioRef?.current?.bass || 0;  
        const extMid \= audioRef?.current?.mid || 0;  
        const extTreble \= audioRef?.current?.treble || 0;  
        const hasExternal \= (extBass \+ extMid \+ extTreble) \> 0;

        // Shift global hue based on music intensity and time  
        // Bass kicks shift the hue faster  
        globalHue \= (globalHue \+ 0.2 \+ (extBass \* 2)) % 360;

        for(let i=0; i\<spectrumSize; i++) {  
            // Internal simulation base  
            const wave \= Math.sin(i \* 0.2 \+ timeStep) \* 0.5 \+ 0.5;  
            const noise \= Math.random() \* 0.3;  
            const eq \= 1 \- Math.abs((i \- spectrumSize/2) / (spectrumSize/2));   
              
            let val \= 0;

            if (hasExternal) {  
              // Map external bands to spectrum  
              // Low indices \= bass, Mid \= mid, High \= treble  
              if (i \< 10\) val \= extBass \* 255;  
              else if (i \< 40\) val \= extMid \* 200 \* wave;  
              else val \= extTreble \* 255 \* (noise \+ 0.5);  
                
              // Add some noise and wave to make it look organic even with static inputs  
              val \= val \* 0.8 \+ (wave \* 50);  
            } else {  
               // Pure simulation  
               val \= (wave \* 50\) \+ (noise \* 50\) \+ (intensity \* 200 \* eq);  
               if (intensity \> 0.6 && Math.random() \> 0.9) val \+= 100;  
            }

            spectrumData\[i\] \= Math.min(255, Math.max(0, val));  
        }  
    };

    const animate \= () \=\> {  
      updateSimulatedSpectrum();  
        
      // Get explicit audio drivers for particle physics  
      const extBass \= audioRef?.current?.bass || 0;  
      const extMid \= audioRef?.current?.mid || 0;  
      const extTreble \= audioRef?.current?.treble || 0;

      // Analyze spectrum for fallback  
      const spectrumBass \= spectrumData.slice(0, 10).reduce((a, b) \=\> a \+ b, 0\) / 10 / 255;  
      const spectrumTreble \= spectrumData.slice(40, 60).reduce((a, b) \=\> a \+ b, 0\) / 20 / 255;

      // Use external if present, else internal spectrum  
      const bass \= Math.max(spectrumBass, extBass);  
      const treble \= Math.max(spectrumTreble, extTreble);  
      const mid \= extMid; // Use mid specifically for color

      // Clear with trail effect  
      // Subtle background color pulse on bass hits  
      const bgHue \= (globalHue \+ 180\) % 360; // Complementary color for background pulse  
      const bgAlpha \= 0.25 \- (intensity \* 0.1) \+ (bass \* 0.05);  
      ctx.fillStyle \= \`hsla(${bgHue}, 30%, 5%, ${bgAlpha})\`;  
      ctx.fillRect(0, 0, w, h);

      // Draw Particles  
      particles.forEach((p, i) \=\> {  
        const freqIndex \= i % spectrumSize;  
        const freqValue \= spectrumData\[freqIndex\] / 255; // 0-1

        // \--- Interaction Physics \---  
        const dx \= p.x \- mouseRef.current.x;  
        const dy \= p.y \- mouseRef.current.y;  
        const dist \= Math.sqrt(dx \* dx \+ dy \* dy);  
        const interactionRadius \= 150;

        if (dist \< interactionRadius) {  
            const force \= (interactionRadius \- dist) / interactionRadius;  
            const angle \= Math.atan2(dy, dx);  
            // Push away force  
            const pushForce \= force \* 15;  
            p.ix \+= Math.cos(angle) \* pushForce;  
            p.iy \+= Math.sin(angle) \* pushForce;  
        }

        // Apply friction  
        p.ix \*= 0.92;  
        p.iy \*= 0.92;

        // \--- Movement Physics \---  
        // Bass strictly drives the speed multiplier  
        // 0.5 is base drift speed. Bass adds bursts of speed.  
        const speedMultiplier \= 0.5 \+ (bass \* 8\) \+ (intensity \* 2);   
          
        // Treble adds jitter/noise to angle  
        p.angle \+= (Math.random() \- 0.5) \* (treble \* 0.5 \+ 0.02);   
          
        // Combine audio reactivity  
        p.x \+= (p.vx \* speedMultiplier) \+ p.ix \+ Math.cos(p.angle) \* freqValue;  
        p.y \+= (p.vy \* speedMultiplier) \+ p.iy \+ Math.sin(p.angle) \* freqValue;

        // \--- VISUAL DYNAMICS \---  
          
        // Radius: Bass Pulse  
        p.radius \= p.baseRadius \+ (bass \* 12\) \+ (intensity \* 5);

        // Hue: Shift based on Global Hue \+ Mid freq  
        const targetHue \= (globalHue \+ (mid \* 40\) \+ (i % 30)) % 360;  
        p.hue \+= (targetHue \- p.hue) \* 0.08;   
          
        // Saturation: Driven by Mid freq (Audio-reactive Color Intensity)  
        // Range from 30% (dull) to 100% (vibrant)  
        const targetSaturation \= 40 \+ (mid \* 60\) \+ (intensity \* 20);  
        // Clamp and smooth  
        const clampedSaturation \= Math.min(100, Math.max(0, targetSaturation));  
        p.saturation \+= (clampedSaturation \- p.saturation) \* 0.1;

        const brightness \= 50 \+ (freqValue \* 50);  
        p.color \= \`hsla(${p.hue}, ${p.saturation}%, ${brightness}%, ${0.6 \+ freqValue \* 0.4})\`;

        // Screen wrap  
        if (p.x \< \-50) p.x \= w \+ 50;  
        if (p.x \> w \+ 50\) p.x \= \-50;  
        if (p.y \< \-50) p.y \= h \+ 50;  
        if (p.y \> h \+ 50\) p.y \= \-50;

        // Draw particle  
        ctx.beginPath();  
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI \* 2);  
        ctx.fillStyle \= p.color;  
        ctx.fill();

        // Draw connections \- Neuro-web effect  
        const connectDist \= 80 \+ (bass \* 100\) \+ (intensity \* 100);   
          
        for(let j=i+1; j\<particles.length; j++) {  
             const p2 \= particles\[j\];  
             const dx2 \= p.x \- p2.x;  
             const dy2 \= p.y \- p2.y;  
             const dist2 \= Math.sqrt(dx2\*dx2 \+ dy2\*dy2);  
               
             if (dist2 \< connectDist) {  
                 ctx.beginPath();  
                 const alpha \= (1 \- dist2/connectDist) \* (0.15 \+ bass \* 0.5);  
                   
                 // Use the particle's dynamic saturation for the lines too  
                 ctx.strokeStyle \= \`hsla(${p.hue}, ${p.saturation}%, 50%, ${alpha})\`;  
                 ctx.lineWidth \= 1;   
                 ctx.moveTo(p.x, p.y);  
                 ctx.lineTo(p2.x, p2.y);  
                 ctx.stroke();  
             }  
        }  
      });

      // Draw Visualizer Bars at bottom  
      const barWidth \= w / spectrumSize;  
      for (let i \= 0; i \< spectrumSize; i++) {  
          const val \= spectrumData\[i\];  
          const barHeight \= (val / 255\) \* (h \* 0.3 \* (0.5 \+ intensity \+ bass \* 0.5));  
            
          // Use global hue for bars too, with a slight offset based on frequency  
          const hue \= (globalHue \+ (val/255 \* 60\) \+ (mid \* 30)) % 360;   
          // Match the saturation vibe of the particles  
          const sat \= 60 \+ (mid \* 40);

          ctx.fillStyle \= \`hsla(${hue}, ${sat}%, 50%, 0.8)\`;  
            
          const x \= i \* barWidth;  
          const y \= h \- barHeight;  
            
          ctx.beginPath();  
          ctx.roundRect(x \+ 1, y, Math.max(0, barWidth \- 2), barHeight \+ 10, 5);  
          ctx.fill();  
            
          ctx.fillStyle \= \`hsla(${hue}, ${sat}%, 50%, 0.2)\`;  
          ctx.beginPath();  
          ctx.rect(x \+ 1, h, Math.max(0, barWidth \- 2), barHeight \* 0.5);  
          ctx.fill();  
      }

      animationFrameId \= requestAnimationFrame(animate);  
    };

    const handleResize \= () \=\> {  
      if (parent) {  
        w \= canvas.width \= parent.clientWidth;  
        h \= canvas.height \= parent.clientHeight;  
        createParticles(100); // Slightly reduced count for better performance with complex physics  
      }  
    };

    const resizeObserver \= new ResizeObserver(handleResize);  
    resizeObserver.observe(parent);  
      
    handleResize();  
    animate();

    return () \=\> {  
      resizeObserver.disconnect();  
      cancelAnimationFrame(animationFrameId);  
      canvas.removeEventListener('mousemove', onMouseMove);  
      canvas.removeEventListener('touchmove', onTouchMove);  
      canvas.removeEventListener('mouseleave', onLeave);  
      canvas.removeEventListener('touchend', onLeave);  
    };  
  }, \[intensity\]); // Re-init if intensity prop changes drastically, though ref handles realtime updates

  return \<canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none" /\>;  
};

# ClosedCaptions.tsx

src/components/ClosedCaptions.tsx

import React, { useMemo } from 'react';  
import { motion } from 'framer-motion';  
import { ChoreographedLine, CCSettings } from '../types';

interface ClosedCaptionsProps {  
  currentLine: ChoreographedLine | null;  
  currentTime: number;  
  nextLine: ChoreographedLine | null;  
  settings: CCSettings;  
}

export const ClosedCaptions: React.FC\<ClosedCaptionsProps\> \= ({  
  currentLine,  
  currentTime,  
  nextLine,  
  settings  
}) \=\> {  
  if (\!settings.showCaptions || \!currentLine) return null;

  // Calculate word-by-word progress  
  // Since we don't have per-word timing, we'll estimate it based on the line's duration  
  const words \= useMemo(() \=\> {  
    const text \= currentLine.text;  
    const wordList \= text.split(' ');  
    const startTime \= currentLine.time;  
    const endTime \= nextLine ? nextLine.time : startTime \+ 5; // Fallback to 5s if no next line  
    const duration \= endTime \- startTime;  
    const timePerWord \= duration / wordList.length;

    return wordList.map((word, index) \=\> {  
      const wordStartTime \= startTime \+ index \* timePerWord;  
      return {  
        text: word,  
        startTime: wordStartTime,  
        isHighlighted: currentTime \>= wordStartTime  
      };  
    });  
  }, \[currentLine, nextLine, currentTime\]);

  return (  
    \<div   
      className="fixed bottom-10 left-1/2 \-translate-x-1/2 z-\[100\] w-full max-w-2xl px-4 pointer-events-none"  
    \>  
      \<div   
        className="rounded-lg p-4 text-center backdrop-blur-md transition-all duration-300"  
        style={{  
          backgroundColor: \`${settings.backgroundColor}${Math.round(settings.backgroundOpacity \* 255).toString(16).padStart(2, '0')}\`,  
        }}  
      \>  
        \<div   
          className="flex flex-wrap justify-center gap-x-2 gap-y-1"  
          style={{  
            fontSize: \`${settings.fontSize}px\`,  
            color: settings.textColor,  
            opacity: settings.textOpacity,  
          }}  
        \>  
          {words.map((word, i) \=\> (  
            \<motion.span  
              key={\`${currentLine.id}-${i}\`}  
              initial={false}  
              animate={{  
                color: word.isHighlighted ? '\#ffffff' : settings.textColor,  
                scale: word.isHighlighted ? 1.1 : 1,  
                textShadow: word.isHighlighted ? '0 0 10px rgba(255,255,255,0.8)' : 'none'  
              }}  
              className="inline-block transition-colors duration-200"  
            \>  
              {word.text}  
            \</motion.span\>  
          ))}  
        \</div\>  
      \</div\>  
    \</div\>  
  );  
};

# src/services

src/services/[geminiService.ts](http://geminiService.ts)

# geminiService.ts

src/services/geminiService.ts 

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";  
import { LyricLine, ChoreographedLine, AnimationType } from "../types";

// Helper to clean up JSON string if necessary (though Schema should handle it)  
const cleanJsonString \= (str: string) \=\> {  
  return str.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();  
};

export const generateLyrics \= async (topic: string): Promise\<{ title: string; artist: string; lyrics: LyricLine\[\] }\> \=\> {  
  const apiKey \= process.env.API\_KEY;  
  if (\!apiKey) {  
    throw new Error("API\_KEY\_MISSING");  
  }

  const ai \= new GoogleGenAI({ apiKey });  
    
  const prompt \= \`  
    Write a song based on this topic/title: "${topic}".  
      
    Return the output as a strict JSON object containing:  
    \- 'title': string (A creative title for the song)  
    \- 'artist': string (A cool fictional artist name)  
    \- 'lyrics': array of objects, each containing:  
      \- 'id': string (unique identifier like '1', '2', etc.)  
      \- 'time': number (start time in seconds. Start at 1.0. Increment the time logically based on line length and a tempo of 110 BPM. Ensure strictly increasing order.)  
      \- 'text': string (The content of the lyric line. Keep lines relatively short for visual impact.)

    Generate enough lines for a 45-60 second song clip (approx 12-20 lines).  
  \`;

  try {  
    const response: GenerateContentResponse \= await ai.models.generateContent({  
      model: "gemini-3-flash-preview",  
      contents: prompt,  
      config: {  
        responseMimeType: "application/json",  
        responseSchema: {  
          type: Type.OBJECT,  
          properties: {  
            title: { type: Type.STRING },  
            artist: { type: Type.STRING },  
            lyrics: {  
              type: Type.ARRAY,  
              items: {  
                type: Type.OBJECT,  
                properties: {  
                  id: { type: Type.STRING },  
                  time: { type: Type.NUMBER },  
                  text: { type: Type.STRING }  
                },  
                required: \['id', 'time', 'text'\]  
              }  
            }  
          },  
          required: \['title', 'artist', 'lyrics'\]  
        }  
      }  
    });

    const data \= JSON.parse(cleanJsonString(response.text || "{}"));  
    return {  
      title: data.title || topic,  
      artist: data.artist || "AI Artist",  
      lyrics: data.lyrics || \[\]  
    };  
  } catch (error: any) {  
    console.error("Gemini Lyric Gen Error:", error);  
    if (error.message?.includes("429") || error.message?.includes("RESOURCE\_EXHAUSTED")) {  
      throw new Error("QUOTA\_EXHAUSTED");  
    }  
    throw error;  
  }  
};

export const choreographLyrics \= async (lyrics: LyricLine\[\]): Promise\<ChoreographedLine\[\]\> \=\> {  
  const apiKey \= process.env.API\_KEY;  
  if (\!apiKey) {  
    return lyrics.map(l \=\> ({ ...l, meta: { color: '\#ffffff', animation: AnimationType.FADE, scale: 1, rotation: 0, fontFamily: 'sans' } }));  
  }

  const ai \= new GoogleGenAI({ apiKey });

  const prompt \= \`  
    You are a world-class VJ (Visual Jockey) for a music app.  
    Your job is to analyze the sentiment, rhythm, and intensity of the following song lyrics.  
    Assign visual choreography metadata to EACH line to create a stunning visual show.

    Rules:  
    1\. 'color': Hex code. Use bright neon colors (Cyan, Magenta, Lime, Hot Pink) for high energy, cool colors for slow parts.  
    2\. 'animation': One of \[fade, bounce, explode, slide, shake, glitch, typewriter\].  
       \- 'shake' or 'glitch' for intense/unstable lyrics.  
       \- 'bounce' for rhythmic lines.  
       \- 'fade' for slow/intro lines.  
    3\. 'scale': Number between 0.8 and 2.5.   
       \- CRITICAL: If the line has more than 5 words, keep scale below 1.2 to prevent screen overflow.  
       \- Only use scale \> 2.0 for single words (e.g. "STOP", "GO").  
    4\. 'rotation': Number between \-10 and 10 degrees.  
    5\. 'fontFamily': One of \[sans, marker, tech\]. 'marker' for graffiti style, 'tech' for robotic lines.  
    6\. 'secondaryText': A short 1-2 word background echo or emoji that fits the vibe.  
    7\. 'sentiment': One of \[energetic, calm, dark, bright\] based on the line's emotional tone.  
  \`;

  // Simplify input to save tokens, we just need text to analyze context  
  const lyricsText \= lyrics.map(l \=\> \`ID:${l.id} Text:${l.text}\`).join('\\n');

  try {  
    const response: GenerateContentResponse \= await ai.models.generateContent({  
      model: "gemini-3-flash-preview",  
      contents: \`${prompt}\\n\\nLyrics to Choreograph:\\n${lyricsText}\`,  
      config: {  
        responseMimeType: "application/json",  
        responseSchema: {  
          type: Type.ARRAY,  
          items: {  
            type: Type.OBJECT,  
            properties: {  
              id: { type: Type.STRING },  
              color: { type: Type.STRING },  
              animation: { type: Type.STRING, enum: Object.values(AnimationType) },  
              scale: { type: Type.NUMBER },  
              rotation: { type: Type.NUMBER },  
              fontFamily: { type: Type.STRING, enum: \['sans', 'marker', 'tech'\] },  
              secondaryText: { type: Type.STRING },  
              sentiment: { type: Type.STRING, enum: \['energetic', 'calm', 'dark', 'bright'\] }  
            },  
            required: \['id', 'color', 'animation', 'scale', 'rotation', 'fontFamily', 'sentiment'\]  
          }  
        }  
      }  
    });

    const choreographyMap \= JSON.parse(cleanJsonString(response.text || "\[\]"));

    // Merge original lyrics with AI metadata  
    return lyrics.map(line \=\> {  
      const meta \= choreographyMap.find((c: any) \=\> c.id \=== line.id);  
      return {  
        ...line,  
        meta: meta || {  
          color: '\#ffffff',  
          animation: AnimationType.FADE,  
          scale: 1,  
          rotation: 0,  
          fontFamily: 'sans'  
        }  
      };  
    });

  } catch (error: any) {  
    console.error("Gemini VJ Error:", error);  
    if (error.message?.includes("429") || error.message?.includes("RESOURCE\_EXHAUSTED")) {  
      // We don't throw here to allow the app to still function with basic lyrics  
      return lyrics.map(l \=\> ({ ...l, meta: { color: '\#ffffff', animation: AnimationType.FADE, scale: 1, rotation: 0, fontFamily: 'sans' } }));  
    }  
    return lyrics.map(l \=\> ({ ...l, meta: { color: '\#ffffff', animation: AnimationType.FADE, scale: 1, rotation: 0, fontFamily: 'sans' } }));  
  }  
};

# src/types.ts

src/types.ts

declare global {  
  interface Window {  
    aistudio: {  
      hasSelectedApiKey: () \=\> Promise\<boolean\>;  
      openSelectKey: () \=\> Promise\<void\>;  
    };  
  }  
}

export interface LyricLine {  
  id: string;  
  time: number; // Seconds  
  text: string;  
}

export enum AnimationType {  
  FADE \= 'fade',  
  BOUNCE \= 'bounce',  
  EXPLODE \= 'explode',  
  SLIDE \= 'slide',  
  SHAKE \= 'shake',  
  GLITCH \= 'glitch',  
  TYPEWRITER \= 'typewriter'  
}

export interface ChoreographyMeta {  
  color: string; // Hex code  
  animation: AnimationType;  
  scale: number; // 1 to 2  
  rotation: number; // degrees  
  fontFamily: 'sans' | 'marker' | 'tech';  
  secondaryText?: string; // An echo or background text  
  sentiment?: 'energetic' | 'calm' | 'dark' | 'bright';  
}

export interface ChoreographedLine extends LyricLine {  
  meta?: ChoreographyMeta;  
}

export interface Song {  
  title: string;  
  artist: string;  
  duration: number;  
  lyrics: LyricLine\[\];  
}

export interface CCSettings {  
  fontSize: number; // in pixels  
  textColor: string;  
  backgroundColor: string;  
  backgroundOpacity: number; // 0 to 1  
  textOpacity: number; // 0 to 1  
  showCaptions: boolean;  
}  
