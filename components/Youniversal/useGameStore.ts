import { create } from 'zustand';
import { supabase } from '../../services/supabaseClient';

export type Vector3 = { x: number; y: number; z: number };

export interface Player {
  id: string; // "slot-0", "slot-1", etc.
  color: string;
  position: Vector3 | null;
  energy: number;
  maxEnergy: number;
  isPlaying: boolean;
  controllerId: string | null;
}

export interface ForceField {
  id: string;
  position: Vector3;
  type: 'attractor' | 'repulsor' | 'black_hole';
  ownerId: string;
  createdAt: number;
  color: string;
}

export interface Snapshot {
  time: number;
  players: Record<string, Player>;
  forceFields: Record<string, ForceField>;
}

interface GameState {
  myId: string | null;
  mySlotId: string | null;
  players: Record<string, Player>;
  forceFields: Record<string, ForceField>;
  replayPlayers: Record<string, Player> | null;
  replayForceFields: Record<string, ForceField> | null;
  isReplaying: boolean;
  isPlayingReplay: boolean;
  snapshots: Snapshot[];
  replayTime: number; // 0 to 1
  ws: WebSocket | null;
  isConnected: boolean;
  joinError: string | null;
  gameEndTime: number | null;
  timerRunning: boolean;
  isWaiting: boolean;
  waitingEndTime: number | null;
  leaderboard: { name: string; wins: number }[];
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  claimSlot: (slotId: string) => void;
  sendCursor: (position: Vector3) => void;
  addForce: (position: Vector3, type: 'attractor' | 'repulsor') => void;
  transferEnergy: (targetSlotId: string, amount: number) => void;
  resetGame: () => void;
  
  // HUD/Settings
  selectedForceType: 'attractor' | 'repulsor';
  setSelectedForceType: (type: 'attractor' | 'repulsor') => void;
  trailLength: number;
  trailWidth: number;
  setTrailLength: (length: number) => void;
  setTrailWidth: (width: number) => void;
  
  // Replay Actions
  startReplay: () => void;
  stopReplay: () => void;
  setReplayTime: (time: number) => void;
  setIsPlayingReplay: (playing: boolean) => void;
  recordSnapshot: () => void;
  fetchLeaderboard: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  myId: null,
  mySlotId: null,
  players: {},
  forceFields: {},
  ws: null,
  isConnected: false,
  joinError: null,
  gameEndTime: null,
  timerRunning: false,
  isWaiting: false,
  waitingEndTime: null,
  leaderboard: [
    { name: "CYL_ELITE", wins: 42 },
    { name: "NEO_PUNK", wins: 28 },
    { name: "VIBE_LORD", wins: 15 }
  ],
  selectedForceType: 'attractor',
  trailLength: 8,
  trailWidth: 0.2,
  replayPlayers: null,
  replayForceFields: null,
  isReplaying: false,
  isPlayingReplay: false,
  snapshots: [],
  replayTime: 0,

  setSelectedForceType: (type) => set({ selectedForceType: type }),
  setTrailLength: (length) => set({ trailLength: length }),
  setTrailWidth: (width) => set({ trailWidth: width }),

  fetchLeaderboard: async () => {
    try {
      const { data, error } = await supabase
        .from('youniversal_leaderboard')
        .select('name, wins')
        .order('wins', { ascending: false })
        .limit(3);
      
      if (!error && data) {
         set({ leaderboard: data });
      }
    } catch(e) {
       console.warn("Leaderboard fetch failed, using fallback static data.");
    }
  },

  startReplay: () => {
    const { snapshots } = get();
    if (snapshots.length > 0) {
      set({ 
        isReplaying: true, 
        isPlayingReplay: true, 
        replayTime: 0, 
        replayPlayers: snapshots[0].players, 
        replayForceFields: snapshots[0].forceFields 
      });
    }
  },
  stopReplay: () => set({ isReplaying: false, isPlayingReplay: false, replayPlayers: null, replayForceFields: null }),
  setReplayTime: (time) => {
    const { snapshots } = get();
    if (snapshots.length === 0) return;
    const index = Math.floor(time * (snapshots.length - 1));
    const snapshot = snapshots[index];
    set({ replayTime: time, replayPlayers: snapshot.players, replayForceFields: snapshot.forceFields });
  },
  setIsPlayingReplay: (playing) => set({ isPlayingReplay: playing }),
  recordSnapshot: () => {
    const { players, forceFields, snapshots, isReplaying } = get();
    if (isReplaying) return;
    const newSnapshots = [...snapshots, { time: Date.now(), players: { ...players }, forceFields: { ...forceFields } }];
    if (newSnapshots.length > 600) {
      newSnapshots.shift();
    }
    set({ snapshots: newSnapshots });
  },

  connect: () => {
    const { ws: currentWs } = get();
    if (currentWs && (currentWs.readyState === WebSocket.CONNECTING || currentWs.readyState === WebSocket.OPEN)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use port 3000 to match the YOUNIVERSAL server.ts
    const wsUrl = `${protocol}//${window.location.hostname}:3000`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('YOUNIVERSAL connected');
      set({ isConnected: true });
    };

    ws.onerror = (error) => {
      console.error('YOUNIVERSAL error:', error);
      set({ isConnected: false });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'init') {
        set({ 
          myId: data.id, 
          gameEndTime: data.gameEndTime,
          timerRunning: data.timerRunning,
          isWaiting: data.isWaiting || false,
          waitingEndTime: data.waitingEndTime || null
        });
        const playersMap: Record<string, Player> = {};
        let mySlotId = null;

        data.players.forEach((p: Player) => {
          playersMap[p.id] = p;
          if (p.controllerId === data.id) {
            mySlotId = p.id;
          }
        });
        
        const forcesMap: Record<string, ForceField> = {};
        data.forceFields.forEach((f: ForceField) => {
          forcesMap[f.id] = f;
        });
        
        set({ players: playersMap, forceFields: forcesMap, mySlotId });
      } else if (data.type === 'player_update') {
        set((state) => {
          const p = data.player;
          let newMySlotId = state.mySlotId;
          
          if (p.controllerId === state.myId) {
             newMySlotId = p.id;
          } else if (state.mySlotId === p.id && p.controllerId !== state.myId) {
             newMySlotId = null;
          }
          
          return {
            players: { ...state.players, [p.id]: p },
            mySlotId: newMySlotId
          };
        });
      } else if (data.type === 'force_added') {
        set((state) => {
          const newForces: Record<string, ForceField> = { ...state.forceFields, [data.force.id]: data.force };
          
          if (data.removedForces) {
            data.removedForces.forEach((id: string) => delete newForces[id]);
          }
          
          const updates: any = { forceFields: newForces };
          if (data.player) {
            updates.players = { ...state.players, [data.player.id]: data.player };
          }
          
          return updates;
        });
      } else if (data.type === 'sync') {
        set((state) => {
          const newPlayers: Record<string, Player> = { ...state.players };
          let newMySlotId = state.mySlotId;
          
          data.players.forEach((p: Player) => {
            newPlayers[p.id] = p;
            if (p.controllerId === state.myId) {
               newMySlotId = p.id;
            } else if (state.mySlotId === p.id && p.controllerId !== state.myId) {
               newMySlotId = null;
            }
          });
          
          let newForces: Record<string, ForceField> = { ...state.forceFields };
          if (data.forceFields) {
            data.forceFields.forEach((f: ForceField) => {
              newForces[f.id] = f;
            });
          }
          if (data.removedForces) {
             data.removedForces.forEach((id: string) => {
               delete newForces[id];
             });
          }
          
          return { players: newPlayers, forceFields: newForces, mySlotId: newMySlotId };
        });
      } else if (data.type === 'timer_update') {
        set({ 
          gameEndTime: data.gameEndTime !== undefined ? data.gameEndTime : get().gameEndTime,
          timerRunning: data.running !== undefined ? data.running : get().timerRunning
        });
      } else if (data.type === 'waiting_update') {
        set({
          isWaiting: data.waiting,
          waitingEndTime: data.waitingEndTime || null
        });
      }
    };

    ws.onclose = () => {
      set({ isConnected: false, mySlotId: null });
    };

    set({ ws });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, players: {}, forceFields: {}, isConnected: false, joinError: null, mySlotId: null });
    }
  },

  claimSlot: (slotId: string) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      set({ joinError: null });
      ws.send(JSON.stringify({ type: 'claim_slot', slotId }));
    }
  },

  sendCursor: (position: Vector3) => {
    const { ws, isReplaying } = get();
    if (isReplaying) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'cursor', position }));
    }
  },

  addForce: (position: Vector3, type: 'attractor' | 'repulsor') => {
    const { ws, mySlotId, players, isReplaying } = get();
    if (isReplaying) return;
    if (ws && ws.readyState === WebSocket.OPEN && mySlotId) {
      const me = players[mySlotId];
      ws.send(JSON.stringify({ type: 'add_force', position, forceType: type, color: me.color }));
    }
  },

  transferEnergy: (targetSlotId: string, amount: number) => {
    const { ws, mySlotId } = get();
    if (ws && ws.readyState === WebSocket.OPEN && mySlotId) {
      ws.send(JSON.stringify({ type: 'transfer_energy', targetSlotId, amount }));
    }
  },

  resetGame: () => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'reset_game' }));
    }
  },
}));
