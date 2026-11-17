import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CardInstance, TurnPhase } from '../../types/game';
import { getCardBackTexture, getCardFrontTexture } from '../../utils/cardTexture';
import { soundEngine } from '../../audio/soundEngine';

interface Card3DProps {
  card: CardInstance;
  owner: 'player' | 'opponent';
  handIndex: number;
  handCount: number;
  isSelectedLocked: boolean;
  isTableTrap?: boolean;
  isTrapRevealed?: boolean;
  phase: TurnPhase;
  onSelectCard?: (card: CardInstance) => void;
  onHoverCard?: (card: CardInstance | null) => void;
}

export const Card3D: React.FC<Card3DProps> = ({
  card,
  owner,
  handIndex,
  handCount,
  isSelectedLocked,
  isTableTrap = false,
  isTrapRevealed = false,
  phase,
  onSelectCard,
  onHoverCard,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const frontTex = useMemo(() => getCardFrontTexture(card.def.id), [card.def.id]);
  const backTex = useMemo(() => getCardBackTexture(), []);

  const isPlayer = owner === 'player';
  const canInteract =
    !isTableTrap &&
    isPlayer &&
    (phase === 'PRE_ROUND_LOAD' || phase === 'PLAYER_SELECT');

  // Fan offset for foreground player cards vs compact row for opponent far cards
  const fanOffset = handIndex - (handCount - 1) / 2;

  const rowX = isTableTrap
    ? isPlayer
      ? -0.42
      : 0.42
    : isPlayer
    ? fanOffset * 0.74 - 0.14
    : 0.35 + fanOffset * 0.56;

  const rowZ = isTableTrap
    ? isPlayer
      ? 0.34
      : -0.52
    : isPlayer
    ? 2.24 + Math.abs(fanOffset) * 0.05
    : -1.44;

  const rowY = isTableTrap
    ? 0.048
    : isPlayer
    ? 0.30 + handIndex * 0.012
    : 0.036;

  // Centered LOCK IN SLOT position on the near plank (sits cleanly above the 0.061 top face)
  const lockPos = useMemo(
    () =>
      isPlayer
        ? new THREE.Vector3(-0.44 + (handIndex % 2) * 0.03, 0.105, 1.16)
        : new THREE.Vector3(-0.42, 0.06, -0.52),
    [isPlayer, handIndex]
  );

  // In image_0.png, image_1.png, image_2.png, opponent's far cards lie face-up;
  // Mid-table slot cards flip face-up during resolution!
  const isFaceDown =
    isTableTrap &&
    !isTrapRevealed &&
    phase !== 'RESOLVE_CHAMBER' &&
    phase !== 'RESOLVE_TRAP' &&
    phase !== 'FIRE_PLAYER' &&
    phase !== 'FIRE_OPPONENT';

  const isRevealingInCenter =
    isTableTrap && (isTrapRevealed || phase === 'RESOLVE_TRAP' || phase === 'RESOLVE_CHAMBER');

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const targetPos = new THREE.Vector3(rowX, rowY, rowZ);
    let targetRotX = isTableTrap ? 0 : isPlayer ? 0.48 : 0;
    let targetRotY = isTableTrap
      ? isPlayer
        ? 0
        : Math.PI
      : isPlayer
      ? -fanOffset * 0.08
      : Math.PI;
    let targetRotZ = isFaceDown ? Math.PI : 0;
    let targetScale = isTableTrap ? 0.68 : isPlayer ? 0.72 : 0.54;

    if (isRevealingInCenter) {
      targetPos.set(isPlayer ? -0.42 : 0.42, 0.2, isPlayer ? 0.42 : -0.48);
      targetRotX = isPlayer ? 0.22 : -0.15;
      targetRotY = 0;
      targetRotZ = 0;
      targetScale = 0.86;
    } else if (isSelectedLocked && !isTableTrap) {
      targetPos.copy(lockPos);
      targetRotX = 0;
      targetRotY = 0;
      targetRotZ = 0;
      targetScale = 0.78;
    } else if (hovered && !isTableTrap && isPlayer) {
      targetPos.y = 0.72;
      targetPos.z = rowZ - 0.08;
      targetRotX = 0.72;
      targetRotY = -fanOffset * 0.02;
      targetScale = 0.88;
    }

    const speed = Math.min(1, delta * 11);
    groupRef.current.position.lerp(targetPos, speed);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      speed
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY,
      speed
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotZ,
      speed
    );

    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, speed);
    groupRef.current.scale.setScalar(s);
  });

  useEffect(() => {
    if (isSelectedLocked && hovered) {
      setHovered(false);
      onHoverCard?.(null);
      document.body.style.cursor = 'auto';
    }
  }, [isSelectedLocked, hovered, onHoverCard]);

  useEffect(() => {
    return () => {
      if (hovered) {
        onHoverCard?.(null);
        document.body.style.cursor = 'auto';
      }
    };
  }, [hovered, onHoverCard]);

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!hovered) {
      setHovered(true);
      soundEngine.playCardHover();
      if (isPlayer || isTrapRevealed) {
        onHoverCard?.(card);
      }
      if (canInteract) {
        document.body.style.cursor = 'pointer';
      }
    }
  };

  const handlePointerOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(false);
    onHoverCard?.(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (canInteract && onSelectCard) {
      soundEngine.playCardSlide();
      onSelectCard(card);
    }
  };

  const hitPos: [number, number, number] =
    isSelectedLocked && !isTableTrap
      ? [lockPos.x, lockPos.y, lockPos.z]
      : [rowX, rowY, rowZ];
  const hitRot: [number, number, number] =
    isSelectedLocked && !isTableTrap
      ? [0, 0, 0]
      : [
          isTableTrap ? 0 : isPlayer ? 0.48 : 0,
          isTableTrap ? (isPlayer ? 0 : Math.PI) : isPlayer ? -fanOffset * 0.08 : Math.PI,
          0,
        ];
  const hitScale = isSelectedLocked && !isTableTrap ? 0.78 : isTableTrap ? 0.68 : isPlayer ? 0.72 : 0.54;
  const noRaycast = () => null;

  return (
    <group>
      {/* Stationary invisible hit-box so animated hover lift never causes pointer flicker */}
      <mesh
        position={hitPos}
        rotation={hitRot}
        scale={hitScale}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[0.92, 0.12, 1.32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={groupRef} position={[rowX, rowY, rowZ]}>
        {/* Chunky beveled cream-parchment 3D card body */}
        <RoundedBox
          args={[0.92, 0.034, 1.32]}
          radius={0.015}
          smoothness={3}
          castShadow
          receiveShadow
          raycast={noRaycast}
        >
          <meshStandardMaterial
            color={hovered || isSelectedLocked ? '#fef08a' : '#e5d3b5'}
            metalness={0.12}
            roughness={0.38}
          />
        </RoundedBox>

        {/* Top Face-Up Canvas Texture Plane */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[0.89, 1.29]} />
          <meshStandardMaterial
            map={frontTex}
            roughness={0.38}
            metalness={0.04}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>

        {/* Bottom Face-Down Back Texture Plane */}
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[0.89, 1.29]} />
          <meshStandardMaterial
            map={backTex}
            roughness={0.4}
            metalness={0.08}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      </group>
    </group>
  );
};
