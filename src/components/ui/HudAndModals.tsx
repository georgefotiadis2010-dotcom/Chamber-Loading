import React, { useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
  RotateCcw,
  Skull,
  Search,
  ArrowRight,
  Settings,
  Plus,
  Crosshair,
  Bell,
} from 'lucide-react';
import {
  ActorSide,
  CardId,
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
  turnTarget: ActorSide;
  phase: TurnPhase;
  statusBanner: string;
  subBanner: string;
  opponentSpeech: string;
  lastTurnSummary: string | null;
  peekedSlotInfo: string | null;
  playerHp: number;
  playerMaxHp: number;
  opponentHp: number;
  opponentMaxHp: number;
  cylinderSlots: ChamberSlot[];
  currentChamberIdx: number;
  showChamberCounts: boolean;
  sharedDeckCount: number;
  discardCount: number;
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
  onDraftCard: (cardId: CardId) => void;
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
  turnTarget,
  phase,
  statusBanner,
  subBanner,
  opponentSpeech,
  lastTurnSummary,
  peekedSlotInfo,
  playerHp,
  playerMaxHp,
  opponentHp,
  opponentMaxHp,
  cylinderSlots,
  currentChamberIdx,
  showChamberCounts,
  sharedDeckCount,
  discardCount,
  selectedCard,
  hoveredCard,
  muted,
  focusMode,
  useBlenderAssets,
  stats,
  onRingBell,
  onDraftCard,
  onToggleChamberCounts,
  onAdvanceNextStage,
  onRestartRun,
  onToggleMute,
  onChangeFocusMode,
  onToggleBlenderAssets,
}) => {
  const draftDialogRef = useRef<HTMLDialogElement | null>(null);
  const rulesDialogRef = useRef<HTMLDialogElement | null>(null);

  useDialogLightDismissFallback(draftDialogRef);
  useDialogLightDismissFallback(rulesDialogRef);

  const openDraftModal = () => {
    soundEngine.playCardHover();
    draftDialogRef.current?.showModal();
  };

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
      <header className="flex items-start justify-between gap-2">
        {/* Top-Left: Player HP, Round/Turn & 6-Chamber Strip */}
        <div className="pointer-events-auto flex flex-col gap-1 rounded-xl bg-stone-950/80 border border-amber-900/50 backdrop-blur-xs px-3 py-1.5 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-wider uppercase text-amber-200/80">
                YOU
              </span>
              <span className="font-black text-sm text-rose-400">
                {playerHp}/{playerMaxHp} HP
              </span>
            </div>

            <span className="text-amber-900/70">|</span>

            <button
              type="button"
              onClick={onToggleChamberCounts}
              title="Toggle Live/Blank shell count visibility"
              className="font-mono text-xs font-bold text-amber-100/90 hover:text-amber-300 cursor-pointer"
            >
              R{roundNumber}·T{turnNumber} ·{' '}
              {showChamberCounts
                ? `${liveCount} LIVE / ${blankCount} BLANK`
                : `${counts.remaining} LEFT`}
            </button>
          </div>

          {/* 6-Chamber Cylinder Progress Indicator */}
          <div className="flex items-center gap-1" title="6-Chamber Cylinder Progress">
            <span className="font-mono text-[10px] text-amber-200/60 mr-1">
              CHAMBERS:
            </span>
            {cylinderSlots.map((slot, idx) => {
              const isCurrent = idx === currentChamberIdx && !slot.spent;
              return (
                <span
                  key={slot.index}
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono text-[9px] font-black border ${
                    slot.spent
                      ? 'bg-stone-900/80 border-stone-700 text-stone-600'
                      : isCurrent
                      ? 'bg-amber-400 border-amber-200 text-stone-950 scale-110 shadow-sm'
                      : 'bg-stone-800/90 border-amber-700/60 text-amber-200/80'
                  }`}
                >
                  {slot.spent ? '×' : idx + 1}
                </span>
              );
            })}
          </div>
        </div>

        {/* Top-Center: Clear Turn Flow & Target Banner (Always Visible) */}
        <div className="pointer-events-none flex flex-col items-center gap-1 max-w-lg text-center">
          <div
            className={`px-4 py-1.5 rounded-2xl bg-stone-950/85 border-2 backdrop-blur-xs shadow-xl ${
              phase === 'PLAYER_SELECT'
                ? isAimedAtOpponent
                  ? 'border-emerald-400/70'
                  : 'border-rose-500/80'
                : 'border-amber-400/70'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-black tracking-wide text-amber-50 uppercase">
              {phase === 'PLAYER_SELECT' && (
                <Crosshair
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isAimedAtOpponent ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                />
              )}
              <span>{statusBanner}</span>
            </div>
            {subBanner && (
              <div className="text-[11px] font-medium text-amber-200/85 mt-0.5 leading-snug">
                {subBanner}
              </div>
            )}
          </div>

          {lastTurnSummary && phase === 'PLAYER_SELECT' && (
            <div className="px-3 py-0.5 rounded-full bg-stone-950/75 border border-amber-900/50 text-amber-200/80 font-mono text-[10px] sm:text-[11px] max-w-full truncate shadow">
              {lastTurnSummary}
            </div>
          )}

          {peekedSlotInfo && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/90 border border-sky-400/70 text-sky-100 font-mono text-[11px] font-bold shadow-md">
              <Search className="w-3 h-3 text-sky-300 shrink-0" aria-hidden="true" />
              <span>{peekedSlotInfo}</span>
            </div>
          )}

          {opponentSpeech && phase !== 'PLAYER_SELECT' && (
            <div className="hidden sm:block px-3 py-0.5 rounded-full bg-stone-950/75 text-amber-200/85 font-mono text-[11px] italic truncate max-w-full">
              {opponentSpeech}
            </div>
          )}
        </div>

        {/* Top-Right: Opponent HP & Compact Audio/Settings Icons */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-xl bg-stone-950/80 border border-amber-900/50 backdrop-blur-xs px-3 py-1.5 shadow-lg">
            <span className="font-bold text-xs tracking-wider uppercase text-amber-200/80">
              {opponent.name}
            </span>
            <span className="font-black text-sm text-rose-400">
              {opponentHp}/{opponentMaxHp} HP
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-stone-950/80 hover:bg-stone-900 border border-amber-900/50 text-amber-100 cursor-pointer shadow-lg"
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-300" />
            )}
          </button>

          <button
            type="button"
            onClick={openRulesModal}
            className="p-2 rounded-xl bg-stone-950/80 hover:bg-stone-900 border border-amber-900/50 text-amber-100 cursor-pointer shadow-lg"
            title="Settings & Rules"
            aria-label="Settings and Rules"
          >
            <Settings className="w-4 h-4 text-amber-200" />
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* BOTTOM BAR: Draft, Card Preview + Lock In Action, Deck/Discard       */}
      {/* ==================================================================== */}
      <footer className="flex items-end justify-between gap-2">
        <button
          type="button"
          onClick={openDraftModal}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-950/80 hover:bg-stone-900 border border-amber-900/50 backdrop-blur-xs text-xs font-bold tracking-wider uppercase text-amber-100 shadow-lg cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-sky-300" />
          <span>DRAFT</span>
        </button>

        {/* Center Card Preview & Clear Lock-In Button */}
        <div className="pointer-events-none flex flex-col items-center gap-1.5">
          {activeCardPreview && phase === 'PLAYER_SELECT' && (
            <div className="px-3.5 py-1 rounded-xl bg-stone-950/90 border border-amber-500/60 backdrop-blur-xs text-xs text-amber-100 shadow-lg max-w-md text-center">
              <span className="font-black text-amber-300">
                {activeCardPreview.def.name}:
              </span>{' '}
              <span>{activeCardPreview.def.description}</span>
            </div>
          )}

          {phase === 'PLAYER_SELECT' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playBrassBell();
                onRingBell();
              }}
              className="pointer-events-auto flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 border-2 border-amber-200 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl cursor-pointer transition-transform active:scale-95"
            >
              <Bell className="w-4 h-4" />
              <span>
                {selectedCard
                  ? `LOCK IN ${selectedCard.def.name} & FIRE`
                  : 'PASS & PULL TRIGGER'}
              </span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={openDraftModal}
          title="Inspect Deck & Discard"
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-950/80 hover:bg-stone-900 border border-amber-900/50 backdrop-blur-xs font-mono text-[11px] font-bold text-amber-100/90 shadow-lg cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-amber-300" />
          <span>DECK {sharedDeckCount}</span>
          <span className="text-amber-900/70">·</span>
          <span className="text-stone-400">DISCARD {discardCount}</span>
        </button>
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
      {/* DRAFT CARDS & DECK INSPECTOR MODAL                                   */}
      {/* ==================================================================== */}
      <dialog
        ref={draftDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="draft-dialog-title"
        className="pointer-events-auto m-auto max-w-2xl w-[92vw] rounded-2xl bg-[#26160c] text-amber-50 border-[3px] border-[#b88655] p-6 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
          <div>
            <h2
              id="draft-dialog-title"
              className="font-black text-xl text-[#fff5dc] cartoon-stroke"
            >
              DRAFT CARDS & DECK ARSENAL
            </h2>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Click any card below to draft a copy into your hand (up to 5 cards in hand).
            </p>
          </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {ALL_CARD_IDS.map((id) => {
            const c = CARD_DEFINITIONS[id];
            return (
              <div
                key={id}
                style={{ borderColor: c.borderColor }}
                className="p-3.5 rounded-xl bg-[#1a0f08]/90 border-2 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-[#fff5dc]">
                      {c.name}
                    </span>
                    <span
                      className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-black/50"
                      style={{ color: c.accentColor }}
                    >
                      {c.badgeText}
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/90 mt-1.5">
                    <strong className="text-amber-300">Chamber Effect:</strong>{' '}
                    {c.chamberEffectText}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playCardSlide();
                    onDraftCard(id);
                    draftDialogRef.current?.close();
                  }}
                  className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-b from-[#6ba3be] to-[#3f6f87] border border-[#a8d8ee] text-[#fff8eb] font-black text-xs uppercase cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>DRAFT {c.name} TO HAND</span>
                </button>
              </div>
            );
          })}
        </div>
      </dialog>

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
            <strong className="text-amber-300">1. Check Who Is in the Crosshairs:</strong>{' '}
            The revolver alternates aim each turn —{' '}
            <strong className="text-emerald-300">YOUR SHOT (at Opponent)</strong> then{' '}
            <strong className="text-rose-400">ENEMY SHOT (at You)</strong>.
          </p>
          <p>
            <strong className="text-amber-300">2. Play a Card (Optional):</strong>{' '}
            Click a card in your hand to lock it in (or pass to save cards):{' '}
            <code className="text-rose-300">LOAD LIVE</code> adds a Live shell,{' '}
            <code className="text-sky-300">STRIP SHELL</code> removes a Live shell, and{' '}
            <code className="text-purple-300">SPIN DRUM</code> shuffles remaining chambers.
          </p>
          <p>
            <strong className="text-amber-300">3. Ring the Bell & Fire:</strong>{' '}
            Click the Brass Bell, press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-amber-700 text-xs">
              Enter
            </kbd>
            , or click <strong>LOCK IN &amp; FIRE</strong>. Both players reveal their cards,
            apply their effects to the 6-chamber cylinder, and fire the current chamber!
          </p>
        </div>
      </dialog>
    </div>
  );
};
