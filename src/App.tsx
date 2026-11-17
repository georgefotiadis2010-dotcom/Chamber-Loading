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
    'SIMULTANEOUS TURN — CHOOSE YOUR CARD'
  );
  const [subBanner, setSubBanner] = useState<string>(
    'Pick a card and ring the Brass Bell. Both players place at the same time!'
  );
  const [opponentSpeech, setOpponentSpeech] = useState<string>(
    LADDER_OPPONENTS[0].tauntIntro
  );

  // Shared 6-Chamber Cylinder (Starts with 1 Live + 5 Blanks)
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
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);

  // Simultaneously Placed Mid-Table Cards (this turn)
  const [playerPlayedCard, setPlayerPlayedCard] = useState<CardInstance | null>(null);
  const [opponentPlayedCard, setOpponentPlayedCard] = useState<CardInstance | null>(null);

  // Single Gun Random Target ('player' or 'opponent')
  const [randomGunTarget, setRandomGunTarget] = useState<ActorSide>('opponent');

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
      setStatusBanner(`ROUND ${nextRound} — SPINNING 6-CHAMBER CYLINDER!`);
      setSubBanner('Fresh brass & blank shells loaded into the drum...');

      schedule(() => {
        setPhase('PLAYER_SELECT');
        setStatusBanner('SIMULTANEOUS TURN — CHOOSE YOUR CARD');
        setSubBanner('Select a card & ring the Brass Bell to place simultaneously!');
      }, 900);
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
      syncDeckCounts();

      setStageIndex(targetStageIdx);
      setPlayerHp(playerMaxHp);
      setOpponentHp(targetOpp.maxHp);
      setTurnNumber(1);
      setRandomGunTarget('opponent');
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
        createCardInstance('purple_jinxpin'),
        createCardInstance('blue_silverblank'),
        createCardInstance('blue_hairtrigger'),
      ]);
      setRoundNumber(1);
      setPhase('PLAYER_SELECT');
      setStatusBanner('SIMULTANEOUS TURN — CHOOSE YOUR CARD');
      setSubBanner(
        'Pick a card and ring the Brass Bell. Both players place at the same time!'
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
    ): ChamberSlot[] => {
      let updated = slots.map((s) => ({ ...s }));
      const playedCards = [pCard, oCard].filter(
        (c): c is CardInstance => c !== null
      );

      let shouldSpinUnspent = false;

      for (const card of playedCards) {
        const unspentIndices = updated
          .map((s, idx) => (!s.spent && idx >= chamberIdx ? idx : -1))
          .filter((idx) => idx !== -1);
        if (unspentIndices.length === 0) continue;

        if (card.def.id === 'blue_silverblank') {
          // STRIP SHELL: Strip a Live (red) unspent chamber if one exists, otherwise load into an empty slot
          const redIdx = unspentIndices.find(
            (idx) => updated[idx].card?.def.color === 'red'
          );
          const targetIdx =
            redIdx ??
            unspentIndices.find((idx) => updated[idx].card === null) ??
            unspentIndices[0];
          updated[targetIdx] = {
            ...updated[targetIdx],
            card,
            spent: false,
            revealed: false,
          };
          soundEngine.playShellClink(1.25);
        } else if (card.def.color === 'red') {
          // LOAD LIVE / HEAVY SLUG: Prefer an empty/non-red unspent chamber
          const nonRedIndices = unspentIndices.filter(
            (idx) => updated[idx].card?.def.color !== 'red'
          );
          const pool = nonRedIndices.length > 0 ? nonRedIndices : unspentIndices;
          const targetIdx = pool[Math.floor(Math.random() * pool.length)];
          updated[targetIdx] = {
            ...updated[targetIdx],
            card,
            spent: false,
            revealed: false,
          };
          soundEngine.playShellClink(0.95);
        } else {
          // PAD CYLINDER / SPIN & RECOIL
          const emptyIndices = unspentIndices.filter(
            (idx) => updated[idx].card === null
          );
          const pool = emptyIndices.length > 0 ? emptyIndices : unspentIndices;
          const targetIdx = pool[Math.floor(Math.random() * pool.length)];
          updated[targetIdx] = {
            ...updated[targetIdx],
            card,
            spent: false,
            revealed: false,
          };
          if (card.def.id === 'purple_recoilcurse') {
            shouldSpinUnspent = true;
          }
          soundEngine.playCylinderSpin();
        }
      }

      if (shouldSpinUnspent) {
        const unspentCards = updated.slice(chamberIdx).map((s) => s.card);
        const shuffled = shuffleArray(unspentCards);
        updated = updated.map((s, idx) =>
          idx >= chamberIdx
            ? { ...s, card: shuffled[idx - chamberIdx], revealed: false }
            : s
        );
      }

      return updated;
    },
    []
  );

  // Full Simultaneous Turn Resolution:
  // 1. Reveal both placed cards -> 2. Randomly pick gun target -> 3. Fire single gun once -> 4. Advance
  const executeSimultaneousTurn = useCallback(
    (params: {
      pCard: CardInstance | null;
      oCard: CardInstance | null;
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
        chamberIdx,
        slots,
        pHand,
        oHand,
        pHp,
        oHp,
        currentRound,
      } = params;

      setPhase('REVEAL_CARDS');
      soundEngine.playCardSlide();
      setStatusBanner('CARDS REVEALED — MODIFYING CYLINDER!');
      setSubBanner(
        `You: ${pCard ? pCard.def.name : 'PASS'}  ·  ${opponent.name}: ${
          oCard ? oCard.def.name : 'PASS'
        }`
      );

      schedule(() => {
        // Randomly pick who the single gun shoots at ('player' or 'opponent')
        const target: ActorSide = Math.random() < 0.5 ? 'opponent' : 'player';
        setRandomGunTarget(target);

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
        setStatusBanner(
          `GUN AIMED AT ${target === 'player' ? 'YOU' : opponent.name}!`
        );
        setSubBanner(`Chamber #${chamberIdx + 1}: ${chamberLabel}`);

        schedule(() => {
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

          const fireRes = chamberCard
            ? chamberCard.def.onChamberFire({
                target,
                chamberIndex: chamberIdx,
                card: chamberCard,
              })
            : {
                damageToTarget: 0,
                logMessage: 'SILVER BLANK! Harmless metallic click.',
              };

          let workingPHp = pHp;
          let workingOHp = oHp;
          let workingPHand = [...pHand];
          let workingOHand = [...oHand];

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
            } else {
              workingPHp = Math.max(0, workingPHp - fireRes.damageToTarget);
              setPlayerHp(workingPHp);
              setPlayerDamagedFlash(true);
              setOpponentSpeech(
                opponent.tauntHitPlayer[
                  Math.floor(Math.random() * opponent.tauntHitPlayer.length)
                ]
              );
            }
          } else {
            soundEngine.playDryFireClick();
            setGunDryFire(true);
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

          if (fireRes.drawCardsForBoth && fireRes.drawCardsForBoth > 0) {
            const pExtra = drawFromSharedDeck(fireRes.drawCardsForBoth);
            const oExtra = drawFromSharedDeck(fireRes.drawCardsForBoth);
            workingPHand = [...workingPHand, ...pExtra];
            workingOHand = [...workingOHand, ...oExtra];
            setPlayerHand(workingPHand);
            setOpponentHand(workingOHand);
          }

          if (fireRes.peekNextChamber) {
            const nextSlot = workingSlots[chamberIdx + 1];
            if (nextSlot) {
              const peekLabel = nextSlot.card
                ? `${nextSlot.card.def.name} (${nextSlot.card.def.badgeText})`
                : 'SILVER BLANK';
              setPeekedSlotInfo(`PEEKED CHAMBER #${chamberIdx + 2}: ${peekLabel}`);
            }
          }

          setStatusBanner(fireRes.logMessage);
          setSubBanner(
            `Single shot fired at ${target === 'player' ? 'YOU' : opponent.name}.`
          );

          schedule(() => {
            setGunMuzzleFlash(false);
            setGunDryFire(false);
            setOpponentDamagedAnim(false);
            setPlayerDamagedFlash(false);

            // Discard both played cards after the turn resolves
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

            // Reload when all 6 chambers are spent
            if (nextIdx >= 6) {
              setPhase('RELOAD_ROUND');
              setStatusBanner('ALL 6 CHAMBERS SPENT — RELOADING CYLINDER');
              setSubBanner('Replenishing hands & loading fresh shells...');
              schedule(() => {
                beginNewRound(currentRound + 1, workingPHand, workingOHand);
              }, 1050);
              return;
            }

            // Replenish hands if empty
            if (workingPHand.length === 0) {
              workingPHand = drawFromSharedDeck(3);
              setPlayerHand(workingPHand);
            }
            if (workingOHand.length === 0) {
              workingOHand = drawFromSharedDeck(3);
              setOpponentHand(workingOHand);
            }

            setCurrentChamberIdx(nextIdx);
            setTurnNumber((t) => t + 1);
            setStats((s) => ({ ...s, turnsPlayed: s.turnsPlayed + 1 }));
            setSelectedCard(null);
            setPhase('PLAYER_SELECT');
            setStatusBanner('SIMULTANEOUS TURN — CHOOSE YOUR CARD');
            setSubBanner(
              `Chamber #${nextIdx + 1} of 6 ready. Pick a card & ring the Bell!`
            );
          }, 950);
        }, 750);
      }, 850);
    },
    [opponent, drawFromSharedDeck, beginNewRound, syncDeckCounts]
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

    const nextSlots = applySimultaneousCardsToCylinder(
      pCard,
      oCard,
      cylinderSlots,
      currentChamberIdx
    );
    setCylinderSlots(nextSlots);

    setOpponentSpeech(
      opponent.tauntLockIn[Math.floor(Math.random() * opponent.tauntLockIn.length)]
    );

    executeSimultaneousTurn({
      pCard,
      oCard,
      chamberIdx: currentChamberIdx,
      slots: nextSlots,
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
        sharedCylinder={shellTypesFor3D}
        currentChamberIdx={currentChamberIdx}
        playerHand={playerHand}
        opponentHand={opponentHand}
        selectedLoadCards={selectedLoadCards}
        selectedPlayerCard={selectedCard}
        playerPlayedCard={playerPlayedCard}
        opponentPlayedCard={opponentPlayedCard}
        readyToLockIn={readyToLockIn}
        randomGunTarget={randomGunTarget}
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
