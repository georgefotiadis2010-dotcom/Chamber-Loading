import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Layers,
  HelpCircle,
  Bell,
  Sparkles,
  RotateCcw,
  Eye,
  Skull,
  Shield,
  Search,
  User,
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

interface GlossyHeartProps {
  filled: boolean;
  label?: string;
}

const GlossyHeart: React.FC<GlossyHeartProps> = ({ filled, label }) => (
  <div
    className={`relative w-8 h-8 flex items-center justify-center transition-transform ${
      filled ? 'scale-100' : 'scale-90 opacity-35 grayscale'
    }`}
  >
    <svg viewBox="0 0 36 36" className="w-8 h-8 drop-shadow-[0_3px_4px_rgba(0,0,0,0.65)]">
      <path
        d="M18 32.5 C18 32.5 3.5 23 3.5 12 C3.5 6.8 7.6 3 12.4 3 C15.3 3 17.2 4.5 18 6.4 C18.8 4.5 20.7 3 23.6 3 C28.4 3 32.5 6.8 32.5 12 C32.5 23 18 32.5 18 32.5 Z"
        fill={filled ? '#ef4444' : '#3f2e26'}
        stroke="#27130b"
        strokeWidth="2.5"
      />
      {filled && (
        <ellipse
          cx="11.5"
          cy="9.5"
          rx="3.2"
          ry="2"
          transform="rotate(-25 11.5 9.5)"
          fill="#fca5a5"
          opacity="0.75"
        />
      )}
    </svg>
    {label && filled && (
      <span className="absolute inset-0 flex items-center justify-center font-black text-[12px] text-white cartoon-stroke">
        {label}
      </span>
    )}
  </div>
);

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
  discardCount,
  selectedLoadCards,
  selectedTrapCard,
  playerAim,
  hoveredCard,
  muted,
  focusMode,
  useBlenderAssets,
  stats,
  onSelectPlayerAim,
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
  const [minimalHud, setMinimalHud] = useState(false);

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

  const canRing =
    (phase === 'PRE_ROUND_LOAD' && selectedLoadCards.length >= 1) ||
    phase === 'PLAYER_SELECT';

  const hasSelectedCard =
    selectedTrapCard !== null || selectedLoadCards.length > 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* ==================================================================== */}
      {/* TOP BAR: Player Plaque (Left), Wooden Round Signboard (Center),      */}
      {/* Opponent Plaque (Right) — Matching image_1.png & image_2.png         */}
      {/* ==================================================================== */}
      <header className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left: Player Avatar + Hearts + Settings Button */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#6b4226] to-[#472a17] border-[3px] border-[#a47449] px-3 py-2 shadow-[0_6px_16px_rgba(0,0,0,0.7)]">
            {/* Stylized Outlaw Player Portrait Badge */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#497aa1] to-[#264661] border-2 border-[#7ec3f7] flex items-center justify-center shadow-inner shrink-0">
              <User className="w-6 h-6 text-[#d6ecff] drop-shadow" aria-hidden="true" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-black text-sm sm:text-base tracking-wide uppercase text-[#fff5df] cartoon-stroke">
                  PLAYER
                </span>
                <span className="text-[11px] font-extrabold text-[#e8cba5] uppercase">
                  YOU
                </span>
              </div>

              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: playerMaxHp }).map((_, i) => (
                  <GlossyHeart
                    key={i}
                    filled={i < playerHp}
                    label={i === 0 ? String(playerHp) : undefined}
                  />
                ))}
                <span className="ml-1.5 font-extrabold text-xs text-[#fff5df] cartoon-stroke">
                  {playerHp}/{playerMaxHp} HP
                </span>
              </div>
            </div>
          </div>

          {/* Chunky Steel-Blue Settings / Rules Gear Button (from image_1.png) */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={openRulesModal}
              className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#6ba3be] to-[#3f6f87] border-2 border-[#a8d8ee] flex items-center justify-center text-[#fff8eb] shadow-[0_4px_0_#244252] cursor-pointer"
              title="Settings & Rules"
              aria-label="Settings and Rules"
            >
              <Settings className="w-6 h-6 drop-shadow" />
            </button>
            <span className="text-[10px] font-black tracking-wider uppercase text-[#fff3d6] cartoon-stroke">
              SETTINGS
            </span>
          </div>
        </div>

        {/* Top-Center: Hanging Carved Wooden Signboard (from image_1.png & image_2.png) */}
        {!minimalHud && (
          <div className="pointer-events-auto relative flex flex-col items-center -mt-2">
            {/* Dark Iron Hanging Straps */}
            <div className="flex justify-between w-40 sm:w-48 px-5 -mb-1 z-10">
              <div className="w-2 h-4 rounded-full bg-stone-800 border border-stone-600 shadow" />
              <div className="w-2 h-4 rounded-full bg-stone-800 border border-stone-600 shadow" />
            </div>

            {/* Wooden Signboard Body */}
            <div className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-[#9c663c] via-[#84522d] to-[#683e1f] border-[3px] border-[#bd8858] px-3.5 py-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.75)]">
              <div className="font-black text-sm sm:text-base tracking-wider uppercase text-[#fff5dc] cartoon-stroke leading-none">
                ROUND {roundNumber}
              </div>

              {/* Cylinder Drum Icon + 6 Carved Chamber Slots */}
              <div className="flex items-center gap-1.5 my-1 px-2 py-1 rounded-xl bg-[#4f2d16]/85 border border-[#a87548]/60 shadow-inner">
                {/* 6-Chamber Revolver Cylinder Icon */}
                <button
                  type="button"
                  onClick={onToggleChamberCounts}
                  title="Click to toggle chamber count visibility"
                  className="relative w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 border-2 border-slate-800 flex items-center justify-center shadow-md cursor-pointer"
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const a = (i * Math.PI) / 3 - Math.PI / 2;
                    const x = Math.cos(a) * 8.5;
                    const y = Math.sin(a) * 8.5;
                    const slot = cylinderSlots[i];
                    const isCurrent = i === currentChamberIdx;
                    let holeCls = 'bg-slate-800';
                    if (slot && !slot.spent && showChamberCounts) {
                      if (slot.card?.def.color === 'red') holeCls = 'bg-amber-400';
                    }
                    return (
                      <span
                        key={i}
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                        className={`absolute w-2 h-2 rounded-full ${holeCls} ${
                          isCurrent ? 'ring-1 ring-amber-300' : ''
                        }`}
                      />
                    );
                  })}
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                </button>

                {/* Carved Wooden Chamber Wells */}
                <div className="flex items-center gap-1">
                  {cylinderSlots.map((slot, idx) => {
                    const isCurrent = idx === currentChamberIdx;
                    const isLive = slot.card?.def.color === 'red';
                    const isPad =
                      slot.card?.def.color === 'blue' ||
                      slot.card?.def.color === 'purple';

                    return (
                      <div
                        key={idx}
                        title={`Chamber #${idx + 1}: ${
                          slot.spent
                            ? 'SPENT'
                            : slot.revealed
                            ? slot.card?.def.name ?? 'EMPTY / BLANK'
                            : 'READY'
                        }`}
                        className={`w-5 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          slot.spent
                            ? 'bg-[#2a170b]/50 border-[#422614] opacity-40'
                            : isCurrent
                            ? 'bg-[#381e0e] border-amber-300 ring-1 ring-amber-400/50 scale-105'
                            : 'bg-[#381e0e] border-[#693f22]'
                        }`}
                      >
                        {!slot.spent && showChamberCounts && isLive && (
                          <span className="w-2.5 h-4 rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 border border-amber-900 shadow-sm" />
                        )}
                        {!slot.spent && showChamberCounts && !isLive && isPad && (
                          <span className="w-2.5 h-4 rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500 border border-slate-800 shadow-sm" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Pill: "1 LIVE / 5 BLANKS" */}
              <div className="px-2.5 py-0.5 rounded-md bg-[#59341a] border border-[#9e6b40] font-black text-[10px] tracking-wider uppercase text-[#fff5dc] cartoon-stroke leading-none">
                {showChamberCounts
                  ? `${liveCount} LIVE / ${blankCount} ${
                      blankCount === 1 ? 'BLANK' : 'BLANKS'
                    }`
                  : `${counts.remaining} CHAMBERS READY`}
              </div>
            </div>
          </div>
        )}

        {/* Top-Right: Opponent Plaque + Quick Audio/View Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#6b4226] to-[#472a17] border-[3px] border-[#a47449] px-3 py-2 shadow-[0_6px_16px_rgba(0,0,0,0.7)]">
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-extrabold text-[#e8cba5] uppercase">
                  OPPONENT
                </span>
                <span className="font-black text-sm sm:text-base tracking-wide uppercase text-[#fff5df] cartoon-stroke">
                  {opponent.name}
                </span>
              </div>

              <div className="flex items-center gap-1 mt-0.5">
                <span className="mr-1.5 font-extrabold text-xs text-[#fff5df] cartoon-stroke">
                  {opponentHp}/{opponentMaxHp} HP
                </span>
                {Array.from({ length: opponentMaxHp }).map((_, i) => (
                  <GlossyHeart
                    key={i}
                    filled={i < opponentHp}
                    label={i === 0 ? String(opponentHp) : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Stylized Outlaw Opponent Portrait Badge */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#9c3a2d] to-[#5e1f18] border-2 border-[#f28b7d] flex items-center justify-center shadow-inner shrink-0">
              <Skull className="w-6 h-6 text-[#ffd6d1] drop-shadow" aria-hidden="true" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-[#472a17]/95 hover:bg-[#5c371e] border-2 border-[#a47449] text-[#fff5df] cursor-pointer shadow"
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
              onClick={() => setMinimalHud((v) => !v)}
              className="p-2 rounded-xl bg-[#472a17]/95 hover:bg-[#5c371e] border-2 border-[#a47449] text-[#fff5df] cursor-pointer shadow"
              title="Toggle Minimal Tabletop View (image_0.png style)"
              aria-label="Toggle Minimal HUD"
            >
              <Eye className="w-4 h-4 text-sky-300" />
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* CENTER FLOATING PROMPT & SPEECH BUBBLE                               */}
      {/* ==================================================================== */}
      {!minimalHud && !hoveredCard && (
        <div className="pointer-events-none flex flex-col items-center justify-center my-auto gap-1 translate-y-6">
          {phase === 'PLAYER_SELECT' ? (
            <>
              <div className="font-black text-2xl sm:text-4xl tracking-wider uppercase text-[#fff3c4] cartoon-stroke-lg text-center leading-none">
                {hasSelectedCard ? 'CARD LOCKED IN!' : 'YOUR TURN'}
              </div>
              <div className="font-black text-xs sm:text-base tracking-wider uppercase text-[#fff5dc] cartoon-stroke text-center">
                {hasSelectedCard
                  ? `TARGET: AIM ${playerAim.toUpperCase()} — RING BELL TO FIRE!`
                  : 'CHOOSE CARD & TARGET'}
              </div>
            </>
          ) : (
            <div className="px-5 py-2 rounded-2xl bg-[#2a180d]/90 border-2 border-[#c8965b] backdrop-blur-xs shadow-2xl text-center max-w-lg">
              <div className="font-black text-sm sm:text-base tracking-wider text-[#fff3c4] uppercase cartoon-stroke">
                {statusBanner}
              </div>
              {subBanner && (
                <div className="font-bold text-xs text-[#e8cba5] mt-0.5">
                  {subBanner}
                </div>
              )}
            </div>
          )}

          {peekedSlotInfo && (
            <div className="flex items-center gap-1.5 px-4 py-1 rounded-xl bg-sky-950/95 border-2 border-sky-400 text-sky-100 font-mono text-xs font-extrabold shadow-lg">
              <Search className="w-3.5 h-3.5 text-sky-300 shrink-0" aria-hidden="true" />
              <span>{peekedSlotInfo}</span>
            </div>
          )}

          {opponentSpeech && phase !== 'PLAYER_SELECT' && (
            <div className="max-w-md px-3.5 py-1 rounded-full bg-stone-950/90 border border-amber-500/40 text-amber-100 font-mono text-xs italic shadow-lg text-center">
              {opponentSpeech}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* HOVERED CARD TOOLTIP PREVIEW (Top-center so 3D card stays clear)     */}
      {/* ==================================================================== */}
      {hoveredCard && phase !== 'GAME_OVER' && phase !== 'VICTORY' && (
        <div className="pointer-events-none flex justify-center mt-2 mb-auto">
          <div
            style={{ borderColor: hoveredCard.def.borderColor }}
            className="w-full max-w-sm rounded-2xl bg-[#24150c]/95 border-2 px-4 py-2.5 backdrop-blur-md shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-amber-900/50">
              <span className="font-black text-sm text-[#fff5dc] tracking-wide uppercase">
                {hoveredCard.def.name}
              </span>
              <span
                className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-black/50"
                style={{ color: hoveredCard.def.accentColor }}
              >
                {hoveredCard.def.badgeText}
              </span>
            </div>
            <div className="mt-1.5 space-y-0.5 text-xs">
              <p className="text-amber-50">
                <span className="font-bold text-amber-300">LOCK IN EFFECT: </span>
                {hoveredCard.def.chamberEffectText}
              </p>
              <p className="text-stone-300">
                <span className="font-bold text-sky-300">SLOT COUNTER: </span>
                {hoveredCard.def.tableTrapText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* BOTTOM CORNERS: Left "DRAFT CARDS" Button & Right "DECK / DISCARD"   */}
      {/* Matching image_1.png & image_2.png while leaving center cards clear! */}
      {/* ==================================================================== */}
      <footer className="flex items-end justify-between gap-2">
        {/* Bottom-Left: Chunky Beveled Steel-Blue "DRAFT CARDS" Button (from image_1.png) */}
        <div className="pointer-events-auto flex items-end gap-2">
          <button
            type="button"
            onClick={openDraftModal}
            className="px-5 py-3 rounded-2xl bg-gradient-to-b from-[#74a9c4] via-[#5689a4] to-[#3f6b82] border-[3px] border-[#b4e0f5] shadow-[0_6px_0_#213c4a,0_10px_20px_rgba(0,0,0,0.75)] cursor-pointer flex flex-col items-center justify-center leading-none"
          >
            <span className="font-black text-base sm:text-lg tracking-wider uppercase text-[#fff6dc] cartoon-stroke">
              DRAFT
            </span>
            <span className="font-black text-base sm:text-lg tracking-wider uppercase text-[#fff6dc] cartoon-stroke mt-0.5">
              CARDS
            </span>
          </button>

          {/* Compact Quick-Action Bar for Keyboard / Accessibility */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#2b180e]/90 border-2 border-[#8c5d38] rounded-xl px-2.5 py-2 shadow-xl">
            <button
              type="button"
              onClick={() => {
                soundEngine.playAimTokenFlip();
                onSelectPlayerAim(playerAim === 'opponent' ? 'self' : 'opponent');
              }}
              className={`px-2.5 py-1.5 rounded-lg font-extrabold text-xs uppercase border transition-colors cursor-pointer ${
                playerAim === 'opponent'
                  ? 'bg-red-900/90 border-red-400 text-red-100'
                  : 'bg-sky-900/90 border-sky-400 text-sky-100'
              }`}
              title="Click or press [Space] to switch Aim Chip"
            >
              <span className="inline-flex items-center gap-1.5">
                {playerAim === 'opponent' ? (
                  <Skull className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>AIM: {playerAim === 'opponent' ? 'OPPONENT' : 'SELF'}</span>
              </span>
            </button>

            <button
              type="button"
              disabled={!canRing}
              onClick={() => {
                soundEngine.playBrassBell();
                onRingBell();
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-xs uppercase border transition-colors ${
                canRing
                  ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 border-amber-100 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>LOCK IN [ENTER]</span>
            </button>
          </div>
        </div>

        {/* Bottom-Right: Visual DECK (10) & DISCARD (0) Card Stacks (from image_1.png & image_2.png) */}
        <div className="pointer-events-auto flex items-end gap-3">
          {/* DECK Stack */}
          <button
            type="button"
            onClick={openDraftModal}
            className="group flex flex-col items-center gap-1 cursor-pointer"
            title="Inspect Deck & Draft Cards"
          >
            <div className="w-14 h-20 rounded-xl bg-gradient-to-b from-[#6e472b] to-[#422815] border-[3px] border-[#e2c69d] shadow-[0_4px_0_#26150a,0_8px_16px_rgba(0,0,0,0.75)] flex items-center justify-center group-hover:-translate-y-1 transition-transform">
              <div className="w-10 h-14 rounded-lg border border-[#c8a87e]/60 flex items-center justify-center">
                <Layers className="w-6 h-6 text-[#f5dec0]" />
              </div>
            </div>
            <span className="font-black text-[11px] tracking-wider uppercase text-[#fff4d6] cartoon-stroke">
              DECK ({sharedDeckCount})
            </span>
          </button>

          {/* DISCARD Stack */}
          <button
            type="button"
            onClick={openDraftModal}
            className="group flex flex-col items-center gap-1 cursor-pointer"
            title="Inspect Discard Pile"
          >
            <div className="w-14 h-20 rounded-xl bg-gradient-to-b from-[#57534e] to-[#292524] border-[3px] border-[#a8a29e] shadow-[0_4px_0_#1c1917,0_8px_16px_rgba(0,0,0,0.75)] flex items-center justify-center group-hover:-translate-y-1 transition-transform">
              <div className="w-10 h-14 rounded-lg border border-stone-500/50 flex items-center justify-center">
                <Skull className="w-6 h-6 text-stone-300" />
              </div>
            </div>
            <span className="font-black text-[11px] tracking-wider uppercase text-[#fff4d6] cartoon-stroke">
              DISCARD ({discardCount})
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
