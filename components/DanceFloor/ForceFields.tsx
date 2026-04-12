import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './useGameStore';

function Attractor({ position, color, ownerId }: { position: THREE.Vector3; color: string; ownerId: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const mountedAt = useRef(Date.now());
  const baseColor = useMemo(() => new THREE.Color(color || "#ffffff"), [color]);

  useFrame((state) => {
    if (meshRef.current) {
      const storeState = useGameStore.getState();
      const currentTime = storeState.isReplaying && storeState.snapshots.length > 0 
        ? storeState.snapshots[Math.floor(storeState.replayTime * (storeState.snapshots.length - 1))].time 
        : Date.now();
      const age = (currentTime - mountedAt.current) / 1000;
      let lifeScale = 1;
      if (age < 0.5) {
        lifeScale = age / 0.5;
      } else if (age > 9.5) {
        lifeScale = Math.max(0, (10 - age) / 0.5);
      }

      const players = storeState.isReplaying && storeState.replayPlayers ? storeState.replayPlayers : storeState.players;
      const owner = players[ownerId];
      const energyRatio = owner ? owner.energy / owner.maxEnergy : 0.5;
      const intensity = 0.3 + energyRatio * 1.2;

      const currentMaterial = meshRef.current.material as THREE.MeshStandardMaterial;
      currentMaterial.color.copy(baseColor).multiplyScalar(intensity);
      currentMaterial.emissive.copy(baseColor).multiplyScalar(intensity * 0.8);
      
      const innerCore = meshRef.current.children[0] as THREE.Mesh;
      (innerCore.material as THREE.MeshBasicMaterial).color.copy(baseColor).multiplyScalar(intensity * 1.5);

      const scale = (1 + Math.sin(state.clock.elapsedTime * 5) * 0.1) * lifeScale * (0.8 + energyRatio * 0.4);
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh position={position} ref={meshRef}>
      <sphereGeometry args={[1.2, 16, 16]} />
      <meshStandardMaterial 
        roughness={0.1} 
        metalness={0.8}
        emissive={color || "#ffffff"}
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
        color={color || "#ffffff"}
      />
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={color || "#ffffff"} />
      </mesh>
    </mesh>
  );
}

function Repulsor({ position, color, createdAt, ownerId }: { position: THREE.Vector3; color: string; createdAt: number; ownerId: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const baseColor = useMemo(() => new THREE.Color(color || "#ff3333"), [color]);

  useFrame((state) => {
    if (groupRef.current) {
      const storeState = useGameStore.getState();
      const currentTime = storeState.isReplaying && storeState.snapshots.length > 0 
        ? storeState.snapshots[Math.floor(storeState.replayTime * (storeState.snapshots.length - 1))].time 
        : Date.now();
      const age = (currentTime - createdAt) / 1000;
      const lifeScale = Math.min(1, age / 0.2); // Quick fade in

      const players = storeState.isReplaying && storeState.replayPlayers ? storeState.replayPlayers : storeState.players;
      const owner = players[ownerId];
      const energyRatio = owner ? owner.energy / owner.maxEnergy : 0.5;
      const intensity = 0.3 + energyRatio * 1.2;

      const time = state.clock.elapsedTime * 1.5;
      groupRef.current.children.forEach((child, i) => {
        if (i === 2) {
          // Inner core
          child.scale.set(lifeScale, lifeScale, lifeScale);
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).color.copy(baseColor).multiplyScalar(intensity * 1.5);
          return;
        }
        const mesh = child as THREE.Mesh;
        // 2 rings
        const phase = (time + i * 0.5) % 1;
        const scale = (0.2 + phase * 8.0) * lifeScale; // Up to 8 units (2 rings)
        mesh.scale.set(scale, scale, scale);
        const opacity = Math.sin(phase * Math.PI) * 0.6 * lifeScale * (0.4 + energyRatio * 0.6);
        
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = opacity;
        mat.color.copy(baseColor).multiplyScalar(intensity);
      });
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {[0, 1].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[0.9, 1.0, 32]} />
          <meshBasicMaterial color={color || "#ff3333"} side={THREE.DoubleSide} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={color || "#ff3333"} />
      </mesh>
    </group>
  );
}

function BlackHole({ position, color, createdAt }: { position: THREE.Vector3; color: string; createdAt: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const REPULSOR_DURATION = 1.5;
  const BLACK_HOLE_DURATION = 2.0;

  useFrame(() => {
    if (groupRef.current) {
      const storeState = useGameStore.getState();
      const currentTime = storeState.isReplaying && storeState.snapshots.length > 0 
        ? storeState.snapshots[Math.floor(storeState.replayTime * (storeState.snapshots.length - 1))].time 
        : Date.now();
      const totalAge = (currentTime - createdAt) / 1000;
      const bhAge = totalAge - REPULSOR_DURATION;
      const timeLeft = BLACK_HOLE_DURATION - bhAge;
      
      const core = groupRef.current.children[0] as THREE.Mesh;
      const disk = groupRef.current.children[1] as THREE.Mesh;
      const outerRing = groupRef.current.children[2] as THREE.Mesh;
      const suckRing = groupRef.current.children[3] as THREE.Mesh;

      // 1. Initial "Suck into a point" transition (0.4s)
      if (bhAge < 0.4) {
        const t = bhAge / 0.4;
        suckRing.visible = true;
        suckRing.scale.set(8 * (1 - t), 8 * (1 - t), 8 * (1 - t));
        (suckRing.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
      } else {
        suckRing.visible = false;
      }

      // 2. Black Hole Core Pulse
      const pulse = 1.0 + Math.sin(bhAge * 15) * 0.15;
      
      // 3. End "Pop" animation
      let popScale = 1;
      if (timeLeft < 0.3 && timeLeft > 0) {
        const t = 1 - (timeLeft / 0.3);
        popScale = 1 + t * 12;
        (core.material as THREE.MeshBasicMaterial).opacity = 1 - t;
        (disk.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.7;
        (outerRing.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.3;
      } else if (timeLeft <= 0) {
        (core.material as THREE.MeshBasicMaterial).opacity = 0;
        (disk.material as THREE.MeshBasicMaterial).opacity = 0;
        (outerRing.material as THREE.MeshBasicMaterial).opacity = 0;
      }
      
      core.scale.set(pulse * popScale, pulse * popScale, pulse * popScale);
      core.rotation.z += 0.2;

      // 4. Accretion Disk
      const diskScale = (1.0 + Math.sin(bhAge * 10) * 0.1) * Math.min(1, bhAge / 0.2);
      disk.scale.set(diskScale * 4, diskScale * 4, diskScale * 4);
      disk.rotation.z -= 0.1;

      // 5. Outer Ring
      const outerScale = (1.0 + Math.cos(bhAge * 8) * 0.05) * Math.min(1, bhAge / 0.4);
      outerRing.scale.set(outerScale, outerScale, outerScale);
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {/* 0: Dark Core */}
      <mesh>
        <sphereGeometry args={[1.2, 24, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={1} />
        <mesh>
          <sphereGeometry args={[1.3, 24, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
        </mesh>
      </mesh>
      
      {/* 1: Accretion Disk */}
      <mesh rotation={[Math.PI / 2.5, 0, 0]}>
        <ringGeometry args={[0.5, 3.0, 32]} />
        <meshBasicMaterial 
          color={color} 
          side={THREE.DoubleSide} 
          transparent 
          opacity={0.7} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
        />
      </mesh>

      {/* 2: Outer Ring (3rd ring) */}
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[11.8, 12.0, 48]} />
        <meshBasicMaterial 
          color="#ffffff" 
          side={THREE.DoubleSide} 
          transparent 
          opacity={0.3} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
        />
      </mesh>

      {/* 3: Sucking Ring (Transition) */}
      <mesh>
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function ForceFields() {
  const isReplaying = useGameStore((state) => state.isReplaying);
  const replayForceFields = useGameStore((state) => state.replayForceFields);
  const liveForceFields = useGameStore((state) => state.forceFields);
  const forceFields = isReplaying && replayForceFields ? replayForceFields : liveForceFields;

  return (
    <>
      {Object.values(forceFields).map((force) => {
        const pos = new THREE.Vector3(force.position.x, force.position.y, force.position.z);
        if (force.type === 'attractor') {
          return <Attractor key={force.id} position={pos} color={force.color} ownerId={force.ownerId} />;
        } else if (force.type === 'repulsor') {
          return <Repulsor key={force.id} position={pos} color={force.color} createdAt={force.createdAt} ownerId={force.ownerId} />;
        } else if (force.type === 'black_hole') {
          return <BlackHole key={force.id} position={pos} color={force.color} createdAt={force.createdAt} />;
        }
        return null;
      })}
    </>
  );
}
