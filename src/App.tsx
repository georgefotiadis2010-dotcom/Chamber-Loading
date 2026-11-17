import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActorSide,
  AimChoice,
  CardId,
  CardInstance,
  ChamberSlot,
  TableTriggerResult,
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
  const [activePlayer, setActivePlayer] = useState<ActorSide>('player');
  const [phase, setPhase] = useState<TurnPhase>('PLAYER_SELECT');

  const [statusBanner, setStatusBanner] = useState<string>(
    'YOUR TURN — CHOOSE CARD & TARGET'
  );
  const [subBanner, setSubBanner] = useState<string>(
    'Click a card to slide it onto LOCK IN SLOT, select Aim Chip, and ring the Brass Bell!'
  );
  const [opponentSpeech, setOpponentSpeech] = useState<string>(
    LADDER_OPPONENTS[0].tauntIntro
  );

  // Shared 6-Chamber Cylinder (Starts with 1 Live + 5 Blanks, matching image_1.png & image_2.png)
  const [cylinderSlots, setCylinderSlots] = useState<ChamberSlot[]>(() =>
    buildShuffledRoundCylinder([createCardInstance('red_crimsonslug')])
  );
  const [currentChamberIdx, setCurrentChamberIdx] = useState<number>(0);
  const [showChamberCounts, setShowChamberCounts] = useState<boolean>(true);
  const [peekedSlotInfo, setPeekedSlotInfo] = useState<string | null>(null);

  // Player foreground hand starts with the 3 iconic cards: LOAD LIVE, STRIP SHELL, PAD CYLINDER
  const [playerHand, setPlayerHand] = useState<CardInstance[]>(() =>
    createHeroTrioHand()
  );
  // Opponent far hand starts with 4 face-up cards across the top of the wood table
  const [opponentHand, setOpponentHand] = useState<CardInstance[]>(() => [
    createCardInstance('red_crimsonslug'),
    createCardInstance('purple_jinxpin'),
    createCardInstance('blue_silverblank'),
    createCardInstance('blue_hairtrigger'),
  ]);

  const [selectedLoadCards, setSelectedLoadCards] = useState<CardInstance[]>([]);
  const [selectedTrapCard, setSelectedTrapCard] = useState<CardInstance | null>(null);

  // Active Mid-Table Slot Cards (SLOT 1 / SLOT 2)
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

  // Reload Cylinder & Replenish Hands for Next Round
  const beginNewRound = useCallback(
    (
      nextRound: number,
      currentPHand: CardInstance[],
      currentOHand: CardInstance[],
      nextActive: ActorSide
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
      setPhase('SPIN_CYLINDERS');
      soundEngine.playCylinderSpin();
      setStatusBanner(`ROUND ${nextRound} — SPINNING 6-CHAMBER CYLINDER!`);
      setSubBanner('Fresh brass & blank shells loaded into the drum...');

      schedule(() => {
        if (nextActive === 'player') {
          setPhase('PLAYER_SELECT');
          setStatusBanner('YOUR TURN — CHOOSE CARD & TARGET');
          setSubBanner('Select a card to Lock In, pick your Aim Chip, and ring the Bell!');
        } else {
          setPhase('AI_THINKING');
          setStatusBanner(`${opponent.name}'S TURN...`);
          setSubBanner('Opponent is eyeing the wood slots and cylinder...');
        }
      }, 900);
    },
    [drawFromSharedDeck, opponent.name]
  );

  // Start a fresh 1v1 Match against a Ladder Opponent
  const startStage = useCallback(
    (targetStageIdx: number) => {
      clearAllTimeouts();
      const targetOpp = LADDER_OPPONENTS[targetStageIdx];
      sharedDeckRef.current = createShuffledSharedDeck();
      discardPileRef.current = [];
      syncDeckCounts();

      setStageIndex(targetStageIdx);
      setPlayerHp(playerMaxHp);
      setOpponentHp(targetOpp.maxHp);
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

      setCylinderSlots(
        buildShuffledRoundCylinder([createCardInstance('red_crimsonslug')])
      );
      setCurrentChamberIdx(0);
      setPlayerTableTrap(null);
      setOpponentTableTrap(null);
      setRevealedTrapOwner(null);
      setSelectedLoadCards([]);
      setSelectedTrapCard(null);
      setPeekedSlotInfo(null);
      setPlayerHand(createHeroTrioHand());
      setOpponentHand([
        createCardInstance('red_crimsonslug'),
        createCardInstance('purple_jinxpin'),
        createCardInstance('blue_silverblank'),
        createCardInstance('blue_hairtrigger'),
      ]);
      setRoundNumber(1);
      setActivePlayer('player');
      setPhase('PLAYER_SELECT');
      setStatusBanner('YOUR TURN — CHOOSE CARD & TARGET');
      setSubBanner(
        'Click a card to slide it onto LOCK IN SLOT, select Aim Chip, and ring the Brass Bell!'
      );
    },
    [syncDeckCounts]
  );

  // Full Turn Resolution Order (Resolve Locked Card -> Check Opponent Slot Counter -> Fire Revolver)
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
        : 'SILVER BLANK CHAMBER';
      setStatusBanner(`CHAMBER #${chamberIdx + 1}: ${chamberLabel}`);
      setSubBanner(
        `${isPlayerShooter ? 'YOU' : opponent.name} aimed at ${
          target === 'player' ? 'YOU' : opponent.name
        }...`
      );

      // C.2: Check if defender has an active mid-table slot card matching this action
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
          setRevealedTrapOwner(null);
          setPhase(isPlayerShooter ? 'FIRE_PLAYER' : 'FIRE_OPPONENT');

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
                ? 'SILVER BLANK! Self-shot safe — you keep your turn!'
                : 'SILVER BLANK! Harmless metallic click.',
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

          if (fireRes.discardTargetCard) {
            if (target === 'opponent' && workingOHand.length > 0) {
              const idx = Math.floor(Math.random() * workingOHand.length);
              const [removed] = workingOHand.splice(idx, 1);
              discardPileRef.current.push(removed);
              syncDeckCounts();
              setOpponentHand([...workingOHand]);
            } else if (target === 'player' && workingPHand.length > 0) {
              const idx = Math.floor(Math.random() * workingPHand.length);
              const [removed] = workingPHand.splice(idx, 1);
              discardPileRef.current.push(removed);
              syncDeckCounts();
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
                : 'SILVER BLANK';
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
            trapResult.triggered ? trapResult.logMessage : 'Resolving revolver shot...'
          );

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

            // Reload when all 6 chambers are spent
            if (nextIdx >= 6) {
              if (nextPTrap) discardPileRef.current.push(nextPTrap);
              if (nextOTrap) discardPileRef.current.push(nextOTrap);
              syncDeckCounts();
              setPhase('RELOAD_ROUND');
              setStatusBanner('ALL 6 CHAMBERS SPENT — RELOADING CYLINDER');
              setSubBanner('Replenishing hands & loading fresh shells...');
              schedule(() => {
                const nextStarter: ActorSide =
                  fireRes.keepTurn && !trapResult.stealTurn ? shooter : defender;
                beginNewRound(
                  currentRound + 1,
                  workingPHand,
                  workingOHand,
                  nextStarter
                );
              }, 1050);
              return;
            }

            // Replenish player hand if empty so foreground cards stay rich
            if (workingPHand.length === 0) {
              workingPHand = drawFromSharedDeck(3);
              setPlayerHand(workingPHand);
            }

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
              setStatusBanner('YOUR TURN — CHOOSE CARD & TARGET');
              setSubBanner(
                `Chamber #${nextIdx + 1} of 6 ready. Select a card or Aim & ring the Bell!`
              );
            } else {
              setPhase('AI_THINKING');
              setStatusBanner(`${opponent.name}'S TURN...`);
              setSubBanner('Opponent is choosing their card and target...');
            }
          }, 950);
        };

        if (trapResult.triggered && defenderTrap) {
          setPhase('RESOLVE_TRAP');
          setRevealedTrapOwner(defender);
          soundEngine.playAimTokenFlip();
          setStatusBanner(trapResult.logMessage);
          setSubBanner(`Mid-table slot card ${defenderTrap.def.name} triggered!`);

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
              syncDeckCounts();
              setPlayerHand([...workingPHand]);
            } else if (shooter === 'opponent' && workingOHand.length > 0) {
              const idx = Math.floor(Math.random() * workingOHand.length);
              const [removed] = workingOHand.splice(idx, 1);
              discardPileRef.current.push(removed);
              syncDeckCounts();
              setOpponentHand([...workingOHand]);
            }
          }

          discardPileRef.current.push(defenderTrap);
          syncDeckCounts();
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
      }, 750);
    },
    [opponent, drawFromSharedDeck, beginNewRound, syncDeckCounts]
  );

  // Apply active card manipulation to cylinder when locked in
  const applyLockedCardToCylinder = useCallback(
    (card: CardInstance, slots: ChamberSlot[], chamberIdx: number): ChamberSlot[] => {
      const updated = slots.map((s) => ({ ...s }));
      if (card.def.color === 'red') {
        // LOAD LIVE / HEAVY SLUG: Loads a Live brass shell into the current or random unspent chamber
        updated[chamberIdx] = {
          ...updated[chamberIdx],
          card,
          spent: false,
          revealed: false,
        };
        soundEngine.playShellClink(0.95);
      } else if (card.def.color === 'blue') {
        // STRIP SHELL / HAIR TRIGGER: Strips any live round from the current chamber and replaces with Blank
        updated[chamberIdx] = {
          ...updated[chamberIdx],
          card,
          spent: false,
          revealed: false,
        };
        soundEngine.playShellClink(1.25);
      } else {
        // PAD CYLINDER / SPIN & RECOIL: Pads remaining empty slots or current chamber
        updated[chamberIdx] = {
          ...updated[chamberIdx],
          card,
          spent: false,
          revealed: false,
        };
        soundEngine.playCylinderSpin();
      }
      return updated;
    },
    []
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
      let nextSlots = cylinderSlots;

      if (aiAction.trapCard) {
        nextOHand = nextOHand.filter((c) => c.uid !== aiAction.trapCard!.uid);
        nextOTrap = aiAction.trapCard;
        setOpponentHand(nextOHand);
        setOpponentTableTrap(nextOTrap);
        nextSlots = applyLockedCardToCylinder(
          aiAction.trapCard,
          cylinderSlots,
          currentChamberIdx
        );
        setCylinderSlots(nextSlots);
        soundEngine.playCardSlide();
      }

      setOpponentAim(aiAction.aim);

      executeShotSequence({
        shooter: 'opponent',
        aim: aiAction.aim,
        chamberIdx: currentChamberIdx,
        slots: nextSlots,
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
    applyLockedCardToCylinder,
  ]);

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
        setSelectedTrapCard((prev) => (prev?.uid === card.uid ? null : card));
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

  // Brass Bell / LOCK IN Handler
  const handleRingBell = useCallback(() => {
    if (phase === 'PLAYER_SELECT') {
      let nextPHand = [...playerHand];
      let nextPTrap = playerTableTrap;
      let nextSlots = cylinderSlots;

      if (selectedTrapCard) {
        nextPHand = nextPHand.filter((c) => c.uid !== selectedTrapCard.uid);
        nextPTrap = selectedTrapCard;
        setPlayerHand(nextPHand);
        setPlayerTableTrap(nextPTrap);
        nextSlots = applyLockedCardToCylinder(
          selectedTrapCard,
          cylinderSlots,
          currentChamberIdx
        );
        setCylinderSlots(nextSlots);
        setSelectedTrapCard(null);
      }

      setOpponentSpeech(
        opponent.tauntLockIn[Math.floor(Math.random() * opponent.tauntLockIn.length)]
      );

      executeShotSequence({
        shooter: 'player',
        aim: playerAim,
        chamberIdx: currentChamberIdx,
        slots: nextSlots,
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
    playerHand,
    playerTableTrap,
    cylinderSlots,
    selectedTrapCard,
    applyLockedCardToCylinder,
    currentChamberIdx,
    opponent,
    executeShotSequence,
    playerAim,
    opponentHand,
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
      } else if (e.key === 'Enter') {
        e.preventDefault();
        soundEngine.playBrassBell();
        handleRingBell();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, playerHand, handleSelectPlayerCard, handleRingBell]);

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
        playerCylinder={shellTypesFor3D}
        opponentCylinder={shellTypesFor3D}
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
        playerJammed={playerSkipNextTurn}
        opponentJammed={opponentSkipNextTurn}
        opponentDamagedAnim={opponentDamagedAnim}
        shakeIntensity={shakeIntensity}
        focusMode={focusMode}
        useBlenderAssets={useBlenderAssets}
        onSelectPlayerCard={handleSelectPlayerCard}
        onHoverCard={setHoveredCard}
        onTogglePlayerAim={() =>
          setPlayerAim((prev) => (prev === 'opponent' ? 'self' : 'opponent'))
        }
        onSelectPlayerAim={(choice) => setPlayerAim(choice)}
        onRingBell={handleRingBell}
      />

      {/* Cartoon Tabletop HUD & Modals Overlay */}
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
        discardCount={discardCount}
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
        onSelectPlayerAim={(choice) => setPlayerAim(choice)}
        onRingBell={handleRingBell}
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
