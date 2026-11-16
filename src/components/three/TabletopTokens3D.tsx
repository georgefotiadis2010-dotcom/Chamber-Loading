import React, { Suspense, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AimChoice, TurnPhase } from '../../types/game';
import { soundEngine } from '../../audio/soundEngine';

function enableShadows(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function BlenderAimToken() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/aim_token.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function ProceduralAimToken() {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.13, 36]} />
        <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.41, 0.41, 0.03, 32]} />
        <meshStandardMaterial color="#dc2626" metalness={0.25} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.26, 0.03, 12, 28]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.06, 0]} castShadow>
        <cylinderGeometry args={[0.41, 0.41, 0.03, 32]} />
        <meshStandardMaterial color="#0284c7" metalness={0.25} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 6]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.22} />
      </mesh>
    </group>
  );
}

interface AimToken3DProps {
  owner: 'player' | 'opponent';
  aim: AimChoice;
  isLockedInZone: boolean;
  phase: TurnPhase;
  useBlenderAssets: boolean;
  onToggleAim?: () => void;
}

export const AimToken3D: React.FC<AimToken3DProps> = ({
  owner,
  aim,
  isLockedInZone,
  phase,
  useBlenderAssets,
  onToggleAim,
}) => {
  const tokenRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const flipPulseRef = useRef(0);
  const prevAimRef = useRef<AimChoice>(aim);

  const isPlayer = owner === 'player';
  const canInteract = isPlayer && phase === 'PLAYER_SELECT';

  if (prevAimRef.current !== aim) {
    prevAimRef.current = aim;
    flipPulseRef.current = 1.0;
  }

  useFrame((_, delta) => {
    if (!tokenRef.current) return;

    if (flipPulseRef.current > 0) {
      flipPulseRef.current = Math.max(0, flipPulseRef.current - delta * 3.2);
    }

    const basePos = isPlayer
      ? isLockedInZone
        ? new THREE.Vector3(0.78, 0.09, 0.65)
        : new THREE.Vector3(0.95, 0.09, 1.28)
      : new THREE.Vector3(0.78, 0.09, -0.65);

    const jumpArc = Math.sin(flipPulseRef.current * Math.PI) * 0.65;
    basePos.y += jumpArc + (hovered && canInteract ? 0.08 : 0);

    const effectiveAim: AimChoice =
      !isPlayer && (phase === 'PRE_ROUND_LOAD' || phase === 'PLAYER_SELECT' || phase === 'AI_THINKING')
        ? 'opponent'
        : aim;

    const targetRotZ = effectiveAim === 'opponent' ? 0 : Math.PI;
    const extraSpin = flipPulseRef.current * Math.PI;

    const speed = Math.min(1, delta * 12);
    tokenRef.current.position.lerp(basePos, speed);
    tokenRef.current.rotation.z = THREE.MathUtils.lerp(
      tokenRef.current.rotation.z,
      targetRotZ + extraSpin,
      speed
    );
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (canInteract && onToggleAim) {
      soundEngine.playAimTokenFlip();
      onToggleAim();
    }
  };

  return (
    <group
      ref={tokenRef}
      position={isPlayer ? [0.95, 0.09, 1.28] : [0.78, 0.09, -0.65]}
      scale={0.86}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (canInteract) {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={handleClick}
    >
      {useBlenderAssets ? (
        <Suspense fallback={<ProceduralAimToken />}>
          <BlenderAimToken />
        </Suspense>
      ) : (
        <ProceduralAimToken />
      )}
    </group>
  );
};

function BlenderBrassBell() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/brass_bell.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function ProceduralBrassBell() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.52, 0.55, 0.1, 32]} />
        <meshStandardMaterial color="#1c1917" metalness={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.44, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.16} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.18} />
      </mesh>
    </group>
  );
}

interface BrassBell3DProps {
  readyToLockIn: boolean;
  phase: TurnPhase;
  useBlenderAssets: boolean;
  onRingBell: () => void;
}

export const BrassBell3D: React.FC<BrassBell3DProps> = ({
  readyToLockIn,
  phase,
  useBlenderAssets,
  onRingBell,
}) => {
  const bellRef = useRef<THREE.Group>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const pressAnimRef = useRef(0);

  const canRing =
    (phase === 'PRE_ROUND_LOAD' || phase === 'PLAYER_SELECT') && readyToLockIn;

  useFrame((state, delta) => {
    if (!bellRef.current) return;
    if (pressAnimRef.current > 0) {
      pressAnimRef.current = Math.max(0, pressAnimRef.current - delta * 5);
    }

    const targetScaleY = 1 - Math.sin(pressAnimRef.current * Math.PI) * 0.22;
    const hoverScale = hovered && canRing ? 1.08 : 1.0;
    bellRef.current.scale.set(0.88 * hoverScale, 0.88 * targetScaleY * hoverScale, 0.88 * hoverScale);

    if (ringMeshRef.current && canRing) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.12;
      ringMeshRef.current.scale.set(pulse, pulse, 1);
    }
  });

  const triggerBell = () => {
    if (!canRing) return;
    pressAnimRef.current = 1.0;
    soundEngine.playBrassBell();
    onRingBell();
  };

  return (
    <group position={[2.55, 0.01, 1.18]}>
      {canRing && (
        <mesh ref={ringMeshRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 0.66, 36]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} />
        </mesh>
      )}

      <group
        ref={bellRef}
        scale={0.88}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (canRing) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          triggerBell();
        }}
      >
        {useBlenderAssets ? (
          <Suspense fallback={<ProceduralBrassBell />}>
            <BlenderBrassBell />
          </Suspense>
        ) : (
          <ProceduralBrassBell />
        )}
      </group>
    </group>
  );
};

function BlenderHeartToken() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/heart_token.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function ProceduralHeartToken() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 24]} />
        <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.14, 0]} castShadow>
        <octahedronGeometry args={[0.16, 1]} />
        <meshStandardMaterial color="#e11d48" emissive="#be123c" emissiveIntensity={0.3} roughness={0.22} />
      </mesh>
    </group>
  );
}

interface HeartTokensRow3DProps {
  owner: 'player' | 'opponent';
  hp: number;
  maxHp: number;
  useBlenderAssets: boolean;
}

export const HeartTokensRow3D: React.FC<HeartTokensRow3DProps> = ({
  owner,
  hp,
  maxHp,
  useBlenderAssets,
}) => {
  const isPlayer = owner === 'player';
  const baseZ = isPlayer ? 2.15 : -2.15;
  const baseX = -3.65;

  return (
    <group position={[baseX, 0.01, baseZ]}>
      {Array.from({ length: maxHp }).map((_, idx) => {
        const active = idx < hp;
        const offsetX = idx * 0.48;
        return (
          <group
            key={idx}
            position={[offsetX, active ? 0.02 : -0.02, 0]}
            scale={active ? 0.92 : 0.62}
          >
            {active ? (
              useBlenderAssets ? (
                <Suspense fallback={<ProceduralHeartToken />}>
                  <BlenderHeartToken />
                </Suspense>
              ) : (
                <ProceduralHeartToken />
              )
            ) : (
              <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.04, 20]} />
                <meshStandardMaterial color="#27272a" roughness={0.8} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

useGLTF.preload(`${import.meta.env.BASE_URL}models/aim_token.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/brass_bell.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/heart_token.glb`);
