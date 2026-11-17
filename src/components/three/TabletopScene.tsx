import React, { Component, ReactNode, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  AimChoice,
  CardInstance,
  OpponentDef,
  ShellType,
  TurnPhase,
} from '../../types/game';
import { Revolver3D } from './Revolver3D';
import { Card3D } from './Card3D';
import { AimToken3D, BrassBell3D } from './TabletopTokens3D';
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
      phase === 'RESOLVE_TRAP'
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
  playerCylinder: ShellType[];
  opponentCylinder: ShellType[];
  playerChamberIdx: number;
  opponentChamberIdx: number;
  playerHand: CardInstance[];
  opponentHand: CardInstance[];
  selectedLoadCards: CardInstance[];
  selectedPlayerCard: CardInstance | null;
  selectedOpponentCard: CardInstance | null;
  playerTableTrap: CardInstance | null;
  opponentTableTrap: CardInstance | null;
  revealedTrapOwner: 'player' | 'opponent' | null;
  readyToLockIn: boolean;
  playerAim: AimChoice;
  opponentAim: AimChoice;
  playerMuzzleFlash: boolean;
  opponentMuzzleFlash: boolean;
  playerDryFire: boolean;
  opponentDryFire: boolean;
  playerJammed: boolean;
  opponentJammed: boolean;
  opponentDamagedAnim: boolean;
  shakeIntensity: number;
  focusMode: CameraFocusMode;
  useBlenderAssets: boolean;
  onSelectPlayerCard: (card: CardInstance) => void;
  onHoverCard?: (card: CardInstance | null) => void;
  onTogglePlayerAim: () => void;
  onSelectPlayerAim?: (choice: AimChoice) => void;
  onRingBell: () => void;
}

const SceneContents: React.FC<TabletopSceneProps> = ({
  opponent,
  phase,
  playerHp,
  playerMaxHp,
  opponentHp,
  opponentMaxHp,
  playerCylinder,
  opponentCylinder,
  playerChamberIdx,
  opponentChamberIdx,
  playerHand,
  opponentHand,
  selectedLoadCards,
  selectedPlayerCard,
  selectedOpponentCard,
  playerTableTrap,
  opponentTableTrap,
  revealedTrapOwner,
  readyToLockIn,
  playerAim,
  opponentAim,
  playerMuzzleFlash,
  opponentMuzzleFlash,
  playerDryFire,
  opponentDryFire,
  playerJammed,
  opponentJammed,
  opponentDamagedAnim,
  shakeIntensity,
  focusMode,
  useBlenderAssets,
  onSelectPlayerCard,
  onHoverCard,
  onTogglePlayerAim,
  onSelectPlayerAim,
  onRingBell,
}) => {
  const hasLockedCard =
    selectedPlayerCard !== null || selectedLoadCards.length > 0;

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

      {/* Player & Opponent 3D Revolvers + 6-Slot Cylinders + 3D Shell Trays */}
      <Revolver3D
        owner="player"
        cylinder={playerCylinder}
        activeChamberIndex={playerChamberIdx}
        phase={phase}
        aim={playerAim}
        isFiringNow={phase === 'FIRE_PLAYER'}
        muzzleFlashActive={playerMuzzleFlash}
        dryFireActive={playerDryFire}
        isJammed={playerJammed}
        useBlenderAssets={useBlenderAssets}
      />
      <Revolver3D
        owner="opponent"
        cylinder={opponentCylinder}
        activeChamberIndex={opponentChamberIdx}
        phase={phase}
        aim={opponentAim}
        isFiringNow={phase === 'FIRE_OPPONENT'}
        muzzleFlashActive={opponentMuzzleFlash}
        dryFireActive={opponentDryFire}
        isJammed={opponentJammed}
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
          isSelectedLocked={selectedOpponentCard?.uid === card.uid}
          phase={phase}
        />
      ))}

      {/* Active Mid-Table Slot Cards on the Wood Planks */}
      {playerTableTrap && (
        <Card3D
          key={`trap_p_${playerTableTrap.uid}`}
          card={playerTableTrap}
          owner="player"
          handIndex={0}
          handCount={1}
          isSelectedLocked={false}
          isTableTrap
          isTrapRevealed={revealedTrapOwner === 'player'}
          phase={phase}
          onHoverCard={onHoverCard}
        />
      )}
      {opponentTableTrap && (
        <Card3D
          key={`trap_o_${opponentTableTrap.uid}`}
          card={opponentTableTrap}
          owner="opponent"
          handIndex={0}
          handCount={1}
          isSelectedLocked={false}
          isTableTrap
          isTrapRevealed={revealedTrapOwner === 'opponent'}
          phase={phase}
          onHoverCard={onHoverCard}
        />
      )}

      {/* Player's Two Distinct 3D Aim Chips (AIM OPPONENT & AIM SELF) + Opponent's Aim Chip */}
      <AimToken3D
        owner="player"
        aim={playerAim}
        isLockedInZone={selectedPlayerCard !== null}
        phase={phase}
        useBlenderAssets={useBlenderAssets}
        onToggleAim={onTogglePlayerAim}
        onSelectAim={onSelectPlayerAim}
      />
      <AimToken3D
        owner="opponent"
        aim={opponentAim}
        isLockedInZone={true}
        phase={phase}
        useBlenderAssets={useBlenderAssets}
      />

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
