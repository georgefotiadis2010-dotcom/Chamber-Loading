import React, { useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  Skull,
  Search,
  ArrowRight,
  Settings,
  Crosshair,
  Bell,
} from 'lucide-react';
import {
  ActorSide,
  CardInstance,
  ChamberSlot,
  LastFiredShotInfo,
  OpponentDef,
  TurnPhase,
} from '../../types/game';
import {
  countChamberCardTypes,
  isLiveChamberCard,
  LADDER_OPPONENTS,
  RARITY_META,
} from '../../data/cardsAndOpponents';
import { CameraFocusMode } from '../three/TabletopScene';
import { soundEngine } from '../../audio/soundEngine';

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

function CartoonHeart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 32 30"
      className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-200 ${
        filled ? 'scale-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]' : 'scale-90 opacity-45'
      }`}
      aria-hidden="true"
    >
      <path
        d="M16 27.5C16 27.5 3.5 19.6 3.5 10.4C3.5 6.3 6.7 3.2 10.6 3.2C13 3.2 15.1 4.4 16 6.2C16.9 4.4 19 3.2 21.4 3.2C25.3 3.2 28.5 6.3 28.5 10.4C28.5 19.6 16 27.5 16 27.5Z"
        fill={filled ? '#e83b46' : '#5e321a'}
        stroke="#2b1307"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M8.2 8.8C8.8 7.1 10.3 6.2 12 6.4"
          fill="none"
          stroke="#ff9da3"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

interface HudAndModalsProps {
  opponent: OpponentDef;
  stageIndex: number;
  roundNumber: number;
  turnNumber: number;
  turnTarget: ActorSide;
  phase: TurnPhase;
  statusBanner: string;
  subBanner: string;
  opponentSpeech: string;
  lastTurnSummary: string | null;
  lastFiredShot: LastFiredShotInfo | null;
  peekedSlotInfo: string | null;
  playerHp: number;
  playerMaxHp: number;
  opponentHp: number;
  opponentMaxHp: number;
  cylinderSlots: ChamberSlot[];
  currentChamberIdx: number;
  showChamberCounts: boolean;
  playerHand: CardInstance[];
  selectedLoadCards: CardInstance[];
  selectedCard: CardInstance | null;
  playerPlayedCard: CardInstance | null;
  opponentPlayedCard: CardInstance | null;
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
  onRingBell: () => void;
  onContinueTurn: () => void;
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
  turnTarget,
  phase,
  statusBanner,
  subBanner,
  opponentSpeech,
  lastTurnSummary,
  lastFiredShot,
  peekedSlotInfo,
  playerHp,
  playerMaxHp,
  opponentHp,
  opponentMaxHp,
  cylinderSlots,
  currentChamberIdx,
  showChamberCounts,
  selectedCard,
  hoveredCard,
  muted,
  focusMode,
  useBlenderAssets,
  stats,
  onRingBell,
  onContinueTurn,
  onToggleChamberCounts,
  onAdvanceNextStage,
  onRestartRun,
  onToggleMute,
  onChangeFocusMode,
  onToggleBlenderAssets,
}) => {
  const rulesDialogRef = useRef<HTMLDialogElement | null>(null);

  useDialogLightDismissFallback(rulesDialogRef);

  const openRulesModal = () => {
    soundEngine.playCardHover();
    rulesDialogRef.current?.showModal();
  };

  const counts = countChamberCardTypes(cylinderSlots);
  const liveCount = counts.red;
  const blankCount = counts.blue + counts.purple + counts.empty;
  const activeCardPreview = hoveredCard ?? selectedCard;
  const isAimedAtOpponent = turnTarget === 'opponent';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* ==================================================================== */}
      {/* TOP BAR: Player/Chamber Info, Clear Turn Flow Banner, Opponent Info  */}
      {/* ==================================================================== */}
      <header className="flex items-start justify-between gap-3">
        {/* Top-Left: YOU + Heart Pill + Round/Shells + Drum */}
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          <div className="font-black text-xl sm:text-2xl leading-none tracking-wide uppercase text-[#fff5dc] cartoon-stroke-lg">
            YOU
          </div>

          {/* Warm Wooden Pill Containing Player Hearts */}
          <div
            className="flex items-center gap-1 rounded-2xl bg-gradient-to-b from-[#e4b384] to-[#c68b59] border-[3px] border-[#3b1c0a] px-2.5 py-1.5 shadow-[0_4px_0_#261106,0_8px_16px_rgba(0,0,0,0.5)]"
            aria-label={`Your HP: ${playerHp} of ${playerMaxHp}`}
          >
            {Array.from({ length: playerMaxHp }).map((_, i) => (
              <CartoonHeart key={i} filled={i < playerHp} />
            ))}
          </div>

          {/* Round & Live/Blank Count */}
          <div className="flex items-center gap-2.5 pl-0.5 text-xs sm:text-sm font-black tracking-wide uppercase text-[#fff5dc] cartoon-stroke">
            <span>ROUND {roundNumber}</span>
            <button
              type="button"
              onClick={onToggleChamberCounts}
              title="Toggle Live/Blank shell count visibility"
              className="hover:text-amber-300 cursor-pointer uppercase"
            >
              {showChamberCounts
                ? `${liveCount} LIVE / ${blankCount} BLANK`
                : `${6 - counts.empty}/6 LOADED`}
            </button>
          </div>

          {/* 6-Chamber Drum Tracker + Last Fired Shot */}
          <div
            className="flex flex-wrap items-center gap-1.5 pl-0.5"
            title="6-Chamber Drum Progress"
          >
            <span className="text-[11px] font-black tracking-wider uppercase text-[#f3d4a5] cartoon-stroke">
              DRUM:
            </span>
            <div className="flex items-center gap-1">
              {cylinderSlots.map((slot, idx) => {
                const isSpent = slot.spent;
                const wasLive = isSpent && isLiveChamberCard(slot.card);
                const wasGold = isSpent && slot.card?.def.color === 'gold';
                const isActive =
                  !isSpent &&
                  idx === currentChamberIdx &&
                  (phase === 'RESOLVE_CHAMBER' ||
                    phase === 'FIRE_PLAYER' ||
                    phase === 'FIRE_OPPONENT');
                const slotTitle = isSpent
                  ? slot.card
                    ? `Fired: ${slot.card.def.name}`
                    : 'Fired: Blank'
                  : 'Unspent Chamber (?)';
                return (
                  <span
                    key={slot.index}
                    title={slotTitle}
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black border-2 shadow-sm ${
                      isSpent
                        ? wasGold
                          ? 'bg-gradient-to-b from-amber-300 to-amber-500 border-[#3b1c0a] text-[#2a1306]'
                          : wasLive
                          ? 'bg-gradient-to-b from-rose-500 to-rose-700 border-[#3b1c0a] text-white'
                          : 'bg-gradient-to-b from-[#cfa276] to-[#9b6c43] border-[#3b1c0a] text-[#2a1306]'
                        : isActive
                        ? 'bg-amber-400 border-[#fff5dc] text-stone-950 scale-110 shadow-md'
                        : 'bg-[#361c0d]/90 border-[#9c6b43] text-[#d9a873]'
                    }`}
                  >
                    {isSpent ? (wasGold ? '★' : wasLive ? '!' : '') : '?'}
                  </span>
                );
              })}
            </div>

            {lastFiredShot && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 font-mono text-[10px] font-bold shadow ${
                  lastFiredShot.wasBlank
                    ? 'bg-[#361c0d]/90 border-[#9c6b43] text-[#f5d8a8]'
                    : lastFiredShot.color === 'gold'
                    ? 'bg-amber-950/95 border-amber-400 text-amber-200'
                    : 'bg-rose-950/95 border-rose-500 text-rose-200'
                }`}
              >
                <span>LAST: {lastFiredShot.label}</span>
                <span className="opacity-85">
                  {lastFiredShot.damage > 0 ? `(-${lastFiredShot.damage} HP)` : '(SAFE)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Center: Wooden Plaque Turn Flow & Target Banner */}
        <div className="pointer-events-none flex flex-col items-center gap-1.5 max-w-xl text-center">
          <div
            className={`px-6 py-2 rounded-2xl bg-gradient-to-b from-[#4f2b17] to-[#32190c] border-[3px] shadow-[0_4px_0_#210f05,0_10px_20px_rgba(0,0,0,0.6)] ${
              phase === 'PICK_TARGET' ||
              phase === 'RESOLVE_CHAMBER' ||
              phase === 'FIRE_PLAYER' ||
              phase === 'FIRE_OPPONENT' ||
              phase === 'TURN_RESULT'
                ? isAimedAtOpponent
                  ? 'border-emerald-400'
                  : 'border-rose-400'
                : 'border-[#d7a66d]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-sm sm:text-lg font-black tracking-wide text-[#fff5dc] uppercase cartoon-stroke">
              {(phase === 'PICK_TARGET' ||
                phase === 'RESOLVE_CHAMBER' ||
                phase === 'FIRE_PLAYER' ||
                phase === 'FIRE_OPPONENT') && (
                <Crosshair
                  className={`w-4 h-4 shrink-0 ${
                    isAimedAtOpponent ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                />
              )}
              <span>{statusBanner}</span>
            </div>
            {subBanner && (
              <div className="text-[11px] sm:text-xs font-bold text-[#f5d8a8] mt-0.5 leading-snug">
                {subBanner}
              </div>
            )}
          </div>

          {lastFiredShot &&
            (phase === 'FIRE_PLAYER' ||
              phase === 'FIRE_OPPONENT' ||
              phase === 'TURN_RESULT') && (
              <div
                className={`px-3.5 py-1 rounded-full border-2 font-mono text-xs font-black tracking-wide shadow-lg ${
                  lastFiredShot.wasBlank
                    ? 'bg-[#361c0d]/95 border-[#c69563] text-[#fff5dc]'
                    : lastFiredShot.color === 'gold'
                    ? 'bg-amber-950/95 border-amber-400 text-amber-200'
                    : 'bg-rose-950/95 border-rose-400 text-rose-100'
                }`}
              >
                FIRED: {lastFiredShot.label}{' '}
                {lastFiredShot.damage > 0
                  ? `— ${lastFiredShot.damage} DMG!`
                  : '— BLANK (SAFE)'}
                {lastFiredShot.note ? ` · ${lastFiredShot.note}` : ''}
              </div>
            )}

          {lastTurnSummary && phase === 'PLAYER_SELECT' && (
            <div className="px-3.5 py-0.5 rounded-full bg-[#2f180b]/90 border-2 border-[#a87849] text-[#f5d8a8] font-mono text-[10px] sm:text-[11px] max-w-full truncate shadow">
              {lastTurnSummary}
            </div>
          )}

          {peekedSlotInfo && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/90 border-2 border-sky-400 text-sky-100 font-mono text-[11px] font-bold shadow-md">
              <Search className="w-3 h-3 text-sky-300 shrink-0" aria-hidden="true" />
              <span>{peekedSlotInfo}</span>
            </div>
          )}

          {opponentSpeech && phase !== 'PLAYER_SELECT' && (
            <div className="hidden sm:block px-3.5 py-0.5 rounded-full bg-[#2f180b]/90 border border-[#a87849]/70 text-[#f5d8a8] font-mono text-[11px] italic truncate max-w-full shadow">
              {opponentSpeech}
            </div>
          )}
        </div>

        {/* Top-Right: Opponent Name + Settings & Sound + Heart Pill */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-black text-xl sm:text-2xl leading-none tracking-wide uppercase text-[#fff5dc] cartoon-stroke-lg">
              {opponent.name}
            </span>

            <button
              type="button"
              onClick={openRulesModal}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-[#7eb7d3] to-[#4b84a0] hover:from-[#8ec6e0] hover:to-[#5a94b0] border-[3px] border-[#2a1508] text-[#fff8eb] flex items-center justify-center cursor-pointer shadow-[0_3px_0_#210f05,0_6px_12px_rgba(0,0,0,0.45)]"
              title="Settings & Rules"
              aria-label="Settings and Rules"
            >
              <Settings className="w-5 h-5 drop-shadow" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-[#de8142] to-[#b25621] hover:from-[#ec9052] hover:to-[#c2632b] border-[3px] border-[#2a1508] text-[#fff8eb] flex items-center justify-center cursor-pointer shadow-[0_3px_0_#210f05,0_6px_12px_rgba(0,0,0,0.45)]"
              aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {muted ? (
                <VolumeX className="w-5 h-5 text-rose-200 drop-shadow" />
              ) : (
                <Volume2 className="w-5 h-5 drop-shadow" />
              )}
            </button>
          </div>

          {/* Warm Wooden Pill Containing Opponent Hearts */}
          <div
            className="flex items-center gap-1 rounded-2xl bg-gradient-to-b from-[#e4b384] to-[#c68b59] border-[3px] border-[#3b1c0a] px-2.5 py-1.5 shadow-[0_4px_0_#261106,0_8px_16px_rgba(0,0,0,0.5)]"
            aria-label={`${opponent.name} HP: ${opponentHp} of ${opponentMaxHp}`}
          >
            {Array.from({ length: opponentMaxHp }).map((_, i) => (
              <CartoonHeart key={i} filled={i < opponentHp} />
            ))}
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* BOTTOM BAR: Centered Card Preview + Lock-In / Continue Action        */}
      {/* ==================================================================== */}
      <footer className="flex items-end justify-center">
        <div className="pointer-events-none flex flex-col items-center gap-1.5">
          {activeCardPreview && phase === 'PLAYER_SELECT' && (
            <div className="px-4 py-1.5 rounded-xl bg-[#2f180b]/95 border-2 border-[#d7a66d] text-xs text-[#fff5dc] shadow-[0_4px_12px_rgba(0,0,0,0.6)] max-w-md text-center">
              <span className="font-black text-amber-300">
                {activeCardPreview.def.name} ({RARITY_META[activeCardPreview.def.rarity].label}):
              </span>{' '}
              <span>{activeCardPreview.def.description}</span>
              {activeCardPreview.def.effectType === 'blood_pact' && playerHp <= 1 && (
                <span className="ml-1.5 font-black text-rose-400">[NEED 2+ HP]</span>
              )}
            </div>
          )}

          {phase === 'PLAYER_SELECT' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playBrassBell();
                onRingBell();
              }}
              className="pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#f7c85c] to-[#d48b22] hover:from-[#ffd670] hover:to-[#e59b2e] border-[3px] border-[#3b1c0a] text-[#2a1306] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_0_#261106,0_8px_18px_rgba(0,0,0,0.55)] cursor-pointer transition-transform active:scale-95"
            >
              <Bell className="w-4 h-4" />
              <span>
                {selectedCard
                  ? `LOCK IN ${selectedCard.def.name} & FIRE`
                  : 'PASS & PULL TRIGGER'}
              </span>
            </button>
          )}

          {phase === 'TURN_RESULT' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playCardHover();
                onContinueTurn();
              }}
              className="pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 border-[3px] border-[#133521] text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_0_#0b2214,0_8px_18px_rgba(0,0,0,0.55)] cursor-pointer transition-transform active:scale-95"
            >
              <span>CONTINUE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* VICTORY / GAME OVER OVERLAY                                          */}
      {/* ==================================================================== */}
      {(phase === 'GAME_OVER' || phase === 'VICTORY') && (
        <div className="pointer-events-auto fixed inset-0 z-30 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`max-w-lg w-full rounded-2xl p-6 border-[3px] shadow-2xl text-center ${
              phase === 'VICTORY'
                ? 'bg-[#2a180d] border-amber-400'
                : 'bg-[#2a180d] border-rose-500'
            }`}
          >
            <div className="inline-flex p-3 rounded-full bg-stone-900 border border-stone-700 mb-3">
              {phase === 'VICTORY' ? (
                <Sparkles className="w-8 h-8 text-amber-400" />
              ) : (
                <Skull className="w-8 h-8 text-rose-500" />
              )}
            </div>

            <h2 className="font-black text-3xl text-[#fff5dc] cartoon-stroke">
              {phase === 'VICTORY' ? 'TABLE CLEARED!' : 'SMOKED AT THE TABLE'}
            </h2>
            <p className="text-sm text-amber-100/90 mt-2">
              {phase === 'VICTORY'
                ? `You outgunned ${opponent.name} in Round ${roundNumber}!`
                : `You fell against ${opponent.name} in Round ${roundNumber}.`}
            </p>

            <div className="grid grid-cols-2 gap-3 my-5 text-left font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-amber-900/60">
                <div className="text-amber-200/70 text-[10px]">TURNS PLAYED</div>
                <div className="text-base font-extrabold text-amber-300 mt-0.5">
                  {stats.turnsPlayed}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-amber-900/60">
                <div className="text-amber-200/70 text-[10px]">SELF-SHOTS SURVIVED</div>
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
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  <span>NEXT CHALLENGER</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onRestartRun}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>NEW MATCH</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SETTINGS & RULES MODAL                                               */}
      {/* ==================================================================== */}
      <dialog
        ref={rulesDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="rules-dialog-title"
        className="pointer-events-auto m-auto max-w-2xl w-[92vw] rounded-2xl bg-[#26160c] text-amber-50 border-[3px] border-[#b88655] p-6 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
          <h2
            id="rules-dialog-title"
            className="font-black text-xl text-[#fff5dc] cartoon-stroke"
          >
            SETTINGS & TABLETOP RULES
          </h2>
          <form method="dialog">
            <button
              type="submit"
              autoFocus
              className="px-3.5 py-1.5 rounded-xl bg-[#472a17] hover:bg-[#5c371e] border border-[#a47449] text-amber-100 font-mono text-xs font-bold cursor-pointer"
            >
              CLOSE [ESC]
            </button>
          </form>
        </div>

        {/* Settings Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
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
            className="p-2.5 rounded-xl bg-[#382011] border border-[#8c5d38] text-xs font-bold text-amber-100 cursor-pointer"
          >
            CAMERA: {focusMode.toUpperCase()}
          </button>

          <button
            type="button"
            onClick={onToggleChamberCounts}
            className="p-2.5 rounded-xl bg-[#382011] border border-[#8c5d38] text-xs font-bold text-amber-100 cursor-pointer"
          >
            COUNTS: {showChamberCounts ? 'SHOWN' : 'HIDDEN'}
          </button>

          <button
            type="button"
            onClick={onToggleBlenderAssets}
            className="p-2.5 rounded-xl bg-[#382011] border border-[#8c5d38] text-xs font-bold text-amber-100 cursor-pointer"
          >
            MODELS: {useBlenderAssets ? 'BLENDER GLB' : 'PROCEDURAL'}
          </button>

          <button
            type="button"
            onClick={onRestartRun}
            className="p-2.5 rounded-xl bg-rose-950/90 border border-rose-500 text-xs font-bold text-rose-100 cursor-pointer"
          >
            RESET MATCH
          </button>
        </div>

        {/* Opponent Ladder Selector */}
        <div className="mb-4">
          <div className="text-xs font-bold text-amber-200 uppercase mb-1.5">
            TAVERN CHALLENGERS (STAGE {stageIndex + 1} OF {LADDER_OPPONENTS.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LADDER_OPPONENTS.map((opp, idx) => (
              <span
                key={opp.id}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                  idx === stageIndex
                    ? 'bg-amber-400 text-stone-950'
                    : 'bg-[#1a0f08] text-amber-200/60 border border-amber-900/40'
                }`}
              >
                {opp.stage}. {opp.name} ({opp.maxHp} HP)
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 text-sm text-amber-100/90 leading-relaxed max-h-[42vh] overflow-y-auto pr-1">
          <p>
            <strong className="text-amber-300">1. Bet on the 50/50 Spin:</strong>{' '}
            Both you and your opponent simultaneously play a card (or pass) before the
            gun picks a target. Load live shells if you bet it lands on them, or strip/spin
            if you think it lands on you!
          </p>
          <p>
            <strong className="text-amber-300">2. Cards Lift &amp; Revolver Spins 50/50:</strong>{' '}
            Both cards lift in the center to reveal their cylinder effects, then the
            revolver spins on the table to randomly pick <strong className="text-emerald-300">OPPONENT</strong> or{' '}
            <strong className="text-rose-400">YOU</strong> (unless redirected by{' '}
            <code className="text-lime-300">DEFLECT</code>).
          </p>
          <p>
            <strong className="text-amber-300">3. Drum Aligns, Fires &amp; Continue:</strong>{' '}
            The revolver lifts to aim, slowly rotates the next chamber into the barrel,
            and fires. Review the result, then click <strong>CONTINUE</strong> (or press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-amber-700 text-xs">
              Space
            </kbd>
            ) to start the next turn.
          </p>
        </div>
      </dialog>
    </div>
  );
};
