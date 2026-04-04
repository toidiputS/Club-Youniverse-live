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

const PORT = 3000;
const GAME_DURATION = 10 * 60 * 1000; // 10 minutes
const ATTRACTOR_COST = 500;
const REPULSOR_COST = 2500;
const TRANSFER_AMOUNT = 500;
const MAX_FORCE_FIELDS = 20;
const FORCE_FIELD_LIFETIME = 15000; // 15 seconds
const ENERGY_DECAY_RATE = 0.5; // Energy lost per second when no activity
const PARTICLE_SPAWN_RATE = 50; // Particles per second from passive spawning
const ENERGY_PER_PARTICLE = 10; // Energy gained per particle attracted

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
  private gameLoopInterval: NodeJS.Timeout | null = null;
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
        this.claimSlot(client, message.slotId);
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

  private claimSlot(client: Client, slotId: string): void {
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
        this.broadcast({
          type: 'player_update',
          player: prevPlayer,
        });
      }
    }

    // Claim new slot
client.slotId = slotId;
    player.controllerId = client.id;
    
    // Start game if we have players
    if (this.isWaiting) {
      this.startGame();
    }

    this.broadcast({
      type: 'player_update',
      player,
    });

    console.log(`[Youniversal] ${client.id} claimed ${slotId}`);
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
    }, 100); // 10 FPS game tick
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
    const now = Date.now();
    const forces = Array.from(this.forceFields.values());
    const players = Array.from(this.players.values());

    // Calculate energy changes from force fields
    for (const force of forces) {
      const owner = players.find(p => p.id === force.ownerId);
      if (!owner || !owner.isPlaying) continue;

      // Energy gain based on force field type
      const gainRate = force.type === 'black_hole' ? 30 : 
                       force.type === 'attractor' ? 15 : 5;
      
      owner.energy = Math.min(owner.maxEnergy, owner.energy + gainRate * 0.1);
    }

    // Passive decay for inactive players
    for (const player of players) {
      if (player.controllerId === null && player.energy > 100) {
        player.energy = Math.max(100, player.energy - ENERGY_DECAY_RATE * 0.1);
      }
      
      // Check for voided players (out of energy)
      if (player.energy <= 0 && player.controllerId) {
        player.isPlaying = false;
        player.controllerId = null;
        this.broadcast({
          type: 'player_update',
          player,
        });
      }
    }

    // Periodic sync (every 10 ticks)
    if (Math.random() < 0.1) {
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
    }
  }

  private endGame(): void {
    this.timerRunning = false;
    
    // Find winner
    const sortedPlayers = Array.from(this.players.values())
      .filter(p => p.isPlaying)
      .sort((a, b) => b.energy - a.energy);
    
    const winner = sortedPlayers[0];
    
    console.log(`[Youniversal] Game over! Winner: ${winner?.id} with ${winner?.energy} energy`);

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
const server = new YouniversalServer(PORT);
console.log(`[Youniversal] Server ready. Waiting for players...`);
