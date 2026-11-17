import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActorSide,
  AimChoice,
  CardInstance,
  ChamberSlot,
  TableTriggerResult,
  TurnPhase,
} from './types/game';
import {
  buildShuffledRoundCylinder,
  countChamberCardTypes,
  createCardInstance,
  createEmptyCylinderSlots,
  decideAiLoadSelection,
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
  const [sharedDeckCount, setSharedDeckCount] = useState<number>(
    sharedDeckRef.current.length
  );

  const drawFromSharedDeck = useCallback((count: number): CardInstance[] => {
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
    setSharedDeckCount(sharedDeckRef.current.length);
    return drawn;
  }, []);

  // Match State (1v1, 3 lives per player)
  const playerMaxHp = 3;
  const opponentMaxHp = 3;
  const [playerHp, setPlayerHp] = useState<number>(playerMaxHp);
  const [opponentHp, setOpponentHp] = useState<number>(opponentMaxHp);

  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [activePlayer, setActivePlayer] = useState<ActorSide>('player');
  const [phase, setPhase] = useState<TurnPhase>('PRE_ROUND_LOAD');

  const [statusBanner, setStatusBanner] = useState<string>(
    'ROUND 1 — LOAD 2 CARDS INTO THE 6-CHAMBER CYLINDER'
  );
  const [subBanner, setSubBanner] = useState<string>(
    'Select 2 cards from your 4-card hand to secretly load, then ring the Brass Bell.'
  );
  const [opponentSpeech, setOpponentSpeech] = useState<string>(
    LADDER_OPPONENTS[0].tauntIntro
  );

  // Shared 6-Chamber Cylinder
  const [cylinderSlots, setCylinderSlots] = useState<ChamberSlot[]>(() =>
    createEmptyCylinderSlots()
  );
  const [currentChamberIdx, setCurrentChamberIdx] = useState<number>(0);
  const [showChamberCounts, setShowChamberCounts] = useState<boolean>(true);
  const [peekedSlotInfo, setPeekedSlotInfo] = useState<string | null>(null);

  // Hands (4 cards dealt at start of round; 2 loaded -> 2 remain)
  const [playerHand, setPlayerHand] = useState<CardInstance[]>(() =>
    drawFromSharedDeck(4)
  );
  const [opponentHand, setOpponentHand] = useState<CardInstance[]>(() =>
    drawFromSharedDeck(4)
  );

  // Pre-round selection (2 cards) & Turn Step A optional trap selection (1 card)
  const [selectedLoadCards, setSelectedLoadCards] = useState<CardInstance[]>([]);
  const [selectedTrapCard, setSelectedTrapCard] = useState<CardInstance | null>(null);

  // Active Face-Down Table Traps (max 1 per player)
  const [playerTableTrap, setPlayerTableTrap] = useState<CardInstance | null>(null);
  const [opponentTableTrap, setOpponentTableTrap] = useState<CardInstance | null>(null);
  const [revealedTrapOwner, setRevealedTrapOwner] = useState<ActorSide | null>(null);

  // Aim & Skip-Turn flags
  const [playerAim, setPlayerAim] = useState<AimChoice>('opponent');
  const [opponentAim, setOpponentAim] = useState<AimChoice>('opponent');
  const [playerSkipNextTurn, setPlayerSkipNextTurn] = useState<boolean>(false);
  const [opponentSkipNextTurn, setOpponentSkipNextTurn] = useState<boolean>(false);

  // Animation & FX Flags
  const [playerMuzzleFlash, setPlayerMuzzleFlash] = useState<boolean>(false);
  const [opponentMuzzleFlash, setOpponentMuzzleFlash] = useState<boolean>(false);
  const [playerDryFire, setPlayerDryFire] = useState<boolean>(false);
  const [opponentDryFire, setOpponentDryFire] = useState<boolean>(false);
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

  // Step D: Reload & Return to Pre-Round Load Phase
  const beginPreRoundLoad = useCallback(
    (
      nextRound: number,
      currentPHand: CardInstance[],
      currentOHand: CardInstance[],
      nextActive: ActorSide
    ) => {
      const pNeeded = Math.max(0, 4 - currentPHand.length);
      const oNeeded = Math.max(0, 4 - currentOHand.length);
      const nextPHand = [...currentPHand, ...drawFromSharedDeck(pNeeded)];
      const nextOHand = [...currentOHand, ...drawFromSharedDeck(oNeeded)];

      setCylinderSlots(createEmptyCylinderSlots());
      setCurrentChamberIdx(0);
      setPlayerTableTrap(null);
      setOpponentTableTrap(null);
      setRevealedTrapOwner(null);
      setSelectedLoadCards([]);
      setSelectedTrapCard(null);
      setPeekedSlotInfo(null);
      setPlayerHand(nextPHand);
      setOpponentHand(nextOHand);
      setRoundNumber(nextRound);
      setActivePlayer(nextActive);
      setPhase('PRE_ROUND_LOAD');
      soundEngine.playCardSlide();
      setStatusBanner(
        `ROUND ${nextRound} — SECRETLY LOAD 2 CARDS INTO THE EMPTY CYLINDER`
      );
      setSubBanner(
        'Pick 2 cards from your 4-card hand to load (remaining 2 stay in hand for Table Traps).'
      );
    },
    [drawFromSharedDeck]
  );

  // Start a fresh 1v1 Match against a Ladder Opponent
  const startStage = useCallback(
    (targetStageIdx: number) => {
      clearAllTimeouts();
      const targetOpp = LADDER_OPPONENTS[targetStageIdx];
      sharedDeckRef.current = createShuffledSharedDeck();
      discardPileRef.current = [];
      setSharedDeckCount(sharedDeckRef.current.length);

      setStageIndex(targetStageIdx);
      setPlayerHp(playerMaxHp);
      setOpponentHp(opponentMaxHp);
      setTurnNumber(1);
      setPlayerSkipNextTurn(false);
      setOpponentSkipNextTurn(false);
      setPlayerAim('opponent');
      setOpponentAim('opponent');
      setPlayerMuzzleFlash(false);
      setOpponentMuzzleFlash(false);
      setPlayerDryFire(false);
      setOpponentDryFire(false);
      setOpponentDamagedAnim(false);
      setPlayerDamagedFlash(false);
      setOpponentSpeech(targetOpp.tauntIntro);

      beginPreRoundLoad(1, [], [], 'player');
    },
    [beginPreRoundLoad]
  );

  // Step C: Full Turn Resolution Order (Reveal Chamber -> Check Opponent Trap -> Resolve Chamber -> Advance/Reload)
  const executeShotSequence = useCallback(
    (params: {
      shooter: ActorSide;
      aim: AimChoice;
      chamberIdx: number;
      slots: ChamberSlot[];
      pHand: CardInstance[];
      oHand: CardInstance[];
      pTrap: CardInstance | null;
      oTrap: CardInstance | null;
      pHp: number;
      oHp: number;
      pSkip: boolean;
      oSkip: boolean;
      currentRound: number;
    }) => {
      const {
        shooter,
        aim,
        chamberIdx,
        slots,
        pHand,
        oHand,
        pTrap,
        oTrap,
        pHp,
        oHp,
        pSkip,
        oSkip,
        currentRound,
      } = params;

      const isPlayerShooter = shooter === 'player';
      const target: ActorSide =
        aim === 'self' ? shooter : isPlayerShooter ? 'opponent' : 'player';
      const defender: ActorSide = isPlayerShooter ? 'opponent' : 'player';

      // C.1: Reveal current chamber card (or Empty/Blank)
      const workingSlots = slots.map((s, idx) =>
        idx === chamberIdx ? { ...s, revealed: true } : s
      );
      const chamberCard = workingSlots[chamberIdx]?.card ?? null;
      setCylinderSlots(workingSlots);
      setCurrentChamberIdx(chamberIdx);
      setPhase('RESOLVE_CHAMBER');
      soundEngine.playShellClink(1.1);

      const chamberLabel = chamberCard
        ? `${chamberCard.def.name} (${chamberCard.def.badgeText})`
        : 'EMPTY / BLANK CHAMBER';
      setStatusBanner(`CHAMBER #${chamberIdx + 1} REVEALED: ${chamberLabel}`);
      setSubBanner(
        `${isPlayerShooter ? 'YOU' : opponent.name} aimed at ${
          target === 'player' ? 'YOU' : opponent.name
        }...`
      );

      // C.2: Check if opponent (defender) has an active face-down table trap matching this action
      schedule(() => {
        const defenderTrap = defender === 'player' ? pTrap : oTrap;
        let trapResult: TableTriggerResult = { triggered: false, logMessage: '' };
        let nextPTrap = pTrap;
        let nextOTrap = oTrap;
        let workingPHand = [...pHand];
        let workingOHand = [...oHand];
        let workingPHp = pHp;
        let workingOHp = oHp;

        if (defenderTrap) {
          trapResult = defenderTrap.def.onTableTrigger({
            trapOwner: defender,
            shooter,
            target,
            aim,
            chamberCard,
          });
        }

        const runFireResolution = () => {
          // C.3: Resolve chamber card's effect and update lives/turn order
          setRevealedTrapOwner(null);
          setPhase(isPlayerShooter ? 'FIRE_PLAYER' : 'FIRE_OPPONENT');

          workingSlots[chamberIdx] = {
            ...workingSlots[chamberIdx],
            spent: true,
            revealed: true,
          };
          if (chamberCard) {
            discardPileRef.current.push(chamberCard);
          }
          setCylinderSlots([...workingSlots]);

          let fireRes;
          if (chamberCard) {
            fireRes = chamberCard.def.onChamberFire({
              shooter,
              target,
              aim,
              chamberIndex: chamberIdx,
              card: chamberCard,
              reflectedToShooter: Boolean(trapResult.reflectDamage),
              cancelledChamberEffect: Boolean(trapResult.cancelChamberEffect),
            });
          } else {
            const selfSafe = aim === 'self' && !trapResult.cancelChamberEffect;
            fireRes = {
              damageToTarget: 0,
              damageToShooter: 0,
              keepTurn: selfSafe,
              logMessage: selfSafe
                ? 'EMPTY CHAMBER! Self-shot safe — keep your turn!'
                : 'EMPTY CHAMBER! Harmless dry click.',
            };
          }

          // Apply damage
          if (fireRes.damageToTarget > 0) {
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
            } else {
              workingPHp = Math.max(0, workingPHp - fireRes.damageToTarget);
              setPlayerHp(workingPHp);
              setPlayerDamagedFlash(true);
              if (!isPlayerShooter) {
                setOpponentSpeech(
                  opponent.tauntHitPlayer[
                    Math.floor(Math.random() * opponent.tauntHitPlayer.length)
                  ]
                );
              }
            }
          }

          if (fireRes.damageToShooter > 0) {
            if (shooter === 'player') {
              workingPHp = Math.max(0, workingPHp - fireRes.damageToShooter);
              setPlayerHp(workingPHp);
              setPlayerDamagedFlash(true);
            } else {
              workingOHp = Math.max(0, workingOHp - fireRes.damageToShooter);
              setOpponentHp(workingOHp);
              setOpponentDamagedAnim(true);
            }
          }

          const totalBang =
            fireRes.damageToTarget > 0 || fireRes.damageToShooter > 0;
          if (totalBang) {
            soundEngine.playGunshotBlast(false);
            setShakeIntensity(1.15);
            if (isPlayerShooter) setPlayerMuzzleFlash(true);
            else setOpponentMuzzleFlash(true);
          } else {
            soundEngine.playDryFireClick();
            if (isPlayerShooter) setPlayerDryFire(true);
            else setOpponentDryFire(true);
          }

          // Secondary chamber effects: discard target card, draw cards, peek next, skip turn
          if (fireRes.discardTargetCard) {
            if (target === 'opponent' && workingOHand.length > 0) {
              const idx = Math.floor(Math.random() * workingOHand.length);
              const [removed] = workingOHand.splice(idx, 1);
              discardPileRef.current.push(removed);
              setOpponentHand([...workingOHand]);
            } else if (target === 'player' && workingPHand.length > 0) {
              const idx = Math.floor(Math.random() * workingPHand.length);
              const [removed] = workingPHand.splice(idx, 1);
              discardPileRef.current.push(removed);
              setPlayerHand([...workingPHand]);
            }
          }

          if (fireRes.drawCards && fireRes.drawCards > 0) {
            const extra = drawFromSharedDeck(fireRes.drawCards);
            if (isPlayerShooter) {
              workingPHand = [...workingPHand, ...extra];
              setPlayerHand(workingPHand);
            } else {
              workingOHand = [...workingOHand, ...extra];
              setOpponentHand(workingOHand);
            }
          }

          if (fireRes.peekNextChamber && isPlayerShooter) {
            const nextSlot = workingSlots[chamberIdx + 1];
            if (nextSlot) {
              const peekLabel = nextSlot.card
                ? `${nextSlot.card.def.name} (${nextSlot.card.def.badgeText})`
                : 'EMPTY / BLANK';
              setPeekedSlotInfo(`PEEKED CHAMBER #${chamberIdx + 2}: ${peekLabel}`);
            }
          }

          let nextPSkip = pSkip;
          let nextOSkip = oSkip;
          if (fireRes.skipShooterNextTurn) {
            if (shooter === 'player') nextPSkip = true;
            else nextOSkip = true;
            setPlayerSkipNextTurn(nextPSkip);
            setOpponentSkipNextTurn(nextOSkip);
          }

          if (fireRes.keepTurn && !trapResult.stealTurn) {
            if (isPlayerShooter) {
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

          setStatusBanner(fireRes.logMessage);
          setSubBanner(
            trapResult.triggered ? trapResult.logMessage : 'Resolving chamber outcome...'
          );

          // Wrap up fire animation & advance state
          schedule(() => {
            setPlayerMuzzleFlash(false);
            setOpponentMuzzleFlash(false);
            setPlayerDryFire(false);
            setOpponentDryFire(false);
            setOpponentDamagedAnim(false);
            setPlayerDamagedFlash(false);

            if (workingOHp <= 0) {
              soundEngine.playVictoryFanfare();
              setPhase('VICTORY');
              setStatusBanner(`${opponent.name} ELIMINATED — YOU WIN THE MATCH!`);
              setSubBanner('All 3 opponent lives depleted.');
              return;
            }
            if (workingPHp <= 0) {
              soundEngine.playDefeatToll();
              setPhase('GAME_OVER');
              setStatusBanner('YOU FELL AT THE TABLE');
              setSubBanner('All 3 of your lives were depleted.');
              return;
            }

            const nextIdx = chamberIdx + 1;

            // Purple Recoil Curse: force-fire next unspent chamber at shooter
            if (fireRes.forceFireNextAtShooter && nextIdx < 6) {
              executeShotSequence({
                shooter,
                aim: 'self',
                chamberIdx: nextIdx,
                slots: workingSlots,
                pHand: workingPHand,
                oHand: workingOHand,
                pTrap: nextPTrap,
                oTrap: nextOTrap,
                pHp: workingPHp,
                oHp: workingOHp,
                pSkip: nextPSkip,
                oSkip: nextOSkip,
                currentRound,
              });
              return;
            }

            // Step D: Reload when all 6 chambers are spent
            if (nextIdx >= 6) {
              if (nextPTrap) discardPileRef.current.push(nextPTrap);
              if (nextOTrap) discardPileRef.current.push(nextOTrap);
              setPhase('RELOAD_ROUND');
              setStatusBanner('ALL 6 CHAMBERS SPENT — RELOADING FOR NEXT ROUND');
              setSubBanner('Clearing unspent traps & drawing back up to 4 cards...');
              schedule(() => {
                const nextStarter: ActorSide =
                  fireRes.keepTurn && !trapResult.stealTurn ? shooter : defender;
                beginPreRoundLoad(
                  currentRound + 1,
                  workingPHand,
                  workingOHand,
                  nextStarter
                );
              }, 1100);
              return;
            }

            // Determine next active player
            setCurrentChamberIdx(nextIdx);
            setTurnNumber((t) => t + 1);
            setStats((s) => ({ ...s, turnsPlayed: s.turnsPlayed + 1 }));

            let nextActive: ActorSide =
              fireRes.keepTurn && !trapResult.stealTurn ? shooter : defender;

            if (nextActive === 'player' && nextPSkip) {
              nextPSkip = false;
              setPlayerSkipNextTurn(false);
              nextActive = 'opponent';
            } else if (nextActive === 'opponent' && nextOSkip) {
              nextOSkip = false;
              setOpponentSkipNextTurn(false);
              nextActive = 'player';
            }

            setActivePlayer(nextActive);
            if (nextActive === 'player') {
              setSelectedTrapCard(null);
              setPhase('PLAYER_SELECT');
              setStatusBanner('YOUR TURN — SET TRAP (OPTIONAL), AIM & FIRE');
              setSubBanner(
                `Chamber #${nextIdx + 1} of 6 ready. Place 1 trap or aim & ring the Bell.`
              );
            } else {
              setPhase('AI_THINKING');
              setStatusBanner(`${opponent.name}'S TURN...`);
              setSubBanner('Opponent is eyeing the felt and cylinder...');
            }
          }, 950);
        };

        if (trapResult.triggered && defenderTrap) {
          setPhase('RESOLVE_TRAP');
          setRevealedTrapOwner(defender);
          soundEngine.playAimTokenFlip();
          setStatusBanner(trapResult.logMessage);
          setSubBanner(`Opponent's face-down ${defenderTrap.def.name} triggered!`);

          // Apply immediate trap effects
          if (trapResult.damageShooter && trapResult.damageShooter > 0) {
            if (shooter === 'player') {
              workingPHp = Math.max(0, workingPHp - trapResult.damageShooter);
              setPlayerHp(workingPHp);
              setPlayerDamagedFlash(true);
            } else {
              workingOHp = Math.max(0, workingOHp - trapResult.damageShooter);
              setOpponentHp(workingOHp);
              setOpponentDamagedAnim(true);
            }
          }

          if (trapResult.discardShooterCard) {
            if (shooter === 'player' && workingPHand.length > 0) {
              const idx = Math.floor(Math.random() * workingPHand.length);
              const [removed] = workingPHand.splice(idx, 1);
              discardPileRef.current.push(removed);
              setPlayerHand([...workingPHand]);
            } else if (shooter === 'opponent' && workingOHand.length > 0) {
              const idx = Math.floor(Math.random() * workingOHand.length);
              const [removed] = workingOHand.splice(idx, 1);
              discardPileRef.current.push(removed);
              setOpponentHand([...workingOHand]);
            }
          }

          // Discard triggered trap
          discardPileRef.current.push(defenderTrap);
          if (defender === 'player') {
            nextPTrap = null;
            setPlayerTableTrap(null);
          } else {
            nextOTrap = null;
            setOpponentTableTrap(null);
          }

          schedule(runFireResolution, 950);
        } else {
          runFireResolution();
        }
      }, 800);
    },
    [opponent, drawFromSharedDeck, beginPreRoundLoad]
  );

  // Triggered when AI_THINKING phase begins
  useEffect(() => {
    if (phase !== 'AI_THINKING') return;

    const timer = window.setTimeout(() => {
      const remaining = countChamberCardTypes(cylinderSlots);
      const aiAction = decideAiTurnAction(
        opponentHand,
        opponentTableTrap,
        remaining,
        opponentHp
      );

      let nextOHand = [...opponentHand];
      let nextOTrap = opponentTableTrap;

      if (aiAction.trapCard && !nextOTrap) {
        nextOHand = nextOHand.filter((c) => c.uid !== aiAction.trapCard!.uid);
        nextOTrap = aiAction.trapCard;
        setOpponentHand(nextOHand);
        setOpponentTableTrap(nextOTrap);
        soundEngine.playCardSlide();
      }

      setOpponentAim(aiAction.aim);

      executeShotSequence({
        shooter: 'opponent',
        aim: aiAction.aim,
        chamberIdx: currentChamberIdx,
        slots: cylinderSlots,
        pHand: playerHand,
        oHand: nextOHand,
        pTrap: playerTableTrap,
        oTrap: nextOTrap,
        pHp: playerHp,
        oHp: opponentHp,
        pSkip: playerSkipNextTurn,
        oSkip: opponentSkipNextTurn,
        currentRound: roundNumber,
      });
    }, 950);

    return () => window.clearTimeout(timer);
  }, [
    phase,
    cylinderSlots,
    opponentHand,
    opponentTableTrap,
    opponentHp,
    currentChamberIdx,
    playerHand,
    playerTableTrap,
    playerHp,
    playerSkipNextTurn,
    opponentSkipNextTurn,
    roundNumber,
    executeShotSequence,
  ]);

  // Card Click Handler (Pre-Round Load: toggle 2 cards; Player Turn: toggle optional 1 trap card)
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
        if (playerTableTrap) return; // Max 1 active face-down trap
        setSelectedTrapCard((prev) => (prev?.uid === card.uid ? null : card));
      }
    },
    [phase, playerTableTrap]
  );

  // Brass Bell / Action Lock-In Handler
  const handleRingBell = useCallback(() => {
    if (phase === 'PRE_ROUND_LOAD') {
      if (selectedLoadCards.length !== 2) return;

      const aiLoad = decideAiLoadSelection(opponentHand);
      const nextPHand = playerHand.filter(
        (c) => !selectedLoadCards.some((s) => s.uid === c.uid)
      );
      const nextOHand = opponentHand.filter(
        (c) => !aiLoad.some((s) => s.uid === c.uid)
      );

      const newSlots = buildShuffledRoundCylinder([...selectedLoadCards, ...aiLoad]);

      setPlayerHand(nextPHand);
      setOpponentHand(nextOHand);
      setSelectedLoadCards([]);
      setCylinderSlots(newSlots);
      setCurrentChamberIdx(0);
      setPhase('SPIN_CYLINDERS');
      soundEngine.playCylinderLatch(false);
      soundEngine.playCylinderSpin();
      setOpponentSpeech(
        opponent.tauntLockIn[Math.floor(Math.random() * opponent.tauntLockIn.length)]
      );
      setStatusBanner('4 CARDS + 2 BLANKS LOADED — SPINNING CYLINDER!');
      setSubBanner('Exact chamber order is randomized and hidden from both players.');

      schedule(() => {
        if (activePlayer === 'player') {
          setPhase('PLAYER_SELECT');
          setStatusBanner('YOUR TURN — SET TRAP (OPTIONAL), AIM & FIRE');
          setSubBanner(
            'Chamber #1 of 6 ready. Optionally place 1 face-down trap, pick Aim, and fire!'
          );
        } else {
          setPhase('AI_THINKING');
          setStatusBanner(`${opponent.name}'S TURN...`);
          setSubBanner('Opponent is preparing their shot...');
        }
      }, 1150);
      return;
    }

    if (phase === 'PLAYER_SELECT') {
      let nextPHand = [...playerHand];
      let nextPTrap = playerTableTrap;

      if (selectedTrapCard && !nextPTrap) {
        nextPHand = nextPHand.filter((c) => c.uid !== selectedTrapCard.uid);
        nextPTrap = selectedTrapCard;
        setPlayerHand(nextPHand);
        setPlayerTableTrap(nextPTrap);
        setSelectedTrapCard(null);
      }

      executeShotSequence({
        shooter: 'player',
        aim: playerAim,
        chamberIdx: currentChamberIdx,
        slots: cylinderSlots,
        pHand: nextPHand,
        oHand: opponentHand,
        pTrap: nextPTrap,
        oTrap: opponentTableTrap,
        pHp: playerHp,
        oHp: opponentHp,
        pSkip: playerSkipNextTurn,
        oSkip: opponentSkipNextTurn,
        currentRound: roundNumber,
      });
    }
  }, [
    phase,
    selectedLoadCards,
    opponentHand,
    playerHand,
    opponent,
    activePlayer,
    playerTableTrap,
    selectedTrapCard,
    executeShotSequence,
    playerAim,
    currentChamberIdx,
    cylinderSlots,
    opponentTableTrap,
    playerHp,
    opponentHp,
    playerSkipNextTurn,
    opponentSkipNextTurn,
    roundNumber,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'PRE_ROUND_LOAD' && phase !== 'PLAYER_SELECT') return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (document.querySelector('dialog[open]')) return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= playerHand.length) {
        soundEngine.playCardSlide();
        handleSelectPlayerCard(playerHand[num - 1]);
      } else if (e.code === 'Space' && phase === 'PLAYER_SELECT') {
        e.preventDefault();
        soundEngine.playAimTokenFlip();
        setPlayerAim((prev) => (prev === 'opponent' ? 'self' : 'opponent'));
      } else if (e.code === 'Enter') {
        e.preventDefault();
        soundEngine.playBrassBell();
        handleRingBell();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, playerHand, handleSelectPlayerCard, handleRingBell]);

  const handleAdvanceNextStage = () => {
    const nextIdx = (stageIndex + 1) % LADDER_OPPONENTS.length;
    startStage(nextIdx);
  };

  const handleRestartRun = () => {
    setStats({
      turnsPlayed: 0,
      shotsFired: 0,
      selfShotsSurvived: 0,
      damageDealt: 0,
    });
    startStage(0);
  };

  const maskedCylinderShells = slotsToShellTypes(cylinderSlots, true);
  const readyToLockIn =
    phase === 'PRE_ROUND_LOAD'
      ? selectedLoadCards.length === 2
      : phase === 'PLAYER_SELECT';

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#09070a] select-none">
      {playerDamagedFlash && (
        <div className="pointer-events-none fixed inset-0 z-20 bg-red-600/35 ring-inset ring-24 ring-red-600/60 animate-pulse" />
      )}

      <TabletopScene
        opponent={opponent}
        phase={phase}
        playerHp={playerHp}
        playerMaxHp={playerMaxHp}
        opponentHp={opponentHp}
        opponentMaxHp={opponentMaxHp}
        playerCylinder={maskedCylinderShells}
        opponentCylinder={maskedCylinderShells}
        playerChamberIdx={currentChamberIdx}
        opponentChamberIdx={currentChamberIdx}
        playerHand={playerHand}
        opponentHand={opponentHand}
        selectedLoadCards={selectedLoadCards}
        selectedPlayerCard={selectedTrapCard}
        selectedOpponentCard={null}
        playerTableTrap={playerTableTrap}
        opponentTableTrap={opponentTableTrap}
        revealedTrapOwner={revealedTrapOwner}
        readyToLockIn={readyToLockIn}
        playerAim={playerAim}
        opponentAim={opponentAim}
        playerMuzzleFlash={playerMuzzleFlash}
        opponentMuzzleFlash={opponentMuzzleFlash}
        playerDryFire={playerDryFire}
        opponentDryFire={opponentDryFire}
        playerJammed={false}
        opponentJammed={false}
        opponentDamagedAnim={opponentDamagedAnim}
        shakeIntensity={shakeIntensity}
        focusMode={focusMode}
        useBlenderAssets={useBlenderAssets}
        onSelectPlayerCard={handleSelectPlayerCard}
        onHoverCard={setHoveredCard}
        onTogglePlayerAim={() =>
          setPlayerAim((prev) => (prev === 'opponent' ? 'self' : 'opponent'))
        }
        onRingBell={handleRingBell}
      />

      <HudAndModals
        opponent={opponent}
        stageIndex={stageIndex}
        roundNumber={roundNumber}
        turnNumber={turnNumber}
        activePlayer={activePlayer}
        phase={phase}
        statusBanner={statusBanner}
        subBanner={subBanner}
        opponentSpeech={opponentSpeech}
        peekedSlotInfo={peekedSlotInfo}
        playerHp={playerHp}
        playerMaxHp={playerMaxHp}
        opponentHp={opponentHp}
        opponentMaxHp={opponentMaxHp}
        cylinderSlots={cylinderSlots}
        currentChamberIdx={currentChamberIdx}
        showChamberCounts={showChamberCounts}
        sharedDeckCount={sharedDeckCount}
        playerHand={playerHand}
        selectedLoadCards={selectedLoadCards}
        selectedTrapCard={selectedTrapCard}
        playerTableTrap={playerTableTrap}
        opponentTableTrap={opponentTableTrap}
        playerAim={playerAim}
        hoveredCard={hoveredCard}
        muted={muted}
        focusMode={focusMode}
        useBlenderAssets={useBlenderAssets}
        stats={stats}
        onSelectPlayerCard={handleSelectPlayerCard}
        onHoverCard={setHoveredCard}
        onTogglePlayerAim={() =>
          setPlayerAim((prev) => (prev === 'opponent' ? 'self' : 'opponent'))
        }
        onRingBell={handleRingBell}
        onToggleChamberCounts={() => setShowChamberCounts((prev) => !prev)}
        onAdvanceNextStage={handleAdvanceNextStage}
        onRestartRun={handleRestartRun}
        onToggleMute={() => setMuted(soundEngine.toggleMute())}
        onChangeFocusMode={(m) => setFocusMode(m)}
        onToggleBlenderAssets={() => setUseBlenderAssets((prev) => !prev)}
      />
    </main>
  );
};

export default App;
