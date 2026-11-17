import React, { Component, ReactNode, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  ActorSide,
  AimChoice,
  CardInstance,
  OpponentDef,
  ShellType,
  TurnPhase,
} from '../../types/game';
import { Revolver3D } from './Revolver3D';
import { Card3D } from './Card3D';
import { BrassBell3D } from './TabletopTokens3D';
import { CardTableEnvironment3D, OpponentBust3D } from './OpponentAndTable3D';

export type CameraFocusMode = 'table' | 'opponent' | 'cards';

interface FirstPersonCameraRigProps {
  focusMode: CameraFocusMode;
  phase: TurnPhase;
  shakeIntensity: number;
}

const FirstPersonCameraRig: React.FC<FirstPersonCameraRigProps> = ({
  focusMode,
  phase,
  shakeIntensity,
}) => {
  const lookAtTargetRef = useRef(new THREE.Vector3(0, 0.32, -0.35));

  useFrame((state, delta) => {
    const pointerX = state.pointer.x;
    const pointerY = state.pointer.y;

    // Seated first-person perspective matching image_0.png, image_1.png, image_2.png
    const basePos = new THREE.Vector3(0, 3.18, 4.92);
    const baseLook = new THREE.Vector3(0, 0.22, -0.18);

    if (focusMode === 'opponent') {
      basePos.set(0, 2.55, 3.85);
      baseLook.set(0, 0.72, -2.5);
    } else if (focusMode === 'cards') {
      basePos.set(0, 3.15, 4.35);
      baseLook.set(0, 0.05, 1.35);
    } else if (
      phase === 'SPIN_CYLINDERS' ||
      phase === 'RESOLVE_CHAMBER' ||
      phase === 'REVEAL_CARDS'
    ) {
      basePos.set(0, 3.18, 4.35);
      baseLook.set(0, 0.25, -0.15);
    } else if (phase === 'FIRE_PLAYER' || phase === 'FIRE_OPPONENT') {
      basePos.set(0, 2.95, 4.45);
      baseLook.set(0, 0.45, -0.45);
    }

    // Subtle mouse-driven camera parallax: gentle look without shifting cards out from under cursor
    basePos.x += pointerX * 0.14;
    basePos.y += pointerY * 0.09;

    baseLook.x += pointerX * 0.24;
    baseLook.y += pointerY * 0.22;
    baseLook.z -= pointerY * 0.18;

    if (shakeIntensity > 0.01) {
      basePos.x += (Math.random() - 0.5) * shakeIntensity * 0.55;
      basePos.y += (Math.random() - 0.5) * shakeIntensity * 0.55;
      basePos.z += (Math.random() - 0.5) * shakeIntensity * 0.35;
    }

    const speed = Math.min(1, delta * 6.5);
    state.camera.position.lerp(basePos, speed);
    lookAtTargetRef.current.lerp(baseLook, speed);
    state.camera.lookAt(lookAtTargetRef.current);
  });

  return (
    <PerspectiveCamera
      makeDefault
      position={[0, 3.08, 4.58]}
      fov={40}
      near={0.1}
      far={50}
    />
  );
};

class GlbErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface TabletopSceneProps {
  opponent: OpponentDef;
  phase: TurnPhase;
  playerHp: number;
  playerMaxHp: number;
  opponentHp: number;
  opponentMaxHp: number;
  sharedCylinder: ShellType[];
  currentChamberIdx: number;
  playerHand: CardInstance[];
  opponentHand: CardInstance[];
  selectedLoadCards: CardInstance[];
  selectedPlayerCard: CardInstance | null;
  playerPlayedCard: CardInstance | null;
  opponentPlayedCard: CardInstance | null;
  readyToLockIn: boolean;
  randomGunTarget: ActorSide;
  gunMuzzleFlash: boolean;
  gunDryFire: boolean;
  opponentDamagedAnim: boolean;
  shakeIntensity: number;
  focusMode: CameraFocusMode;
  useBlenderAssets: boolean;
  onSelectPlayerCard: (card: CardInstance) => void;
  onHoverCard?: (card: CardInstance | null) => void;
  onRingBell: () => void;
}

const SceneContents: React.FC<TabletopSceneProps> = ({
  opponent,
  phase,
  sharedCylinder,
  currentChamberIdx,
  playerHand,
  opponentHand,
  selectedLoadCards,
  selectedPlayerCard,
  playerPlayedCard,
  opponentPlayedCard,
  readyToLockIn,
  randomGunTarget,
  gunMuzzleFlash,
  gunDryFire,
  opponentDamagedAnim,
  shakeIntensity,
  focusMode,
  useBlenderAssets,
  onSelectPlayerCard,
  onHoverCard,
  onRingBell,
}) => {
  const hasLockedCard =
    selectedPlayerCard !== null || selectedLoadCards.length > 0;
  const gunAim: AimChoice = randomGunTarget === 'opponent' ? 'opponent' : 'self';
  const isFiringNow = phase === 'FIRE_PLAYER' || phase === 'FIRE_OPPONENT';
  const arePlayedCardsRevealed =
    phase === 'REVEAL_CARDS' ||
    phase === 'RESOLVE_CHAMBER' ||
    phase === 'FIRE_PLAYER' ||
    phase === 'FIRE_OPPONENT';

  return (
    <>
      <FirstPersonCameraRig
        focusMode={focusMode}
        phase={phase}
        shakeIntensity={shakeIntensity}
      />

      {/* Warm Dim Tavern Background & Depth Fog */}
      <color attach="background" args={['#140e0c']} />
      <fog attach="fog" args={['#140e0c', 7.5, 18]} />

      {/* Soft Studio / Tabletop Lighting from Warm Overhead Hanging Lamp */}
      <ambientLight intensity={0.95} color="#ffedd5" />
      <spotLight
        position={[0, 6.2, 0.4]}
        angle={0.78}
        penumbra={0.75}
        intensity={48}
        color="#ffd699"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[2.5, 4.5, 3.8]} intensity={1.15} color="#fde68a" />
      <pointLight position={[0, 2.8, -1.2]} intensity={12} color="#ffb74d" distance={8} />

      {/* 3D Dark Wood Planked Table, Overhead Lamp & Tavern Room Props */}
      <CardTableEnvironment3D
        useBlenderAssets={useBlenderAssets}
        hasLockedCard={hasLockedCard}
      />

      {/* 3D Seated Cartoon Opponent across the table */}
      <OpponentBust3D
        opponent={opponent}
        phase={phase}
        recentlyDamaged={opponentDamagedAnim}
        useBlenderAssets={useBlenderAssets}
      />

      {/* Single Shared 3D Revolver + 6-Slot Cylinder + 3D Shell Tray */}
      <Revolver3D
        owner="player"
        cylinder={sharedCylinder}
        activeChamberIndex={currentChamberIdx}
        phase={phase}
        aim={gunAim}
        isFiringNow={isFiringNow}
        muzzleFlashActive={gunMuzzleFlash}
        dryFireActive={gunDryFire}
        isJammed={false}
        useBlenderAssets={useBlenderAssets}
      />

      {/* Player's Foreground 3D Cards Row (LOAD LIVE, STRIP SHELL, PAD CYLINDER) */}
      {playerHand.map((card, idx) => {
        const isLocked =
          phase === 'PRE_ROUND_LOAD'
            ? selectedLoadCards.some((c) => c.uid === card.uid)
            : selectedPlayerCard?.uid === card.uid;
        return (
          <Card3D
            key={card.uid}
            card={card}
            owner="player"
            handIndex={idx}
            handCount={playerHand.length}
            isSelectedLocked={isLocked}
            phase={phase}
            onSelectCard={onSelectPlayerCard}
            onHoverCard={onHoverCard}
          />
        );
      })}

      {/* Opponent's Far Row of Smaller Face-Up 3D Cards */}
      {opponentHand.map((card, idx) => (
        <Card3D
          key={card.uid}
          card={card}
          owner="opponent"
          handIndex={idx}
          handCount={opponentHand.length}
          isSelectedLocked={false}
          phase={phase}
        />
      ))}

      {/* Simultaneously Placed Mid-Table Cards on the Wood Planks */}
      {playerPlayedCard && (
        <Card3D
          key={`played_p_${playerPlayedCard.uid}`}
          card={playerPlayedCard}
          owner="player"
          handIndex={0}
          handCount={1}
          isSelectedLocked={false}
          isPlayedSlot
          isSlotRevealed={arePlayedCardsRevealed}
          phase={phase}
          onHoverCard={onHoverCard}
        />
      )}
      {opponentPlayedCard && (
        <Card3D
          key={`played_o_${opponentPlayedCard.uid}`}
          card={opponentPlayedCard}
          owner="opponent"
          handIndex={0}
          handCount={1}
          isSelectedLocked={false}
          isPlayedSlot
          isSlotRevealed={arePlayedCardsRevealed}
          phase={phase}
          onHoverCard={onHoverCard}
        />
      )}

      {/* Physical 3D Brass LOCK IN Bell next to LOCK IN SLOT */}
      <BrassBell3D
        readyToLockIn={readyToLockIn}
        phase={phase}
        useBlenderAssets={useBlenderAssets}
        onRingBell={onRingBell}
      />
    </>
  );
};

export const TabletopScene: React.FC<TabletopSceneProps> = (props) => {
  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <GlbErrorBoundary
          fallback={<SceneContents {...props} useBlenderAssets={false} />}
        >
          <SceneContents {...props} />
        </GlbErrorBoundary>
      </Canvas>
    </div>
  );
};
