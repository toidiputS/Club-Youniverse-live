import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './useGameStore';
import { computeCurl } from '../../utils/curlNoise';
import { useIsMobile } from '../../hooks/useIsMobile';

const MAX_PARTICLES_DESKTOP = 150000;
const MAX_PARTICLES_MOBILE = 50000;
const PARTICLE_LIFETIME = 5.0; // seconds

export function Particles({ mousePosRef }: { mousePosRef: React.MutableRefObject<THREE.Vector3 | null> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const isMobile = useIsMobile();
  const MAX_PARTICLES = isMobile ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;
  
  const data = useMemo(() => {
    return {
      positions: new Float32Array(MAX_PARTICLES * 3),
      colors: new Float32Array(MAX_PARTICLES * 3),
      velocities: new Float32Array(MAX_PARTICLES * 3),
      lives: new Float32Array(MAX_PARTICLES), 
      active: new Uint8Array(MAX_PARTICLES),
      baseColors: new Float32Array(MAX_PARTICLES * 3),
      ownerIndices: new Int8Array(MAX_PARTICLES), 
      maxLives: new Float32Array(MAX_PARTICLES).fill(PARTICLE_LIFETIME),
    };
  }, [MAX_PARTICLES]);

  React.useEffect(() => {
    spawnIndex.current = 0;
  }, [MAX_PARTICLES]);

  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: particleTexture },
      uPixelRatio: { value: window.devicePixelRatio },
      uSize: { value: 120.0 }
    },
    vertexShader: `
      attribute float life;
      attribute float maxLife;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uPixelRatio;
      uniform float uSize;

      void main() {
        vColor = color;
        float lifeRatio = life / maxLife;
        float fadeIn = smoothstep(1.0, 0.8, lifeRatio);
        float fadeOut = smoothstep(0.0, 0.2, lifeRatio);
        vAlpha = fadeIn * fadeOut;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float scaleIn = smoothstep(1.0, 0.9, lifeRatio);
        float scaleOut = smoothstep(0.0, 0.25, lifeRatio);
        float scale = scaleIn * scaleOut;
        gl_PointSize = uSize * scale * uPixelRatio * (1.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 texColor = texture2D(uTexture, gl_PointCoord);
        if (texColor.a < 0.01) discard;
        float centerGlow = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        vec3 finalColor = vColor + centerGlow * 0.2;
        gl_FragColor = vec4(finalColor, vAlpha * texColor.a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  }), [particleTexture]);

  const spawnIndex = useRef(0);
  const tempColor = useRef(new THREE.Color());
  const tempPos = useRef(new THREE.Vector3());
  const defaultEmberColor = useRef(new THREE.Color('#ff4400'));
  const playerColorsRef = useRef([
    new THREE.Color('#ffffff'),
    new THREE.Color('#ffffff'),
    new THREE.Color('#ffffff'),
    new THREE.Color('#ffffff'),
  ]);
  const playerStatusRef = useRef([false, false, false, false]);
  const playerEnergiesRef = useRef([0, 0, 0, 0]);
  const forceDataRef = useRef<{x: number, y: number, z: number, type: string}[]>([]);

  const spawnParticle = (pos: THREE.Vector3, colorHex: string, ownerIndex: number = -1) => {
    const i = spawnIndex.current;
    const idx3 = i * 3;
    data.active[i] = 1;
    data.lives[i] = PARTICLE_LIFETIME;
    data.ownerIndices[i] = ownerIndex;
    data.positions[idx3] = pos.x + (Math.random() - 0.5) * 1.2;
    data.positions[idx3 + 1] = pos.y + (Math.random() - 0.5) * 1.2;
    data.positions[idx3 + 2] = pos.z + (Math.random() - 0.5) * 1.2;
    const speed = 1.0 + Math.random() * 2.0;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    data.velocities[idx3] = speed * Math.sin(phi) * Math.cos(theta);
    data.velocities[idx3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
    data.velocities[idx3 + 2] = speed * Math.cos(phi);
    tempColor.current.set(colorHex);
    tempColor.current.offsetHSL((Math.random() - 0.5) * 0.05, 0, 0);
    data.baseColors[idx3] = tempColor.current.r;
    data.baseColors[idx3 + 1] = tempColor.current.g;
    data.baseColors[idx3 + 2] = tempColor.current.b;
    data.colors[idx3] = tempColor.current.r;
    data.colors[idx3 + 1] = tempColor.current.g;
    data.colors[idx3 + 2] = tempColor.current.b;
    spawnIndex.current = (spawnIndex.current + 1) % MAX_PARTICLES;
  };

  const mySlotId = useGameStore((state) => state.mySlotId);
  const isReplaying = useGameStore((state) => state.isReplaying);
  const replayPlayers = useGameStore((state) => state.replayPlayers);
  const livePlayers = useGameStore((state) => state.players);
  const players = isReplaying && replayPlayers ? replayPlayers : livePlayers;
  const replayForceFields = useGameStore((state) => state.replayForceFields);
  const liveForceFields = useGameStore((state) => state.forceFields);
  const forceFields = isReplaying && replayForceFields ? replayForceFields : liveForceFields;
  const me = mySlotId ? players[mySlotId] : null;
  const myColor = me?.color;

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const spawnBase = isMobile ? 30 : 100;
    if (!isReplaying && mousePosRef.current && me && me.isPlaying && myColor) {
      const myIdx = parseInt(mySlotId?.split('-')[1] || '-1');
      const spawnCount = Math.max(1, Math.floor((me.energy / me.maxEnergy) * spawnBase));
      for (let k = 0; k < spawnCount; k++) {
        spawnParticle(mousePosRef.current, myColor, myIdx);
      }
    }
    for (let i = 0; i < 4; i++) {
        const player = players[`slot-${i}`];
        if (!isReplaying && player && player.id === mySlotId) continue;
        if (player && player.position && player.color && player.isPlaying) {
            tempPos.current.set(player.position.x, player.position.y, player.position.z);
            const spawnCount = Math.max(1, Math.floor((player.energy / player.maxEnergy) * spawnBase));
            for (let k = 0; k < spawnCount; k++) {
              spawnParticle(tempPos.current, player.color, i);
            }
        }
    }

    playerStatusRef.current[0] = players['slot-0']?.isPlaying ?? false;
    playerStatusRef.current[1] = players['slot-1']?.isPlaying ?? false;
    playerStatusRef.current[2] = players['slot-2']?.isPlaying ?? false;
    playerStatusRef.current[3] = players['slot-3']?.isPlaying ?? false;
    playerEnergiesRef.current[0] = (players['slot-0']?.energy || 0) / (players['slot-0']?.maxEnergy || 1);
    playerEnergiesRef.current[1] = (players['slot-1']?.energy || 0) / (players['slot-1']?.maxEnergy || 1);
    playerEnergiesRef.current[2] = (players['slot-2']?.energy || 0) / (players['slot-2']?.maxEnergy || 1);
    playerEnergiesRef.current[3] = (players['slot-3']?.energy || 0) / (players['slot-3']?.maxEnergy || 1);
    playerColorsRef.current[0].set(players['slot-0']?.color ?? '#ffffff');
    playerColorsRef.current[1].set(players['slot-1']?.color ?? '#ffffff');
    playerColorsRef.current[2].set(players['slot-2']?.color ?? '#ffffff');
    playerColorsRef.current[3].set(players['slot-3']?.color ?? '#ffffff');

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    const lives = pointsRef.current.geometry.attributes.life.array as Float32Array;

    let forceCount = 0;
    for (const key in forceFields) {
      const f = forceFields[key];
      if (forceDataRef.current.length <= forceCount) forceDataRef.current.push({ x: 0, y: 0, z: 0, type: '' });
      forceDataRef.current[forceCount].x = f.position.x;
      forceDataRef.current[forceCount].y = f.position.y;
      forceDataRef.current[forceCount].z = f.position.z;
      forceDataRef.current[forceCount].type = f.type;
      forceCount++;
    }
    forceDataRef.current.length = forceCount;
    const forceData = forceDataRef.current;

    for (let i = 0; i < MAX_PARTICLES; i++) {
        if (data.active[i] === 0) continue;
        const idx3 = i * 3;
        const ownerIdx = data.ownerIndices[i];
        if (ownerIdx !== -1 && ownerIdx < 4 && !playerStatusRef.current[ownerIdx]) {
            if (data.lives[i] > 0.4) data.lives[i] = 0.4;
        }
        data.lives[i] -= delta;
        if (data.lives[i] <= 0) {
            data.active[i] = 0;
            positions[idx3] = 99999;
            continue;
        }

        const time = state.clock.elapsedTime * 0.5;
        const curl = computeCurl(data.positions[idx3] * 0.1, data.positions[idx3+1] * 0.1, data.positions[idx3+2] * 0.2);
        data.velocities[idx3] += curl.x * delta * 2.0;
        data.velocities[idx3 + 1] += curl.y * delta * 2.0;
        data.velocities[idx3 + 2] += curl.z * delta * 2.0;
        
        data.velocities[idx3] += Math.sin(data.positions[idx3+1] * 0.5 + time) * delta * 1.0;
        data.velocities[idx3 + 1] += Math.cos(data.positions[idx3] * 0.5 + time) * delta * 1.0;

        let drainFactor = 0.0;
        for (const force of forceData) {
            const dx = force.x - data.positions[idx3];
            const dy = force.y - data.positions[idx3+1];
            const dz = force.z - data.positions[idx3+2];
            const distSq = dx*dx + dy*dy + dz*dz;
            if (distSq > 0.1 && distSq < 400) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist; const ny = dy / dist; const nz = dz / dist;
                if (force.type === 'attractor') {
                    const strength = 100.0 / (distSq + 1.0);
                    data.velocities[idx3] += nx * strength * delta;
                    data.velocities[idx3 + 1] += ny * strength * delta;
                    data.velocities[idx3 + 2] += nz * strength * delta;
                    drainFactor += Math.max(0, 1.0 - dist / 20.0);
                } else if (force.type === 'repulsor') {
                    const strength = 120.0 / (distSq + 1.0);
                    data.velocities[idx3] -= nx * strength * delta;
                    data.velocities[idx3 + 1] -= ny * strength * delta;
                    data.velocities[idx3 + 2] -= nz * strength * delta;
                } else if (force.type === 'black_hole') {
                    const strength = 4000.0 / (distSq + 0.5);
                    data.velocities[idx3] += nx * strength * delta;
                    data.velocities[idx3 + 1] += ny * strength * delta;
                    data.velocities[idx3 + 2] += nz * strength * delta;
                    drainFactor += Math.max(0, 1.0 - dist / 20.0);
                    const sx = ny; const sy = -nx;
                    data.velocities[idx3] += sx * strength * 0.8 * delta;
                    data.velocities[idx3 + 1] += sy * strength * 0.8 * delta;
                    if (dist < 3.0) {
                        data.velocities[idx3] *= 0.7; data.velocities[idx3 + 1] *= 0.7; data.velocities[idx3 + 2] *= 0.7;
                    }
                    if (distSq < 1.0) {
                        data.lives[i] = 0; data.active[i] = 0; positions[idx3] = 99999;
                        continue;
                    }
                }
            }
        }
        data.velocities[idx3] *= 0.97; data.velocities[idx3 + 1] *= 0.97; data.velocities[idx3 + 2] *= 0.97;
        data.positions[idx3] += data.velocities[idx3] * delta;
        data.positions[idx3 + 1] += data.velocities[idx3 + 1] * delta;
        data.positions[idx3 + 2] += data.velocities[idx3 + 2] * delta;
        positions[idx3] = data.positions[idx3];
        positions[idx3 + 1] = data.positions[idx3 + 1];
        positions[idx3 + 2] = data.positions[idx3 + 2];
        const lifeRatio = data.lives[i] / PARTICLE_LIFETIME;
        const t = Math.pow(1 - lifeRatio, 3);
        let r = data.baseColors[idx3]; let g = data.baseColors[idx3 + 1]; let b = data.baseColors[idx3 + 2];
        let targetR = defaultEmberColor.current.r; let targetG = defaultEmberColor.current.g; let targetB = defaultEmberColor.current.b;
        if (ownerIdx !== -1 && ownerIdx < 4) {
            const energyRatio = playerEnergiesRef.current[ownerIdx];
            const ownerColor = playerColorsRef.current[ownerIdx];
            const intensity = 0.4 + energyRatio * 0.6;
            r *= intensity; g *= intensity; b *= intensity;
            targetR = ownerColor.r * (1.0 - energyRatio) + energyRatio;
            targetG = ownerColor.g * (1.0 - energyRatio) + energyRatio;
            targetB = ownerColor.b * (1.0 - energyRatio) + energyRatio;
        }
        if (drainFactor > 0) {
            const cappedDrain = Math.min(1.0, drainFactor);
            const pulse = (Math.sin(time * 15.0 + i) * 0.5 + 0.5) * cappedDrain;
            r = r * (1 - pulse) + 1.0 * pulse; g = g * (1 - pulse) + 0.0 * pulse; b = b * (1 - pulse) + 0.0 * pulse;
            const dim = 1.0 - (cappedDrain * 0.5); r *= dim; g *= dim; b *= dim;
        }
        colors[idx3] = r * (1 - t) + targetR * t;
        colors[idx3 + 1] = g * (1 - t) + targetG * t;
        colors[idx3 + 2] = b * (1 - t) + targetB * t;
        lives[i] = data.lives[i];
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    pointsRef.current.geometry.attributes.life.needsUpdate = true;
  });

  return (
    <points key={MAX_PARTICLES} ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-life" args={[data.lives, 1]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-maxLife" args={[data.maxLives, 1]} />
      </bufferGeometry>
      <primitive object={material} />
    </points>
  );
}
