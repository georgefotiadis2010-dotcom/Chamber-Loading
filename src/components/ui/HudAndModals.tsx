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
} from 'lucide-react';
import {
  ActorSide,
  AimChoice,
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
  discardCount: number;
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
  onSelectPlayerAim: (choice: AimChoice) => void;
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
  phase,
  statusBanner,
  opponentSpeech,
  peekedSlotInfo,
  playerHp,
  playerMaxHp,
  opponentHp,
  opponentMaxHp,
  cylinderSlots,
  showChamberCounts,
  sharedDeckCount,
  discardCount,
  muted,
  focusMode,
  useBlenderAssets,
  stats,
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

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* ==================================================================== */}
      {/* MINIMAL TOP BAR: Compact Corner Pills Only                           */}
      {/* ==================================================================== */}
      <header className="flex items-start justify-between gap-2">
        {/* Top-Left: Player HP & Round/Chamber Pill */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-stone-950/75 border border-amber-900/50 backdrop-blur-xs px-3 py-1.5 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs tracking-wider uppercase text-amber-200/80">
              YOU
            </span>
            <span className="font-black text-sm text-rose-400">
              {playerHp}/{playerMaxHp}
            </span>
          </div>

          <span className="text-amber-900/70">|</span>

          <button
            type="button"
            onClick={onToggleChamberCounts}
            title="Toggle chamber count visibility"
            className="font-mono text-xs font-bold text-amber-100/90 hover:text-amber-300 cursor-pointer"
          >
            R{roundNumber} ·{' '}
            {showChamberCounts
              ? `${liveCount}L / ${blankCount}B`
              : `${counts.remaining} LEFT`}
          </button>
        </div>

        {/* Top-Center: Subtle single-line status / peek / speech pill (never covers cards) */}
        <div className="pointer-events-none hidden sm:flex flex-col items-center gap-1 max-w-md">
          {phase !== 'PLAYER_SELECT' && (
            <div className="px-3.5 py-1 rounded-full bg-stone-950/75 border border-amber-700/40 backdrop-blur-xs text-xs font-bold tracking-wide text-amber-100 uppercase shadow-md truncate max-w-full">
              {statusBanner}
            </div>
          )}
          {peekedSlotInfo && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/85 border border-sky-400/60 text-sky-100 font-mono text-[11px] font-bold shadow-md">
              <Search className="w-3 h-3 text-sky-300 shrink-0" aria-hidden="true" />
              <span>{peekedSlotInfo}</span>
            </div>
          )}
          {opponentSpeech && phase !== 'PLAYER_SELECT' && (
            <div className="px-3 py-0.5 rounded-full bg-stone-950/70 text-amber-200/85 font-mono text-[11px] italic truncate max-w-full">
              {opponentSpeech}
            </div>
          )}
        </div>

        {/* Top-Right: Opponent HP & Compact Audio/Settings Icons */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-xl bg-stone-950/75 border border-amber-900/50 backdrop-blur-xs px-3 py-1.5 shadow-lg">
            <span className="font-bold text-xs tracking-wider uppercase text-amber-200/80">
              {opponent.name}
            </span>
            <span className="font-black text-sm text-rose-400">
              {opponentHp}/{opponentMaxHp}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-stone-950/75 hover:bg-stone-900 border border-amber-900/50 text-amber-100 cursor-pointer shadow-lg"
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
            className="p-2 rounded-xl bg-stone-950/75 hover:bg-stone-900 border border-amber-900/50 text-amber-100 cursor-pointer shadow-lg"
            title="Settings & Rules"
            aria-label="Settings and Rules"
          >
            <Settings className="w-4 h-4 text-amber-200" />
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MINIMAL BOTTOM CORNERS: Draft & Deck/Discard Pills                   */}
      {/* ==================================================================== */}
      <footer className="flex items-end justify-between gap-2">
        <button
          type="button"
          onClick={openDraftModal}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-950/75 hover:bg-stone-900 border border-amber-900/50 backdrop-blur-xs text-xs font-bold tracking-wider uppercase text-amber-100 shadow-lg cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-sky-300" />
          <span>DRAFT</span>
        </button>

        <button
          type="button"
          onClick={openDraftModal}
          title="Inspect Deck & Discard"
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-950/75 hover:bg-stone-900 border border-amber-900/50 backdrop-blur-xs font-mono text-[11px] font-bold text-amber-100/90 shadow-lg cursor-pointer"
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
                    <strong className="text-amber-300">Lock In:</strong>{' '}
                    {c.chamberEffectText}
                  </p>
                  <p className="text-xs text-stone-300 mt-0.5">
                    <strong className="text-sky-300">Slot Counter:</strong>{' '}
                    {c.tableTrapText}
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
            <strong className="text-amber-300">1. Choose a Card from Your Hand:</strong>{' '}
            Hover and click any 3D card in front of you (
            <code className="text-sky-300">LOAD LIVE</code>,{' '}
            <code className="text-amber-300">STRIP SHELL</code>,{' '}
            <code className="text-lime-300">PAD CYLINDER</code>) to slide it onto the{' '}
            <strong className="text-amber-200">LOCK IN SLOT</strong>.
          </p>
          <p>
            <strong className="text-amber-300">2. Flip Your Aim Poker-Chip:</strong>{' '}
            Click the Red <strong className="text-red-400">AIM OPPONENT</strong> skull
            chip or the Blue <strong className="text-sky-300">AIM SELF</strong> shield
            chip beside your revolver. Shooting yourself with a Blank/Empty chamber deals{' '}
            <strong>0 DMG and grants an extra turn!</strong>
          </p>
          <p>
            <strong className="text-amber-300">3. Ring the 3D Brass Bell:</strong>{' '}
            Click the <strong className="text-amber-300">LOCK IN</strong> bell (or press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-amber-700 text-xs">
              Enter
            </kbd>
            ) to slide both players’ cards into the mid-table resolution slots and pull
            the trigger!
          </p>
        </div>
      </dialog>
    </div>
  );
};
