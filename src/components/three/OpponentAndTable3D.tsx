import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { OpponentDef, TurnPhase } from '../../types/game';
import { getLockInSlotTexture, getMidTableSlotTexture } from '../../utils/cardTexture';

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
      {/* High-Backed Wooden Tavern Chair */}
      <RoundedBox args={[0.24, 2.35, 0.22]} radius={0.05} position={[-1.02, 1.35, -0.52]} rotation={[0, 0, 0.08]} castShadow receiveShadow>
        <meshStandardMaterial color="#57311a" roughness={0.48} />
      </RoundedBox>
      <RoundedBox args={[0.24, 2.35, 0.22]} radius={0.05} position={[1.02, 1.35, -0.52]} rotation={[0, 0, -0.08]} castShadow receiveShadow>
        <meshStandardMaterial color="#57311a" roughness={0.48} />
      </RoundedBox>
      <RoundedBox args={[1.88, 1.65, 0.16]} radius={0.05} position={[0, 1.55, -0.56]} castShadow receiveShadow>
        <meshStandardMaterial color="#4a2916" roughness={0.5} />
      </RoundedBox>

      {/* Torso / Dark Vest */}
      <mesh position={[0, 0.72, -0.05]} scale={[1.12, 1.18, 0.74]} castShadow receiveShadow>
        <sphereGeometry args={[0.95, 28, 18]} />
        <meshStandardMaterial color="#2c3e44" roughness={0.52} />
      </mesh>

      {/* Cream Shirt Sleeves & Leather Forearm Bracers */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh
            position={[side * 0.96, 0.78, 0.08]}
            rotation={[0.38, 0, side * -0.42]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.28, 0.3, 1.05, 20]} />
            <meshStandardMaterial color="#dfd3c3" roughness={0.55} />
          </mesh>
          <mesh
            position={[side * 1.12, 0.42, 0.42]}
            rotation={[0.85, 0, side * -0.22]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.25, 0.27, 0.72, 20]} />
            <meshStandardMaterial color="#5c341d" roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* Sculpted Orange-Red Bandana Scarf */}
      <mesh position={[0, 1.38, 0.04]} rotation={[Math.PI / 2 + 0.22, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.64, 0.24, 16, 32]} />
        <meshStandardMaterial color={opponent.accentColor} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.12, 0.46]} rotation={[Math.PI - 0.38, 0, 0]} scale={[1.15, 1, 0.55]} castShadow>
        <coneGeometry args={[0.52, 0.68, 24]} />
        <meshStandardMaterial color={opponent.accentColor} roughness={0.42} />
      </mesh>

      {/* Cartoon Head, Ears, Nose & Goatee */}
      <mesh position={[0, 2.06, 0.06]} scale={[0.94, 1.12, 0.88]} castShadow receiveShadow>
        <sphereGeometry args={[0.68, 32, 24]} />
        <meshStandardMaterial color="#e6a176" roughness={0.42} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * 0.66, 2.02, 0.04]} scale={[0.55, 1.08, 0.82]} castShadow>
          <sphereGeometry args={[0.19, 16, 12]} />
          <meshStandardMaterial color="#e6a176" roughness={0.42} />
        </mesh>
      ))}
      <mesh position={[0, 1.62, 0.34]} scale={[0.88, 0.65, 0.72]} castShadow>
        <sphereGeometry args={[0.42, 20, 14]} />
        <meshStandardMaterial color="#4a2c18" roughness={0.48} />
      </mesh>
      <mesh position={[0, 1.98, 0.68]} rotation={[Math.PI / 2 - 0.2, 0, 0]} castShadow>
        <coneGeometry args={[0.13, 0.28, 18]} />
        <meshStandardMaterial color="#df9568" roughness={0.42} />
      </mesh>

      {/* Domino Mask, Expressive Cartoon Eyes & Furrowed Eyebrows */}
      <RoundedBox args={[1.16, 0.38, 0.3]} radius={0.08} position={[0, 2.12, 0.54]} castShadow>
        <meshStandardMaterial color={opponent.maskColor} roughness={0.38} />
      </RoundedBox>
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[side * 0.24, 2.1, 0.64]} scale={[0.95, 1.18, 0.52]}>
            <sphereGeometry args={[0.145, 20, 14]} />
            <meshStandardMaterial color="#fafafa" roughness={0.2} />
          </mesh>
          <mesh position={[side * 0.21, 2.09, 0.71]} scale={[0.9, 1.1, 0.45]}>
            <sphereGeometry args={[0.068, 16, 12]} />
            <meshStandardMaterial color="#141010" roughness={0.15} />
          </mesh>
          <RoundedBox
            args={[0.34, 0.09, 0.14]}
            radius={0.025}
            position={[side * 0.26, 2.3, 0.66]}
            rotation={[0, 0, side * 0.28]}
            castShadow
          >
            <meshStandardMaterial color="#3d2314" roughness={0.45} />
          </RoundedBox>
        </group>
      ))}

      {/* Cheeky Cartoon Grin */}
      <RoundedBox args={[0.44, 0.17, 0.12]} radius={0.04} position={[0.02, 1.74, 0.63]} rotation={[0, 0, 0.08]}>
        <meshStandardMaterial color="#2b130e" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.38, 0.11, 0.1]} radius={0.03} position={[0.02, 1.75, 0.66]} rotation={[0, 0, 0.08]}>
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </RoundedBox>

      {/* Sculpted Swept Cartoon Hair with Swoosh */}
      <mesh position={[0, 2.48, -0.04]} scale={[1.04, 0.72, 0.96]} castShadow>
        <sphereGeometry args={[0.66, 24, 16]} />
        <meshStandardMaterial color="#52301c" roughness={0.45} />
      </mesh>
      <mesh position={[0.12, 2.78, 0.22]} rotation={[0.45, 0.28, -0.48]} scale={[0.95, 1, 0.72]} castShadow>
        <coneGeometry args={[0.46, 0.92, 20]} />
        <meshStandardMaterial color="#52301c" roughness={0.45} />
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

    const targetY = -0.82 + Math.sin(t * 2.1) * 0.025;
    const targetZ =
      recentlyDamaged
        ? -2.95
        : phase === 'RESOLVE_CHAMBER' || phase === 'RESOLVE_TRAP' || phase === 'FIRE_OPPONENT'
        ? -2.35
        : -2.52;
    const targetRotX = recentlyDamaged ? -0.25 : 0.08 + Math.sin(t * 1.4) * 0.018;
    const targetRotY = Math.sin(t * 0.85) * 0.05;

    const speed = Math.min(1, delta * 8);
    bustRef.current.position.y = THREE.MathUtils.lerp(bustRef.current.position.y, targetY, speed);
    bustRef.current.position.z = THREE.MathUtils.lerp(bustRef.current.position.z, targetZ, speed);
    bustRef.current.rotation.x = THREE.MathUtils.lerp(bustRef.current.rotation.x, targetRotX, speed);
    bustRef.current.rotation.y = THREE.MathUtils.lerp(bustRef.current.rotation.y, targetRotY, speed);
  });

  return (
    <group ref={bustRef} position={[0, -0.82, -2.52]} scale={0.66}>
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

function HangingLantern3D({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Iron hook & cap */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.25, 12]} />
        <meshStandardMaterial color="#1c1614" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.26, 0.16, 8]} />
        <meshStandardMaterial color="#2b1e19" roughness={0.5} />
      </mesh>
      {/* Glowing warm glass lantern body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.36, 8]} />
        <meshStandardMaterial
          color="#ffb74d"
          emissive="#ff8f00"
          emissiveIntensity={2.4}
          roughness={0.2}
        />
      </mesh>
      {/* Bottom base */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.08, 8]} />
        <meshStandardMaterial color="#2b1e19" roughness={0.5} />
      </mesh>
      <pointLight position={[0, -0.05, 0.1]} color="#ff9d3b" intensity={3.5} distance={6.5} />
    </group>
  );
}

function TavernBarrel3D({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.56, 0.56, 1.35, 20]} />
        <meshStandardMaterial color="#422618" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[1.08, 0.65, 1.08]} castShadow receiveShadow>
        <sphereGeometry args={[0.56, 20, 14]} />
        <meshStandardMaterial color="#4a2b1b" roughness={0.58} />
      </mesh>
      {/* Iron barrel hoops */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.59, 0.59, 0.09, 20]} />
        <meshStandardMaterial color="#1f1b1a" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.59, 0.59, 0.09, 20]} />
        <meshStandardMaterial color="#1f1b1a" metalness={0.6} roughness={0.45} />
      </mesh>
    </group>
  );
}

export const CardTableEnvironment3D: React.FC<{
  useBlenderAssets: boolean;
  hasLockedCard?: boolean;
}> = ({ hasLockedCard = false }) => {
  const lockSlotTex = useMemo(() => getLockInSlotTexture(hasLockedCard), [hasLockedCard]);
  const slot1Tex = useMemo(() => getMidTableSlotTexture('SLOT', '1', false), []);
  const slot2Tex = useMemo(() => getMidTableSlotTexture('SLOT', '2', false), []);
  const oppSlotTex = useMemo(() => getMidTableSlotTexture('SLOT', '', true), []);

  // 4 horizontal main wood planks + near foreground card ledge
  const plankZs = [-1.42, -0.44, 0.54, 1.54];

  return (
    <group>
      {/* ================================================================== */}
      {/* 1. OVERHEAD HANGING TAVERN LAMP SHADE & WARM BULB (Top Center)     */}
      {/* ================================================================== */}
      <group position={[0, 2.25, -2.15]}>
        {/* Lamp cord */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
          <meshStandardMaterial color="#1c1512" roughness={0.7} />
        </mesh>
        {/* Outer conical dark shade */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.38, 1.18, 0.48, 36, 1, true]} />
          <meshStandardMaterial color="#2b1e1a" roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
        {/* Warm golden-cream illuminated inner shade */}
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.36, 1.14, 0.44, 36, 1, true]} />
          <meshBasicMaterial color="#fcd34d" side={THREE.BackSide} />
        </mesh>
        {/* Glowing warm lightbulb */}
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.2, 24, 16]} />
          <meshBasicMaterial color="#fffbeb" />
        </mesh>
      </group>

      {/* ================================================================== */}
      {/* 2. DARK WOOD PLANKED CARD TABLE (Matches image_0, image_1, image_2)*/}
      {/* ================================================================== */}
      {/* Solid dark wood sub-base so gaps between planks look like carved wood grooves */}
      <RoundedBox
        args={[7.5, 0.34, 4.9]}
        radius={0.08}
        position={[0, -0.2, 0.52]}
        receiveShadow
      >
        <meshStandardMaterial color="#24130a" roughness={0.75} />
      </RoundedBox>

      {/* 4 Horizontal Beveled Wood Planks */}
      {plankZs.map((pz, idx) => (
        <RoundedBox
          key={idx}
          args={[6.68, 0.24, 0.93]}
          radius={0.045}
          smoothness={3}
          position={[0, -0.11, pz]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={idx % 2 === 0 ? '#573521' : '#51311e'}
            roughness={0.48}
            metalness={0.04}
          />
        </RoundedBox>
      ))}

      {/* Foreground Player Hand Apron Plank (nearest camera, z = 2.52) */}
      <RoundedBox
        args={[7.6, 0.26, 0.96]}
        radius={0.05}
        smoothness={3}
        position={[0, -0.1, 2.52]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#4c2d1b" roughness={0.46} metalness={0.04} />
      </RoundedBox>

      {/* Left, Right & Far Raised Beveled Wood Frame Rails */}
      <RoundedBox
        args={[7.6, 0.3, 0.34]}
        radius={0.06}
        smoothness={3}
        position={[0, -0.09, -2.02]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#432617" roughness={0.46} />
      </RoundedBox>
      <RoundedBox
        args={[0.44, 0.3, 4.35]}
        radius={0.06}
        smoothness={3}
        position={[-3.56, -0.09, -0.02]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#432617" roughness={0.46} />
      </RoundedBox>
      <RoundedBox
        args={[0.44, 0.3, 4.35]}
        radius={0.06}
        smoothness={3}
        position={[3.56, -0.09, -0.02]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#432617" roughness={0.46} />
      </RoundedBox>

      {/* ================================================================== */}
      {/* 3. MID-TABLE RESOLUTION SLOTS ("SLOT 1", "SLOT 2" & Opponent Slots)*/}
      {/* ================================================================== */}
      {/* Player's 4 Mid-Table Resolution Slots on Plank 2 (z = 0.34) */}
      {([-1.26, -0.42, 0.42, 1.26] as const).map((sx, idx) => (
        <mesh
          key={`p_slot_${idx}`}
          position={[sx, 0.013, 0.34]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.66, 0.72]} />
          <meshStandardMaterial
            map={idx < 2 ? slot1Tex : slot2Tex}
            roughness={0.55}
          />
        </mesh>
      ))}

      {/* Opponent's 4 Mid-Table Resolution Slots on Plank 3 (z = -0.52) */}
      {([-1.26, -0.42, 0.42, 1.26] as const).map((sx, idx) => (
        <mesh
          key={`o_slot_${idx}`}
          position={[sx, 0.013, -0.52]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.66, 0.72]} />
          <meshStandardMaterial map={oppSlotTex} roughness={0.55} />
        </mesh>
      ))}

      {/* ================================================================== */}
      {/* 4. CENTERED "LOCK IN SLOT" 3D BASE BLOCK ON NEAR PLANK (z = 1.16)  */}
      {/* ================================================================== */}
      <group position={[-0.44, 0.032, 1.16]}>
        {/* Stacked card-deck base block */}
        <RoundedBox
          args={[0.72, 0.055, 0.82]}
          radius={0.016}
          smoothness={3}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#cbb89d" roughness={0.42} />
        </RoundedBox>
        {/* Top printed "LOCK IN SLOT" face */}
        <mesh position={[0, 0.029, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.68, 0.78]} />
          <meshStandardMaterial map={lockSlotTex} roughness={0.38} />
        </mesh>
        {/* Subtle neon pink/gold edge glow around LOCK IN SLOT */}
        <mesh position={[0, -0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.82, 0.92]} />
          <meshBasicMaterial
            color={hasLockedCard ? '#fbbf24' : '#f43f5e'}
            transparent
            opacity={hasLockedCard ? 0.45 : 0.22}
          />
        </mesh>
      </group>

      {/* ================================================================== */}
      {/* 5. BACKGROUND TAVERN ROOM (Shelves, Stools, Lanterns & Barrels)    */}
      {/* ================================================================== */}
      {/* Back tavern wall */}
      <mesh position={[0, 1.2, -5.8]} receiveShadow>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial color="#181210" roughness={0.88} />
      </mesh>

      {/* Left Tavern Area: Side Table, 2 Barstools, Glowing Table Lantern & Wall Shelves */}
      <group position={[-3.35, 0, -4.6]}>
        {/* Side table */}
        <RoundedBox args={[2.4, 0.14, 0.95]} radius={0.03} position={[0, -0.15, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#3b2316" roughness={0.58} />
        </RoundedBox>
        <RoundedBox args={[2.2, 1.4, 0.8]} radius={0.02} position={[0, -0.92, 0]} receiveShadow>
          <meshStandardMaterial color="#26160e" roughness={0.7} />
        </RoundedBox>

        {/* Two round wooden barstools in front of the side table */}
        {([-0.68, 0.42] as const).map((bx, i) => (
          <group key={i} position={[bx, -0.82, 0.85]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.38, 0.36, 0.12, 20]} />
              <meshStandardMaterial color="#4a2c1b" roughness={0.55} />
            </mesh>
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.24, 0.32, 0.9, 16]} />
              <meshStandardMaterial color="#2b1910" roughness={0.65} />
            </mesh>
          </group>
        ))}

        {/* Green bottle + warm glowing lantern on the side table */}
        <mesh position={[0.28, 0.16, 0.1]} castShadow>
          <cylinderGeometry args={[0.06, 0.11, 0.48, 14]} />
          <meshStandardMaterial color="#3f6212" roughness={0.35} />
        </mesh>
        <mesh position={[0.62, 0.12, 0.12]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <pointLight position={[0.62, 0.25, 0.25]} color="#ff9d3b" intensity={2.6} distance={5} />

        {/* Two Wall Shelves above the side table */}
        <RoundedBox args={[2.1, 0.1, 0.38]} radius={0.02} position={[-0.1, 1.05, -0.35]} castShadow>
          <meshStandardMaterial color="#3b2316" roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[2.1, 0.1, 0.38]} radius={0.02} position={[-0.1, 1.75, -0.35]} castShadow>
          <meshStandardMaterial color="#3b2316" roughness={0.6} />
        </RoundedBox>
      </group>

      {/* Right Tavern Area: Wooden Beam, 2 Hanging Lanterns & 2 Chunky Wooden Barrels */}
      <group position={[0, 0, 0]}>
        {/* Vertical & horizontal timber posts */}
        <RoundedBox args={[0.32, 5.2, 0.32]} radius={0.03} position={[2.95, 1.1, -4.65]} castShadow>
          <meshStandardMaterial color="#2d1b12" roughness={0.65} />
        </RoundedBox>
        <RoundedBox args={[2.2, 0.26, 0.26]} radius={0.03} position={[3.2, 2.35, -4.45]} castShadow>
          <meshStandardMaterial color="#2d1b12" roughness={0.65} />
        </RoundedBox>

        {/* Two warm glowing hanging lanterns on the right */}
        <HangingLantern3D position={[2.25, 1.82, -4.45]} />
        <HangingLantern3D position={[3.65, 1.72, -4.15]} />

        {/* Two chunky wooden barrels below the lanterns */}
        <TavernBarrel3D position={[2.35, -0.68, -4.65]} scale={0.95} />
        <TavernBarrel3D position={[3.65, -0.65, -4.25]} scale={1.02} />
      </group>
    </group>
  );
};

useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_rookie.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_counter.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_heavy.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_saboteur.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/opponent_dealer.glb`);
