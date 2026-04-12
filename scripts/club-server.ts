/**
 * Youniversal WebSocket Game Server
 * 
 * Manages multiplayer 4-player particle stealing game.
 * Players compete to accumulate energy by attracting particles.
 * Force fields drain particles from other players.
 * 
 * Run: npx ts-node scripts/youniversal-server.ts
 * Or: node scripts/youniversal-server.js (after ts-node transpile)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ktfezfnkghtwbkmhxdyd.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Cpca6J3OdRz7czjQJN-KeQ_RNFc9QQU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


const PORT = 3000;
const GAME_DURATION = 10 * 60 * 1000; // 10 minutes
const ATTRACTOR_COST = 500;
const REPULSOR_COST = 2500;
const MAX_FORCE_FIELDS = 20;
const FORCE_FIELD_LIFETIME = 15000; // 15 seconds
const ENERGY_DECAY_RATE = 0.5; // Energy lost per second when no activity

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Player {
  id: string;
  color: string;
  position: Vector3 | null;
  energy: number;
  maxEnergy: number;
  isPlaying: boolean;
  controllerId: string | null;
  name: string | null;
  userId: string | null;
}

interface ForceField {
  id: string;
  position: Vector3;
  type: 'attractor' | 'repulsor' | 'black_hole';
  ownerId: string;
  createdAt: number;
  color: string;
}

interface Client {
  ws: WebSocket;
  id: string;
  slotId: string | null;
}

// Player slot configurations
const SLOT_CONFIGS = [
  { id: 'slot-0', color: '#ff4444', position: { x: -15, y: 0, z: -15 }, corner: 'tl' },  // Red - Top Left
  { id: 'slot-1', color: '#4488ff', position: { x: 15, y: 0, z: -15 }, corner: 'tr' },    // Blue - Top Right
  { id: 'slot-2', color: '#ff8800', position: { x: -15, y: 0, z: 15 }, corner: 'bl' },    // Orange - Bottom Left
  { id: 'slot-3', color: '#44ff88', position: { x: 15, y: 0, z: 15 }, corner: 'br' },    // Green - Bottom Right
];

class YouniversalServer {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private players: Map<string, Player> = new Map();
  private forceFields: Map<string, ForceField> = new Map();
  private gameStartTime: number = 0;
  private gameEndTime: number = 0;
  private timerRunning: boolean = false;
  private isWaiting: boolean = true;
  private waitingEndTime: number = 0;
  // @ts-ignore - Assigned but not read
  private gameLoopInterval: NodeJS.Timeout | null = null;
  // @ts-ignore - Assigned but not read
  private forceFieldCleanupInterval: NodeJS.Timeout | null = null;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`[Youniversal Server] Running on ws://localhost:${port}`);
    
    this.initializeSlots();
    this.setupGameLoop();
    this.setupForceFieldCleanup();
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private initializeSlots(): void {
    for (const config of SLOT_CONFIGS) {
      this.players.set(config.id, {
        id: config.id,
        color: config.color,
        position: config.position,
        energy: 2500,
        maxEnergy: 10000,
        isPlaying: true,
        controllerId: null,
        name: null,
        userId: null,
      });
    }
  }

  private handleConnection(ws: WebSocket): void {
    const clientId = this.generateId();
    const client: Client = { ws, id: clientId, slotId: null };
    this.clients.set(clientId, client);
    
    console.log(`[Youniversal] Client connected: ${clientId} (Total: ${this.clients.size})`);

    // Send initial state
    this.sendToClient(client, {
      type: 'init',
      id: clientId,
      players: Array.from(this.players.values()),
      forceFields: Array.from(this.forceFields.values()),
      gameEndTime: this.gameEndTime,
      timerRunning: this.timerRunning,
      isWaiting: this.isWaiting,
      waitingEndTime: this.waitingEndTime,
    });

    // Start game if we have at least 1 player waiting
    if (this.isWaiting && this.clients.size >= 1) {
      this.startWaitingTimer();
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(client, message);
      } catch (e) {
        console.error('[Youniversal] Invalid message:', e);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(client);
    });

    ws.on('error', (error) => {
      console.error(`[Youniversal] Client error (${clientId}):`, error);
    });
  }

  private handleMessage(client: Client, message: any): void {
    switch (message.type) {
      case 'claim_slot':
        this.claimSlot(client, message.slotId, message.name, message.userId);
        break;
      case 'cursor':
        this.updateCursor(client, message.position);
        break;
      case 'add_force':
        this.addForce(client, message.position, message.forceType, message.color);
        break;
      case 'transfer_energy':
        this.transferEnergy(client, message.targetSlotId, message.amount);
        break;
      case 'reset_game':
        this.resetGame();
        break;
    }
  }

  private claimSlot(client: Client, slotId: string, name?: string, userId?: string): void {
    // Check if slot exists and is available
    const player = this.players.get(slotId);
    if (!player || player.controllerId) {
      return;
    }

    // Release previous slot if any
    if (client.slotId) {
      const prevPlayer = this.players.get(client.slotId);
      if (prevPlayer) {
        prevPlayer.controllerId = null;
        prevPlayer.name = null;
        prevPlayer.userId = null;
        this.broadcast({
          type: 'player_update',
          player: prevPlayer,
        });
      }
    }

    // Claim new slot
    client.slotId = slotId;
    player.controllerId = client.id;
    player.name = name || `GUEST_${client.id.substring(0, 4)}`;
    player.userId = userId || null;
    
    // Start game if we have players
    if (this.isWaiting) {
      this.startGame();
    }

    this.broadcast({
      type: 'player_update',
      player,
    });

    console.log(`[Youniversal] ${client.id} (${player.name}) claimed ${slotId}`);
  }

  private updateCursor(client: Client, position: Vector3): void {
    if (!client.slotId) return;
    
    const player = this.players.get(client.slotId);
    if (player) {
      player.position = position;
      this.broadcast({
        type: 'player_update',
        player,
      });
    }
  }

  private addForce(client: Client, position: Vector3, forceType: string, color: string): void {
    if (!client.slotId) return;

    const player = this.players.get(client.slotId);
    if (!player) return;

    const cost = forceType === 'repulsor' ? REPULSOR_COST : ATTRACTOR_COST;
    if (player.energy < cost) return;

    // Check force field limit
    const ownerForces = Array.from(this.forceFields.values()).filter(f => f.ownerId === client.slotId);
    if (ownerForces.length >= MAX_FORCE_FIELDS) {
      // Remove oldest force field
      const oldest = ownerForces.sort((a, b) => a.createdAt - b.createdAt)[0];
      this.forceFields.delete(oldest.id);
    }

    // Deduct energy
    player.energy -= cost;

    // Create force field
    const forceField: ForceField = {
      id: `force-${this.generateId()}`,
      position,
      type: forceType as 'attractor' | 'repulsor' | 'black_hole',
      ownerId: client.slotId,
      createdAt: Date.now(),
      color: color || player.color,
    };

    this.forceFields.set(forceField.id, forceField);

    // Check if should become black hole
    let removedForces: string[] = [];
    if (forceType === 'repulsor') {
      const totalRepulsors = Array.from(this.forceFields.values()).filter(f => f.ownerId === client.slotId && f.type === 'repulsor').length;
      if (totalRepulsors >= 5) {
        // Upgrade oldest repulsor to black hole
        const oldestRepulsor = ownerForces.filter(f => f.type === 'repulsor').sort((a, b) => a.createdAt - b.createdAt)[0];
        if (oldestRepulsor) {
          oldestRepulsor.type = 'black_hole';
          removedForces.push(oldestRepulsor.id);
        }
      }
    }

    this.broadcast({
      type: 'force_added',
      force: forceField,
      removedForces,
      player,
    });
  }

  private transferEnergy(client: Client, targetSlotId: string, amount: number): void {
    if (!client.slotId) return;

    const sender = this.players.get(client.slotId);
    const target = this.players.get(targetSlotId);
    
    if (!sender || !target) return;
    if (sender.energy < amount || target.energy >= target.maxEnergy) return;

    sender.energy -= amount;
    target.energy += amount;

    this.broadcast({
      type: 'player_update',
      player: sender,
    });
    this.broadcast({
      type: 'player_update',
      player: target,
    });
  }

  private handleDisconnect(client: Client): void {
    console.log(`[Youniversal] Client disconnected: ${client.id}`);
    
    if (client.slotId) {
      const player = this.players.get(client.slotId);
      if (player) {
        player.controllerId = null;
        player.name = null;
        player.userId = null;
        this.broadcast({
          type: 'player_update',
          player,
        });
      }
    }
    
    this.clients.delete(client.id);
    
    // If no clients left, go back to waiting state
    if (this.clients.size === 0) {
      this.isWaiting = true;
      this.timerRunning = false;
    }
  }

  private startWaitingTimer(): void {
    this.isWaiting = true;
    this.waitingEndTime = Date.now() + 60000; // 60 second wait
    this.broadcast({
      type: 'waiting_update',
      waiting: true,
      waitingEndTime: this.waitingEndTime,
    });
  }

  private startGame(): void {
    this.isWaiting = false;
    this.waitingEndTime = 0;
    this.gameStartTime = Date.now();
    this.gameEndTime = this.gameStartTime + GAME_DURATION;
    this.timerRunning = true;
    
    // Reset player energies
    for (const player of this.players.values()) {
      player.energy = 2500;
      player.isPlaying = true;
    }

    // Clear force fields
    this.forceFields.clear();

    console.log(`[Youniversal] Game setup. Players:`, Array.from(this.players.values()).map(p => p.name).filter(n => !!n));

    this.broadcast({
      type: 'waiting_update',
      waiting: false,
      waitingEndTime: 0,
    });
    
    this.broadcast({
      type: 'timer_update',
      gameEndTime: this.gameEndTime,
      running: true,
    });

    this.broadcast({
      type: 'sync',
      players: Array.from(this.players.values()),
      forceFields: Array.from(this.forceFields.values()),
    });

    console.log(`[Youniversal] Game started! Duration: ${GAME_DURATION / 60000} minutes`);
  }

  private resetGame(): void {
    // Reset all players
    for (const player of this.players.values()) {
      player.energy = 2500;
      player.isPlaying = true;
      player.controllerId = null;
      player.name = null;
      player.userId = null;
    }
    
    // Clear all force fields
    this.forceFields.clear();
    
    // Clear all client slots
    for (const client of this.clients.values()) {
      client.slotId = null;
    }

    // Go back to waiting state
    this.isWaiting = true;
    this.timerRunning = false;
    this.startWaitingTimer();

    console.log(`[Youniversal] Game reset`);
  }

  private setupGameLoop(): void {
    this.gameLoopInterval = setInterval(() => {
      this.gameLoop();
    }, 50); // 20 FPS game tick for smoother interaction
  }

  private setupForceFieldCleanup(): void {
    this.forceFieldCleanupInterval = setInterval(() => {
      this.cleanupExpiredForceFields();
    }, 1000);
  }

  private cleanupExpiredForceFields(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [id, field] of this.forceFields) {
      if (now - field.createdAt > FORCE_FIELD_LIFETIME) {
        expired.push(id);
      }
    }

    if (expired.length > 0) {
      for (const id of expired) {
        this.forceFields.delete(id);
      }
      
      this.broadcast({
        type: 'sync',
        players: Array.from(this.players.values()),
        forceFields: Array.from(this.forceFields.values()),
        removedForces: expired,
      });
    }
  }

  private gameLoop(): void {
    if (!this.timerRunning) return;

    // Check if game is over
    if (Date.now() >= this.gameEndTime) {
      this.endGame();
      return;
    }

    // Process force fields and energy transfer
    const forces = Array.from(this.forceFields.values());
    const players = Array.from(this.players.values()).filter(p => p.isPlaying);

    for (const force of forces) {
      const owner = players.find(p => p.id === force.ownerId);
      if (!owner) continue;

      // Base generation for the owner
      const baseGain = force.type === 'black_hole' ? 1.5 : (force.type === 'attractor' ? 0.8 : 0.2);
      owner.energy = Math.min(owner.maxEnergy, owner.energy + baseGain);

      // Energy stealing from other players
      for (const target of players) {
        if (target.id === owner.id || !target.position) continue;

        const dx = force.position.x - target.position.x;
        const dy = force.position.y - target.position.y;
        const dz = force.position.z - target.position.z;
        const distSq = dx*dx + dy*dy + dz*dz;

        // Radius for stealing: 15 units
        if (distSq < 225) {
            const distance = Math.sqrt(distSq);
            const stealPower = (1.0 - distance / 15) * (force.type === 'black_hole' ? 5.0 : 1.5);
            
            const actualSteal = Math.min(target.energy, stealPower);
            target.energy -= actualSteal;
            owner.energy = Math.min(owner.maxEnergy, owner.energy + actualSteal);
        }
      }
    }

    // Passive decay for disconnected/inactive "zombie" slots and regeneration for uncontrolled slots
    for (const player of Array.from(this.players.values())) {
      if (player.controllerId === null) {
        // Regenerate uncontrolled slots slowly to give new joiners a head start
        player.energy = Math.min(5000, player.energy + 0.1);
        player.isPlaying = true; // Always allow joining
      } else {
        // Active players decay slightly
        player.energy = Math.max(0, player.energy - 0.05);

        // Auto-void if energy hits zero
        if (player.energy <= 0) {
            console.log(`[Youniversal] Player ${player.name} voided!`);
            player.isPlaying = false;
            // controllerId is kept so they see the VOIDED screen, 
            // but they can't play until reset or energy transfer
        }
      }
    }

    // Periodic sync (every 2 seconds)
    if (Math.random() < 0.025) {
      this.broadcast({
        type: 'sync',
        players: Array.from(this.players.values()),
        forceFields: Array.from(this.forceFields.values()),
      });
    }
  }

  private endGame(): void {
    this.timerRunning = false;
    
    // Find winner
    const sortedPlayers = Array.from(this.players.values())
      .filter(p => p.isPlaying)
      .sort((a, b) => b.energy - a.energy);
    
    const winner = sortedPlayers[0];
    
    if (winner && winner.userId && winner.name) {
      console.log(`[Youniversal] Game over! Winner: ${winner.name} (${winner.userId}) with ${winner.energy} energy`);
      this.recordWin(winner.userId, winner.name);
    } else {
      console.log(`[Youniversal] Game over! Winner: ${winner?.id} (GUEST) with ${winner?.energy} energy`);
    }

    this.broadcast({
      type: 'timer_update',
      gameEndTime: this.gameEndTime,
      running: false,
    });

    // Return to waiting state after a delay
    setTimeout(() => {
      this.resetGame();
    }, 10000);
  }

  private async recordWin(userId: string, name: string): Promise<void> {
    try {
      console.log(`[Youniversal] Submitting win to Supabase for ${name}...`);
      
      // We use a single query that increments if exists or inserts if not
      // Using rpc or upsert with increment logic isn't trivial in plain JS without RPC
      // So we do a Select then Update/Insert
      const { data, error } = await supabase
        .from('youniversal_leaderboard')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Youniversal] Error checking leaderboard:', error);
        return;
      }

      if (data) {
        const { error: updateError } = await supabase
          .from('youniversal_leaderboard')
          .update({ 
            wins: (data.wins || 0) + 1,
            name: name, // Keep name updated
            updated_at: new Date()
          })
          .eq('user_id', userId);
        
        if (updateError) console.error('[Youniversal] Update failed:', updateError);
        else console.log(`[Youniversal] Updated ${name}'s wins to ${data.wins + 1}`);
      } else {
        const { error: insertError } = await supabase
          .from('youniversal_leaderboard')
          .insert({
            user_id: userId,
            name: name,
            wins: 1
          });
        
        if (insertError) console.error('[Youniversal] Insert failed:', insertError);
        else console.log(`[Youniversal] Created first win record for ${name}`);
      }
    } catch (e) {
      console.error('[Youniversal] recordWin exception:', e);
    }
  }

  private sendToClient(client: Client, data: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  private broadcast(data: any): void {
    const message = JSON.stringify(data);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }
}

// Start the server
new YouniversalServer(PORT);
console.log(`[Youniversal] Server ready. Waiting for players...`);
