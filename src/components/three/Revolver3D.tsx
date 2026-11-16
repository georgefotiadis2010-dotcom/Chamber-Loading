import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AimChoice, ShellType, TurnPhase } from '../../types/game';

interface Revolver3DProps {
  owner: 'player' | 'opponent';
  cylinder: ShellType[];
  activeChamberIndex: number;
  phase: TurnPhase;
  aim: AimChoice;
  isFiringNow: boolean;
  muzzleFlashActive: boolean;
  dryFireActive: boolean;
  isJammed: boolean;
  useBlenderAssets: boolean;
}

function enableShadows(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function BlenderShellMesh({ type }: { type: Exclude<ShellType, 'empty'> }) {
  const path =
    type === 'live'
      ? `${import.meta.env.BASE_URL}models/shell_live.glb`
      : type === 'heavy'
      ? `${import.meta.env.BASE_URL}models/shell_heavy.glb`
      : `${import.meta.env.BASE_URL}models/shell_blank.glb`;
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function ProceduralShellMesh({ type }: { type: Exclude<ShellType, 'empty'> }) {
  const hullColor =
    type === 'live' ? '#dc2626' : type === 'heavy' ? '#f97316' : '#64748b';
  const rimColor = type === 'blank' ? '#cbd5e1' : '#fbbf24';
  const tipColor =
    type === 'live' ? '#d97706' : type === 'heavy' ? '#facc15' : '#94a3b8';

  return (
    <group>
      <mesh position={[0, -0.31, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.105, 0.105, 0.06, 20]} />
        <meshStandardMaterial color={rimColor} metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.096, 0.096, 0.36, 20]} />
        <meshStandardMaterial color={hullColor} metalness={0.35} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.092, 16, 12]} />
        <meshStandardMaterial color={tipColor} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

function BlenderRevolverFrame() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/revolver_frame.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function BlenderRevolverCylinder() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/revolver_cylinder.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function BlenderShellTray() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/shell_tray.glb`);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    enableShadows(c);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

function ProceduralRevolverFrame() {
  return (
    <group>
      <RoundedBox args={[0.36, 0.18, 1.45]} radius={0.05} smoothness={3} position={[0, 0.48, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
      </RoundedBox>
      <RoundedBox args={[0.36, 0.18, 1.38]} radius={0.05} smoothness={3} position={[0, -0.46, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
      </RoundedBox>
      <RoundedBox args={[0.38, 0.96, 0.42]} radius={0.06} smoothness={3} position={[0, 0.02, 0.65]} castShadow receiveShadow>
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
      </RoundedBox>
      <mesh position={[0, 0.16, -1.10]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 1.25, 28]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.86} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.16, -1.73]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.05, 24]} />
        <meshBasicMaterial color="#050507" />
      </mesh>
      <mesh position={[0, -0.09, -1.02]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.14, 1.1, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.82} roughness={0.28} />
      </mesh>
      <RoundedBox args={[0.09, 0.16, 0.22]} radius={0.02} position={[0, 0.48, -1.52]} castShadow>
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.35} />
      </RoundedBox>
      <mesh position={[0, -0.62, 0.14]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.28, 0.06, 14, 28]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.32} />
      </mesh>
      <mesh position={[0, -0.58, 0.18]} rotation={[0.45, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 16]} />
        <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.22} />
      </mesh>
      <RoundedBox
        args={[0.44, 1.22, 0.54]}
        radius={0.12}
        smoothness={4}
        position={[0, -0.78, 0.98]}
        rotation={[0.45, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#9a441a" metalness={0.05} roughness={0.42} />
      </RoundedBox>
    </group>
  );
}

function ProceduralRevolverCylinder() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.40, 0.40, 0.84, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.26} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.94, 20]} />
        <meshStandardMaterial color="#eab308" metalness={0.92} roughness={0.2} />
      </mesh>
    </group>
  );
}

export const Revolver3D: React.FC<Revolver3DProps> = ({
  owner,
  cylinder,
  activeChamberIndex,
  phase,
  aim,
  isFiringNow,
  muzzleFlashActive,
  dryFireActive,
  useBlenderAssets,
}) => {
  const gunGroupRef = useRef<THREE.Group>(null);
  const cylinderPivotRef = useRef<THREE.Group>(null);
  const cylinderSpinRef = useRef<THREE.Group>(null);
  const spinVelocityRef = useRef(0);

  const isPlayer = owner === 'player';

  const restPos = useMemo(
    () => (isPlayer ? new THREE.Vector3(-2.35, 0.25, 1.15) : new THREE.Vector3(2.35, 0.25, -1.15)),
    [isPlayer]
  );

  const isCylinderOpen = phase === 'PRE_ROUND_LOAD' || phase === 'RELOAD_ROUND';
  const isSpinning = phase === 'SPIN_CYLINDERS';

  useFrame((_, delta) => {
    if (!gunGroupRef.current || !cylinderPivotRef.current || !cylinderSpinRef.current) return;

    const targetPos = restPos.clone();
    let targetRotX = 0;
    let targetRotY = isPlayer ? -0.35 : Math.PI - 0.35;
    let targetRotZ = isPlayer ? Math.PI * 0.42 : -Math.PI * 0.42;

    if (isCylinderOpen || isSpinning) {
      targetPos.y = 0.78;
      targetPos.x = isPlayer ? -1.95 : 1.95;
      targetPos.z = isPlayer ? 0.95 : -0.95;
      targetRotX = 0.18;
      targetRotY = isPlayer ? -0.45 : Math.PI - 0.45;
      targetRotZ = 0;
    } else if (isFiringNow) {
      targetPos.set(isPlayer ? -0.35 : 0.35, 1.25, isPlayer ? 1.35 : -1.35);

      if (isPlayer) {
        if (aim === 'opponent') {
          targetRotX = muzzleFlashActive ? 0.48 : 0.04;
          targetRotY = 0;
          targetRotZ = 0;
        } else {
          targetRotX = muzzleFlashActive ? -0.45 : -0.12;
          targetRotY = Math.PI;
          targetRotZ = 0;
        }
      } else {
        if (aim === 'opponent') {
          targetRotX = muzzleFlashActive ? -0.48 : -0.04;
          targetRotY = Math.PI;
          targetRotZ = 0;
        } else {
          targetRotX = muzzleFlashActive ? 0.45 : 0.12;
          targetRotY = 0;
          targetRotZ = 0;
        }
      }

      if (muzzleFlashActive) {
        targetPos.y += 0.22;
      }
    }

    const lerpSpeed = Math.min(1, delta * 9);
    gunGroupRef.current.position.lerp(targetPos, lerpSpeed);
    gunGroupRef.current.rotation.x = THREE.MathUtils.lerp(gunGroupRef.current.rotation.x, targetRotX, lerpSpeed);
    gunGroupRef.current.rotation.y = THREE.MathUtils.lerp(gunGroupRef.current.rotation.y, targetRotY, lerpSpeed);
    gunGroupRef.current.rotation.z = THREE.MathUtils.lerp(gunGroupRef.current.rotation.z, targetRotZ, lerpSpeed);

    const targetSwingX = isCylinderOpen ? -0.62 : 0;
    const targetSwingY = isCylinderOpen ? -0.14 : 0;
    cylinderPivotRef.current.position.x = THREE.MathUtils.lerp(
      cylinderPivotRef.current.position.x,
      targetSwingX,
      Math.min(1, delta * 10)
    );
    cylinderPivotRef.current.position.y = THREE.MathUtils.lerp(
      cylinderPivotRef.current.position.y,
      targetSwingY,
      Math.min(1, delta * 10)
    );

    if (isSpinning) {
      spinVelocityRef.current = 22.0;
      cylinderSpinRef.current.rotation.z += spinVelocityRef.current * delta;
    } else {
      const targetAngle = Math.PI / 2 - activeChamberIndex * (Math.PI / 3);
      cylinderSpinRef.current.rotation.z = THREE.MathUtils.lerp(
        cylinderSpinRef.current.rotation.z,
        targetAngle,
        Math.min(1, delta * 8)
      );
    }
  });

  const trayPos: [number, number, number] = isPlayer ? [-3.65, 0.01, 1.15] : [3.65, 0.01, -1.15];
  const traySlotOffsets: [number, number][] = [
    [-0.38, -0.18],
    [0, -0.18],
    [0.38, -0.18],
    [-0.38, 0.18],
    [0, 0.18],
    [0.38, 0.18],
  ];

  return (
    <group>
      {/* 1. Physical 3D Snub-Nose Revolver + Separated 6-Slot Cylinder */}
      <group ref={gunGroupRef} position={restPos.toArray()} scale={0.56}>
        {useBlenderAssets ? (
          <Suspense fallback={<ProceduralRevolverFrame />}>
            <BlenderRevolverFrame />
          </Suspense>
        ) : (
          <ProceduralRevolverFrame />
        )}

        {/* Separated Rotating & Swing-Out 6-Slot Cylinder */}
        <group ref={cylinderPivotRef}>
          <group ref={cylinderSpinRef}>
            {useBlenderAssets ? (
              <Suspense fallback={<ProceduralRevolverCylinder />}>
                <BlenderRevolverCylinder />
              </Suspense>
            ) : (
              <ProceduralRevolverCylinder />
            )}

            {/* Physical 3D Shells seated inside the 6 chambers of the cylinder */}
            {cylinder.map((shell, idx) => {
              if (shell === 'empty') return null;
              const angle = idx * (Math.PI / 3);
              const cx = Math.cos(angle) * 0.245;
              const cy = Math.sin(angle) * 0.245;
              return (
                <group
                  key={idx}
                  position={[cx, cy, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  scale={0.92}
                >
                  {useBlenderAssets ? (
                    <Suspense fallback={<ProceduralShellMesh type={shell} />}>
                      <BlenderShellMesh type={shell} />
                    </Suspense>
                  ) : (
                    <ProceduralShellMesh type={shell} />
                  )}
                </group>
              );
            })}
          </group>
        </group>

        {/* Volumetric 3D Muzzle Flash & Smoke Puff when firing a Live / Heavy round */}
        {muzzleFlashActive && (
          <group position={[0, 0.16, -2.05]}>
            <pointLight color="#ff7b00" intensity={18} distance={8} decay={2} />
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.52, 1.45, 16]} />
              <meshBasicMaterial color="#fef08a" transparent opacity={0.92} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0.4]} scale={1.35}>
              <coneGeometry args={[0.68, 1.8, 16]} />
              <meshBasicMaterial color="#f97316" transparent opacity={0.65} />
            </mesh>
          </group>
        )}

        {/* 3D Metallic Click Ring when Dry-Firing */}
        {dryFireActive && (
          <group position={[0, 0.35, -1.75]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.32, 0.035, 12, 24]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          </group>
        )}
      </group>

      {/* 2. Physical 3D Shell Tray beside each gun showing the 6 shells in the cylinder */}
      <group position={trayPos} scale={0.78}>
        {useBlenderAssets ? (
          <Suspense
            fallback={
              <RoundedBox args={[1.28, 0.18, 0.78]} radius={0.03} position={[0, 0.09, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#5c2d16" roughness={0.45} />
              </RoundedBox>
            }
          >
            <BlenderShellTray />
          </Suspense>
        ) : (
          <RoundedBox args={[1.28, 0.18, 0.78]} radius={0.03} position={[0, 0.09, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#5c2d16" roughness={0.45} />
          </RoundedBox>
        )}

        {cylinder.map((shell, idx) => {
          if (shell === 'empty') return null;
          const [sx, sz] = traySlotOffsets[idx];
          return (
            <group key={idx} position={[sx, 0.34, sz]} scale={0.88}>
              {useBlenderAssets ? (
                <Suspense fallback={<ProceduralShellMesh type={shell} />}>
                  <BlenderShellMesh type={shell} />
                </Suspense>
              ) : (
                <ProceduralShellMesh type={shell} />
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
};

useGLTF.preload(`${import.meta.env.BASE_URL}models/revolver_frame.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/revolver_cylinder.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/shell_live.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/shell_blank.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/shell_heavy.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/shell_tray.glb`);
