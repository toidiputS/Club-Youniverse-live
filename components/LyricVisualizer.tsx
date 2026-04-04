import React, { useRef, useEffect, useMemo } from 'react';  
import { ParticleBackground, AudioData } from './ParticleBackground';  
import { LyricStage } from './LyricStage';  
import { ChoreographedLine, AnimationType } from '../types';
import { getBroadcastManager } from '../services/globalBroadcastManager';

interface LyricVisualizerProps {  
  currentTime: number; // The current playback time in seconds  
  isPlaying: boolean;  // Whether the track is playing  
  lyrics: Partial<ChoreographedLine>[]; // Can accept plain lyrics (just time/text) or fully choreographed ones  
  className?: string; // Optional styling class  
  volume?: number; // 0 to 1  
}

// Default Neon Palette for Auto-Mode  
const AUTO_COLORS = ['#00f3ff', '#ff00aa', '#ccff00', '#ff3333', '#bf00ff', '#ffffff'];  
const AUTO_ANIMS: AnimationType[] = [AnimationType.FADE, AnimationType.SLIDE, AnimationType.BOUNCE, AnimationType.TYPEWRITER];

export const LyricVisualizer: React.FC<LyricVisualizerProps> = ({   
  currentTime,   
  isPlaying,   
  lyrics,  
  className = "",  
  volume = 1  
}) => {  
  const stageRef = useRef<HTMLDivElement>(null);  
  const requestRef = useRef<number | undefined>(undefined);  
  const broadcastManager = getBroadcastManager();
    
  // Shared ref for audio data to sync Stage CSS vars and Particle Canvas  
  const audioDataRef = useRef<AudioData>({ bass: 0, mid: 0, treble: 0 });  
  
  // Internal Analyser state for smoother transitions
  const internalDataRef = useRef({ bass: 0, mid: 0, treble: 0 });
    
  // State to track audio reactivity values  
  const audioMetaRef = useRef({  
    scale: 1,  
    animation: 'fade',  
    isHighEnergy: false  
  });

  // 0. Robust Lyric Parser (Handles JSON arrays OR raw text strings)
  const parsedLyrics = useMemo((): Partial<ChoreographedLine>[] => {
    if (!lyrics) return [];
    
    // If it's already an array, use it
    if (Array.isArray(lyrics)) return lyrics as Partial<ChoreographedLine>[];

    // If it's a string, try parsing it
    const lyricsStr = lyrics as any;
    if (typeof lyricsStr === 'string') {
        try {
            const json = JSON.parse(lyricsStr);
            if (Array.isArray(json)) return json as Partial<ChoreographedLine>[];
        } catch (e) {
            // Not JSON, treat as raw text
            return lyricsStr.split('\n')
                .filter((l: string) => l.trim())
                .map((line: string, i: number) => ({
                    time: i * 5, // Simple 5s spacing for raw text
                    text: line.trim(),
                    animation: AnimationType.FADE
                }));
        }
    }
    return [];
  }, [lyrics]);

  // 1. Determine active lines based on timestamp  
  const currentIndex = useMemo(() => {  
    return parsedLyrics.findIndex((line, i) => {  
      const nextLine = parsedLyrics[i + 1];  
      // Basic check: Current time is after this line, but before the next  
      const time = line.time || 0;  
      const nextTime = nextLine?.time || Infinity;  
      return currentTime >= time && currentTime < nextTime;  
    });  
  }, [parsedLyrics, currentTime]);

  // 2. Process the Current Line (Apply Auto-VJ logic if meta is missing)  
  const currentLine = useMemo((): ChoreographedLine | null => {  
    if (currentIndex === -1) return null;  
    const rawLine = parsedLyrics[currentIndex];

    // If we already have AI choreography, use it  
    if (rawLine.meta) {  
      return rawLine as ChoreographedLine;  
    }

    // --- AUTO-VJ FALLBACK ---  
    const seed = (rawLine.id || rawLine.text || "").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);  
    const color = AUTO_COLORS[seed % AUTO_COLORS.length];  
    const anim = AUTO_ANIMS[seed % AUTO_ANIMS.length];  
      
    // Detect high energy keywords for auto-scaling  
    const text = (rawLine.text || "").toUpperCase();  
    const isLoud = text.includes('!') || text.length < 5; 

    return {  
      id: rawLine.id || `auto-${currentIndex}`,  
      time: rawLine.time || 0,  
      text: rawLine.text || "",  
      meta: {  
        color: color,  
        animation: anim,  
        scale: isLoud ? 1.5 : 1,  
        rotation: (seed % 10) - 5, // -5 to 5 degrees  
        fontFamily: seed % 2 === 0 ? 'sans' : 'tech',  
        secondaryText: undefined  
      }  
    };  
  }, [currentIndex, lyrics]);

  const nextLine = currentIndex !== -1 && currentIndex + 1 < lyrics.length ? lyrics[currentIndex + 1] as ChoreographedLine : null;  
  const previousLine = currentIndex > 0 ? lyrics[currentIndex - 1] as ChoreographedLine : null;

  // 3. Sync current lyric meta to ref for the animation loop  
  useEffect(() => {  
    if (currentLine?.meta) {  
      audioMetaRef.current = {  
        scale: currentLine.meta.scale || 1,  
        animation: currentLine.meta.animation || 'fade',  
        isHighEnergy: (currentLine.meta.scale > 1.2 || currentLine.meta.animation === 'explode')  
      };  
    } else {  
      audioMetaRef.current = { scale: 0, animation: 'fade', isHighEnergy: false };  
    }  
  }, [currentLine]);

  // 4. Calculate "Intensity" for ParticleBackground  
  const bgIntensity = (isPlaying && currentLine?.meta?.scale   
    ? Math.max(0, (currentLine.meta.scale - 0.8) / 1.5)   
    : 0) * volume;

  // 5. Audio Analysis Loop  
  const animate = (time: number) => {  
    if (stageRef.current && isPlaying) {  
      const meta = audioMetaRef.current;
      
      let bass = 0;
      let mid = 0;
      let treble = 0;

      // ATTEMPT TO GET REAL ANALYSER DATA
      const analyser = broadcastManager.getAnalyser();
      const dataArray = broadcastManager.getDataArray();

      if (analyser && dataArray) {
        (analyser as any).getByteFrequencyData(dataArray as any);
        // Bass: Bins 0-4
        bass = (dataArray[0] + dataArray[1] + dataArray[2] + dataArray[3]) / 1020;
        // Mid: Bins 8-16
        mid = (dataArray[8] + dataArray[10] + dataArray[12] + dataArray[14]) / 1020;
        // Treble: Bins 20-30
        treble = (dataArray[24] + dataArray[26] + dataArray[28] + dataArray[30]) / 1020;
      } else {
        // FALLBACK TO SIMULATION (if audio context blocked or cross-origin)
        const t = time / 1000;
        const beatPhase = (t * 2) % 1;   
        const kickEnvelope = Math.exp(-6 * beatPhase);  
        bass = kickEnvelope * Math.min(meta.scale, 1.5);

        const snarePhase = (t * 2 + 0.5) % 1;  
        const snareEnvelope = Math.exp(-8 * snarePhase) * 0.6;  
        const melodyOsc = (Math.sin(t * 3) + 1) / 2;  
        mid = snareEnvelope + (melodyOsc * 0.4);

        const hatPhase = (t * 8) % 1;  
        const hatEnvelope = Math.exp(-15 * hatPhase);  
        treble = hatEnvelope * 0.4;
      }

      // Smooth the data
      const lerp = 0.3;
      internalDataRef.current.bass += (bass - internalDataRef.current.bass) * lerp;
      internalDataRef.current.mid += (mid - internalDataRef.current.mid) * lerp;
      internalDataRef.current.treble += (treble - internalDataRef.current.treble) * lerp;

      let finalBass = internalDataRef.current.bass;
      let finalMid = internalDataRef.current.mid;
      let finalTreble = internalDataRef.current.treble;

      if (meta.animation === AnimationType.BOUNCE) finalBass *= 1.3;
      if (meta.animation === AnimationType.EXPLODE) {  
        finalBass = Math.max(finalBass, 0.7);
        finalTreble *= 2.0;
      }  
      if (meta.animation === AnimationType.GLITCH) {  
        if (Math.random() > 0.8) { finalTreble = 1.0; finalMid = 0.8; }  
      }  
      if (meta.isHighEnergy) { finalMid *= 1.4; finalTreble *= 1.4; }

      finalBass *= volume;  
      finalMid *= volume;  
      finalTreble *= volume;

      audioDataRef.current = { bass: finalBass, mid: finalMid, treble: finalTreble };

      document.documentElement.style.setProperty('--audio-bass', finalBass.toFixed(3));  
      document.documentElement.style.setProperty('--audio-mid', finalMid.toFixed(3));  
      document.documentElement.style.setProperty('--audio-treble', finalTreble.toFixed(3));  
        
      stageRef.current.style.setProperty('--audio-bass', finalBass.toFixed(3));  
      stageRef.current.style.setProperty('--audio-mid', finalMid.toFixed(3));  
      stageRef.current.style.setProperty('--audio-treble', finalTreble.toFixed(3));  
        
    } else if (stageRef.current && !isPlaying) {  
      const reset = '0';
      document.documentElement.style.setProperty('--audio-bass', reset);  
      document.documentElement.style.setProperty('--audio-mid', reset);  
      document.documentElement.style.setProperty('--audio-treble', reset);  
      stageRef.current.style.setProperty('--audio-bass', reset);  
      stageRef.current.style.setProperty('--audio-mid', reset);  
      stageRef.current.style.setProperty('--audio-treble', reset);  
      audioDataRef.current = { bass: 0, mid: 0, treble: 0 };  
    }

    if (isPlaying) {  
      requestRef.current = requestAnimationFrame(animate);  
    }  
  };

  useEffect(() => {  
    if (isPlaying) {  
      requestRef.current = requestAnimationFrame(animate);  
    } else {  
      if (requestRef.current) cancelAnimationFrame(requestRef.current);  
    }  
    return () => {  
      if (requestRef.current) cancelAnimationFrame(requestRef.current);  
    };  
  }, [isPlaying]);

  return (  
    <div   
      ref={stageRef}  
      className={`relative w-full h-full bg-black overflow-hidden select-none ${className}`}  
    >  
      <ParticleBackground intensity={bgIntensity} audioRef={audioDataRef} />
      <div className="absolute inset-0 z-10 pointer-events-none">  
        <LyricStage   
          currentLine={currentLine}   
          nextLine={nextLine}   
          previousLine={previousLine}   
          intensity={bgIntensity}  
        />  
      </div>  
    </div>  
  );  
};
