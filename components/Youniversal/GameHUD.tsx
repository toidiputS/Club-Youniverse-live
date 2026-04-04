import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from './useGameStore';
import { HelpCircle, MousePointer2, Zap, Settings2, Circle, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GameHUD() {
  const players = useGameStore((state) => state.players);
  const mySlotId = useGameStore((state) => state.mySlotId);
  const claimSlot = useGameStore((state) => state.claimSlot);
  const transferEnergy = useGameStore((state) => state.transferEnergy);
  const gameEndTime = useGameStore((state) => state.gameEndTime);
  const timerRunning = useGameStore((state) => state.timerRunning);
  const isWaiting = useGameStore((state) => state.isWaiting);
  const waitingEndTime = useGameStore((state) => state.waitingEndTime);
  const selectedForceType = useGameStore((state) => state.selectedForceType);
  const setSelectedForceType = useGameStore((state) => state.setSelectedForceType);

  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('10:00');
  const [waitLeft, setWaitLeft] = useState<string>('60');

  const trailLength = useGameStore((state) => state.trailLength);
  const trailWidth = useGameStore((state) => state.trailWidth);
  const setTrailLength = useGameStore((state) => state.setTrailLength);
  const setTrailWidth = useGameStore((state) => state.setTrailWidth);

  const isReplaying = useGameStore((state) => state.isReplaying);
  const isPlayingReplay = useGameStore((state) => state.isPlayingReplay);
  const replayTime = useGameStore((state) => state.replayTime);
  const startReplay = useGameStore((state) => state.startReplay);
  const stopReplay = useGameStore((state) => state.stopReplay);
  const setReplayTime = useGameStore((state) => state.setReplayTime);
  const setIsPlayingReplay = useGameStore((state) => state.setIsPlayingReplay);
  const recordSnapshot = useGameStore((state) => state.recordSnapshot);
  const snapshots = useGameStore((state) => state.snapshots);
  
  const prevMySlotId = useRef<string | null>(null);

  useEffect(() => {
    if (prevMySlotId.current && !mySlotId) {
      const lastSlot = players[prevMySlotId.current];
      if (lastSlot && (!lastSlot.isPlaying || lastSlot.energy <= 0)) {
        setShowGameOver(true);
        setTimeout(() => setShowGameOver(false), 5000);
      }
    }
    prevMySlotId.current = mySlotId;
  }, [mySlotId, players]);

  useEffect(() => {
    if (!gameEndTime) return;
    const interval = setInterval(() => {
      if (!timerRunning) return;
      const now = Date.now();
      const diff = Math.max(0, gameEndTime - now);
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameEndTime, timerRunning]);

  useEffect(() => {
    if (!waitingEndTime || !isWaiting) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, waitingEndTime - now);
      const seconds = Math.ceil(diff / 1000);
      setWaitLeft(seconds.toString());
    }, 1000);
    return () => clearInterval(interval);
  }, [waitingEndTime, isWaiting]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!useGameStore.getState().isReplaying) {
        recordSnapshot();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [recordSnapshot]);

  useEffect(() => {
    if (!isReplaying || !isPlayingReplay) return;
    let lastTime = performance.now();
    let animationFrameId: number;
    const updateReplay = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      const state = useGameStore.getState();
      if (state.snapshots.length > 0) {
        const duration = (state.snapshots[state.snapshots.length - 1].time - state.snapshots[0].time) / 1000;
        const timeStep = duration > 0 ? delta / duration : 0;
        let newTime = state.replayTime + timeStep;
        if (newTime >= 1) {
          newTime = 1;
          state.setIsPlayingReplay(false);
        }
        state.setReplayTime(newTime);
      }
      animationFrameId = requestAnimationFrame(updateReplay);
    };
    animationFrameId = requestAnimationFrame(updateReplay);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isReplaying, isPlayingReplay]);

  const renderSlot = (slotId: string, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    const currentPlayers = isReplaying && useGameStore.getState().replayPlayers ? useGameStore.getState().replayPlayers! : players;
    const p = currentPlayers[slotId];
    if (!p) return null;

    const isMe = mySlotId === slotId;
    const isTaken = !!p.controllerId;
    const isVoided = !p.isPlaying;
    const attractorCount = Math.floor(p.energy / 500);
    const repulsorCount = Math.floor(p.energy / 2500);

    const posClass = {
      tl: 'top-0 left-0 items-start text-left',
      tr: 'top-0 right-0 items-end text-right',
      bl: 'bottom-0 left-0 items-start text-left flex-col-reverse',
      br: 'bottom-0 right-0 items-end text-right flex-col-reverse',
    }[corner];

    return (
      <div className={`absolute ${posClass} z-20 flex flex-col gap-0.5 sm:gap-1 p-2 sm:p-6 transition-all duration-300 ${isMe ? 'opacity-100' : 'opacity-60 hover:opacity-100'} ${isVoided ? 'grayscale opacity-30 shadow-none' : ''}`}>
        <div className="flex items-center gap-2 text-[8px] sm:text-[10px] tracking-[0.2em] font-bold uppercase opacity-50">
           {isVoided ? <span className="text-red-500">VOIDED</span> : isMe ? <span className="text-white">YOU</span> : isTaken ? <span>PLAYER {slotId.split('-')[1]}</span> : <span>OPEN</span>}
        </div>

        {!isVoided && (
          <motion.div 
            className="text-lg sm:text-2xl font-mono font-light leading-none" 
            style={{ color: p.color }}
            animate={{ 
              textShadow: [
                `0 0 10px ${p.color}40`,
                `0 0 25px ${p.color}80`,
                `0 0 10px ${p.color}40`
              ]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {Math.floor(p.energy)}
          </motion.div>
        )}

        {!isVoided && (
          <div className="w-20 sm:w-32 h-0.5 bg-white/10 mt-1 mb-1 relative">
             <motion.div 
               className="h-full"
               initial={false}
               animate={{ 
                 width: `${Math.min(100, (p.energy / p.maxEnergy) * 100)}%`,
                 backgroundColor: p.color,
                 boxShadow: [
                   `0 0 5px ${p.color}`,
                   `0 0 15px ${p.color}`,
                   `0 0 5px ${p.color}`
                 ]
               }}
               transition={{ 
                 width: { type: "spring", stiffness: 100, damping: 20 },
                 boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
               }}
             />
          </div>
        )}

        {!isVoided && (isTaken || isMe) && (
          <div className={`flex gap-3 text-[8px] sm:text-[10px] font-mono opacity-80 ${corner.includes('r') ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="flex items-center gap-1 text-cyan-400">
              <span className="font-bold">{attractorCount}</span>
              <MousePointer2 size={10} />
            </div>
            <div className="flex items-center gap-1 text-yellow-400">
              <span className="font-bold">{repulsorCount}</span>
              <MousePointer2 size={10} className="transform scale-x-[-1]" />
            </div>
          </div>
        )}

        {!isReplaying && !isVoided && !isTaken && !mySlotId && (
          <button
            onClick={() => claimSlot(slotId)}
            className="mt-2 text-[8px] sm:text-[10px] tracking-[0.2em] uppercase text-white/50 hover:text-white border-b border-transparent hover:border-white transition-all pointer-events-auto"
          >
            [ INITIATE ]
          </button>
        )}

        {!isReplaying && !isVoided && isTaken && !isMe && mySlotId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              transferEnergy(slotId, 500);
            }}
            disabled={players[mySlotId]?.energy < 500 || p.energy >= p.maxEnergy}
            className={`mt-2 flex items-center gap-1 text-[8px] sm:text-[10px] tracking-[0.1em] uppercase border px-2 py-1 rounded transition-all pointer-events-auto ${
              players[mySlotId]?.energy >= 500 && p.energy < p.maxEnergy
                ? 'text-yellow-500/50 hover:text-yellow-400 border-transparent hover:border-yellow-500/30' 
                : 'text-gray-500/30 border-transparent cursor-not-allowed'
            }`}
          >
            <Zap size={10} />
            <span className="hidden sm:inline">TRANSFER 500</span>
            <span className="sm:hidden">500</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Top Center: Title & Timer */}
      <div className="absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 sm:gap-2 pointer-events-auto opacity-80 hover:opacity-100 transition-opacity">
        <h1 className="text-[12px] sm:text-sm font-bold tracking-[0.8em] uppercase text-white/80 select-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          YOUNIVERSAL
        </h1>
        <div className="text-[8px] sm:text-[10px] font-mono text-white/40 tracking-widest uppercase">
          {timerRunning ? timeLeft : isWaiting ? `WAITING FOR OTHERS: ${waitLeft}s` : 'WAITING...'}
        </div>
        <div className="flex gap-4 mt-1">
          <button onClick={() => setShowSettings(!showSettings)} className="text-white/20 hover:text-white transition-colors" title="Settings">
            <Settings2 size={12} />
          </button>
          <button onClick={() => setShowHelp(true)} className="text-white/20 hover:text-white transition-colors" title="Mission Dossier">
            <HelpCircle size={12} />
          </button>
          {snapshots.length > 0 && (
            <button 
              onClick={() => isReplaying ? stopReplay() : startReplay()}
              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border transition-colors ${isReplaying ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-white/10 text-white/60 border-white/20 hover:bg-white/20'}`}
            >
              {isReplaying ? 'Stop Replay' : 'Replay'}
            </button>
          )}
        </div>

        {isReplaying && (
          <div className="mt-4 p-4 bg-black/80 border border-white/10 rounded backdrop-blur-md flex flex-col gap-4 w-64 pointer-events-auto">
            <h3 className="text-[10px] uppercase tracking-widest text-white/60 border-b border-white/10 pb-2 flex justify-between items-center">
              <span>Replay Timeline</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsPlayingReplay(!isPlayingReplay)} className="text-white hover:text-cyan-400 transition-colors">
                  {isPlayingReplay ? 'PAUSE' : 'PLAY'}
                </button>
                <button onClick={() => stopReplay()} className="hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>
            </h3>
            <div className="flex flex-col gap-1">
              <input 
                type="range" min="0" max="1" step="0.001" value={replayTime} 
                onChange={(e) => { setIsPlayingReplay(false); setReplayTime(Number(e.target.value)); }}
                className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer"
              />
              <div className="text-[8px] text-white/40 text-right">{Math.floor(replayTime * 100)}%</div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="mt-4 p-4 bg-black/80 border border-white/10 rounded backdrop-blur-md flex flex-col gap-4 w-64 pointer-events-auto">
            <h3 className="text-[10px] uppercase tracking-widest text-white/60 border-b border-white/10 pb-2 flex justify-between items-center">
              <span>Trail Settings</span>
              <button onClick={() => setShowSettings(false)} className="hover:text-white transition-colors">
                <X size={12} />
              </button>
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>Length</span>
                <span>{trailLength}</span>
              </div>
              <input type="range" min="1" max="30" value={trailLength} onChange={(e) => setTrailLength(Number(e.target.value))} className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>Width</span>
                <span>{trailWidth.toFixed(2)}</span>
              </div>
              <input type="range" min="0.05" max="1.0" step="0.05" value={trailWidth} onChange={(e) => setTrailWidth(Number(e.target.value))} className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer" />
            </div>
          </div>
        )}
      </div>

      {renderSlot('slot-0', 'tl')}
      {renderSlot('slot-1', 'tr')}
      {renderSlot('slot-2', 'bl')}
      {renderSlot('slot-3', 'br')}

      <AnimatePresence>
        {showGameOver && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center backdrop-blur-md"
          >
            <div className="text-center space-y-4 p-6">
              <h2 className="text-4xl sm:text-6xl font-bold tracking-[0.5em] text-red-500 uppercase">VOIDED</h2>
              <p className="text-white/40 font-mono text-[10px] sm:text-xs tracking-widest uppercase">Your energy has been consumed by the singularity.</p>
              <div className="pt-8">
                <button onClick={() => setShowGameOver(false)} className="px-8 py-3 border border-white/20 hover:bg-white/10 text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-all pointer-events-auto">Return to Observation</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showHelp && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm pointer-events-auto" onClick={() => setShowHelp(false)}>
          <div className="max-w-2xl w-full text-white/80 font-mono space-y-8 overflow-y-auto max-h-full p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-end border-b border-white/20 pb-4">
              <h2 className="text-xl sm:text-2xl tracking-widest uppercase text-white">Mission Dossier</h2>
              <button onClick={() => setShowHelp(false)} className="text-xs hover:text-white underline underline-offset-4">CLOSE [ESC]</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 text-[10px] sm:text-xs leading-relaxed">
              <div className="space-y-6">
                <div><h3 className="text-white mb-2 uppercase tracking-wider">Objective</h3><p>Accumulate maximum energy before the universal collapse. Drain energy from rivals and uncontrolled sectors.</p></div>
                <div><h3 className="text-white mb-2 uppercase tracking-wider">Protocol</h3><ul className="space-y-2 list-disc list-inside text-gray-400"><li>Select a sector to initiate control.</li><li>Uncontrolled sectors regenerate energy indefinitely.</li><li>Use energy to deploy gravitational anomalies.</li></ul></div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-white mb-2 uppercase tracking-wider">Controls</h3>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 border border-white/40 rounded flex items-center justify-center">L</div><span>Click / Tap</span></div>
                    <div className="text-gray-500">Deploy Attractor (Cost: 500)<br/>Pulls particles in.</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 border border-white/40 rounded flex items-center justify-center">R</div><span>Click / Long Press</span></div>
                    <div className="text-gray-500">Deploy Repulsor (Cost: 2500)<br/>Pushes particles away. Becomes Black Hole.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8 border-t border-white/10">
              <button onClick={() => { useGameStore.getState().resetGame(); setShowHelp(false); }} className="px-6 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest transition-all">Reset Protocol</button>
              <button onClick={() => setShowHelp(false)} className="px-6 py-2 border border-white/20 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-white transition-all">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
