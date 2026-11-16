import React, { useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Layers,
  HelpCircle,
  Crosshair,
  Shield,
  Bell,
  Sparkles,
  Trash2,
  ArrowRight,
  RotateCcw,
  Eye,
  Box,
  Skull,
  Flame,
} from 'lucide-react';
import {
  AimChoice,
  CardDef,
  CardId,
  CardInstance,
  OpponentDef,
  ShellType,
  TurnPhase,
} from '../../types/game';
import {
  CARD_DEFINITIONS,
  countShells,
  LADDER_OPPONENTS,
} from '../../data/cardsAndOpponents';
import { CameraFocusMode } from '../three/TabletopScene';
import { soundEngine } from '../../audio/soundEngine';

interface CylinderBadgeProps {
  label: string;
  cylinder: ShellType[];
  activeIdx: number;
  hp: number;
  maxHp: number;
  isOpponent?: boolean;
  bonusNextTurn?: boolean;
}

const CylinderTelemetryCard: React.FC<CylinderBadgeProps> = ({
  label,
  cylinder,
  activeIdx,
  hp,
  maxHp,
  isOpponent = false,
  bonusNextTurn = false,
}) => {
  const counts = countShells(cylinder);
  const lethalPct = Math.round((counts.lethal / 6) * 100);

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border backdrop-blur-md shadow-xl ${
        isOpponent
          ? 'bg-stone-950/88 border-red-900/70'
          : 'bg-stone-950/90 border-amber-600/60'
      }`}
    >
      {/* Mini 6-Slot Revolving Drum Diagram */}
      <div className="relative w-12 h-12 rounded-full bg-stone-900 border-2 border-stone-600 flex items-center justify-center shrink-0">
        {cylinder.map((shell, idx) => {
          const angle = (idx * Math.PI) / 3 - Math.PI / 2;
          const x = Math.cos(angle) * 14;
          const y = Math.sin(angle) * 14;
          const dotColor =
            shell === 'live'
              ? 'bg-red-500 ring-2 ring-red-300 shadow-[0_0_8px_#ef4444]'
              : shell === 'heavy'
              ? 'bg-orange-500 ring-2 ring-yellow-300 shadow-[0_0_8px_#f97316]'
              : shell === 'blank'
              ? 'bg-sky-400 ring-1 ring-sky-200'
              : 'bg-stone-800 border border-stone-600';
          return (
            <span
              key={idx}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              className={`absolute w-3 h-3 rounded-full transition-all ${dotColor} ${
                idx === activeIdx ? 'scale-110' : ''
              }`}
              title={`Slot ${idx + 1}: ${shell.toUpperCase()}`}
            />
          );
        })}
        <span className="w-2 h-2 rounded-full bg-amber-400/80" />
      </div>

      {/* Counts & Odds */}
      <div className="flex flex-col min-w-[155px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-extrabold tracking-wider uppercase text-amber-200">
            {label}
          </span>
          <span
            className={`font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
              lethalPct >= 50
                ? 'bg-red-950 text-red-300 border border-red-600/60'
                : lethalPct > 0
                ? 'bg-amber-950 text-amber-300 border border-amber-600/60'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-600/60'
            }`}
          >
            {lethalPct}% LETHAL
          </span>
        </div>

        {/* Hearts Row */}
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: maxHp }).map((_, i) => (
            <span
              key={i}
              className={`text-sm leading-none transition-transform ${
                i < hp ? 'text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.7)] scale-105' : 'text-stone-700'
              }`}
            >
              ♥
            </span>
          ))}
          <span className="ml-1.5 font-mono text-[11px] text-stone-300 font-bold">
            {hp}/{maxHp} HP
          </span>
          {bonusNextTurn && (
            <span className="ml-auto px-1.5 py-0.5 rounded bg-sky-900/90 border border-sky-400 text-[10px] font-mono font-bold text-sky-200">
              +2 DRAW ARMED
            </span>
          )}
        </div>

        {/* Shell Breakdown Pills */}
        <div className="flex items-center gap-2 mt-1 font-mono text-[10px] font-bold">
          <span className="text-red-400">● {counts.live} LIVE</span>
          {counts.heavy > 0 && <span className="text-orange-400">◈ {counts.heavy} HVY</span>}
          <span className="text-sky-300">○ {counts.blank} BLK</span>
          <span className="text-stone-400">· {counts.empty} EMP</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Light-dismiss fallback hook for <dialog closedby="any">
 * Follows modern-web-guidance `dialog` and `light-dismiss-a-dialog` rules.
 */
function useDialogLightDismissFallback(dialogRef: React.RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        if (e.target !== dialog) {
          pressedOutside = false;
          return;
        }
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (e.target === dialog && pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      return () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, [dialogRef]);
}

interface HudAndModalsProps {
  opponent: OpponentDef;
  stageIndex: number;
  turnNumber: number;
  phase: TurnPhase;
  statusBanner: string;
  subBanner: string;
  opponentSpeech: string;
  playerHp: number;
  playerMaxHp: number;
  opponentHp: number;
  opponentMaxHp: number;
  playerCylinder: ShellType[];
  opponentCylinder: ShellType[];
  playerChamberIdx: number;
  opponentChamberIdx: number;
  playerDeck: CardInstance[];
  playerHand: CardInstance[];
  selectedPlayerCard: CardInstance | null;
  selectedOpponentCard: CardInstance | null;
  playerAim: AimChoice;
  playerBonusDraw: boolean;
  opponentBonusDraw: boolean;
  draftOptions: CardId[];
  draftPickedCard: CardId | null;
  trimmedCardUid: string | null;
  muted: boolean;
  focusMode: CameraFocusMode;
  useBlenderAssets: boolean;
  stats: {
    turnsPlayed: number;
    shotsFired: number;
    selfShotsSurvived: number;
    damageDealt: number;
  };
  onSelectPlayerCard: (card: CardInstance) => void;
  onTogglePlayerAim: () => void;
  onRingBell: () => void;
  onPickDraftCard: (id: CardId) => void;
  onTrimDeckCard: (uid: string) => void;
  onAdvanceNextStage: () => void;
  onRestartRun: () => void;
  onToggleMute: () => void;
  onChangeFocusMode: (mode: CameraFocusMode) => void;
  onToggleBlenderAssets: () => void;
}

export const HudAndModals: React.FC<HudAndModalsProps> = ({
  opponent,
  stageIndex,
  turnNumber,
  phase,
  statusBanner,
  subBanner,
  opponentSpeech,
  playerHp,
  playerMaxHp,
  opponentHp,
  opponentMaxHp,
  playerCylinder,
  opponentCylinder,
  playerChamberIdx,
  opponentChamberIdx,
  playerDeck,
  playerHand,
  selectedPlayerCard,
  selectedOpponentCard,
  playerAim,
  playerBonusDraw,
  opponentBonusDraw,
  draftOptions,
  draftPickedCard,
  trimmedCardUid,
  muted,
  focusMode,
  useBlenderAssets,
  stats,
  onSelectPlayerCard,
  onTogglePlayerAim,
  onRingBell,
  onPickDraftCard,
  onTrimDeckCard,
  onAdvanceNextStage,
  onRestartRun,
  onToggleMute,
  onChangeFocusMode,
  onToggleBlenderAssets,
}) => {
  const deckDialogRef = useRef<HTMLDialogElement | null>(null);
  const rulesDialogRef = useRef<HTMLDialogElement | null>(null);

  useDialogLightDismissFallback(deckDialogRef);
  useDialogLightDismissFallback(rulesDialogRef);

  const openDeckModal = () => {
    soundEngine.playCardHover();
    deckDialogRef.current?.showModal();
  };

  const openRulesModal = () => {
    soundEngine.playCardHover();
    rulesDialogRef.current?.showModal();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* ==================================================================== */}
      {/* TOP BAR: Ladder Progress, Opponent Cylinder Telemetry & Quick Actions */}
      {/* ==================================================================== */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: Game Brand + 5-Opponent Ladder Progress */}
        <div className="pointer-events-auto flex flex-col gap-1.5 bg-stone-950/88 border border-amber-700/50 rounded-xl px-3.5 py-2 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-serif font-black tracking-widest text-sm text-amber-100">
              CHAMBER LOADING
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 font-mono text-[10px] font-bold text-amber-300">
              TURN {turnNumber}
            </span>
          </div>

          {/* 5-Stage Ladder Stepper */}
          <div className="flex items-center gap-1.5">
            {LADDER_OPPONENTS.map((opp, idx) => {
              const isCurrent = idx === stageIndex;
              const isDefeated = idx < stageIndex;
              return (
                <div
                  key={opp.id}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-stone-950 shadow-sm ring-1 ring-amber-200'
                      : isDefeated
                      ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50'
                      : 'bg-stone-900 text-stone-500 border border-stone-800'
                  }`}
                  title={`Stage ${opp.stage}: ${opp.name} (${opp.title})`}
                >
                  <span>{isDefeated ? '✓' : opp.stage}.</span>
                  <span className="hidden md:inline">{opp.name.replace('THE ', '')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Opponent Cylinder Telemetry + Taunt Bubble */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          <CylinderTelemetryCard
            label={`${opponent.name} (${opponent.title})`}
            cylinder={opponentCylinder}
            activeIdx={opponentChamberIdx}
            hp={opponentHp}
            maxHp={opponentMaxHp}
            isOpponent
            bonusNextTurn={opponentBonusDraw}
          />
          {opponentSpeech && (
            <div className="max-w-md px-3 py-1 rounded-full bg-stone-950/92 border border-amber-500/40 text-amber-100/95 font-mono text-xs italic shadow-lg text-center">
              {opponentSpeech}
            </div>
          )}
        </div>

        {/* Right: Camera Controls, 3D Engine Toggle, Deck & Rules Modals, Mute */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-stone-950/88 border border-stone-700/70 rounded-xl p-1.5 backdrop-blur-md shadow-xl">
          {/* Camera Focus Presets */}
          <button
            type="button"
            onClick={() =>
              onChangeFocusMode(
                focusMode === 'table'
                  ? 'opponent'
                  : focusMode === 'opponent'
                  ? 'cards'
                  : 'table'
              )
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-100 font-mono text-xs font-bold cursor-pointer transition-colors"
            title="Cycle Camera Focus Angle"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="uppercase">{focusMode} CAM</span>
          </button>

          {/* Blender GLB vs Procedural R3F Mesh Toggle */}
          <button
            type="button"
            onClick={onToggleBlenderAssets}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold cursor-pointer transition-colors ${
              useBlenderAssets
                ? 'bg-emerald-950/90 hover:bg-emerald-900/90 border-emerald-500/70 text-emerald-200'
                : 'bg-indigo-950/90 hover:bg-indigo-900/90 border-indigo-500/70 text-indigo-200'
            }`}
            title="Switch between Headless Blender .glb Models and Procedural R3F Geometry"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{useBlenderAssets ? 'BLENDER GLB' : 'PROCEDURAL 3D'}</span>
          </button>

          {/* Deck Inspector Modal Trigger */}
          <button
            type="button"
            onClick={openDeckModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-100 font-mono text-xs font-bold cursor-pointer transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>DECK ({playerDeck.length})</span>
          </button>

          {/* Rules Modal Trigger */}
          <button
            type="button"
            onClick={openRulesModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-100 font-mono text-xs font-bold cursor-pointer transition-colors"
            aria-label="How to Play"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">RULES</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-100 cursor-pointer transition-colors"
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title={muted ? 'Unmute Web Audio Synth' : 'Mute Web Audio Synth'}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* CENTER PHASE / RESOLUTION BANNER (Only shown during resolution/fire) */}
      {/* ==================================================================== */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
        {phase !== 'PLAYER_SELECT' && (
          <div className="px-5 py-2.5 rounded-2xl bg-stone-950/92 border-2 border-amber-500/80 backdrop-blur-md shadow-2xl text-center max-w-xl transition-all">
            <div className="font-serif font-black text-base sm:text-lg tracking-wider text-amber-200 uppercase">
              {statusBanner}
            </div>
            {subBanner && (
              <div className="font-mono text-xs text-stone-300 mt-0.5">
                {subBanner}
              </div>
            )}
          </div>
        )}

        {/* Revealed Cards Comparison Banner during RESOLVE_CARDS / SPIN_CYLINDERS */}
        {(phase === 'RESOLVE_CARDS' || phase === 'SPIN_CYLINDERS') &&
          selectedPlayerCard &&
          selectedOpponentCard && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              <div
                className="px-4 py-2 rounded-xl bg-stone-950/95 border-2 shadow-xl text-left min-w-[210px]"
                style={{ borderColor: selectedPlayerCard.def.borderColor }}
              >
                <div className="font-mono text-[10px] font-bold text-amber-300 uppercase">
                  YOU PLAYED
                </div>
                <div className="font-serif font-black text-sm text-white">
                  {selectedPlayerCard.def.name}
                </div>
                <div className="font-mono text-xs font-bold text-amber-200 mt-0.5">
                  {selectedPlayerCard.def.shortTag}
                </div>
              </div>

              <div className="font-mono font-black text-amber-400 text-sm">VS</div>

              <div
                className="px-4 py-2 rounded-xl bg-stone-950/95 border-2 shadow-xl text-left min-w-[210px]"
                style={{ borderColor: selectedOpponentCard.def.borderColor }}
              >
                <div className="font-mono text-[10px] font-bold text-rose-300 uppercase">
                  {opponent.name} PLAYED
                </div>
                <div className="font-serif font-black text-sm text-white">
                  {selectedOpponentCard.def.name}
                </div>
                <div className="font-mono text-xs font-bold text-amber-200 mt-0.5">
                  {selectedOpponentCard.def.shortTag}
                </div>
              </div>
            </div>
          )}
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM BAR: Player Cylinder Telemetry, Quick Card Bar & Lock-In Bell */}
      {/* ==================================================================== */}
      <footer className="flex flex-wrap items-end justify-between gap-2">
        {/* Player Cylinder Telemetry */}
        <div className="pointer-events-auto">
          <CylinderTelemetryCard
            label="YOUR REVOLVER (6-SLOT)"
            cylinder={playerCylinder}
            activeIdx={playerChamberIdx}
            hp={playerHp}
            maxHp={playerMaxHp}
            bonusNextTurn={playerBonusDraw}
          />
        </div>

        {/* Sleek Single-Line Quick-Select Card Pills */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 bg-stone-950/88 border border-stone-800 rounded-xl px-2.5 py-1.5 backdrop-blur-md shadow-xl">
          {playerHand.map((card, idx) => {
            const isSelected = selectedPlayerCard?.uid === card.uid;
            const disabled = phase !== 'PLAYER_SELECT';
            return (
              <button
                key={card.uid}
                type="button"
                disabled={disabled}
                onClick={() => {
                  soundEngine.playCardSlide();
                  onSelectPlayerCard(card);
                }}
                style={{
                  borderColor: isSelected ? '#fbbf24' : card.def.borderColor,
                }}
                title={`${card.def.name}: ${card.def.description}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 font-mono text-[11px] font-bold transition-all ${
                  isSelected
                    ? 'bg-amber-950 text-amber-200 ring-1 ring-amber-300 -translate-y-0.5'
                    : 'bg-stone-900/95 hover:bg-stone-800 text-stone-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="text-stone-400">[{idx + 1}]</span>
                <span className="text-amber-50">{card.def.name}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Aim Token Flip & Brass Bell Lock-In Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-stone-950/92 border border-amber-600/50 rounded-xl px-3 py-2 backdrop-blur-md shadow-xl">
          <button
            type="button"
            disabled={phase !== 'PLAYER_SELECT'}
            onClick={() => {
              soundEngine.playAimTokenFlip();
              onTogglePlayerAim();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-extrabold uppercase border-2 transition-all ${
              playerAim === 'opponent'
                ? 'bg-red-950/90 border-red-500 text-red-100 hover:bg-red-900/90'
                : 'bg-sky-950/90 border-sky-400 text-sky-100 hover:bg-sky-900/90'
            } ${
              phase === 'PLAYER_SELECT' ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}
            title="Click to flip your 3D Aim Token on the table [Space]"
          >
            {playerAim === 'opponent' ? (
              <>
                <Crosshair className="w-3.5 h-3.5 text-red-400" />
                <span>AIM: FOE</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-sky-300" />
                <span>AIM: SELF (+2 DRAW)</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={phase !== 'PLAYER_SELECT' || !selectedPlayerCard}
            onClick={() => {
              soundEngine.playBrassBell();
              onRingBell();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-mono text-xs font-black tracking-wider uppercase border-2 transition-all ${
              phase === 'PLAYER_SELECT' && selectedPlayerCard
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-200 cursor-pointer shadow-lg shadow-amber-500/30'
                : 'bg-stone-900 text-stone-500 border-stone-700 cursor-not-allowed'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>
              {selectedPlayerCard ? 'RING BELL [ENTER]' : 'PICK 1 CARD'}
            </span>
          </button>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* POST-MATCH CARD DRAFT & DECK TRIM OVERLAY                            */}
      {/* ==================================================================== */}
      {phase === 'POST_MATCH_DRAFT' && (
        <div className="pointer-events-auto fixed inset-0 z-30 bg-black/82 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-4xl w-full bg-stone-950 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-4">
              <div>
                <div className="font-mono text-xs font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  STAGE {opponent.stage} CLEARED — {opponent.name} DEFEATED!
                </div>
                <h2 className="font-serif font-black text-2xl sm:text-3xl text-amber-100 mt-1">
                  CHAMBER SPOILS & DECK TUNING
                </h2>
              </div>
              <button
                type="button"
                onClick={onAdvanceNextStage}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg transition-transform hover:scale-105"
              >
                <span>
                  {draftPickedCard ? 'NEXT OPPONENT' : 'SKIP DRAFT & ADVANCE'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Pick 1 of 3 New Cards */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  1. DRAFT 1 NEW TACTICAL CARD INTO YOUR DECK{' '}
                  {draftPickedCard && (
                    <span className="text-emerald-400 ml-2">
                      (✓ ADDED {CARD_DEFINITIONS[draftPickedCard].name})
                    </span>
                  )}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                {draftOptions.map((cardId) => {
                  const def: CardDef = CARD_DEFINITIONS[cardId];
                  const isPicked = draftPickedCard === cardId;
                  const alreadyPickedAnother =
                    draftPickedCard !== null && draftPickedCard !== cardId;

                  return (
                    <button
                      key={cardId}
                      type="button"
                      disabled={draftPickedCard !== null}
                      onClick={() => {
                        soundEngine.playCardSlide();
                        onPickDraftCard(cardId);
                      }}
                      style={{ borderColor: isPicked ? '#34d399' : def.borderColor }}
                      className={`flex flex-col justify-between p-4 rounded-xl border-2 text-left transition-all ${
                        isPicked
                          ? 'bg-emerald-950/60 ring-2 ring-emerald-400 scale-[1.02]'
                          : alreadyPickedAnother
                          ? 'bg-stone-900/40 opacity-45 cursor-not-allowed'
                          : 'bg-stone-900/90 hover:bg-stone-800/95 hover:-translate-y-1 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="px-2 py-0.5 rounded font-mono text-[10px] font-extrabold text-white uppercase"
                            style={{ backgroundColor: def.borderColor }}
                          >
                            {def.badgeText}
                          </span>
                          <span
                            className="font-mono text-xs font-extrabold"
                            style={{ color: def.accentColor }}
                          >
                            {def.shortTag}
                          </span>
                        </div>
                        <div className="font-serif font-black text-lg text-amber-50 mt-2">
                          {def.name}
                        </div>
                        <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                          {def.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-stone-800 flex items-center justify-between font-mono text-[11px] font-bold">
                        <span className="text-stone-400">PRIORITY {def.priority}</span>
                        <span className={isPicked ? 'text-emerald-300' : 'text-amber-300'}>
                          {isPicked ? '✓ IN YOUR DECK' : '+ ADD TO DECK'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Optional Deck Trim (Remove 1 Weak Starter Card) */}
            <div className="mt-6 pt-5 border-t border-stone-800">
              <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                2. OPTIONAL DECK TRIM: REMOVE 1 WEAK CARD FROM YOUR DECK (
                {trimmedCardUid ? '✓ 1 CARD REMOVED' : 'CLICK A CARD BELOW TO BURN IT'})
              </h3>

              <div className="flex flex-wrap gap-2 mt-3 max-h-40 overflow-y-auto pr-1">
                {playerDeck.map((c) => (
                  <button
                    key={c.uid}
                    type="button"
                    disabled={trimmedCardUid !== null || playerDeck.length <= 6}
                    onClick={() => {
                      soundEngine.playShellClink(0.8);
                      onTrimDeckCard(c.uid);
                    }}
                    style={{ borderColor: c.def.borderColor }}
                    className={`px-3 py-1.5 rounded-lg border text-left font-mono text-xs transition-all ${
                      trimmedCardUid !== null
                        ? 'bg-stone-900/50 text-stone-500 opacity-50 cursor-not-allowed'
                        : 'bg-stone-900 hover:bg-rose-950/80 text-stone-200 hover:border-rose-500 cursor-pointer'
                    }`}
                  >
                    <span className="font-bold">{c.def.name}</span>{' '}
                    <span className="text-[10px] text-stone-400">({c.def.shortTag})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VICTORY / GAME OVER FULL-RUN SUMMARY OVERLAY                         */}
      {/* ==================================================================== */}
      {(phase === 'GAME_OVER' || phase === 'VICTORY') && (
        <div className="pointer-events-auto fixed inset-0 z-30 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`max-w-lg w-full rounded-2xl p-6 border-2 shadow-2xl text-center ${
              phase === 'VICTORY'
                ? 'bg-stone-950 border-amber-400'
                : 'bg-stone-950 border-rose-600'
            }`}
          >
            <div className="inline-flex p-3 rounded-full bg-stone-900 border border-stone-700 mb-3">
              {phase === 'VICTORY' ? (
                <Sparkles className="w-8 h-8 text-amber-400" />
              ) : (
                <Skull className="w-8 h-8 text-rose-500" />
              )}
            </div>

            <h2 className="font-serif font-black text-3xl text-amber-100">
              {phase === 'VICTORY'
                ? 'THE HOUSE IS CONQUERED!'
                : 'ELIMINATED AT THE TABLE'}
            </h2>
            <p className="text-sm text-stone-300 mt-2">
              {phase === 'VICTORY'
                ? 'You out-bluffed, out-counted, and out-drew all 5 ladder opponents across the Velvet Pit!'
                : `You fell on Stage ${opponent.stage} against ${opponent.name}. Every chamber tells a story.`}
            </p>

            <div className="grid grid-cols-2 gap-3 my-5 text-left font-mono text-xs">
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-stone-400 text-[10px]">LADDER STAGE</div>
                <div className="text-base font-extrabold text-amber-300 mt-0.5">
                  {phase === 'VICTORY' ? '5 / 5 CLEARED' : `${stageIndex + 1} / 5`}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-stone-400 text-[10px]">TURNS PLAYED</div>
                <div className="text-base font-extrabold text-amber-300 mt-0.5">
                  {stats.turnsPlayed}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-stone-400 text-[10px]">SELF-SHOTS SURVIVED</div>
                <div className="text-base font-extrabold text-sky-300 mt-0.5">
                  {stats.selfShotsSurvived} (+{stats.selfShotsSurvived * 2} CARDS)
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-stone-400 text-[10px]">HEART DAMAGE DEALT</div>
                <div className="text-base font-extrabold text-rose-400 mt-0.5">
                  {stats.damageDealt} HP
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onRestartRun}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-black text-sm uppercase tracking-wider cursor-pointer shadow-lg transition-transform hover:scale-[1.02]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>START NEW LADDER RUN</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* NATIVE <dialog> 1: DECK INSPECTOR                                    */}
      {/* ==================================================================== */}
      <dialog
        ref={deckDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="deck-dialog-title"
        className="pointer-events-auto m-auto max-w-2xl w-[92vw] rounded-2xl bg-stone-950 text-amber-50 border-2 border-amber-600/70 p-6 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 id="deck-dialog-title" className="font-serif font-black text-xl text-amber-200">
            YOUR REVOLVER DECK ({playerDeck.length} CARDS)
          </h2>
          <form method="dialog">
            <button
              type="submit"
              autoFocus
              className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 font-mono text-xs font-bold cursor-pointer"
            >
              CLOSE [ESC]
            </button>
          </form>
        </div>
        <p className="text-xs text-stone-400 font-mono mt-2">
          Each turn you draw up to 5 cards face-up onto the table (+2 bonus cards if you survived an Aim Self pull on an Empty/Blank chamber).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {playerDeck.map((c, i) => (
            <div
              key={c.uid}
              style={{ borderColor: c.def.borderColor }}
              className="p-3 rounded-xl bg-stone-900/90 border-l-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-amber-100">
                  {i + 1}. {c.def.name}
                </span>
                <span
                  className="font-mono text-[10px] font-extrabold"
                  style={{ color: c.def.accentColor }}
                >
                  {c.def.shortTag}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1">{c.def.description}</p>
            </div>
          ))}
        </div>
      </dialog>

      {/* ==================================================================== */}
      {/* NATIVE <dialog> 2: RULES & TACTICAL GUIDE                            */}
      {/* ==================================================================== */}
      <dialog
        ref={rulesDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="rules-dialog-title"
        className="pointer-events-auto m-auto max-w-2xl w-[92vw] rounded-2xl bg-stone-950 text-amber-50 border-2 border-amber-600/70 p-6 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 id="rules-dialog-title" className="font-serif font-black text-xl text-amber-200">
            CHAMBER LOADING — RULES OF THE TABLE
          </h2>
          <form method="dialog">
            <button
              type="submit"
              autoFocus
              className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 font-mono text-xs font-bold cursor-pointer"
            >
              GOT IT [ESC]
            </button>
          </form>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-stone-200 mt-4 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <strong className="text-amber-300 font-mono uppercase block mb-1">
              1. Two 6-Slot Revolvers & Open Information
            </strong>
            Both players start with a 6-chamber snub-nose revolver initialized with{' '}
            <span className="text-red-400 font-bold">1 Live Round</span> and{' '}
            <span className="text-stone-400 font-bold">5 Empty Slots</span>. Both players’ drawn cards lie{' '}
            <strong>face-up on the table</strong> so you can read the opponent’s options before locking in!
          </div>

          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <strong className="text-amber-300 font-mono uppercase block mb-1">
              2. Secret Lock-In (1 Card + 3D Aim Token)
            </strong>
            Select <strong>1 Card</strong> from your row (Red Loaders stuff Live shells into the opponent’s gun; Blue Strippers remove Live shells or add silver Blanks to your own gun) and flip your{' '}
            <strong>3D Aim Token</strong> between <em>AIM OPPONENT</em> or <em>AIM SELF</em>, then ring the{' '}
            <strong>Brass Bell</strong>.
          </div>

          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <strong className="text-amber-300 font-mono uppercase block mb-1">
              3. Spin & Pull the Trigger
            </strong>
            Both locked-in cards flip face-up, modify the cylinders, and the cylinders spin. Then each player picks up <strong>their own revolver</strong> and fires at their chosen Aim target:
            <ul className="list-disc list-inside mt-1.5 space-y-1 text-stone-300">
              <li>
                <span className="text-red-400 font-bold">Aim Opponent + Live/Heavy:</span> Deals 1 HP (or 2 HP for Heavy) damage to your opponent!
              </li>
              <li>
                <span className="text-sky-300 font-bold">Aim Self + Empty/Blank:</span> Click! You survive unharmed and draw <strong>+2 Bonus Cards</strong> next turn!
              </li>
              <li>
                <span className="text-rose-400 font-bold">Aim Self + Live/Heavy:</span> You shoot yourself for 1–2 HP damage!
              </li>
            </ul>
          </div>
        </div>
      </dialog>
    </div>
  );
};
