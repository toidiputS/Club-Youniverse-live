import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Particles } from './Particles';
import { OtherPlayers, LocalCursor } from './OtherPlayers';
import { ForceFields } from './ForceFields';
import { useGameStore } from './useGameStore';
import { useIsMobile } from '../../hooks/useIsMobile';

function InteractionLayer({ mousePosRef }: { mousePosRef: React.MutableRefObject<THREE.Vector3 | null> }) {
  const addForce = useGameStore((state) => state.addForce);
  const selectedForceType = useGameStore((state) => state.selectedForceType);
  const sendCursor = useGameStore((state) => state.sendCursor);
  const isReplaying = useGameStore((state) => state.isReplaying);

  const handlePointerMove = (e: any) => {
    if (isReplaying) return;
    const { point } = e;
    mousePosRef.current = point;
    sendCursor({ x: point.x, y: point.y, z: point.z });
  };

  const handlePointerDown = (e: any) => {
    if (isReplaying) return;
    const { point } = e;
    addForce({ x: point.x, y: point.y, z: point.z }, selectedForceType);
  };

  return (
    <mesh 
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      visible={false}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

export default function CosmicCanvas() {
  const mousePosRef = useRef<THREE.Vector3 | null>(null);
  const isMobile = useIsMobile();

  return (
    <div className="absolute inset-0 z-0 bg-black overflow-hidden select-none touch-none">
      <Canvas
        shadows
        gl={{ 
            antialias: !isMobile, 
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
            depth: true
        }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#000000']} />
          <PerspectiveCamera makeDefault position={[0, 15, 35]} fov={50} />
          
          <InteractionLayer mousePosRef={mousePosRef} />
          
          <Particles mousePosRef={mousePosRef} />
          <OtherPlayers />
          <LocalCursor mousePosRef={mousePosRef} />
          <ForceFields />

          <EffectComposer multisampling={isMobile ? 0 : 4}>
            <Bloom 
              intensity={1.2} 
              luminanceThreshold={0.1} 
              luminanceSmoothing={0.9} 
              height={300} 
            />
            <Noise opacity={0.03} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            <ChromaticAberration offset={new THREE.Vector2(0.0005, 0.0005)} />
          </EffectComposer>

          {/* Optional Ambient Light for Force Fields */}
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={1.0} />
        </Suspense>
      </Canvas>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/40" />
    </div>
  );
}
