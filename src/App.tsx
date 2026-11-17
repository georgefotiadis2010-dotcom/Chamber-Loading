import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActorSide,
  CardId,
  CardInstance,
  ChamberSlot,
  TurnPhase,
} from './types/game';
import {
  buildShuffledRoundCylinder,
  countChamberCardTypes,
  createCardInstance,
  createHeroTrioHand,
  decideAiTurnAction,
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
  const pendingContinueRef = useRef<{
    pCard: CardInstance | null;
    oCard: CardInstance | null;
    chamberIdx: number;
    workingPHand: CardInstance[];
    workingOHand: CardInstance[];
    workingPHp: number;
    workingOHp: number;
    currentRound: number;
  } | null>(null);

  // Shared 6-Chamber Cylinder (Starts with 1 Live + 5 Blanks)
  const [cylinderSlots, setCylinderSlots] = useState<ChamberSlot[]>(() =>
    buildShuffledRoundCylinder([createCardInstance('red_crimsonslug')])
  );
  const [currentChamberIdx, setCurrentChamberIdx] = useState<number>(0);
  const [showChamberCounts, setShowChamberCounts] = useState<boolean>(true);
  const [peekedSlotInfo, setPeekedSlotInfo] = useState<string | null>(null);

  // Player foreground hand starts with the 3 iconic starter cards: LOAD LIVE, STRIP SHELL, SPIN DRUM
  const [playerHand, setPlayerHand] = useState<CardInstance[]>(() =>
    createHeroTrioHand()
  );
  // Opponent far hand starts with 4 face-up cards across the top of the wood table
  const [opponentHand, setOpponentHand] = useState<CardInstance[]>(() => [
    createCardInstance('red_crimsonslug'),
    createCardInstance('blue_silverblank'),
    createCardInstance('purple_recoilcurse'),
    createCardInstance('blue_hairtrigger'),
  ]);

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
      if (nextRound >= 2) {
        liveSeeds.push(createCardInstance('red_crimsonslug'));
      }

      const freshSlots = buildShuffledRoundCylinder(liveSeeds);

      setCylinderSlots(freshSlots);
      setCurrentChamberIdx(0);
      setPlayerPlayedCard(null);
      setOpponentPlayedCard(null);
      setSelectedLoadCards([]);
      setSelectedCard(null);
      setPeekedSlotInfo(null);
      setPlayerHand(nextPHand);
      setOpponentHand(nextOHand);
      setRoundNumber(nextRound);
      setPhase('SPIN_CYLINDERS');
      soundEngine.playCylinderSpin();
      setStatusBanner(`ROUND ${nextRound} — SPINNING 6-CHAMBER CYLINDER`);
      setSubBanner(
        `${liveSeeds.length} Live & ${6 - liveSeeds.length} Blank shells loaded into the drum...`
      );

      schedule(() => {
        setPhase('PLAYER_SELECT');
        setStatusBanner('50/50 BET — CHOOSE YOUR CARD');
        setSubBanner(
          'Pick a card (or pass) & ring the Bell. Gun picks 50/50 after cards reveal!'
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
      setOpponentHand([
        createCardInstance('red_crimsonslug'),
        createCardInstance('blue_silverblank'),
        createCardInstance('purple_recoilcurse'),
        createCardInstance('blue_hairtrigger'),
      ]);
      setRoundNumber(1);
      setPhase('PLAYER_SELECT');
      setStatusBanner('50/50 BET — CHOOSE YOUR CARD');
      setSubBanner(
        'Pick a card (or pass) & ring the Bell. Gun picks 50/50 after cards reveal!'
      );
    },
    [syncDeckCounts]
  );

  // Apply both simultaneously placed cards to the shared 6-chamber cylinder
  const applySimultaneousCardsToCylinder = useCallback(
    (
      pCard: CardInstance | null,
      oCard: CardInstance | null,
      slots: ChamberSlot[],
      chamberIdx: number
    ): {
      slots: ChamberSlot[];
      playerDeflected: boolean;
      opponentDeflected: boolean;
      peekedInfo: string | null;
      actionSummary: string;
    } => {
      let updated = slots.map((s) => ({ ...s }));
      let playerDeflected = false;
      let opponentDeflected = false;
      let peekedInfo: string | null = null;
      const summaries: string[] = [];

      const entries: { actor: 'YOU' | 'ENEMY'; card: CardInstance | null }[] = [
        { actor: 'YOU', card: pCard },
        { actor: 'ENEMY', card: oCard },
      ];

      for (const { actor, card } of entries) {
        if (!card) {
          summaries.push(`${actor}: PASS`);
          continue;
        }

        const unspentIndices = updated
          .map((s, idx) => (!s.spent && idx >= chamberIdx ? idx : -1))
          .filter((idx) => idx !== -1);

        switch (card.def.effectType) {
          case 'load_live': {
            const emptyIdx = unspentIndices.find((idx) => updated[idx].card === null);
            const nonRedIndices = unspentIndices.filter(
              (idx) => updated[idx].card?.def.color !== 'red'
            );
            const targetIdx =
              emptyIdx ??
              (nonRedIndices.length > 0
                ? nonRedIndices[Math.floor(Math.random() * nonRedIndices.length)]
                : undefined);
            if (targetIdx !== undefined) {
              updated[targetIdx] = {
                ...updated[targetIdx],
                card,
                spent: false,
                revealed: false,
              };
              soundEngine.playShellClink(0.95);
              summaries.push(`${actor}: LOAD LIVE (+1 Live)`);
            } else {
              summaries.push(`${actor}: LOAD LIVE (Drum Full)`);
            }
            break;
          }

          case 'load_heavy': {
            const emptyIdx = unspentIndices.find((idx) => updated[idx].card === null);
            const nonHeavyIndices = unspentIndices.filter(
              (idx) => updated[idx].card?.def.id !== 'red_hollowpoint'
            );
            const targetIdx =
              emptyIdx ??
              (nonHeavyIndices.length > 0
                ? nonHeavyIndices[Math.floor(Math.random() * nonHeavyIndices.length)]
                : undefined);
            if (targetIdx !== undefined) {
              updated[targetIdx] = {
                ...updated[targetIdx],
                card,
                spent: false,
                revealed: false,
              };
              soundEngine.playShellClink(0.85);
              summaries.push(`${actor}: HEAVY SLUG (+2 DMG Shell)`);
            } else {
              summaries.push(`${actor}: HEAVY SLUG (Drum Full)`);
            }
            break;
          }

          case 'strip_live': {
            const redIndices = unspentIndices.filter(
              (idx) => updated[idx].card?.def.color === 'red'
            );
            if (redIndices.length > 0) {
              const targetIdx =
                redIndices[Math.floor(Math.random() * redIndices.length)];
              updated[targetIdx] = {
                ...updated[targetIdx],
                card: null,
                spent: false,
                revealed: false,
              };
              soundEngine.playShellClink(1.25);
              summaries.push(`${actor}: STRIP SHELL (-1 Live)`);
            } else {
              summaries.push(`${actor}: STRIP SHELL (No Live)`);
            }
            break;
          }

          case 'spin_drum': {
            const unspentCards = updated.slice(chamberIdx).map((s) => s.card);
            const shuffled = shuffleArray(unspentCards);
            updated = updated.map((s, idx) =>
              idx >= chamberIdx
                ? { ...s, card: shuffled[idx - chamberIdx], revealed: false }
                : s
            );
            peekedInfo = null;
            soundEngine.playCylinderSpin();
            summaries.push(`${actor}: SPIN DRUM (Shuffled)`);
            break;
          }

          case 'peek_next': {
            if (actor === 'YOU') {
              const peekIdx = chamberIdx + 1 < 6 ? chamberIdx + 1 : chamberIdx;
              const slot = updated[peekIdx];
              const isLive = slot?.card?.def.color === 'red';
              const dmg = slot?.card?.def.id === 'red_hollowpoint' ? 2 : 1;
              peekedInfo = isLive
                ? `PEEK CHAMBER #${peekIdx + 1}: LIVE (${dmg} DMG)!`
                : `PEEK CHAMBER #${peekIdx + 1}: BLANK (SAFE)`;
            }
            soundEngine.playCardSlide();
            summaries.push(`${actor}: PEEK CHAMBER`);
            break;
          }

          case 'deflect': {
            if (actor === 'YOU') playerDeflected = true;
            else opponentDeflected = true;
            soundEngine.playShellClink(1.1);
            summaries.push(`${actor}: DEFLECT (Protected!)`);
            break;
          }
        }
      }

      return {
        slots: updated,
        playerDeflected,
        opponentDeflected,
        peekedInfo,
        actionSummary: summaries.join('  ·  '),
      };
    },
    []
  );

  // Advance from TURN_RESULT when player clicks CONTINUE
  const handleContinueTurn = useCallback(() => {
    if (phase !== 'TURN_RESULT' || !pendingContinueRef.current) return;
    const {
      pCard,
      oCard,
      chamberIdx,
      workingPHand,
      workingOHand,
      workingPHp,
      workingOHp,
      currentRound,
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

    const nextIdx = chamberIdx + 1;

    if (nextIdx >= 6) {
      setPhase('RELOAD_ROUND');
      setStatusBanner('ALL 6 CHAMBERS SPENT — RELOADING CYLINDER');
      setSubBanner('Replenishing hands & loading fresh shells...');
      schedule(() => {
        beginNewRound(currentRound + 1, workingPHand, workingOHand);
      }, 1600);
      return;
    }

    let nextPHand = [...workingPHand];
    let nextOHand = [...workingOHand];
    if (nextPHand.length < 4) {
      const needed = nextPHand.length === 0 ? 2 : 1;
      nextPHand = [...nextPHand, ...drawFromSharedDeck(needed)];
      setPlayerHand(nextPHand);
    }
    if (nextOHand.length < 4) {
      const needed = nextOHand.length === 0 ? 2 : 1;
      nextOHand = [...nextOHand, ...drawFromSharedDeck(needed)];
      setOpponentHand(nextOHand);
    }

    setCurrentChamberIdx(nextIdx);
    setTurnNumber((t) => t + 1);
    setStats((s) => ({ ...s, turnsPlayed: s.turnsPlayed + 1 }));
    setSelectedCard(null);
    setPhase('PLAYER_SELECT');
    setStatusBanner('50/50 BET — CHOOSE YOUR CARD');
    setSubBanner(
      `Chamber #${nextIdx + 1}/6 ready. Pick a card (or pass) & ring the Bell!`
    );
  }, [phase, opponent.name, syncDeckCounts, beginNewRound, drawFromSharedDeck]);

  // Full Simultaneous Turn Resolution:
  // 1. REVEAL_CARDS (lift cards & show effects)
  // 2. PICK_TARGET (50/50 revolver spin on table + Deflect check)
  // 3. RESOLVE_CHAMBER (lift & aim gun, slowly rotate drum into barrel)
  // 4. FIRE -> TURN_RESULT (pause until CONTINUE)
  const executeSimultaneousTurn = useCallback(
    (params: {
      pCard: CardInstance | null;
      oCard: CardInstance | null;
      playerDeflected: boolean;
      opponentDeflected: boolean;
      actionSummary: string;
      chamberIdx: number;
      slots: ChamberSlot[];
      pHand: CardInstance[];
      oHand: CardInstance[];
      pHp: number;
      oHp: number;
      currentRound: number;
    }) => {
      const {
        pCard,
        oCard,
        playerDeflected,
        opponentDeflected,
        actionSummary,
        chamberIdx,
        slots,
        pHand,
        oHand,
        pHp,
        oHp,
        currentRound,
      } = params;

      // 1. REVEAL CARDS (cards slide to center & lift toward player)
      setPhase('REVEAL_CARDS');
      soundEngine.playCardSlide();
      setStatusBanner('CARDS REVEALED!');
      setSubBanner(actionSummary);

      schedule(() => {
        // 2. PICK TARGET (50/50 roulette spin on the table)
        const initialRoll: ActorSide = Math.random() < 0.5 ? 'opponent' : 'player';
        let target: ActorSide = initialRoll;
        let targetSub =
          initialRoll === 'player'
            ? '50/50 spin landed on YOU!'
            : `50/50 spin landed on ${opponent.name}!`;

        if (initialRoll === 'player' && playerDeflected && !opponentDeflected) {
          target = 'opponent';
          targetSub = `Spin landed on YOU — DEFLECTED to ${opponent.name}!`;
        } else if (
          initialRoll === 'opponent' &&
          opponentDeflected &&
          !playerDeflected
        ) {
          target = 'player';
          targetSub = `Spin landed on ${opponent.name} — DEFLECTED to YOU!`;
        } else if (playerDeflected && opponentDeflected) {
          targetSub = `Both played DEFLECT (cancelled) — Aimed at ${
            target === 'player' ? 'YOU' : opponent.name
          }!`;
        }

        setTurnTarget(target);
        setPhase('PICK_TARGET');
        soundEngine.playCylinderSpin();
        setStatusBanner('50/50 ROULETTE SPIN...');
        setSubBanner(targetSub);

        schedule(() => {
          // 3. RESOLVE CHAMBER (gun lifts & aims, drum slowly rotates into barrel)
          const workingSlots = slots.map((s, idx) =>
            idx === chamberIdx ? { ...s, revealed: true } : s
          );
          const chamberCard = workingSlots[chamberIdx]?.card ?? null;
          setCylinderSlots(workingSlots);
          setCurrentChamberIdx(chamberIdx);
          setPhase('RESOLVE_CHAMBER');
          soundEngine.playShellClink(1.1);

          const targetName = target === 'player' ? 'YOU' : opponent.name;
          const remainingStats = countChamberCardTypes(workingSlots);
          const remBlank =
            remainingStats.blue + remainingStats.purple + remainingStats.empty;
          setStatusBanner(`AIMING CHAMBER #${chamberIdx + 1}/6 → ${targetName}`);
          setSubBanner(
            `Drum aligning... (${remainingStats.red} Live · ${remBlank} Blank remaining)`
          );

          schedule(() => {
            // 4. FIRE SHOT
            setPhase(target === 'opponent' ? 'FIRE_OPPONENT' : 'FIRE_PLAYER');

            workingSlots[chamberIdx] = {
              ...workingSlots[chamberIdx],
              spent: true,
              revealed: true,
            };
            if (chamberCard) {
              discardPileRef.current.push(chamberCard);
              syncDeckCounts();
            }
            setCylinderSlots([...workingSlots]);

            setPeekedSlotInfo((prev) =>
              prev && prev.includes(`#${chamberIdx + 1}:`) ? null : prev
            );

            const fireRes = chamberCard
              ? chamberCard.def.onChamberFire({
                  target,
                  chamberIndex: chamberIdx,
                  card: chamberCard,
                })
              : {
                  damageToTarget: 0,
                  logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
                };

            let workingPHp = pHp;
            let workingOHp = oHp;

            if (fireRes.damageToTarget > 0) {
              soundEngine.playGunshotBlast(false);
              setShakeIntensity(1.15);
              setGunMuzzleFlash(true);

              if (target === 'opponent') {
                workingOHp = Math.max(0, workingOHp - fireRes.damageToTarget);
                setOpponentHp(workingOHp);
                setOpponentDamagedAnim(true);
                setStats((s) => ({
                  ...s,
                  shotsFired: s.shotsFired + 1,
                  damageDealt: s.damageDealt + fireRes.damageToTarget,
                }));
                setOpponentSpeech(
                  opponent.tauntDamaged[
                    Math.floor(Math.random() * opponent.tauntDamaged.length)
                  ]
                );
                setStatusBanner(
                  `BANG! ${opponent.name} TAKES ${fireRes.damageToTarget} DMG!`
                );
              } else {
                workingPHp = Math.max(0, workingPHp - fireRes.damageToTarget);
                setPlayerHp(workingPHp);
                setPlayerDamagedFlash(true);
                setOpponentSpeech(
                  opponent.tauntHitPlayer[
                    Math.floor(Math.random() * opponent.tauntHitPlayer.length)
                  ]
                );
                setStatusBanner(`BANG! YOU TAKE ${fireRes.damageToTarget} DMG!`);
              }
            } else {
              soundEngine.playDryFireClick();
              setGunDryFire(true);
              setStatusBanner('CLICK! BLANK CHAMBER — SAFE!');
              if (target === 'player') {
                setStats((s) => ({
                  ...s,
                  selfShotsSurvived: s.selfShotsSurvived + 1,
                }));
              } else {
                setOpponentSpeech(
                  opponent.tauntSelfSafe[
                    Math.floor(Math.random() * opponent.tauntSelfSafe.length)
                  ]
                );
              }
            }

            setSubBanner(
              `Chamber #${chamberIdx + 1} fired at ${targetName}. Click CONTINUE when ready.`
            );
            setLastTurnSummary(
              `Last Turn: ${actionSummary} → Shot at ${targetName}: ${
                fireRes.damageToTarget > 0
                  ? `BANG! (-${fireRes.damageToTarget} HP)`
                  : 'CLICK (Blank)'
              }`
            );

            // Pause on TURN_RESULT until player clicks CONTINUE
            schedule(() => {
              setGunMuzzleFlash(false);
              setGunDryFire(false);
              setOpponentDamagedAnim(false);
              setPlayerDamagedFlash(false);

              pendingContinueRef.current = {
                pCard,
                oCard,
                chamberIdx,
                workingPHand: [...pHand],
                workingOHand: [...oHand],
                workingPHp,
                workingOHp,
                currentRound,
              };
              setPhase('TURN_RESULT');
            }, 950);
          }, 1600);
        }, 1800);
      }, 2000);
    },
    [opponent, syncDeckCounts]
  );

  // Card Click Handler: slides card onto LOCK IN SLOT
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
        setSelectedCard((prev) => (prev?.uid === card.uid ? null : card));
      }
    },
    [phase]
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
      currentChamberIdx
    );
    setCylinderSlots(applied.slots);
    if (pCard?.def.effectType === 'spin_drum' || oCard?.def.effectType === 'spin_drum') {
      setPeekedSlotInfo(null);
    } else if (applied.peekedInfo) {
      setPeekedSlotInfo(applied.peekedInfo);
    }

    setOpponentSpeech(
      opponent.tauntLockIn[Math.floor(Math.random() * opponent.tauntLockIn.length)]
    );

    executeSimultaneousTurn({
      pCard,
      oCard,
      playerDeflected: applied.playerDeflected,
      opponentDeflected: applied.opponentDeflected,
      actionSummary: applied.actionSummary,
      chamberIdx: currentChamberIdx,
      slots: applied.slots,
      pHand: nextPHand,
      oHand: nextOHand,
      pHp: playerHp,
      oHp: opponentHp,
      currentRound: roundNumber,
    });
  }, [
    phase,
    playerHand,
    selectedCard,
    cylinderSlots,
    opponentHand,
    opponentHp,
    applySimultaneousCardsToCylinder,
    currentChamberIdx,
    opponent,
    executeSimultaneousTurn,
    playerHp,
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
