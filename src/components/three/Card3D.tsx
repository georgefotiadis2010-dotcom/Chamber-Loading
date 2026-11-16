import React, { useMemo, useRef, useState } from 'react';
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

  const spacing = handCount > 5 ? 0.88 : 1.04;
  const rowX = isTableTrap ? -1.45 : (handIndex - (handCount - 1) / 2) * spacing;
  const rowZ = isTableTrap ? (isPlayer ? 0.72 : -0.72) : isPlayer ? 2.02 : -2.18;
  const rowY = isTableTrap ? 0.06 : 0.045;

  const lockPos = useMemo(
    () =>
      isPlayer
        ? new THREE.Vector3(-0.78 + (handIndex % 2) * 0.35, 0.08, 0.58)
        : new THREE.Vector3(-0.78, 0.08, -0.58),
    [isPlayer, handIndex]
  );

  const isFaceDown =
    (isTableTrap && !isTrapRevealed) ||
    (!isPlayer && !isTableTrap && phase === 'PRE_ROUND_LOAD');

  const isRevealingInCenter =
    isTableTrap && isTrapRevealed && phase === 'RESOLVE_TRAP';

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const targetPos = new THREE.Vector3(rowX, rowY, rowZ);
    let targetRotX = isTableTrap ? 0 : isPlayer ? -0.16 : -0.06;
    let targetRotY = 0;
    let targetRotZ = isFaceDown ? Math.PI : 0;
    let targetScale = isTableTrap ? 0.88 : 0.92;

    if (isRevealingInCenter) {
      targetPos.set(0, 0.38, isPlayer ? 0.35 : -0.35);
      targetRotX = 0;
      targetRotZ = 0;
      targetScale = 1.15;
    } else if (isSelectedLocked && !isTableTrap) {
      targetPos.copy(lockPos);
      targetRotX = 0;
      targetRotY = 0;
      targetRotZ = phase === 'PRE_ROUND_LOAD' ? Math.PI : 0;
      targetPos.y = 0.14;
      targetScale = 0.98;
    } else if (hovered && !isTableTrap) {
      targetPos.y = 0.38;
      targetPos.z = isPlayer ? rowZ - 0.24 : rowZ + 0.18;
      targetRotX = isPlayer ? -0.34 : 0.22;
      targetScale = 1.16;
    }

    const speed = Math.min(1, delta * 11);
    groupRef.current.position.lerp(targetPos, speed);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, speed);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, speed);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, speed);

    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, speed);
    groupRef.current.scale.setScalar(s);
  });

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!hovered) {
      setHovered(true);
      soundEngine.playCardHover();
      if (canInteract) {
        document.body.style.cursor = 'pointer';
      }
    }
  };

  const handlePointerOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (canInteract && onSelectCard) {
      soundEngine.playCardSlide();
      onSelectCard(card);
    }
  };

  return (
    <group
      ref={groupRef}
      position={[rowX, rowY, rowZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Chunky beveled 3D card body */}
      <RoundedBox args={[0.92, 0.032, 1.32]} radius={0.014} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color={hovered || isSelectedLocked ? card.def.accentColor : '#27232f'}
          metalness={0.55}
          roughness={0.32}
        />
      </RoundedBox>

      {/* Top Face-Up Canvas Texture Plane */}
      <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.88, 1.28]} />
        <meshStandardMaterial map={frontTex} roughness={0.35} metalness={0.08} />
      </mesh>

      {/* Bottom Face-Down Casino Back Texture Plane */}
      <mesh position={[0, -0.017, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.88, 1.28]} />
        <meshStandardMaterial map={backTex} roughness={0.38} metalness={0.15} />
      </mesh>
    </group>
  );
};
