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
  RotateCcw,
  Eye,
  EyeOff,
  Box,
  Skull,
  Flame,
  ArrowRight,
} from 'lucide-react';
import {
  ActorSide,
  AimChoice,
  CardInstance,
  ChamberSlot,
  OpponentDef,
  TurnPhase,
} from '../../types/game';
import {
  ALL_CARD_IDS,
  CARD_DEFINITIONS,
  countChamberCardTypes,
  LADDER_OPPONENTS,
} from '../../data/cardsAndOpponents';
import { CameraFocusMode } from '../three/TabletopScene';
import { soundEngine } from '../../audio/soundEngine';

interface SharedCylinderTelemetryProps {
  cylinderSlots: ChamberSlot[];
  currentChamberIdx: number;
  showChamberCounts: boolean;
  phase: TurnPhase;
  playerHp: number;
  playerMaxHp: number;
  playerTableTrap: CardInstance | null;
}

const SharedCylinderTelemetry: React.FC<SharedCylinderTelemetryProps> = ({
  cylinderSlots,
  currentChamberIdx,
  showChamberCounts,
  phase,
  playerHp,
  playerMaxHp,
  playerTableTrap,
}) => {
  const counts = countChamberCardTypes(cylinderSlots);

  return (
    <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl border border-amber-600/60 bg-stone-950/90 backdrop-blur-md shadow-xl">
      {/* Mini 6-Slot Shared Cylinder Diagram */}
      <div className="relative w-12 h-12 rounded-full bg-stone-900 border-2 border-stone-600 flex items-center justify-center shrink-0">
        {cylinderSlots.map((slot, idx) => {
          const angle = (idx * Math.PI) / 3 - Math.PI / 2;
          const x = Math.cos(angle) * 14;
          const y = Math.sin(angle) * 14;

          let dotColor = 'bg-stone-600 border border-stone-400';
          if (slot.spent) {
            dotColor = 'bg-stone-900 border border-stone-700 opacity-40';
          } else if (slot.revealed) {
            if (!slot.card) dotColor = 'bg-stone-500 ring-1 ring-stone-300';
            else if (slot.card.def.color === 'red')
              dotColor = 'bg-red-500 ring-2 ring-red-300 shadow-[0_0_8px_#ef4444]';
            else if (slot.card.def.color === 'blue')
              dotColor = 'bg-sky-400 ring-1 ring-sky-200';
            else dotColor = 'bg-purple-500 ring-2 ring-purple-300';
          } else if (phase !== 'PRE_ROUND_LOAD') {
            dotColor = 'bg-amber-900/80 border border-amber-500/70';
          }

          return (
            <span
              key={idx}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              className={`absolute w-3 h-3 rounded-full transition-all ${dotColor} ${
                idx === currentChamberIdx && phase !== 'PRE_ROUND_LOAD'
                  ? 'scale-125 ring-2 ring-amber-300'
                  : ''
              }`}
              title={`Chamber #${idx + 1}: ${
                slot.spent ? 'SPENT' : slot.revealed ? slot.card?.def.name ?? 'EMPTY' : 'HIDDEN'
              }`}
            />
          );
        })}
        <span className="w-2 h-2 rounded-full bg-amber-400/80" />
      </div>

      {/* Player HP, Trap Status & Loaded Counts */}
      <div className="flex flex-col min-w-[185px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-extrabold tracking-wider uppercase text-amber-200">
            YOU ({playerHp}/{playerMaxHp} HP)
          </span>
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300">
            SLOT {Math.min(currentChamberIdx + 1, 6)}/6
          </span>
        </div>

        {/* Hearts + Player Table Trap Badge */}
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: playerMaxHp }).map((_, i) => (
            <span
              key={i}
              className={`text-sm leading-none transition-transform ${
                i < playerHp
                  ? 'text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.7)] scale-105'
                  : 'text-stone-700'
              }`}
            >
              ♥
            </span>
          ))}
          {playerTableTrap ? (
            <span
              className="ml-auto px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-400 text-[10px] font-mono font-bold text-purple-200"
              title={`Active Face-Down Trap: ${playerTableTrap.def.name} (${playerTableTrap.def.tableTrapText})`}
            >
              TRAP: {playerTableTrap.def.name}
            </span>
          ) : (
            <span className="ml-auto font-mono text-[10px] text-stone-500">
              NO TABLE TRAP
            </span>
          )}
        </div>

        {/* Shared Cylinder Card Type Counts (Toggleable) */}
        <div className="flex items-center gap-2 mt-1 font-mono text-[10px] font-bold">
          {phase === 'PRE_ROUND_LOAD' ? (
            <span className="text-stone-400">CYLINDER EMPTY (0/6 LOADED)</span>
          ) : showChamberCounts ? (
            <>
              <span className="text-red-400">● {counts.red} RED</span>
              <span className="text-sky-300">○ {counts.blue} BLU</span>
              <span className="text-purple-400">◆ {counts.purple} PRP</span>
              <span className="text-stone-400">· {counts.empty} EMP</span>
            </>
          ) : (
            <span className="text-stone-500">
              CHAMBER COUNTS HIDDEN ({counts.remaining} LEFT)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

function useDialogLightDismissFallback(
  dialogRef: React.RefObject<HTMLDialogElement | null>
) {
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
  roundNumber: number;
  turnNumber: number;
  activePlayer: ActorSide;
  phase: TurnPhase;
  statusBanner: string;
  subBanner: string;
  opponentSpeech: string;
  peekedSlotInfo: string | null;
  playerHp: number;
  playerMaxHp: number;
  opponentHp: number;
  opponentMaxHp: number;
  cylinderSlots: ChamberSlot[];
  currentChamberIdx: number;
  showChamberCounts: boolean;
  sharedDeckCount: number;
  playerHand: CardInstance[];
  selectedLoadCards: CardInstance[];
  selectedTrapCard: CardInstance | null;
  playerTableTrap: CardInstance | null;
  opponentTableTrap: CardInstance | null;
  playerAim: AimChoice;
  hoveredCard: CardInstance | null;
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
  onHoverCard: (card: CardInstance | null) => void;
  onTogglePlayerAim: () => void;
  onRingBell: () => void;
  onToggleChamberCounts: () => void;
  onAdvanceNextStage: () => void;
  onRestartRun: () => void;
  onToggleMute: () => void;
  onChangeFocusMode: (mode: CameraFocusMode) => void;
  onToggleBlenderAssets: () => void;
}

export const HudAndModals: React.FC<HudAndModalsProps> = ({
  opponent,
  stageIndex,
  roundNumber,
  turnNumber,
  activePlayer,
  phase,
  statusBanner,
  subBanner,
  opponentSpeech,
  peekedSlotInfo,
  playerHp,
  playerMaxHp,
  opponentHp,
  opponentMaxHp,
  cylinderSlots,
  currentChamberIdx,
  showChamberCounts,
  sharedDeckCount,
  playerHand,
  selectedLoadCards,
  selectedTrapCard,
  playerTableTrap,
  opponentTableTrap,
  playerAim,
  hoveredCard,
  muted,
  focusMode,
  useBlenderAssets,
  stats,
  onSelectPlayerCard,
  onHoverCard,
  onTogglePlayerAim,
  onRingBell,
  onToggleChamberCounts,
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

  const isInteractive = phase === 'PRE_ROUND_LOAD' || phase === 'PLAYER_SELECT';
  const canRing =
    (phase === 'PRE_ROUND_LOAD' && selectedLoadCards.length === 2) ||
    phase === 'PLAYER_SELECT';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* ==================================================================== */}
      {/* TOP BAR: Round/Turn, Opponent Status & Quick Controls                */}
      {/* ==================================================================== */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: Game Brand + Round/Turn + Shared Deck */}
        <div className="pointer-events-auto flex flex-col gap-1.5 bg-stone-950/88 border border-amber-700/50 rounded-xl px-3.5 py-2 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-serif font-black tracking-widest text-sm text-amber-100">
              CHAMBER LOADING
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 font-mono text-[10px] font-bold text-amber-300">
              R{roundNumber} • T{turnNumber}
            </span>
            <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 font-mono text-[10px] font-bold text-stone-300">
              DECK: {sharedDeckCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {LADDER_OPPONENTS.map((opp, idx) => {
              const isCurrent = idx === stageIndex;
              return (
                <div
                  key={opp.id}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-stone-950 shadow-sm ring-1 ring-amber-200'
                      : 'bg-stone-900 text-stone-500 border border-stone-800'
                  }`}
                >
                  <span>{opp.stage}.</span>
                  <span className="hidden md:inline">
                    {opp.name.replace('THE ', '')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Opponent HP, Active Trap & Taunt */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-red-900/70 bg-stone-950/88 backdrop-blur-md shadow-xl">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold tracking-wider uppercase text-amber-200">
                  {opponent.name}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                    activePlayer === 'opponent'
                      ? 'bg-rose-600 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {activePlayer === 'opponent' ? 'ACTIVE' : 'WAITING'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {Array.from({ length: opponentMaxHp }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm leading-none ${
                      i < opponentHp ? 'text-rose-500' : 'text-stone-700'
                    }`}
                  >
                    ♥
                  </span>
                ))}
                <span className="ml-1 font-mono text-[11px] text-stone-300 font-bold">
                  {opponentHp}/{opponentMaxHp} HP
                </span>
                {opponentTableTrap ? (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-400 text-[10px] font-mono font-bold text-purple-200">
                    FACE-DOWN TRAP SET
                  </span>
                ) : (
                  <span className="ml-2 font-mono text-[10px] text-stone-500">
                    NO TRAP
                  </span>
                )}
              </div>
            </div>
          </div>

          {opponentSpeech && (
            <div className="max-w-md px-3 py-1 rounded-full bg-stone-950/92 border border-amber-500/40 text-amber-100/95 font-mono text-xs italic shadow-lg text-center">
              {opponentSpeech}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-stone-950/88 border border-stone-700/70 rounded-xl p-1.5 backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={onToggleChamberCounts}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold cursor-pointer transition-colors ${
              showChamberCounts
                ? 'bg-amber-950/90 border-amber-500/70 text-amber-200'
                : 'bg-stone-900 border-stone-700 text-stone-400'
            }`}
            title="Toggle visibility of total card counts loaded in the cylinder"
          >
            {showChamberCounts ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              COUNTS: {showChamberCounts ? 'ON' : 'OFF'}
            </span>
          </button>

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
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="uppercase">{focusMode}</span>
          </button>

          <button
            type="button"
            onClick={onToggleBlenderAssets}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold cursor-pointer transition-colors ${
              useBlenderAssets
                ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200'
                : 'bg-indigo-950/90 border-indigo-500/70 text-indigo-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {useBlenderAssets ? 'GLB' : '3D'}
            </span>
          </button>

          <button
            type="button"
            onClick={openDeckModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-100 font-mono text-xs font-bold cursor-pointer transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>CARDS</span>
          </button>

          <button
            type="button"
            onClick={openRulesModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-100 font-mono text-xs font-bold cursor-pointer transition-colors"
            aria-label="How to Play"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">RULES</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-100 cursor-pointer transition-colors"
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
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
      {/* CENTER PHASE / RESOLUTION BANNER                                     */}
      {/* ==================================================================== */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none gap-2">
        <div className="px-5 py-2.5 rounded-2xl bg-stone-950/90 border-2 border-amber-500/75 backdrop-blur-md shadow-2xl text-center max-w-xl">
          <div className="font-serif font-black text-sm sm:text-base tracking-wider text-amber-200 uppercase">
            {statusBanner}
          </div>
          {subBanner && (
            <div className="font-mono text-xs text-stone-300 mt-0.5">
              {subBanner}
            </div>
          )}
        </div>

        {peekedSlotInfo && (
          <div className="px-4 py-1.5 rounded-xl bg-sky-950/95 border border-sky-400 text-sky-200 font-mono text-xs font-bold shadow-lg">
            🔍 {peekedSlotInfo}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* HOVERED CARD PREVIEW                                                 */}
      {/* ==================================================================== */}
      {hoveredCard && phase !== 'GAME_OVER' && phase !== 'VICTORY' && (
        <div className="pointer-events-none flex justify-center mb-2">
          <div
            style={{ borderColor: hoveredCard.def.borderColor }}
            className="w-full max-w-sm rounded-xl bg-stone-950/95 border-2 px-4 py-3 backdrop-blur-md shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-800">
              <span className="font-serif font-black text-sm text-amber-100 tracking-wide">
                {hoveredCard.def.name}
              </span>
              <span
                className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-black/50"
                style={{ color: hoveredCard.def.accentColor }}
              >
                {hoveredCard.def.badgeText}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <p className="text-stone-100">
                <span className="font-mono font-bold text-amber-400">IN GUN: </span>
                {hoveredCard.def.chamberEffectText}
              </p>
              <p className="text-stone-300">
                <span className="font-mono font-bold text-purple-300">AS TRAP: </span>
                {hoveredCard.def.tableTrapText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* BOTTOM BAR: Shared Cylinder Telemetry, Hand Cards & Action Controls  */}
      {/* ==================================================================== */}
      <footer className="flex flex-wrap items-end justify-between gap-2">
        <div className="pointer-events-auto">
          <SharedCylinderTelemetry
            cylinderSlots={cylinderSlots}
            currentChamberIdx={currentChamberIdx}
            showChamberCounts={showChamberCounts}
            phase={phase}
            playerHp={playerHp}
            playerMaxHp={playerMaxHp}
            playerTableTrap={playerTableTrap}
          />
        </div>

        {/* Interactive Hand Card Pills */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 bg-stone-950/88 border border-stone-800 rounded-xl px-2.5 py-1.5 backdrop-blur-md shadow-xl">
          {playerHand.length === 0 ? (
            <span className="font-mono text-xs text-stone-500 px-2 py-1">
              HAND EMPTY
            </span>
          ) : (
            playerHand.map((card, idx) => {
              const isSelected =
                phase === 'PRE_ROUND_LOAD'
                  ? selectedLoadCards.some((c) => c.uid === card.uid)
                  : selectedTrapCard?.uid === card.uid;
              const trapBlocked =
                phase === 'PLAYER_SELECT' && playerTableTrap !== null;
              const disabled = !isInteractive || trapBlocked;
              return (
                <button
                  key={card.uid}
                  type="button"
                  disabled={disabled}
                  onMouseEnter={() => onHoverCard(card)}
                  onMouseLeave={() => onHoverCard(null)}
                  onClick={() => {
                    soundEngine.playCardSlide();
                    onSelectPlayerCard(card);
                  }}
                  style={{
                    borderColor: isSelected ? '#fbbf24' : card.def.borderColor,
                  }}
                  title={`${card.def.name} — ${card.def.shortTag}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 font-mono text-[11px] font-bold transition-all ${
                    isSelected
                      ? 'bg-amber-950 text-amber-200 ring-1 ring-amber-300 -translate-y-0.5'
                      : 'bg-stone-900/95 hover:bg-stone-800 text-stone-200'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-stone-400">[{idx + 1}]</span>
                  <span className="text-amber-50">{card.def.name}</span>
                  <span
                    className="text-[9px] px-1 rounded bg-black/40"
                    style={{ color: card.def.accentColor }}
                  >
                    {card.def.color.toUpperCase()}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Aim & Fire / Load Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-stone-950/92 border border-amber-600/50 rounded-xl px-3 py-2 backdrop-blur-md shadow-xl">
          {phase === 'PLAYER_SELECT' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playAimTokenFlip();
                onTogglePlayerAim();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-extrabold uppercase border-2 transition-all cursor-pointer ${
                playerAim === 'opponent'
                  ? 'bg-red-950/90 border-red-500 text-red-100 hover:bg-red-900/90'
                  : 'bg-sky-950/90 border-sky-400 text-sky-100 hover:bg-sky-900/90'
              }`}
              title="Flip Aim [Space]"
            >
              {playerAim === 'opponent' ? (
                <>
                  <Crosshair className="w-3.5 h-3.5 text-red-400" />
                  <span>SHOOT OPPONENT</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-sky-300" />
                  <span>SHOOT SELF</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            disabled={!canRing}
            onClick={() => {
              soundEngine.playBrassBell();
              onRingBell();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-mono text-xs font-black tracking-wider uppercase border-2 transition-all ${
              canRing
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-200 cursor-pointer shadow-lg shadow-amber-500/30'
                : 'bg-stone-900 text-stone-500 border-stone-700 cursor-not-allowed'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>
              {phase === 'PRE_ROUND_LOAD'
                ? `LOAD ${selectedLoadCards.length}/2 [ENTER]`
                : phase === 'PLAYER_SELECT'
                ? selectedTrapCard
                  ? 'SET TRAP & FIRE [ENTER]'
                  : 'FIRE CHAMBER [ENTER]'
                : 'RESOLVING...'}
            </span>
          </button>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* VICTORY / GAME OVER OVERLAY                                          */}
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
              {phase === 'VICTORY' ? 'MATCH VICTORY!' : 'ELIMINATED AT THE TABLE'}
            </h2>
            <p className="text-sm text-stone-300 mt-2">
              {phase === 'VICTORY'
                ? `You defeated ${opponent.name} in Round ${roundNumber}!`
                : `You fell against ${opponent.name} in Round ${roundNumber}.`}
            </p>

            <div className="grid grid-cols-2 gap-3 my-5 text-left font-mono text-xs">
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-stone-400 text-[10px]">TURNS PLAYED</div>
                <div className="text-base font-extrabold text-amber-300 mt-0.5">
                  {stats.turnsPlayed}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                <div className="text-stone-400 text-[10px]">SELF-SHOTS SURVIVED</div>
                <div className="text-base font-extrabold text-sky-300 mt-0.5">
                  {stats.selfShotsSurvived}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {phase === 'VICTORY' && (
                <button
                  type="button"
                  onClick={onAdvanceNextStage}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-mono font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  <span>NEXT CHALLENGER</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onRestartRun}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>NEW MATCH</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CARD GUIDE MODAL                                                     */}
      {/* ==================================================================== */}
      <dialog
        ref={deckDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="deck-dialog-title"
        className="pointer-events-auto m-auto max-w-2xl w-[92vw] rounded-2xl bg-stone-950 text-amber-50 border-2 border-amber-600/70 p-6 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 id="deck-dialog-title" className="font-serif font-black text-xl text-amber-200">
            AMMUNITION & TRAP CARDS (6 TYPES)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {ALL_CARD_IDS.map((id) => {
            const c = CARD_DEFINITIONS[id];
            return (
              <div
                key={id}
                style={{ borderColor: c.borderColor }}
                className="p-3 rounded-xl bg-stone-900/90 border-l-4 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-amber-100">
                    {c.name}
                  </span>
                  <span
                    className="font-mono text-[10px] font-extrabold"
                    style={{ color: c.accentColor }}
                  >
                    {c.badgeText}
                  </span>
                </div>
                <p className="text-xs text-stone-200">
                  <strong className="text-amber-300">In Gun:</strong> {c.chamberEffectText}
                </p>
                <p className="text-xs text-stone-400">
                  <strong className="text-purple-300">As Trap:</strong> {c.tableTrapText}
                </p>
              </div>
            );
          })}
        </div>
      </dialog>

      {/* ==================================================================== */}
      {/* RULES MODAL                                                          */}
      {/* ==================================================================== */}
      <dialog
        ref={rulesDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="rules-dialog-title"
        className="pointer-events-auto m-auto max-w-2xl w-[92vw] rounded-2xl bg-stone-950 text-amber-50 border-2 border-amber-600/70 p-6 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 id="rules-dialog-title" className="font-serif font-black text-xl text-amber-200">
            CHAMBER LOADING — 1V1 RULES
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
              1. Pre-Round Load Phase
            </strong>
            Each round, both players are dealt <strong>4 cards</strong> from the shared deck and secretly load <strong>2 cards</strong> into the empty 6-chamber cylinder (+2 Empty/Blank chambers). The 6 chambers are spun randomly. Your remaining 2 cards stay in hand.
          </div>
          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <strong className="text-amber-300 font-mono uppercase block mb-1">
              2. Card Types
            </strong>
            <span className="text-red-400 font-bold">Red (Live):</span> 1 DMG + bonus effect.{' '}
            <span className="text-sky-300 font-bold">Blue (Blank):</span> 0 DMG; shoot self to keep your turn.{' '}
            <span className="text-purple-400 font-bold">Purple (Trap):</span> 0 DMG; punishes whoever fires it.
          </div>
          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <strong className="text-amber-300 font-mono uppercase block mb-1">
              3. Turn Phase (Set → Aim → Resolve)
            </strong>
            Optionally place <strong>1 face-down Table Trap</strong> (max 1 active per player), choose <strong>Shoot Self</strong> or <strong>Shoot Opponent</strong>, and fire. Opponent’s matching Table Trap resolves before the chamber card! When all 6 chambers are spent, unspent traps clear and you reload.
          </div>
        </div>
      </dialog>
    </div>
  );
};
