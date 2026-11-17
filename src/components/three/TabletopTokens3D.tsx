import React, { Suspense, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AimChoice, TurnPhase } from '../../types/game';
import { getAimChipTexture, getLockInLabelTexture } from '../../utils/cardTexture';
import { soundEngine } from '../../audio/soundEngine';

function enableShadows(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

interface SingleAimChip3DProps {
  chipMode: AimChoice;
  isSelected: boolean;
  position: [number, number, number];
  scale?: number;
  canInteract: boolean;
  onSelect: () => void;
}

const SingleAimChip3D: React.FC<SingleAimChip3DProps> = ({
  chipMode,
  isSelected,
  position,
  scale = 0.72,
  canInteract,
  onSelect,
}) => {
  const chipRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const flipPulseRef = useRef(0);
  const prevSelectedRef = useRef(isSelected);

  const chipTex = useMemo(() => getAimChipTexture(chipMode), [chipMode]);
  const isOpponentChip = chipMode === 'opponent';
  const rimColor = isOpponentChip ? '#b92b27' : '#38598b';

  if (prevSelectedRef.current !== isSelected && isSelected) {
    prevSelectedRef.current = isSelected;
    flipPulseRef.current = 1.0;
  } else if (prevSelectedRef.current !== isSelected) {
    prevSelectedRef.current = isSelected;
  }

  useFrame((_, delta) => {
    if (!chipRef.current) return;
    if (flipPulseRef.current > 0) {
      flipPulseRef.current = Math.max(0, flipPulseRef.current - delta * 3.4);
    }

    const jumpArc = Math.sin(flipPulseRef.current * Math.PI) * 0.55;
    const hoverLift = hovered && canInteract ? 0.08 : 0;
    const activeLift = isSelected ? 0.045 : 0;

    const targetPos = new THREE.Vector3(
      position[0],
      position[1] + jumpArc + hoverLift + activeLift,
      position[2]
    );
    const targetRotX = flipPulseRef.current * Math.PI * 2;
    const targetScale = scale * (isSelected ? 1.06 : 0.96);

    const speed = Math.min(1, delta * 12);
    chipRef.current.position.lerp(targetPos, speed);
    chipRef.current.rotation.x = THREE.MathUtils.lerp(
      chipRef.current.rotation.x,
      targetRotX,
      speed
    );
    const s = THREE.MathUtils.lerp(chipRef.current.scale.x, targetScale, speed);
    chipRef.current.scale.setScalar(s);
  });

  return (
    <group>
      {/* Subtle selection glow ring on table under active chip */}
      {isSelected && (
        <mesh
          position={[position[0], 0.015, position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.36, 0.45, 32]} />
          <meshBasicMaterial
            color={isOpponentChip ? '#f87171' : '#38bdf8'}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}

      <group
        ref={chipRef}
        position={position}
        scale={scale}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (canInteract) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (canInteract) {
            flipPulseRef.current = 1.0;
            soundEngine.playAimTokenFlip();
            onSelect();
          }
        }}
      >
        {/* Weighted 3D Poker Chip Cylinder Body */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.48, 0.48, 0.12, 36]} />
          <meshStandardMaterial color={rimColor} roughness={0.35} metalness={0.18} />
        </mesh>

        {/* 8 Edge Notches around the 3D cylinder rim */}
        {Array.from({ length: 8 }).map((_, i) => {
          const ang = (i * Math.PI) / 4;
          return (
            <mesh
              key={i}
              position={[Math.cos(ang) * 0.46, 0, Math.sin(ang) * 0.46]}
              rotation={[0, -ang, 0]}
              castShadow
            >
              <boxGeometry args={[0.06, 0.124, 0.13]} />
              <meshStandardMaterial
                color={isOpponentChip ? '#f5ebe1' : '#172236'}
                roughness={0.4}
              />
            </mesh>
          );
        })}

        {/* Top Printed Poker-Chip Face */}
        <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.47, 36]} />
          <meshStandardMaterial map={chipTex} roughness={0.32} metalness={0.08} />
        </mesh>

        {/* Bottom Printed Poker-Chip Face */}
        <mesh position={[0, -0.062, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.47, 36]} />
          <meshStandardMaterial map={chipTex} roughness={0.32} metalness={0.08} />
        </mesh>
      </group>
    </group>
  );
};

interface AimToken3DProps {
  owner: 'player' | 'opponent';
  aim: AimChoice;
  isLockedInZone: boolean;
  phase: TurnPhase;
  useBlenderAssets: boolean;
  onToggleAim?: () => void;
  onSelectAim?: (choice: AimChoice) => void;
}

export const AimToken3D: React.FC<AimToken3DProps> = ({
  owner,
  aim,
  phase,
  onToggleAim,
  onSelectAim,
}) => {
  const isPlayer = owner === 'player';
  const canInteract =
    isPlayer && (phase === 'PRE_ROUND_LOAD' || phase === 'PLAYER_SELECT');

  const handleChoose = (targetAim: AimChoice) => {
    if (onSelectAim) {
      onSelectAim(targetAim);
    } else if (onToggleAim && aim !== targetAim) {
      onToggleAim();
    } else if (onToggleAim) {
      onToggleAim();
    }
  };

  if (!isPlayer) {
    // Opponent's single interactive aim chip sitting between their gun and their cards (matches image_0.png)
    return (
      <SingleAimChip3D
        chipMode={aim}
        isSelected={false}
        position={[-0.96, 0.06, -1.44]}
        scale={0.46}
        canInteract={false}
        onSelect={() => {}}
      />
    );
  }

  // Player's TWO distinct 3D weighted poker-chip tokens sitting near the revolver on the right:
  // 1) AIM OPPONENT (red, skull icon) at [1.24, 0.06, 1.52]
  // 2) AIM SELF (blue, shield icon) at [1.62, 0.06, 1.98]
  return (
    <group>
      <SingleAimChip3D
        chipMode="opponent"
        isSelected={aim === 'opponent'}
        position={[1.24, 0.06, 1.52]}
        scale={0.62}
        canInteract={canInteract}
        onSelect={() => handleChoose('opponent')}
      />
      <SingleAimChip3D
        chipMode="self"
        isSelected={aim === 'self'}
        position={[1.62, 0.06, 1.98]}
        scale={0.62}
        canInteract={canInteract}
        onSelect={() => handleChoose('self')}
      />
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
        <meshStandardMaterial color="#2b1911" metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.44, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e5c178" metalness={0.92} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 24]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.92} roughness={0.18} />
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
  const raysGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const pressAnimRef = useRef(0);

  const lockInLabelTex = useMemo(() => getLockInLabelTexture(), []);

  const canRing =
    (phase === 'PRE_ROUND_LOAD' || phase === 'PLAYER_SELECT') && readyToLockIn;

  useFrame((state, delta) => {
    if (!bellRef.current) return;
    if (pressAnimRef.current > 0) {
      pressAnimRef.current = Math.max(0, pressAnimRef.current - delta * 5);
    }

    const targetScaleY = 1 - Math.sin(pressAnimRef.current * Math.PI) * 0.24;
    const hoverScale = hovered && canRing ? 1.08 : 1.0;
    bellRef.current.scale.set(
      0.76 * hoverScale,
      0.76 * targetScaleY * hoverScale,
      0.76 * hoverScale
    );

    if (ringMeshRef.current && canRing) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
      ringMeshRef.current.scale.set(pulse, pulse, 1);
    }
    if (raysGroupRef.current && canRing) {
      raysGroupRef.current.rotation.y = state.clock.elapsedTime * 0.35;
    }
  });

  const triggerBell = () => {
    if (!canRing) return;
    pressAnimRef.current = 1.0;
    soundEngine.playBrassBell();
    onRingBell();
  };

  // Centered right next to LOCK IN SLOT at [0.38, 0.01, 1.08] (matching image_0.png, image_1.png, image_2.png)
  return (
    <group position={[0.38, 0.01, 1.08]}>
      {/* Warm golden base glow ring & rays when ready to Lock In */}
      {canRing && (
        <>
          <mesh
            ref={ringMeshRef}
            position={[0, 0.015, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.32, 0.44, 36]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.85} />
          </mesh>
          <group ref={raysGroupRef} position={[0, 0.012, 0]}>
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * Math.PI) / 4;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.52, 0, Math.sin(a) * 0.52]}
                  rotation={[-Math.PI / 2, 0, -a]}
                >
                  <planeGeometry args={[0.22, 0.038]} />
                  <meshBasicMaterial color="#fef08a" transparent opacity={0.65} />
                </mesh>
              );
            })}
          </group>
        </>
      )}

      {/* Printed "LOCK IN" label directly below the bell on the wood plank */}
      <mesh position={[0, 0.012, 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.74, 0.19]} />
        <meshBasicMaterial map={lockInLabelTex} transparent />
      </mesh>

      <group
        ref={bellRef}
        scale={0.62}
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
        <meshStandardMaterial
          color="#e11d48"
          emissive="#be123c"
          emissiveIntensity={0.3}
          roughness={0.22}
        />
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
  // Left rail for Player hearts, Right rail for Opponent hearts (matches image_0.png)
  const baseX = isPlayer ? -3.15 : 3.15;
  const baseZ = -0.15;

  return (
    <group position={[baseX, 0.04, baseZ]}>
      {Array.from({ length: maxHp }).map((_, idx) => {
        const active = idx < hp;
        const offsetZ = (idx - (maxHp - 1) / 2) * 0.42;
        return (
          <group
            key={idx}
            position={[0, active ? 0.02 : -0.02, offsetZ]}
            scale={active ? 0.78 : 0.52}
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
                <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
                <meshStandardMaterial color="#271912" roughness={0.8} />
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
