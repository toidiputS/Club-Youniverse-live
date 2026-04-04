import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from './useGameStore';
import { Trail } from '@react-three/drei';

function PlayerCursor({ position, color }: { position: THREE.Vector3; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailLength = useGameStore((state) => state.trailLength);
  const trailWidth = useGameStore((state) => state.trailWidth);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.lerp(position, 0.2);
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Trail width={trailWidth} length={trailLength} color={new THREE.Color(color)} attenuation={(t) => t * t}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.18, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      </mesh>
    </Trail>
  );
}

export function LocalCursor({ mousePosRef }: { mousePosRef: React.MutableRefObject<THREE.Vector3 | null> }) {
  const isReplaying = useGameStore((state) => state.isReplaying);
  const mySlotId = useGameStore((state) => state.mySlotId);
  const players = useGameStore((state) => state.players);
  const me = mySlotId ? players[mySlotId] : null;
  const myColor = me?.color || '#ffffff';
  const meshRef = useRef<THREE.Mesh>(null);
  const trailLength = useGameStore((state) => state.trailLength);
  const trailWidth = useGameStore((state) => state.trailWidth);

  useFrame((state) => {
    if (meshRef.current && mousePosRef.current) {
      meshRef.current.position.lerp(mousePosRef.current, 0.4);
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  if (isReplaying) return null;

  return (
    <Trail width={trailWidth} length={trailLength} color={new THREE.Color(myColor)} attenuation={(t) => t * t}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={myColor} transparent opacity={0.9} />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.18, 32]} />
          <meshBasicMaterial color={myColor} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      </mesh>
    </Trail>
  );
}

export function OtherPlayers() {
  const isReplaying = useGameStore((state) => state.isReplaying);
  const replayPlayers = useGameStore((state) => state.replayPlayers);
  const livePlayers = useGameStore((state) => state.players);
  const players = isReplaying && replayPlayers ? replayPlayers : livePlayers;

  return (
    <>
      {Object.values(players).map((player) => {
        if (!player.position) return null;
        const pos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        return <PlayerCursor key={player.id} position={pos} color={player.color} />;
      })}
    </>
  );
}
