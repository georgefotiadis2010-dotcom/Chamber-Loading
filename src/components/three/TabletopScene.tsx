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
import { AimToken3D, BrassBell3D, HeartTokensRow3D } from './TabletopTokens3D';
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
  const lookAtTargetRef = useRef(new THREE.Vector3(0, 0.08, -0.35));

  useFrame((state, delta) => {
    const pointerX = state.pointer.x;
    const pointerY = state.pointer.y;

    const basePos = new THREE.Vector3(0, 4.35, 5.45);
    const baseLook = new THREE.Vector3(0, 0.28, -0.62);

    if (focusMode === 'opponent') {
      basePos.set(0, 3.15, 4.45);
      baseLook.set(0, 1.05, -3.5);
    } else if (focusMode === 'cards') {
      basePos.set(0, 4.15, 4.85);
      baseLook.set(0, 0.0, 1.35);
    } else if (
      phase === 'SPIN_CYLINDERS' ||
      phase === 'RESOLVE_CHAMBER' ||
      phase === 'RESOLVE_TRAP'
    ) {
      basePos.set(0, 4.25, 4.75);
      baseLook.set(0, 0.25, -0.15);
    } else if (phase === 'FIRE_PLAYER' || phase === 'FIRE_OPPONENT') {
      basePos.set(0, 3.65, 4.85);
      baseLook.set(0, 0.65, -0.45);
    }

    basePos.x += pointerX * 0.42;
    basePos.y += pointerY * 0.24;

    baseLook.x += pointerX * 0.65;
    baseLook.y += pointerY * 0.55;
    baseLook.z -= pointerY * 0.45;

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

  return <PerspectiveCamera makeDefault position={[0, 4.45, 5.28]} fov={43} near={0.1} far={50} />;
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
  onTogglePlayerAim: () => void;
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
  onTogglePlayerAim,
  onRingBell,
}) => {
  return (
    <>
      <FirstPersonCameraRig
        focusMode={focusMode}
        phase={phase}
        shakeIntensity={shakeIntensity}
      />

      {/* Atmospheric Dark Saloon Background & Fog */}
      <color attach="background" args={['#09070a']} />
      <fog attach="fog" args={['#09070a', 9.5, 22]} />

      {/* Warm Overhead Lamp & Rim Lighting */}
      <ambientLight intensity={0.85} color="#ffedd5" />
      <spotLight
        position={[0, 8.2, 0.8]}
        angle={0.72}
        penumbra={0.65}
        intensity={52}
        color="#ffd89b"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[4, 5, 4]} intensity={1.2} color="#fde68a" />
      <pointLight position={[0, 2.6, -3.5]} intensity={10} color={opponent.eyeColor} distance={7} />

      {/* 3D Card Table & Props */}
      <CardTableEnvironment3D useBlenderAssets={useBlenderAssets} />

      {/* 3D Opponent Bust across the table */}
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

      {/* Player's 3D Cards Row */}
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
          />
        );
      })}

      {/* Opponent's 3D Cards Row */}
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

      {/* Active Face-Down Table Traps on the Felt */}
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
        />
      )}

      {/* Player & Opponent 3D Aim Tokens */}
      <AimToken3D
        owner="player"
        aim={playerAim}
        isLockedInZone={selectedPlayerCard !== null}
        phase={phase}
        useBlenderAssets={useBlenderAssets}
        onToggleAim={onTogglePlayerAim}
      />
      <AimToken3D
        owner="opponent"
        aim={opponentAim}
        isLockedInZone={true}
        phase={phase}
        useBlenderAssets={useBlenderAssets}
      />

      {/* Physical 3D Brass LOCK IN Bell */}
      <BrassBell3D
        readyToLockIn={readyToLockIn}
        phase={phase}
        useBlenderAssets={useBlenderAssets}
        onRingBell={onRingBell}
      />

      {/* 3D Ruby Heart HP Tokens */}
      <HeartTokensRow3D
        owner="player"
        hp={playerHp}
        maxHp={playerMaxHp}
        useBlenderAssets={useBlenderAssets}
      />
      <HeartTokensRow3D
        owner="opponent"
        hp={opponentHp}
        maxHp={opponentMaxHp}
        useBlenderAssets={useBlenderAssets}
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
