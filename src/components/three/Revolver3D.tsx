import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AimChoice, ShellType, TurnPhase } from '../../types/game';
import { soundEngine } from '../../audio/soundEngine';

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
  const isBrass = type === 'live' || type === 'heavy';
  const hullColor = isBrass ? '#eab308' : '#cbd5e1';
  const rimColor = isBrass ? '#facc15' : '#e2e8f0';
  const boreColor = isBrass ? '#713f12' : '#475569';

  return (
    <group>
      <mesh position={[0, -0.31, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.105, 0.105, 0.06, 20]} />
        <meshStandardMaterial color={rimColor} metalness={0.88} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.098, 0.098, 0.42, 20]} />
        <meshStandardMaterial color={hullColor} metalness={0.82} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
        <meshStandardMaterial color={boreColor} roughness={0.6} />
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
        <meshStandardMaterial color="#94a3b8" metalness={0.78} roughness={0.28} />
      </RoundedBox>
      <RoundedBox args={[0.36, 0.18, 1.38]} radius={0.05} smoothness={3} position={[0, -0.46, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color="#94a3b8" metalness={0.78} roughness={0.28} />
      </RoundedBox>
      <RoundedBox args={[0.38, 0.96, 0.42]} radius={0.06} smoothness={3} position={[0, 0.02, 0.65]} castShadow receiveShadow>
        <meshStandardMaterial color="#94a3b8" metalness={0.78} roughness={0.28} />
      </RoundedBox>
      <mesh position={[0, 0.16, -1.1]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 1.25, 28]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.16, -1.73]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.05, 24]} />
        <meshBasicMaterial color="#050507" />
      </mesh>
      <mesh position={[0, -0.09, -1.02]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.14, 1.1, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.78} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.62, 0.14]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.28, 0.06, 14, 28]} />
        <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh position={[0, -0.58, 0.18]} rotation={[0.45, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.28} />
      </mesh>
      <RoundedBox
        args={[0.46, 1.24, 0.56]}
        radius={0.14}
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
        <cylinderGeometry args={[0.4, 0.4, 0.84, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.82} roughness={0.26} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.94, 20]} />
        <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
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
  const manualSpinRef = useRef(0);
  const manualPopOutRef = useRef(false);

  const isPlayer = owner === 'player';

  // Exact tabletop positions matching image_0.png, image_1.png, image_2.png:
  // Player's gun lies flat on the right side of the near plank; Opponent's gun lies on the far left plank.
  const restPos = useMemo(
    () => (isPlayer ? new THREE.Vector3(2.12, 0.26, 1.12) : new THREE.Vector3(-1.72, 0.20, -1.24)),
    [isPlayer]
  );

  const isCylinderOpen =
    phase === 'RELOAD_ROUND' ||
    phase === 'RESOLVE_CHAMBER' ||
    manualPopOutRef.current;
  const isSpinning = phase === 'SPIN_CYLINDERS' || manualSpinRef.current > 0.05;

  useFrame((_, delta) => {
    if (!gunGroupRef.current || !cylinderPivotRef.current || !cylinderSpinRef.current) return;

    if (manualSpinRef.current > 0) {
      manualSpinRef.current = Math.max(0, manualSpinRef.current - delta * 14);
    }

    const targetPos = restPos.clone();
    // Lying flat on its left side so the barrel points left-upward and the brown wooden grip curves down-right!
    let targetRotX = isPlayer ? -0.05 : 0.05;
    let targetRotY = isPlayer ? 1.28 : -1.82;
    let targetRotZ = isPlayer ? -Math.PI * 0.46 : Math.PI * 0.46;

    if (phase === 'SPIN_CYLINDERS') {
      targetPos.y = isPlayer ? 0.56 : 0.42;
      targetPos.x = isPlayer ? 1.72 : -1.48;
      targetRotX = 0.16;
      targetRotY = isPlayer ? 0.85 : -2.15;
      targetRotZ = isPlayer ? 0.35 : -0.35;
    } else if (isFiringNow) {
      targetPos.set(isPlayer ? 0.42 : -0.42, 1.08, isPlayer ? 1.15 : -1.05);

      if (isPlayer) {
        if (aim === 'opponent') {
          targetRotX = muzzleFlashActive ? 0.48 : 0.05;
          targetRotY = 0.08;
          targetRotZ = 0;
        } else {
          targetRotX = muzzleFlashActive ? -0.45 : -0.12;
          targetRotY = Math.PI - 0.15;
          targetRotZ = 0;
        }
      } else {
        if (aim === 'opponent') {
          targetRotX = muzzleFlashActive ? -0.48 : -0.05;
          targetRotY = Math.PI - 0.08;
          targetRotZ = 0;
        } else {
          targetRotX = muzzleFlashActive ? 0.45 : 0.12;
          targetRotY = 0.15;
          targetRotZ = 0;
        }
      }

      if (muzzleFlashActive) {
        targetPos.y += 0.22;
      }
    }

    const lerpSpeed = Math.min(1, delta * 6.5);
    gunGroupRef.current.position.lerp(targetPos, lerpSpeed);
    gunGroupRef.current.rotation.x = THREE.MathUtils.lerp(gunGroupRef.current.rotation.x, targetRotX, lerpSpeed);
    gunGroupRef.current.rotation.y = THREE.MathUtils.lerp(gunGroupRef.current.rotation.y, targetRotY, lerpSpeed);
    gunGroupRef.current.rotation.z = THREE.MathUtils.lerp(gunGroupRef.current.rotation.z, targetRotZ, lerpSpeed);

    // Cylinder physical pop-out / swing-out animation
    const targetSwingX = isCylinderOpen ? -0.54 : 0;
    const targetSwingY = isCylinderOpen ? 0.16 : 0;
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
      const vel = phase === 'SPIN_CYLINDERS' ? 22.0 : manualSpinRef.current;
      cylinderSpinRef.current.rotation.z += vel * delta;
    } else {
      const targetAngle = Math.PI / 2 - activeChamberIndex * (Math.PI / 3);
      cylinderSpinRef.current.rotation.z = THREE.MathUtils.lerp(
        cylinderSpinRef.current.rotation.z,
        targetAngle,
        Math.min(1, delta * 8)
      );
    }
  });

  // Tray positions matching image_0.png, image_1.png, image_2.png:
  // Player's tray sits right above the revolver on the right; Opponent's tray sits beside their revolver on the left.
  const trayPos: [number, number, number] = isPlayer
    ? [2.44, 0.02, 0.34]
    : [-2.18, 0.02, -1.04];
  const trayRotY = isPlayer ? -0.24 : 0.18;

  const traySlotOffsets: [number, number][] = [
    [-0.38, -0.18],
    [-0.38, 0.18],
    [0, -0.18],
    [0, 0.18],
    [0.38, -0.18],
    [0.38, 0.18],
  ];

  // Ensure the tray visually displays 3 brass (live) shells on the left and 3 silver (blank) shells on the right
  // while reflecting spent chambers
  const trayShells: ShellType[] = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((i) => {
      if (cylinder[i] === 'empty') return 'empty';
      return i < 3 ? 'live' : 'blank';
    });
  }, [cylinder]);

  const handleInspectRevolver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    manualPopOutRef.current = !manualPopOutRef.current;
    manualSpinRef.current = 18.0;
    soundEngine.playCylinderLatch(manualPopOutRef.current);
    soundEngine.playCylinderSpin();
  };

  return (
    <group>
      {/* 1. Physical 3D Snub-Nose Revolver + Pop-Out 6-Slot Cylinder */}
      <group
        ref={gunGroupRef}
        position={restPos.toArray()}
        scale={isPlayer ? 0.62 : 0.45}
        onClick={handleInspectRevolver}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
      >
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

        {/* Volumetric 3D Muzzle Flash & Smoke Puff when firing a Live round */}
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

      {/* 2. Physical 3D Shell Tray beside each gun holding Brass (Live) & Silver (Blank) 3D Shells */}
      <group
        position={trayPos}
        rotation={[0, trayRotY, 0]}
        scale={isPlayer ? 0.68 : 0.52}
        onClick={handleInspectRevolver}
      >
        {useBlenderAssets ? (
          <Suspense
            fallback={
              <RoundedBox args={[1.32, 0.22, 0.82]} radius={0.05} position={[0, 0.11, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#6b5b50" roughness={0.48} />
              </RoundedBox>
            }
          >
            <BlenderShellTray />
          </Suspense>
        ) : (
          <RoundedBox args={[1.32, 0.22, 0.82]} radius={0.05} position={[0, 0.11, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#6b5b50" roughness={0.48} />
          </RoundedBox>
        )}

        {trayShells.map((shell, idx) => {
          if (shell === 'empty') return null;
          const [sx, sz] = traySlotOffsets[idx];
          return (
            <group key={idx} position={[sx, 0.36, sz]} scale={0.92}>
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
