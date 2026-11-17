import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActorSide,
  CardId,
  CardInstance,
  ChamberSlot,
  LastFiredShotInfo,
  TurnPhase,
} from './types/game';
import {
  buildShuffledRoundCylinder,
  countChamberCardTypes,
  createCardInstance,
  createHeroTrioHand,
  decideAiTurnAction,
  isLiveChamberCard,
  LADDER_OPPONENTS,
  SHARED_DECK_IDS,
  shuffleArray,
  slotsToShellTypes,
} from './data/cardsAndOpponents';
import { CameraFocusMode, TabletopScene } from './components/three/TabletopScene';
import { HudAndModals } from './components/ui/HudAndModals';
import { soundEngine } from './audio/soundEngine';

function createShuffledSharedDeck(): CardInstance[] {
  return shuffleArray(SHARED_DECK_IDS).map((id) => createCardInstance(id));
}

function createInitialOpponentHand(): CardInstance[] {
  return [
    createCardInstance('red_crimsonslug'),
    createCardInstance('blue_brace'),
    createCardInstance('blue_dumpshell'),
    createCardInstance('purple_riggedspin'),
  ];
}

export const App: React.FC = () => {
  const [stageIndex, setStageIndex] = useState<number>(0);
  const opponent = LADDER_OPPONENTS[stageIndex];

  // Shared Deck & Discard refs so async turn steps never see stale deck state
  const sharedDeckRef = useRef<CardInstance[]>(createShuffledSharedDeck());
  const discardPileRef = useRef<CardInstance[]>([]);
  const [sharedDeckCount, setSharedDeckCount] = useState<number>(10);
  const [discardCount, setDiscardCount] = useState<number>(0);

  const syncDeckCounts = useCallback(() => {
    setSharedDeckCount(sharedDeckRef.current.length);
    setDiscardCount(discardPileRef.current.length);
  }, []);

  const drawFromSharedDeck = useCallback(
    (count: number): CardInstance[] => {
      const drawn: CardInstance[] = [];
      for (let i = 0; i < count; i++) {
        if (sharedDeckRef.current.length === 0) {
          if (discardPileRef.current.length > 0) {
            sharedDeckRef.current = shuffleArray(discardPileRef.current);
            discardPileRef.current = [];
          } else {
            sharedDeckRef.current = createShuffledSharedDeck();
          }
        }
        const top = sharedDeckRef.current.pop();
        if (top) drawn.push(top);
      }
      syncDeckCounts();
      return drawn;
    },
    [syncDeckCounts]
  );

  // Match State (1v1, 3 lives for player, opponent maxHp from ladder)
  const playerMaxHp = 3;
  const opponentMaxHp = opponent.maxHp;
  const [playerHp, setPlayerHp] = useState<number>(playerMaxHp);
  const [opponentHp, setOpponentHp] = useState<number>(opponent.maxHp);

  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [phase, setPhase] = useState<TurnPhase>('PLAYER_SELECT');

  const [statusBanner, setStatusBanner] = useState<string>(
    '50/50 BET — CHOOSE YOUR CARD'
  );
  const [subBanner, setSubBanner] = useState<string>(
    'Pick a card (or pass) & ring the Bell. Gun picks 50/50 after cards reveal!'
  );
  const [opponentSpeech, setOpponentSpeech] = useState<string>(
    LADDER_OPPONENTS[0].tauntIntro
  );
  const [lastTurnSummary, setLastTurnSummary] = useState<string | null>(null);
  const [lastFiredShot, setLastFiredShot] = useState<LastFiredShotInfo | null>(null);
  const playerBonusDrawRef = useRef<number>(0);
  const opponentBonusDrawRef = useRef<number>(0);

  const pendingContinueRef = useRef<{
    pCard: CardInstance | null;
    oCard: CardInstance | null;
    workingPHand: CardInstance[];
    workingOHand: CardInstance[];
    workingPHp: number;
    workingOHp: number;
    currentRound: number;
    liveCount: number;
    blankCount: number;
    drumReset: boolean;
  } | null>(null);

  // Shared 6-Chamber Cylinder (Starts with 1 Live + 5 Blanks)
  const [cylinderSlots, setCylinderSlots] = useState<ChamberSlot[]>(() =>
    buildShuffledRoundCylinder([createCardInstance('red_crimsonslug')])
  );
  const [currentChamberIdx, setCurrentChamberIdx] = useState<number>(0);
  const [showChamberCounts, setShowChamberCounts] = useState<boolean>(true);
  const [peekedSlotInfo, setPeekedSlotInfo] = useState<string | null>(null);

  // Player foreground hand starts with the 3 iconic starter cards: LOAD LIVE, BRACE, DUMP SHELL
  const [playerHand, setPlayerHand] = useState<CardInstance[]>(() =>
    createHeroTrioHand()
  );
  // Opponent far hand starts with 4 face-up cards across the top of the wood table
  const [opponentHand, setOpponentHand] = useState<CardInstance[]>(() =>
    createInitialOpponentHand()
  );

  const [selectedLoadCards, setSelectedLoadCards] = useState<CardInstance[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);

  // Simultaneously Placed Mid-Table Cards (this turn)
  const [playerPlayedCard, setPlayerPlayedCard] = useState<CardInstance | null>(null);
  const [opponentPlayedCard, setOpponentPlayedCard] = useState<CardInstance | null>(null);

  // Alternating Turn Target ('opponent' on Your Shot, 'player' on Enemy Shot; can be flipped by SWAP AIM)
  const [turnTarget, setTurnTarget] = useState<ActorSide>('opponent');

  // Animation & FX Flags
  const [gunMuzzleFlash, setGunMuzzleFlash] = useState<boolean>(false);
  const [gunDryFire, setGunDryFire] = useState<boolean>(false);
  const [opponentDamagedAnim, setOpponentDamagedAnim] = useState<boolean>(false);
  const [playerDamagedFlash, setPlayerDamagedFlash] = useState<boolean>(false);
  const [shakeIntensity, setShakeIntensity] = useState<number>(0);

  // UI & Camera State
  const [hoveredCard, setHoveredCard] = useState<CardInstance | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [focusMode, setFocusMode] = useState<CameraFocusMode>('table');
  const [useBlenderAssets, setUseBlenderAssets] = useState<boolean>(true);

  const [stats, setStats] = useState({
    turnsPlayed: 0,
    shotsFired: 0,
    selfShotsSurvived: 0,
    damageDealt: 0,
  });

  const timeoutsRef = useRef<number[]>([]);
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };
  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  useEffect(() => {
    if (shakeIntensity <= 0.01) return;
    const interval = window.setInterval(() => {
      setShakeIntensity((prev) => (prev > 0.02 ? prev * 0.78 : 0));
    }, 40);
    return () => window.clearInterval(interval);
  }, [shakeIntensity]);

  // Reload Cylinder & Replenish Hands for Next Round
  const beginNewRound = useCallback(
    (
      nextRound: number,
      currentPHand: CardInstance[],
      currentOHand: CardInstance[]
    ) => {
      const pNeeded = Math.max(0, 3 - currentPHand.length);
      const oNeeded = Math.max(0, 4 - currentOHand.length);
      const nextPHand =
        currentPHand.length === 0 && nextRound === 1
          ? createHeroTrioHand()
          : [...currentPHand, ...drawFromSharedDeck(pNeeded)];
      const nextOHand = [...currentOHand, ...drawFromSharedDeck(oNeeded)];

      const liveSeeds: CardInstance[] = [createCardInstance('red_crimsonslug')];

      const freshSlots = buildShuffledRoundCylinder(liveSeeds);

      setCylinderSlots(freshSlots);
      setCurrentChamberIdx(0);
      setPlayerPlayedCard(null);
      setOpponentPlayedCard(null);
      setSelectedLoadCards([]);
      setSelectedCard(null);
      setPeekedSlotInfo(null);
      setLastFiredShot(null);
      setPlayerHand(nextPHand);
      setOpponentHand(nextOHand);
      setRoundNumber(nextRound);
      setPhase('SPIN_CYLINDERS');
      soundEngine.playCylinderSpin();
      setStatusBanner(`ROUND ${nextRound} — FRESH 6-CHAMBER DRUM`);
      setSubBanner(
        `${liveSeeds.length} Live & ${6 - liveSeeds.length} Blank shells loaded. Spins randomly every turn!`
      );

      schedule(() => {
        setPhase('PLAYER_SELECT');
        setStatusBanner('50/50 BET — CHOOSE YOUR CARD');
        setSubBanner(
          'Pick a card (or pass) & ring the Bell. Drum spins randomly each turn!'
        );
      }, 1600);
    },
    [drawFromSharedDeck]
  );

  // Start a fresh 1v1 Match against a Ladder Opponent
  const startStage = useCallback(
    (targetStageIdx: number) => {
      clearAllTimeouts();
      pendingContinueRef.current = null;
      playerBonusDrawRef.current = 0;
      opponentBonusDrawRef.current = 0;
      const targetOpp = LADDER_OPPONENTS[targetStageIdx];
      sharedDeckRef.current = createShuffledSharedDeck();
      discardPileRef.current = [];
      syncDeckCounts();

      setStageIndex(targetStageIdx);
      setPlayerHp(playerMaxHp);
      setOpponentHp(targetOpp.maxHp);
      setTurnNumber(1);
      setTurnTarget('opponent');
      setLastTurnSummary(null);
      setLastFiredShot(null);
      setGunMuzzleFlash(false);
      setGunDryFire(false);
      setOpponentDamagedAnim(false);
      setPlayerDamagedFlash(false);
      setOpponentSpeech(targetOpp.tauntIntro);

      setCylinderSlots(
        buildShuffledRoundCylinder([createCardInstance('red_crimsonslug')])
      );
      setCurrentChamberIdx(0);
      setPlayerPlayedCard(null);
      setOpponentPlayedCard(null);
      setSelectedLoadCards([]);
      setSelectedCard(null);
      setPeekedSlotInfo(null);
      setPlayerHand(createHeroTrioHand());
      setOpponentHand(createInitialOpponentHand());
      setRoundNumber(1);
      setPhase('PLAYER_SELECT');
      setStatusBanner('50/50 BET — CHOOSE YOUR CARD');
      setSubBanner(
        'Pick a card (or pass) & ring the Bell. Drum spins randomly each turn!'
      );
    },
    [syncDeckCounts]
  );

  interface TurnModifiers {
    playerShield: number;
    opponentShield: number;
    bonusLiveDmg: number;
    playerBonusDrawNext: number;
    opponentBonusDrawNext: number;
    silverBulletCaster: { player: boolean; opponent: boolean };
    fieldPatchCaster: { player: boolean; opponent: boolean };
    riggedBy: { player: boolean; opponent: boolean };
    forcedAim: ActorSide | null;
    lock5050: boolean;
    misfireActive: { player: boolean; opponent: boolean };
    ricochetActive: { player: boolean; opponent: boolean };
    hairTriggerActive: boolean;
    rewindActive: { player: boolean; opponent: boolean };
    guaranteedChamberIndex: number | null;
    workingPHp: number;
    workingOHp: number;
    stolenForPlayer: CardInstance | null;
    stolenForOpponent: CardInstance | null;
  }

  // Apply both simultaneously placed cards to the shared 6-chamber cylinder
  const applySimultaneousCardsToCylinder = useCallback(
    (
      pCard: CardInstance | null,
      oCard: CardInstance | null,
      slots: ChamberSlot[],
      pHp: number,
      oHp: number,
      oMaxHp: number
    ): {
      slots: ChamberSlot[];
      mods: TurnModifiers;
      actionSummary: string;
    } => {
      const updated = slots.map((s) => ({ ...s }));
      const summaries: string[] = [];

      const mods: TurnModifiers = {
        playerShield: 0,
        opponentShield: 0,
        bonusLiveDmg: 0,
        playerBonusDrawNext: 0,
        opponentBonusDrawNext: 0,
        silverBulletCaster: { player: false, opponent: false },
        fieldPatchCaster: { player: false, opponent: false },
        riggedBy: { player: false, opponent: false },
        forcedAim: null,
        lock5050: false,
        misfireActive: { player: false, opponent: false },
        ricochetActive: { player: false, opponent: false },
        hairTriggerActive: false,
        rewindActive: { player: false, opponent: false },
        guaranteedChamberIndex: null,
        workingPHp: pHp,
        workingOHp: oHp,
        stolenForPlayer: null,
        stolenForOpponent: null,
      };

      let nextLoadSeq = updated.reduce(
        (max, s) => Math.max(max, s.loadedAt ?? 0),
        0
      );
      let evictedAny = false;

      const loadShellIntoDrum = (
        shellCard: CardInstance
      ): { index: number; evictedCard: CardInstance | null } => {
        const emptySlots = updated
          .filter((s) => s.card === null)
          .map((s) => s.index);

        let targetIdx: number;
        let evictedCard: CardInstance | null = null;

        if (emptySlots.length > 0) {
          targetIdx = emptySlots[Math.floor(Math.random() * emptySlots.length)];
        } else {
          // Drum is full: remove the oldest loaded card (FIFO queue) to make room
          const oldestSlot = updated.reduce((oldest, slot) => {
            const oldestSeq = oldest.loadedAt ?? 0;
            const slotSeq = slot.loadedAt ?? 0;
            return slotSeq < oldestSeq ? slot : oldest;
          }, updated[0]);
          targetIdx = oldestSlot.index;
          evictedCard = oldestSlot.card;
          if (evictedCard) {
            discardPileRef.current.push(evictedCard);
            evictedAny = true;
          }
        }

        updated[targetIdx] = {
          ...updated[targetIdx],
          card: shellCard,
          spent: false,
          revealed: false,
          loadedAt: ++nextLoadSeq,
        };
        return { index: targetIdx, evictedCard };
      };

      const removeRandomLive = (): boolean => {
        const liveIndices = updated
          .filter((s) => isLiveChamberCard(s.card))
          .map((s) => s.index);
        if (liveIndices.length === 0) return false;
        const targetIdx = liveIndices[Math.floor(Math.random() * liveIndices.length)];
        updated[targetIdx] = {
          ...updated[targetIdx],
          card: null,
          spent: false,
          revealed: false,
          loadedAt: undefined,
        };
        return true;
      };

      // Step 1: Handle Sleight of Hand & Jammer counters
      let activePlayerCard: CardInstance | null = pCard;
      let activeOpponentCard: CardInstance | null = oCard;

      if (
        pCard?.def.effectType === 'sleight_of_hand' &&
        oCard &&
        oCard.def.effectType !== 'sleight_of_hand'
      ) {
        mods.stolenForPlayer = createCardInstance(oCard.def.id);
        activePlayerCard = oCard;
        activeOpponentCard = null;
        summaries.push(`YOU: SLEIGHT OF HAND (Stole ${oCard.def.name}!)`);
      } else if (
        oCard?.def.effectType === 'sleight_of_hand' &&
        pCard &&
        pCard.def.effectType !== 'sleight_of_hand'
      ) {
        mods.stolenForOpponent = createCardInstance(pCard.def.id);
        activeOpponentCard = pCard;
        activePlayerCard = null;
        summaries.push(`ENEMY: SLEIGHT OF HAND (Stole ${pCard.def.name}!)`);
      }

      if (
        activePlayerCard?.def.effectType === 'jammer' &&
        activeOpponentCard?.def.color === 'red'
      ) {
        summaries.push(`YOU: JAMMER (Cancelled ${activeOpponentCard.def.name} +1 Live!)`);
        activeOpponentCard = null;
        loadShellIntoDrum(createCardInstance('red_crimsonslug'));
        activePlayerCard = null;
      } else if (
        activeOpponentCard?.def.effectType === 'jammer' &&
        activePlayerCard?.def.color === 'red'
      ) {
        summaries.push(`ENEMY: JAMMER (Cancelled ${activePlayerCard.def.name} +1 Live!)`);
        activePlayerCard = null;
        loadShellIntoDrum(createCardInstance('red_crimsonslug'));
        activeOpponentCard = null;
      }

      const entries: { actor: 'YOU' | 'ENEMY'; side: ActorSide; card: CardInstance | null }[] = [
        { actor: 'YOU', side: 'player', card: activePlayerCard },
        { actor: 'ENEMY', side: 'opponent', card: activeOpponentCard },
      ];

      for (const { actor, side, card } of entries) {
        if (!card) {
          if (
            !(side === 'player' && pCard?.def.effectType === 'sleight_of_hand') &&
            !(side === 'opponent' && oCard?.def.effectType === 'sleight_of_hand') &&
            !(side === 'player' && pCard?.def.effectType === 'jammer') &&
            !(side === 'opponent' && oCard?.def.effectType === 'jammer')
          ) {
            summaries.push(`${actor}: PASS`);
          }
          continue;
        }

        switch (card.def.effectType) {
          case 'load_live': {
            const { evictedCard } = loadShellIntoDrum(card);
            soundEngine.playShellClink(0.95);
            summaries.push(
              evictedCard
                ? `${actor}: LOAD LIVE (Replaced oldest ${evictedCard.def.name})`
                : `${actor}: LOAD LIVE (+1 Live)`
            );
            break;
          }
          case 'brace': {
            if (side === 'player') mods.playerShield += 1;
            else mods.opponentShield += 1;
            soundEngine.playShellClink(1.1);
            summaries.push(`${actor}: BRACE (+1 Shield)`);
            break;
          }
          case 'dump_shell': {
            const removed = removeRandomLive();
            soundEngine.playShellClink(1.25);
            summaries.push(removed ? `${actor}: DUMP SHELL (-1 Live)` : `${actor}: DUMP SHELL (No Live)`);
            break;
          }
          case 'quick_draw': {
            if (side === 'player') mods.playerBonusDrawNext += 1;
            else mods.opponentBonusDrawNext += 1;
            soundEngine.playCardSlide();
            summaries.push(`${actor}: QUICK DRAW (+1 Card Next)`);
            break;
          }
          case 'double_tap': {
            loadShellIntoDrum(createCardInstance('red_crimsonslug'));
            mods.bonusLiveDmg += 1;
            soundEngine.playShellClink(0.9);
            summaries.push(`${actor}: DOUBLE TAP (+1 Live, +1 DMG)`);
            break;
          }
          case 'rigged_spin': {
            mods.riggedBy[side] = true;
            soundEngine.playCylinderSpin();
            summaries.push(`${actor}: RIGGED SPIN (75% Odds)`);
            break;
          }
          case 'field_patch': {
            const removed = removeRandomLive();
            mods.fieldPatchCaster[side] = true;
            soundEngine.playShellClink(1.2);
            summaries.push(
              removed
                ? `${actor}: FIELD PATCH (-1 Live, Heal on Blank)`
                : `${actor}: FIELD PATCH (Heal on Blank)`
            );
            break;
          }
          case 'concussion_round': {
            const { evictedCard } = loadShellIntoDrum(card);
            soundEngine.playShellClink(0.85);
            summaries.push(
              evictedCard
                ? `${actor}: CONCUSSION (Replaced oldest ${evictedCard.def.name})`
                : `${actor}: CONCUSSION (+1 Shell)`
            );
            break;
          }
          case 'twin_load': {
            loadShellIntoDrum(createCardInstance('red_crimsonslug'));
            loadShellIntoDrum(createCardInstance('red_crimsonslug'));
            soundEngine.playShellClink(0.85);
            summaries.push(`${actor}: TWIN LOAD (+2 Live)`);
            break;
          }
          case 'misfire': {
            mods.misfireActive[side] = true;
            soundEngine.playCardSlide();
            summaries.push(`${actor}: MISFIRE (Safe from Live)`);
            break;
          }
          case 'hair_trigger': {
            mods.hairTriggerActive = true;
            soundEngine.playShellClink(1.15);
            summaries.push(`${actor}: HAIR TRIGGER (2nd Pull on Blank)`);
            break;
          }
          case 'jammer': {
            summaries.push(`${actor}: JAMMER (No Red Card)`);
            break;
          }
          case 'blood_pact': {
            if (side === 'player' && mods.workingPHp > 1) {
              mods.workingPHp -= 1;
            } else if (side === 'opponent' && mods.workingOHp > 1) {
              mods.workingOHp -= 1;
            }
            const { index: idx } = loadShellIntoDrum(card);
            mods.guaranteedChamberIndex = idx;
            soundEngine.playShellClink(0.75);
            summaries.push(`${actor}: BLOOD PACT (-1 HP · 2 DMG Pierce!)`);
            break;
          }
          case 'ricochet': {
            mods.ricochetActive[side] = true;
            soundEngine.playShellClink(1.1);
            summaries.push(`${actor}: RICOCHET (Redirect Live)`);
            break;
          }
          case 'bandolier': {
            if (side === 'player') {
              mods.playerShield += 1;
              mods.playerBonusDrawNext += 1;
            } else {
              mods.opponentShield += 1;
              mods.opponentBonusDrawNext += 1;
            }
            soundEngine.playShellClink(1.1);
            summaries.push(`${actor}: BANDOLIER (+1 Shield, +1 Draw)`);
            break;
          }
          case 'sleight_of_hand': {
            summaries.push(`${actor}: SLEIGHT OF HAND (Nothing to Steal)`);
            break;
          }
          case 'adrenaline_shot': {
            const curHp = side === 'player' ? mods.workingPHp : mods.workingOHp;
            const maxHp = side === 'player' ? playerMaxHp : oMaxHp;
            const healAmt = curHp === 1 ? 2 : 1;
            const nextHp = Math.min(maxHp, curHp + healAmt);
            if (side === 'player') mods.workingPHp = nextHp;
            else mods.workingOHp = nextHp;
            if (curHp === 1) {
              mods.forcedAim = side === 'player' ? 'opponent' : 'player';
              summaries.push(`${actor}: ADRENALINE (+2 HP & AIM!)`);
            } else {
              summaries.push(`${actor}: ADRENALINE (+1 HP)`);
            }
            soundEngine.playCardSlide();
            break;
          }
          case 'russian_roulette': {
            for (let i = 0; i < updated.length; i++) {
              if (updated[i].card === null) {
                updated[i] = {
                  ...updated[i],
                  card: createCardInstance('red_crimsonslug'),
                  spent: false,
                  revealed: false,
                  loadedAt: ++nextLoadSeq,
                };
              }
            }
            mods.lock5050 = true;
            soundEngine.playCylinderSpin();
            summaries.push(`${actor}: RUSSIAN ROULETTE (ALL LIVE · 50/50!)`);
            break;
          }
          case 'golden_gun': {
            const { index: idx } = loadShellIntoDrum(card);
            mods.guaranteedChamberIndex = idx;
            mods.forcedAim = side === 'player' ? 'opponent' : 'player';
            soundEngine.playShellClink(0.8);
            summaries.push(`${actor}: GOLDEN GUN (2 DMG at Foe!)`);
            break;
          }
          case 'silver_bullet': {
            const { evictedCard } = loadShellIntoDrum(card);
            mods.silverBulletCaster[side] = true;
            soundEngine.playShellClink(0.85);
            summaries.push(
              evictedCard
                ? `${actor}: SILVER BULLET (Replaced oldest ${evictedCard.def.name})`
                : `${actor}: SILVER BULLET (+3 DMG Shell)`
            );
            break;
          }
          case 'rewind_cylinder': {
            mods.rewindActive[side] = true;
            soundEngine.playCylinderSpin();
            summaries.push(`${actor}: REWIND CYLINDER (Cheat Death)`);
            break;
          }
        }
      }

      if (evictedAny) {
        syncDeckCounts();
      }

      return {
        slots: updated,
        mods,
        actionSummary: summaries.join('  ·  '),
      };
    },
    [playerMaxHp, syncDeckCounts]
  );

  // Advance from TURN_RESULT when player clicks CONTINUE
  const handleContinueTurn = useCallback(() => {
    if (phase !== 'TURN_RESULT' || !pendingContinueRef.current) return;
    const {
      pCard,
      oCard,
      workingPHand,
      workingOHand,
      workingPHp,
      workingOHp,
      currentRound,
      liveCount,
      blankCount,
      drumReset,
    } = pendingContinueRef.current;
    pendingContinueRef.current = null;

    if (pCard) discardPileRef.current.push(pCard);
    if (oCard) discardPileRef.current.push(oCard);
    syncDeckCounts();
    setPlayerPlayedCard(null);
    setOpponentPlayedCard(null);

    if (workingOHp <= 0) {
      soundEngine.playVictoryFanfare();
      setPhase('VICTORY');
      setStatusBanner(`${opponent.name} ELIMINATED — YOU WIN THE MATCH!`);
      setSubBanner('All opponent hearts depleted.');
      return;
    }
    if (workingPHp <= 0) {
      soundEngine.playDefeatToll();
      setPhase('GAME_OVER');
      setStatusBanner('YOU FELL AT THE TABLE');
      setSubBanner('All 3 of your hearts were depleted.');
      return;
    }

    if (drumReset) {
      setPhase('RELOAD_ROUND');
      setStatusBanner('REWIND — RELOADING FRESH DRUM');
      setSubBanner('Replenishing hands & loading fresh shells...');
      schedule(() => {
        beginNewRound(currentRound + 1, workingPHand, workingOHand);
      }, 1500);
      return;
    }

    const pBonus = playerBonusDrawRef.current;
    const oBonus = opponentBonusDrawRef.current;
    playerBonusDrawRef.current = 0;
    opponentBonusDrawRef.current = 0;

    let nextPHand = [...workingPHand];
    let nextOHand = [...workingOHand];
    const basePDraw = nextPHand.length === 0 ? 2 : nextPHand.length < 4 ? 1 : 0;
    const totalPDraw = Math.min(5 - nextPHand.length, basePDraw + pBonus);
    if (totalPDraw > 0) {
      nextPHand = [...nextPHand, ...drawFromSharedDeck(totalPDraw)];
    }
    setPlayerHand(nextPHand);

    const baseODraw = nextOHand.length === 0 ? 2 : nextOHand.length < 4 ? 1 : 0;
    const totalODraw = Math.min(5 - nextOHand.length, baseODraw + oBonus);
    if (totalODraw > 0) {
      nextOHand = [...nextOHand, ...drawFromSharedDeck(totalODraw)];
    }
    setOpponentHand(nextOHand);

    setCylinderSlots(
      buildShuffledRoundCylinder([createCardInstance('red_crimsonslug')])
    );
    setCurrentChamberIdx(0);
    setPeekedSlotInfo(null);
    soundEngine.playCylinderSpin();

    setTurnNumber((t) => t + 1);
    setStats((s) => ({ ...s, turnsPlayed: s.turnsPlayed + 1 }));
    setSelectedCard(null);
    setPhase('PLAYER_SELECT');
    setStatusBanner('50/50 BET — CHOOSE YOUR CARD');
    setSubBanner(
      'Drum reset: 1 Live · 5 Blank. Pick a card (or pass) & ring the Bell!'
    );
  }, [phase, opponent.name, syncDeckCounts, beginNewRound, drawFromSharedDeck]);

  // Full Simultaneous Turn Resolution with Random-Spin Chamber Selection
  const executeSimultaneousTurn = useCallback(
    (params: {
      pCard: CardInstance | null;
      oCard: CardInstance | null;
      mods: TurnModifiers;
      actionSummary: string;
      slots: ChamberSlot[];
      pHand: CardInstance[];
      oHand: CardInstance[];
      pMaxHp: number;
      oMaxHp: number;
      currentRound: number;
    }) => {
      const {
        pCard,
        oCard,
        mods,
        actionSummary,
        slots,
        pHand,
        oHand,
        pMaxHp,
        oMaxHp,
        currentRound,
      } = params;

      // Apply immediate HP changes (Blood Pact / Adrenaline)
      let workingPHp = mods.workingPHp;
      let workingOHp = mods.workingOHp;
      setPlayerHp(workingPHp);
      setOpponentHp(workingOHp);

      // Add stolen cards (Sleight of Hand) to hand
      const workingPHand = mods.stolenForPlayer
        ? [...pHand.slice(pHand.length >= 5 ? 1 : 0), mods.stolenForPlayer]
        : [...pHand];
      const workingOHand = mods.stolenForOpponent
        ? [...oHand.slice(oHand.length >= 5 ? 1 : 0), mods.stolenForOpponent]
        : [...oHand];
      if (mods.stolenForPlayer) setPlayerHand(workingPHand);
      if (mods.stolenForOpponent) setOpponentHand(workingOHand);

      // 1. REVEAL CARDS
      setPhase('REVEAL_CARDS');
      soundEngine.playCardSlide();
      setStatusBanner('CARDS REVEALED!');
      setSubBanner(actionSummary);

      schedule(() => {
        // 2. PICK TARGET (50/50 or rigged/forced spin)
        let opponentChance = 0.5;
        let spinLabel = '50/50 ROULETTE SPIN...';
        let targetSub = '';

        if (mods.lock5050) {
          opponentChance = 0.5;
          spinLabel = 'RUSSIAN ROULETTE — LOCKED 50/50!';
        } else if (mods.forcedAim) {
          opponentChance = mods.forcedAim === 'opponent' ? 1 : 0;
          spinLabel = 'FORCED AIM!';
        } else if (mods.riggedBy.player && !mods.riggedBy.opponent) {
          opponentChance = 0.75;
          spinLabel = 'RIGGED SPIN (75% FOE / 25% YOU)...';
        } else if (mods.riggedBy.opponent && !mods.riggedBy.player) {
          opponentChance = 0.25;
          spinLabel = 'ENEMY RIGGED SPIN (25% FOE / 75% YOU)...';
        }

        const initialRoll: ActorSide =
          Math.random() < opponentChance ? 'opponent' : 'player';
        let target: ActorSide = initialRoll;
        targetSub =
          initialRoll === 'player'
            ? 'Spin landed on YOU!'
            : `Spin landed on ${opponent.name}!`;

        setTurnTarget(target);
        setPhase('PICK_TARGET');
        soundEngine.playCylinderSpin();
        setStatusBanner(spinLabel);
        setSubBanner(targetSub);

        schedule(() => {
          // 3. SPIN DRUM & PICK RANDOM UNSPENT CHAMBER
          const workingSlots = slots.map((s) => ({ ...s }));
          const unspentIndices = workingSlots
            .filter((s) => !s.spent)
            .map((s) => s.index);

          const chosenIdx =
            mods.guaranteedChamberIndex !== null &&
            !workingSlots[mods.guaranteedChamberIndex]?.spent
              ? mods.guaranteedChamberIndex
              : unspentIndices[Math.floor(Math.random() * unspentIndices.length)] ?? 0;

          let chamberCard = workingSlots[chosenIdx]?.card ?? null;

          // Check Ricochet (redirects Live non-piercing shot if target has Ricochet)
          const previewFire = chamberCard
            ? chamberCard.def.onChamberFire({
                target,
                chamberIndex: chosenIdx,
                card: chamberCard,
              })
            : { damageToTarget: 0, logMessage: '' };

          if (
            !mods.lock5050 &&
            previewFire.damageToTarget > 0 &&
            !previewFire.piercing
          ) {
            if (
              target === 'player' &&
              mods.ricochetActive.player &&
              !mods.ricochetActive.opponent
            ) {
              target = 'opponent';
              setTurnTarget('opponent');
              targetSub = `RICOCHET! Redirected to ${opponent.name}!`;
            } else if (
              target === 'opponent' &&
              mods.ricochetActive.opponent &&
              !mods.ricochetActive.player
            ) {
              target = 'player';
              setTurnTarget('player');
              targetSub = 'ENEMY RICOCHET! Redirected to YOU!';
            }
          }

          workingSlots[chosenIdx] = { ...workingSlots[chosenIdx], revealed: true };
          setCylinderSlots(workingSlots);
          setCurrentChamberIdx(chosenIdx);
          setPhase('RESOLVE_CHAMBER');
          soundEngine.playShellClink(1.1);

          const targetName = target === 'player' ? 'YOU' : opponent.name;
          const remainingStats = countChamberCardTypes(workingSlots);
          const remBlank =
            remainingStats.blue + remainingStats.purple + remainingStats.empty;
          setStatusBanner(`SPINNING DRUM → ${targetName}`);
          setSubBanner(
            `${targetSub} (${remainingStats.red} Live · ${remBlank} Blank in drum)`
          );

          schedule(() => {
            // 4. FIRE SHOT (helper supports Hair Trigger 2nd pull on Blank)
            let playerTookDmg = 0;
            let opponentTookDmg = 0;
            let drumReset = false;

            const resolveOneChamber = (slotIdx: number, shotTarget: ActorSide) => {
              const cardInSlot = workingSlots[slotIdx]?.card ?? null;
              workingSlots[slotIdx] = {
                ...workingSlots[slotIdx],
                card: null,
                spent: false,
                revealed: false,
                loadedAt: undefined,
              };
              if (cardInSlot) {
                discardPileRef.current.push(cardInSlot);
                syncDeckCounts();
              }

              let fireRes = cardInSlot
                ? cardInSlot.def.onChamberFire({
                    target: shotTarget,
                    chamberIndex: slotIdx,
                    card: cardInSlot,
                  })
                : {
                    damageToTarget: 0,
                    logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
                  };

              let note = '';

              // Check Misfire
              if (
                fireRes.damageToTarget > 0 &&
                mods.misfireActive[shotTarget]
              ) {
                fireRes = {
                  damageToTarget: 0,
                  logMessage: 'MISFIRE! LIVE SHELL TURNED TO BLANK!',
                };
                workingSlots[slotIdx] = { ...workingSlots[slotIdx], card: null };
                note = 'MISFIRED!';
              }

              // Bonus Live DMG (Double Tap)
              if (fireRes.damageToTarget > 0 && mods.bonusLiveDmg > 0) {
                fireRes = {
                  ...fireRes,
                  damageToTarget: fireRes.damageToTarget + mods.bonusLiveDmg,
                };
                note = `+${mods.bonusLiveDmg} DOUBLE TAP`;
              }

              // Shield absorption (unless Piercing)
              let finalDmg = fireRes.damageToTarget;
              if (finalDmg > 0 && !fireRes.piercing) {
                const shield =
                  shotTarget === 'player' ? mods.playerShield : mods.opponentShield;
                if (shield > 0) {
                  const blocked = Math.min(shield, finalDmg);
                  finalDmg -= blocked;
                  if (shotTarget === 'player') mods.playerShield -= blocked;
                  else mods.opponentShield -= blocked;
                  note = note ? `${note} · SHIELD -${blocked}` : `SHIELD BLOCKED ${blocked}`;
                }
              } else if (finalDmg > 0 && fireRes.piercing) {
                note = 'PIERCING!';
              }

              // Apply Damage & Discard-on-Hit (Concussion Round)
              if (finalDmg > 0) {
                soundEngine.playGunshotBlast(false);
                setShakeIntensity(1.15);
                setGunMuzzleFlash(true);

                if (shotTarget === 'opponent') {
                  workingOHp = Math.max(0, workingOHp - finalDmg);
                  opponentTookDmg += finalDmg;
                  setOpponentHp(workingOHp);
                  setOpponentDamagedAnim(true);
                  setStats((s) => ({
                    ...s,
                    shotsFired: s.shotsFired + 1,
                    damageDealt: s.damageDealt + finalDmg,
                  }));
                  if (fireRes.discardOnHit && workingOHand.length > 0) {
                    const dropIdx = Math.floor(Math.random() * workingOHand.length);
                    const dropped = workingOHand.splice(dropIdx, 1)[0];
                    discardPileRef.current.push(dropped);
                    setOpponentHand([...workingOHand]);
                    note = `DISCARDED ${dropped.def.name}`;
                  }
                } else {
                  workingPHp = Math.max(0, workingPHp - finalDmg);
                  playerTookDmg += finalDmg;
                  setPlayerHp(workingPHp);
                  setPlayerDamagedFlash(true);
                  if (fireRes.discardOnHit && workingPHand.length > 0) {
                    const dropIdx = Math.floor(Math.random() * workingPHand.length);
                    const dropped = workingPHand.splice(dropIdx, 1)[0];
                    discardPileRef.current.push(dropped);
                    setPlayerHand([...workingPHand]);
                    note = `DISCARDED ${dropped.def.name}`;
                  }
                }
              } else {
                soundEngine.playDryFireClick();
                setGunDryFire(true);
                if (shotTarget === 'player') {
                  setStats((s) => ({
                    ...s,
                    selfShotsSurvived: s.selfShotsSurvived + 1,
                  }));
                }
                // Field Patch heal on Blank
                if (mods.fieldPatchCaster.player) {
                  workingPHp = Math.min(pMaxHp, workingPHp + 1);
                  setPlayerHp(workingPHp);
                  note = 'FIELD PATCH +1 HP';
                }
                if (mods.fieldPatchCaster.opponent) {
                  workingOHp = Math.min(oMaxHp, workingOHp + 1);
                  setOpponentHp(workingOHp);
                }
              }

              // Rewind Cylinder (Cheat Death)
              if (workingPHp <= 0 && mods.rewindActive.player) {
                workingPHp = 1;
                setPlayerHp(1);
                drumReset = true;
                note = 'REWIND SAVED YOU AT 1 HP!';
              }
              if (workingOHp <= 0 && mods.rewindActive.opponent) {
                workingOHp = 1;
                setOpponentHp(1);
                drumReset = true;
                note = 'ENEMY REWIND SAVED AT 1 HP!';
              }

              const wasBlank = fireRes.damageToTarget === 0 && !cardInSlot;
              setLastFiredShot({
                label: cardInSlot ? cardInSlot.def.name : 'BLANK SHELL',
                cardId: cardInSlot ? cardInSlot.def.id : null,
                color: cardInSlot ? cardInSlot.def.color : 'blank',
                rarity: cardInSlot?.def.rarity,
                damage: finalDmg,
                target: shotTarget,
                wasBlank: finalDmg === 0,
                note: note || undefined,
              });

              return { finalDmg, wasBlank: fireRes.damageToTarget === 0, note, cardInSlot };
            };

            setPhase(target === 'opponent' ? 'FIRE_OPPONENT' : 'FIRE_PLAYER');
            const firstShot = resolveOneChamber(chosenIdx, target);

            // Hair Trigger: if first shot was Blank, fire a 2nd random chamber!
            let secondShotInfo = '';
            if (firstShot.wasBlank && mods.hairTriggerActive && !drumReset) {
              const remainingPool = workingSlots
                .filter((s) => s.index !== chosenIdx)
                .map((s) => s.index);
              if (remainingPool.length > 0) {
                const secondIdx =
                  remainingPool[Math.floor(Math.random() * remainingPool.length)];
                const secondShot = resolveOneChamber(secondIdx, target);
                secondShotInfo = ` · HAIR TRIGGER 2ND PULL: ${
                  secondShot.finalDmg > 0 ? `${secondShot.finalDmg} DMG!` : 'BLANK!'
                }`;
              }
            }

            setCylinderSlots([...workingSlots]);

            // Bonus draws for next turn
            playerBonusDrawRef.current += mods.playerBonusDrawNext;
            opponentBonusDrawRef.current += mods.opponentBonusDrawNext;
            if (mods.silverBulletCaster.player && playerTookDmg === 0) {
              playerBonusDrawRef.current += 2;
            }
            if (mods.silverBulletCaster.opponent && opponentTookDmg === 0) {
              opponentBonusDrawRef.current += 2;
            }

            const totalDmgThisTurn =
              target === 'opponent' ? opponentTookDmg : playerTookDmg;

            if (totalDmgThisTurn > 0) {
              setStatusBanner(
                target === 'opponent'
                  ? `BANG! ${opponent.name} TAKES ${totalDmgThisTurn} DMG!`
                  : `BANG! YOU TAKE ${totalDmgThisTurn} DMG!`
              );
              setOpponentSpeech(
                target === 'opponent'
                  ? opponent.tauntDamaged[
                      Math.floor(Math.random() * opponent.tauntDamaged.length)
                    ]
                  : opponent.tauntHitPlayer[
                      Math.floor(Math.random() * opponent.tauntHitPlayer.length)
                    ]
              );
            } else {
              setStatusBanner(
                firstShot.note
                  ? `${firstShot.note}!`
                  : 'CLICK! BLANK CHAMBER — SAFE!'
              );
              if (target === 'opponent') {
                setOpponentSpeech(
                  opponent.tauntSelfSafe[
                    Math.floor(Math.random() * opponent.tauntSelfSafe.length)
                  ]
                );
              }
            }

            const firedName = firstShot.cardInSlot
              ? firstShot.cardInSlot.def.name
              : 'BLANK SHELL';
            setSubBanner(
              `Fired ${firedName} at ${targetName}${secondShotInfo}. Click CONTINUE when ready.`
            );
            setLastTurnSummary(
              `Last Turn: ${actionSummary} → Fired ${firedName} at ${targetName}: ${
                totalDmgThisTurn > 0 ? `BANG! (-${totalDmgThisTurn} HP)` : 'SAFE (0 DMG)'
              }${secondShotInfo}`
            );

            const endCounts = countChamberCardTypes(workingSlots);
            const endBlankCount = endCounts.blue + endCounts.purple + endCounts.empty;

            schedule(() => {
              setGunMuzzleFlash(false);
              setGunDryFire(false);
              setOpponentDamagedAnim(false);
              setPlayerDamagedFlash(false);

              pendingContinueRef.current = {
                pCard,
                oCard,
                workingPHand: [...workingPHand],
                workingOHand: [...workingOHand],
                workingPHp,
                workingOHp,
                currentRound,
                liveCount: endCounts.red,
                blankCount: endBlankCount,
                drumReset,
              };
              setPhase('TURN_RESULT');
            }, 950);
          }, 1500);
        }, 1600);
      }, 1800);
    },
    [opponent, syncDeckCounts]
  );

  // Card Click Handler: slides card onto LOCK IN SLOT (disables Blood Pact at 1 HP)
  const handleSelectPlayerCard = useCallback(
    (card: CardInstance) => {
      if (phase === 'PRE_ROUND_LOAD') {
        setSelectedLoadCards((prev) => {
          const exists = prev.some((c) => c.uid === card.uid);
          if (exists) return prev.filter((c) => c.uid !== card.uid);
          if (prev.length >= 2) return [prev[1], card];
          return [...prev, card];
        });
      } else if (phase === 'PLAYER_SELECT') {
        if (card.def.effectType === 'blood_pact' && playerHp <= 1) {
          setStatusBanner('BLOOD PACT UNAVAILABLE');
          setSubBanner('You need at least 2 HP to pay the 1 HP Blood Pact cost.');
          return;
        }
        setSelectedCard((prev) => (prev?.uid === card.uid ? null : card));
      }
    },
    [phase, playerHp]
  );

  // Draft Card Handler from "DRAFT CARDS" button
  const handleDraftCard = useCallback((cardId: CardId) => {
    const newCard = createCardInstance(cardId);
    setPlayerHand((prev) => {
      if (prev.length >= 5) {
        return [...prev.slice(1), newCard];
      }
      return [...prev, newCard];
    });
    setStatusBanner(`DRAFTED ${newCard.def.name} INTO YOUR HAND!`);
    setSubBanner(newCard.def.chamberEffectText);
  }, []);

  // Brass Bell / LOCK IN Handler — Both players place cards at the exact same time!
  const handleRingBell = useCallback(() => {
    if (phase !== 'PLAYER_SELECT') return;

    let nextPHand = [...playerHand];
    const pCard = selectedCard;
    if (pCard) {
      nextPHand = nextPHand.filter((c) => c.uid !== pCard.uid);
      setPlayerHand(nextPHand);
      setSelectedCard(null);
    }

    const remaining = countChamberCardTypes(cylinderSlots);
    const oCard = decideAiTurnAction(opponentHand, remaining, opponentHp);
    let nextOHand = [...opponentHand];
    if (oCard) {
      nextOHand = nextOHand.filter((c) => c.uid !== oCard.uid);
      setOpponentHand(nextOHand);
    }

    setPlayerPlayedCard(pCard);
    setOpponentPlayedCard(oCard);

    const applied = applySimultaneousCardsToCylinder(
      pCard,
      oCard,
      cylinderSlots,
      playerHp,
      opponentHp,
      opponentMaxHp
    );
    setCylinderSlots(applied.slots);
    setPeekedSlotInfo(null);

    setOpponentSpeech(
      opponent.tauntLockIn[Math.floor(Math.random() * opponent.tauntLockIn.length)]
    );

    executeSimultaneousTurn({
      pCard,
      oCard,
      mods: applied.mods,
      actionSummary: applied.actionSummary,
      slots: applied.slots,
      pHand: nextPHand,
      oHand: nextOHand,
      pMaxHp: playerMaxHp,
      oMaxHp: opponentMaxHp,
      currentRound: roundNumber,
    });
  }, [
    phase,
    playerHand,
    selectedCard,
    cylinderSlots,
    opponentHand,
    opponentHp,
    opponentMaxHp,
    applySimultaneousCardsToCylinder,
    opponent,
    executeSimultaneousTurn,
    playerHp,
    playerMaxHp,
    roundNumber,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (document.querySelector('dialog[open]')) return;

      if (phase === 'TURN_RESULT' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        soundEngine.playCardHover();
        handleContinueTurn();
        return;
      }

      if (phase !== 'PRE_ROUND_LOAD' && phase !== 'PLAYER_SELECT') return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= playerHand.length) {
        soundEngine.playCardSlide();
        handleSelectPlayerCard(playerHand[num - 1]);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        soundEngine.playBrassBell();
        handleRingBell();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, playerHand, handleSelectPlayerCard, handleRingBell, handleContinueTurn]);

  const shellTypesFor3D = slotsToShellTypes(cylinderSlots, !showChamberCounts);

  const readyToLockIn = phase === 'PLAYER_SELECT';

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#140e0c] select-none">
      {/* Red screen vignette flash when player takes damage */}
      {playerDamagedFlash && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-red-600/35 animate-pulse" />
      )}

      {/* Fullscreen First-Person 3D Tabletop Canvas */}
      <TabletopScene
        opponent={opponent}
        phase={phase}
        playerHp={playerHp}
        playerMaxHp={playerMaxHp}
        opponentHp={opponentHp}
        opponentMaxHp={opponentMaxHp}
        sharedCylinder={shellTypesFor3D}
        currentChamberIdx={currentChamberIdx}
        playerHand={playerHand}
        opponentHand={opponentHand}
        selectedLoadCards={selectedLoadCards}
        selectedPlayerCard={selectedCard}
        playerPlayedCard={playerPlayedCard}
        opponentPlayedCard={opponentPlayedCard}
        readyToLockIn={readyToLockIn}
        randomGunTarget={turnTarget}
        gunMuzzleFlash={gunMuzzleFlash}
        gunDryFire={gunDryFire}
        opponentDamagedAnim={opponentDamagedAnim}
        shakeIntensity={shakeIntensity}
        focusMode={focusMode}
        useBlenderAssets={useBlenderAssets}
        onSelectPlayerCard={handleSelectPlayerCard}
        onHoverCard={setHoveredCard}
        onRingBell={handleRingBell}
      />

      {/* Cartoon Tabletop HUD & Modals Overlay */}
      <HudAndModals
        opponent={opponent}
        stageIndex={stageIndex}
        roundNumber={roundNumber}
        turnNumber={turnNumber}
        turnTarget={turnTarget}
        phase={phase}
        statusBanner={statusBanner}
        subBanner={subBanner}
        opponentSpeech={opponentSpeech}
        lastTurnSummary={lastTurnSummary}
        lastFiredShot={lastFiredShot}
        peekedSlotInfo={peekedSlotInfo}
        playerHp={playerHp}
        playerMaxHp={playerMaxHp}
        opponentHp={opponentHp}
        opponentMaxHp={opponentMaxHp}
        cylinderSlots={cylinderSlots}
        currentChamberIdx={currentChamberIdx}
        showChamberCounts={showChamberCounts}
        sharedDeckCount={sharedDeckCount}
        discardCount={discardCount}
        playerHand={playerHand}
        selectedLoadCards={selectedLoadCards}
        selectedCard={selectedCard}
        playerPlayedCard={playerPlayedCard}
        opponentPlayedCard={opponentPlayedCard}
        hoveredCard={hoveredCard}
        muted={muted}
        focusMode={focusMode}
        useBlenderAssets={useBlenderAssets}
        stats={stats}
        onSelectPlayerCard={handleSelectPlayerCard}
        onHoverCard={setHoveredCard}
        onRingBell={handleRingBell}
        onContinueTurn={handleContinueTurn}
        onDraftCard={handleDraftCard}
        onToggleChamberCounts={() => setShowChamberCounts((v) => !v)}
        onAdvanceNextStage={() =>
          startStage((stageIndex + 1) % LADDER_OPPONENTS.length)
        }
        onRestartRun={() => startStage(0)}
        onToggleMute={() => {
          const m = soundEngine.toggleMute();
          setMuted(m);
        }}
        onChangeFocusMode={setFocusMode}
        onToggleBlenderAssets={() => setUseBlenderAssets((v) => !v)}
      />
    </main>
  );
};

export default App;
