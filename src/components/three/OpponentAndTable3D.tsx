import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { OpponentDef, TurnPhase } from '../../types/game';

function enableShadows(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function BlenderOpponentBust({ glbPath }: { glbPath: string }) {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function ProceduralOpponentBust({ opponent }: { opponent: OpponentDef }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} scale={[1.35, 1.0, 0.75]} castShadow receiveShadow>
        <sphereGeometry args={[1.1, 28, 18]} />
        <meshStandardMaterial color="#1f1e24" roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.95, 0.12]} scale={[0.88, 1.18, 0.78]} castShadow receiveShadow>
        <sphereGeometry args={[0.68, 28, 20]} />
        <meshStandardMaterial color={opponent.maskColor} roughness={0.28} metalness={0.35} />
      </mesh>
      <mesh position={[-0.24, 2.02, 0.58]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshBasicMaterial color={opponent.eyeColor} />
      </mesh>
      <mesh position={[0.24, 2.02, 0.58]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshBasicMaterial color={opponent.eyeColor} />
      </mesh>
      <mesh position={[0, 2.65, 0.08]} castShadow>
        <cylinderGeometry args={[0.65, 0.75, 0.45, 24]} />
        <meshStandardMaterial color={opponent.accentColor} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

interface OpponentBust3DProps {
  opponent: OpponentDef;
  phase: TurnPhase;
  recentlyDamaged: boolean;
  useBlenderAssets: boolean;
}

export const OpponentBust3D: React.FC<OpponentBust3DProps> = ({
  opponent,
  phase,
  recentlyDamaged,
  useBlenderAssets,
}) => {
  const bustRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!bustRef.current) return;
    const t = state.clock.elapsedTime;

    const targetY = -1.08 + Math.sin(t * 2.1) * 0.035;
    const targetZ =
      recentlyDamaged
        ? -4.85
        : phase === 'RESOLVE_CHAMBER' || phase === 'RESOLVE_TRAP' || phase === 'FIRE_OPPONENT'
        ? -4.05
        : -4.25;
    const targetRotX = recentlyDamaged ? -0.35 : 0.08 + Math.sin(t * 1.4) * 0.025;
    const targetRotY = Math.sin(t * 0.9) * 0.06;

    const speed = Math.min(1, delta * 8);
    bustRef.current.position.y = THREE.MathUtils.lerp(bustRef.current.position.y, targetY, speed);
    bustRef.current.position.z = THREE.MathUtils.lerp(bustRef.current.position.z, targetZ, speed);
    bustRef.current.rotation.x = THREE.MathUtils.lerp(bustRef.current.rotation.x, targetRotX, speed);
    bustRef.current.rotation.y = THREE.MathUtils.lerp(bustRef.current.rotation.y, targetRotY, speed);
  });

  return (
    <group ref={bustRef} position={[0, -1.08, -4.25]} scale={0.94}>
      {useBlenderAssets ? (
        <Suspense fallback={<ProceduralOpponentBust opponent={opponent} />}>
          <BlenderOpponentBust glbPath={opponent.glbPath} />
        </Suspense>
      ) : (
        <ProceduralOpponentBust opponent={opponent} />
      )}
    </group>
  );
};

function BlenderTableProps() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/table_props.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

export const CardTableEnvironment3D: React.FC<{ useBlenderAssets: boolean }> = ({
  useBlenderAssets,
}) => {
  return (
    <group>
      {/* Main Dark Felt Tabletop Surface (y = 0 at top face) */}
      <RoundedBox
        args={[10.4, 0.36, 7.2]}
        radius={0.14}
        smoothness={4}
        position={[0, -0.18, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#132a21" roughness={0.82} metalness={0.04} />
      </RoundedBox>

      {/* Rich Dark Walnut Outer Table Rails */}
      <RoundedBox
        args={[10.9, 0.48, 0.46]}
        radius={0.12}
        smoothness={3}
        position={[0, -0.10, 3.62]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#3b1d11" roughness={0.42} metalness={0.08} />
      </RoundedBox>
      <RoundedBox
        args={[10.9, 0.48, 0.46]}
        radius={0.12}
        smoothness={3}
        position={[0, -0.10, -3.62]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#3b1d11" roughness={0.42} metalness={0.08} />
      </RoundedBox>
      <RoundedBox
        args={[0.48, 0.48, 7.6]}
        radius={0.12}
        smoothness={3}
        position={[-5.25, -0.10, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#3b1d11" roughness={0.42} metalness={0.08} />
      </RoundedBox>
      <RoundedBox
        args={[0.48, 0.48, 7.6]}
        radius={0.12}
        smoothness={3}
        position={[5.25, -0.10, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#3b1d11" roughness={0.42} metalness={0.08} />
      </RoundedBox>

      {/* Center Brass & Crimson Duel Arena Mat */}
      <RoundedBox
        args={[3.6, 0.02, 2.75]}
        radius={0.01}
        position={[0, 0.002, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#1c1619" roughness={0.78} />
      </RoundedBox>

      {/* Center Divider Brass Strip */}
      <mesh position={[0, 0.014, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.008, 0.03]} />
        <meshStandardMaterial color="#d97706" metalness={0.88} roughness={0.28} />
      </mesh>

      {/* 4 Brass Lock-In Slot Frames in Center of Table */}
      <mesh position={[-0.78, 0.014, 0.65]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.04, 1.44]} />
        <meshStandardMaterial color="#451a03" roughness={0.7} />
      </mesh>
      <mesh position={[-0.78, 0.014, -0.65]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.04, 1.44]} />
        <meshStandardMaterial color="#451a03" roughness={0.7} />
      </mesh>

      <mesh position={[0.78, 0.014, 0.65]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.48, 0.56, 32]} />
        <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0.78, 0.014, -0.65]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.48, 0.56, 32]} />
        <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Leather Revolver Holster Pads */}
      <RoundedBox args={[1.65, 0.02, 1.35]} radius={0.01} position={[-2.35, 0.005, 1.15]} receiveShadow>
        <meshStandardMaterial color="#291711" roughness={0.65} />
      </RoundedBox>
      <RoundedBox args={[1.65, 0.02, 1.35]} radius={0.01} position={[2.35, 0.005, -1.15]} receiveShadow>
        <meshStandardMaterial color="#291711" roughness={0.65} />
      </RoundedBox>

      {/* Tabletop Saloon Props (Lantern, Poker Chips, Card Shoe) */}
      <group position={[-4.15, 0.01, -1.25]} scale={0.9}>
        {useBlenderAssets ? (
          <Suspense
            fallback={
              <mesh position={[0, 0.35, 0]} castShadow>
                <cylinderGeometry args={[0.28, 0.34, 0.7, 20]} />
                <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.8} />
              </mesh>
            }
          >
            <BlenderTableProps />
          </Suspense>
        ) : (
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.34, 0.7, 20]} />
            <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.8} />
          </mesh>
        )}
        <pointLight position={[0, 0.75, 0]} color="#ff9d3b" intensity={3.2} distance={6} />
      </group>
    </group>
  );
};

useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_rookie.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_counter.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_heavy.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_saboteur.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_dealer.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/table_props.glb`);
