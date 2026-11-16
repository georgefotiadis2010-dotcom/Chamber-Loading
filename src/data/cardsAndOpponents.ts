import {
  AimChoice,
  CardDef,
  CardId,
  CardInstance,
  ChamberSlot,
  OpponentDef,
  ShellType,
} from '../types/game';

export const CARD_DEFINITIONS: Record<CardId, CardDef> = {
  red_crimsonslug: {
    id: 'red_crimsonslug',
    name: 'CRIMSON SLUG',
    color: 'red',
    category: 'red',
    shortTag: '1 DMG + DISCARD',
    description:
      'CHAMBER: 1 DMG + target discards 1 card. TRAP: Reflects a Red Live shot aimed at you.',
    chamberEffectText: 'Deals 1 DMG to target and forces them to discard 1 card.',
    tableTrapText: 'When opponent aims a Red Live card at you: Reflect 1 DMG back.',
    accentColor: '#ef4444',
    borderColor: '#dc2626',
    badgeText: 'RED • LIVE',
    onChamberFire: (ctx) => {
      if (ctx.cancelledChamberEffect) {
        return {
          damageToTarget: 0,
          damageToShooter: 0,
          keepTurn: false,
          logMessage: 'Crimson Slug was nullified by a Table Trap!',
        };
      }
      if (ctx.reflectedToShooter) {
        return {
          damageToTarget: 0,
          damageToShooter: 1,
          keepTurn: false,
          logMessage: 'Crimson Slug reflected! Shooter takes 1 DMG.',
        };
      }
      return {
        damageToTarget: 1,
        damageToShooter: 0,
        keepTurn: false,
        discardTargetCard: true,
        logMessage: 'CRIMSON SLUG fired! 1 DMG + target discards 1 card.',
      };
    },
    onTableTrigger: (ctx) => {
      const isRedAtOwner =
        ctx.shooter !== ctx.trapOwner &&
        ctx.target === ctx.trapOwner &&
        ctx.chamberCard?.def.color === 'red';
      if (!isRedAtOwner) {
        return { triggered: false, logMessage: '' };
      }
      return {
        triggered: true,
        reflectDamage: true,
        logMessage: 'TRAP SPRUNG: Crimson Slug reflected the Red Live shot!',
      };
    },
  },

  red_hollowpoint: {
    id: 'red_hollowpoint',
    name: 'HOLLOW POINT',
    color: 'red',
    category: 'red',
    shortTag: '1 DMG + DRAW 1',
    description:
      'CHAMBER: 1 DMG + shooter draws 1 card. TRAP: Counter-deals 1 DMG when opponent fires Red.',
    chamberEffectText: 'Deals 1 DMG to target and shooter draws 1 card.',
    tableTrapText: 'When opponent fires any Red Live card: Deal 1 counter-DMG to them.',
    accentColor: '#f97316',
    borderColor: '#ea580c',
    badgeText: 'RED • LIVE',
    onChamberFire: (ctx) => {
      if (ctx.cancelledChamberEffect) {
        return {
          damageToTarget: 0,
          damageToShooter: 0,
          keepTurn: false,
          logMessage: 'Hollow Point was nullified by a Table Trap!',
        };
      }
      if (ctx.reflectedToShooter) {
        return {
          damageToTarget: 0,
          damageToShooter: 1,
          keepTurn: false,
          logMessage: 'Hollow Point reflected! Shooter takes 1 DMG.',
        };
      }
      return {
        damageToTarget: 1,
        damageToShooter: 0,
        keepTurn: false,
        drawCards: 1,
        logMessage: 'HOLLOW POINT fired! 1 DMG + shooter draws 1 card.',
      };
    },
    onTableTrigger: (ctx) => {
      const isOpponentRed =
        ctx.shooter !== ctx.trapOwner && ctx.chamberCard?.def.color === 'red';
      if (!isOpponentRed) {
        return { triggered: false, logMessage: '' };
      }
      return {
        triggered: true,
        damageShooter: 1,
        logMessage: 'TRAP SPRUNG: Hollow Point dealt 1 counter-DMG to the shooter!',
      };
    },
  },

  blue_silverblank: {
    id: 'blue_silverblank',
    name: 'SILVER BLANK',
    color: 'blue',
    category: 'blue',
    shortTag: '0 DMG • PEEK NEXT',
    description:
      'CHAMBER: 0 DMG. If aimed at self, keep turn & peek next chamber. TRAP: Nullify 1 incoming shot.',
    chamberEffectText: '0 DMG. Self-shot keeps turn & peeks at the next chamber.',
    tableTrapText: 'When opponent shoots at you: Cancel all chamber damage & effects.',
    accentColor: '#38bdf8',
    borderColor: '#0284c7',
    badgeText: 'BLUE • BLANK',
    onChamberFire: (ctx) => {
      const selfShot = ctx.aim === 'self';
      return {
        damageToTarget: 0,
        damageToShooter: 0,
        keepTurn: selfShot,
        peekNextChamber: selfShot,
        logMessage: selfShot
          ? 'SILVER BLANK! Self-shot safe — keep turn & peek next chamber!'
          : 'SILVER BLANK! Harmless click across the table.',
      };
    },
    onTableTrigger: (ctx) => {
      const aimedAtOwner =
        ctx.shooter !== ctx.trapOwner && ctx.target === ctx.trapOwner;
      if (!aimedAtOwner) {
        return { triggered: false, logMessage: '' };
      }
      return {
        triggered: true,
        cancelChamberEffect: true,
        logMessage: 'TRAP SPRUNG: Silver Blank warded off the incoming shot!',
      };
    },
  },

  blue_hairtrigger: {
    id: 'blue_hairtrigger',
    name: 'HAIR TRIGGER',
    color: 'blue',
    category: 'blue',
    shortTag: '0 DMG • DRAW 1',
    description:
      'CHAMBER: 0 DMG. If aimed at self, keep turn & draw 1 card. TRAP: Steal opponent self-shot turn.',
    chamberEffectText: '0 DMG. Self-shot keeps turn & draws 1 card.',
    tableTrapText: 'When opponent shoots themselves with a Blank/Empty: Steal their extra turn.',
    accentColor: '#3b82f6',
    borderColor: '#2563eb',
    badgeText: 'BLUE • BLANK',
    onChamberFire: (ctx) => {
      const selfShot = ctx.aim === 'self';
      return {
        damageToTarget: 0,
        damageToShooter: 0,
        keepTurn: selfShot,
        drawCards: selfShot ? 1 : 0,
        logMessage: selfShot
          ? 'HAIR TRIGGER! Self-shot safe — keep turn & draw 1 card!'
          : 'HAIR TRIGGER! Blank click across the table.',
      };
    },
    onTableTrigger: (ctx) => {
      const isOppSelfSafe =
        ctx.shooter !== ctx.trapOwner &&
        ctx.aim === 'self' &&
        (ctx.chamberCard === null || ctx.chamberCard.def.color === 'blue');
      if (!isOppSelfSafe) {
        return { triggered: false, logMessage: '' };
      }
      return {
        triggered: true,
        stealTurn: true,
        logMessage: 'TRAP SPRUNG: Hair Trigger stole the opponent’s bonus turn!',
      };
    },
  },

  purple_jinxpin: {
    id: 'purple_jinxpin',
    name: 'JINX PIN',
    color: 'purple',
    category: 'purple',
    shortTag: 'TRAP: SKIP TURN',
    description:
      'CHAMBER: 0 DMG; shooter skips their next turn. TRAP: When opponent fires Purple, they discard 1.',
    chamberEffectText: '0 DMG. Shooter immediately suffers a Jinx and skips their next turn.',
    tableTrapText: 'When opponent fires a Purple Trap chamber: Force them to discard 1 card.',
    accentColor: '#a855f7',
    borderColor: '#9333ea',
    badgeText: 'PURPLE • TRAP',
    onChamberFire: (ctx) => {
      if (ctx.cancelledChamberEffect) {
        return {
          damageToTarget: 0,
          damageToShooter: 0,
          keepTurn: false,
          logMessage: 'Jinx Pin was nullified by a Table Trap!',
        };
      }
      return {
        damageToTarget: 0,
        damageToShooter: 0,
        keepTurn: false,
        skipShooterNextTurn: true,
        logMessage: 'JINX PIN triggered! Shooter skips their next turn!',
      };
    },
    onTableTrigger: (ctx) => {
      const isOppPurple =
        ctx.shooter !== ctx.trapOwner && ctx.chamberCard?.def.color === 'purple';
      if (!isOppPurple) {
        return { triggered: false, logMessage: '' };
      }
      return {
        triggered: true,
        discardShooterCard: true,
        logMessage: 'TRAP SPRUNG: Jinx Pin forced the shooter to discard 1 card!',
      };
    },
  },

  purple_recoilcurse: {
    id: 'purple_recoilcurse',
    name: 'RECOIL CURSE',
    color: 'purple',
    category: 'purple',
    shortTag: 'TRAP: FORCE SELF',
    description:
      'CHAMBER: 0 DMG; force-fires the next chamber at shooter! TRAP: Opponent shoots you -> discards 1.',
    chamberEffectText:
      '0 DMG. Immediately force-fires the next unspent chamber at the shooter!',
    tableTrapText: 'When opponent aims at you: Force them to discard 1 card.',
    accentColor: '#ec4899',
    borderColor: '#db2777',
    badgeText: 'PURPLE • TRAP',
    onChamberFire: (ctx) => {
      if (ctx.cancelledChamberEffect) {
        return {
          damageToTarget: 0,
          damageToShooter: 0,
          keepTurn: false,
          logMessage: 'Recoil Curse was nullified by a Table Trap!',
        };
      }
      return {
        damageToTarget: 0,
        damageToShooter: 0,
        keepTurn: false,
        forceFireNextAtShooter: true,
        logMessage: 'RECOIL CURSE! Next chamber is force-fired at the shooter!',
      };
    },
    onTableTrigger: (ctx) => {
      const aimedAtOwner =
        ctx.shooter !== ctx.trapOwner && ctx.target === ctx.trapOwner;
      if (!aimedAtOwner) {
        return { triggered: false, logMessage: '' };
      }
      return {
        triggered: true,
        discardShooterCard: true,
        logMessage: 'TRAP SPRUNG: Recoil Curse forced the attacker to discard 1 card!',
      };
    },
  },
};

export const ALL_CARD_IDS: CardId[] = [
  'red_crimsonslug',
  'red_hollowpoint',
  'blue_silverblank',
  'blue_hairtrigger',
  'purple_jinxpin',
  'purple_recoilcurse',
];

// 24-card shared deck (4 copies of each of the 6 cards)
export const SHARED_DECK_IDS: CardId[] = [
  ...ALL_CARD_IDS,
  ...ALL_CARD_IDS,
  ...ALL_CARD_IDS,
  ...ALL_CARD_IDS,
];

export const LADDER_OPPONENTS: OpponentDef[] = [
  {
    stage: 1,
    id: 'rookie',
    name: 'THE ROOKIE',
    title: 'Sweaty Tinhorn Gambler',
    maxHp: 3,
    tauntIntro: '"Two cards each into six chambers... I like my odds!"',
    tauntLockIn: [
      '"Good luck guessing which chambers I loaded!"',
      '"Two shells in, two cards left on the felt."',
      '"Spin that drum and let fate decide."',
    ],
    tauntHitPlayer: [
      '"HAH! Right across the felt!"',
      '"Crimson lead never lies!"',
    ],
    tauntSelfSafe: [
      '"Click! Still breathing, and I keep the trigger!"',
      '"Blue blank! My turn again!"',
    ],
    tauntDamaged: [
      '"Gah! You loaded that Red slug on purpose!"',
      '"Wait—how did you know that slot was live?!"',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_rookie.glb`,
    maskColor: '#e0d6c2',
    accentColor: '#ad6b33',
    eyeColor: '#f2bf40',
  },
  {
    stage: 2,
    id: 'counter',
    name: 'THE COUNTER',
    title: 'Brass Probability Automaton',
    maxHp: 3,
    tauntIntro: '"SIX CHAMBERS. FOUR LOADED CARDS. PROBABILITY MATRIX INITIALIZED."',
    tauntLockIn: [
      '"OPTIMAL AMMUNITION PAIR LOCKED."',
      '"CHAMBER ENTROPY COMPUTED."',
      '"PROCEEDING TO RANDOMIZED SPIN."',
    ],
    tauntHitPlayer: [
      '"DIRECT HIT CONFIRMED."',
      '"EXPECTED VALUE REALIZED."',
    ],
    tauntSelfSafe: [
      '"ZERO-DAMAGE SELF-TEST PASSED. RETAINING TURN."',
      '"CHAMBER SAFE. CONTINUING SEQUENCE."',
    ],
    tauntDamaged: [
      '"VARIANCE EXCEEDED THRESHOLD."',
      '"RECALIBRATING TRAP HEURISTICS..."',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_counter.glb`,
    maskColor: '#384252',
    accentColor: '#d9ad38',
    eyeColor: '#26f28c',
  },
  {
    stage: 3,
    id: 'heavy',
    name: 'HEAVY TRIGGER',
    title: 'Ironclad Magnum Enforcer',
    maxHp: 3,
    tauntIntro: '"Three lives each. One shared cylinder. Load your best lead."',
    tauntLockIn: [
      '"I loaded something nasty into that drum."',
      '"Hope you like Crimson slugs."',
      '"No mercy at the Velvet Pit."',
    ],
    tauntHitPlayer: [
      '"BOOM! Feel that kick?!"',
      '"Down a heart!"',
    ],
    tauntSelfSafe: [
      '"Click! Still standing, still shooting!"',
      '"My turn continues!"',
    ],
    tauntDamaged: [
      '"Clang! Merely dented my faceplate!"',
      '"You’ll pay for that shot!"',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_heavy.glb`,
    maskColor: '#524742',
    accentColor: '#d16129',
    eyeColor: '#fa401f',
  },
  {
    stage: 4,
    id: 'saboteur',
    name: 'THE SABOTEUR',
    title: 'Vaudeville Trap Whisperer',
    maxHp: 3,
    tauntIntro: '"Careful what you shoot at me—my face-down trap is waiting."',
    tauntLockIn: [
      '"Red, Blue, or Purple? Good luck!"',
      '"One wrong pull and the curse hits you."',
      '"Go ahead, pull the trigger."',
    ],
    tauntHitPlayer: [
      '"Surprise! That chamber was live!"',
      '"Right through your guard!"',
    ],
    tauntSelfSafe: [
      '"A harmless silver click. Still my turn!"',
      '"Calculated risk paid off."',
    ],
    tauntDamaged: [
      '"Tch! My goggles cracked!"',
      '"Lucky spin!"',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_saboteur.glb`,
    maskColor: '#47335c',
    accentColor: '#bf9e47',
    eyeColor: '#bf40fa',
  },
  {
    stage: 5,
    id: 'dealer',
    name: 'THE DEALER',
    title: 'Proprietor of the Velvet Pit',
    maxHp: 3,
    tauntIntro: '"Final table. Four cards dealt, two loaded, two kept for traps."',
    tauntLockIn: [
      '"The House always loads with precision."',
      '"Spin the cylinder. Let us see who blinks."',
      '"Mind the face-down trap on the felt."',
    ],
    tauntHitPlayer: [
      '"THE HOUSE COLLECTS IN LEAD."',
      '"A debt paid in crimson."',
    ],
    tauntSelfSafe: [
      '"The chamber bows to its master."',
      '"Another turn for the House."',
    ],
    tauntDamaged: [
      '"Impressive nerve..."',
      '"A bold shot against the Proprietor!"',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_dealer.glb`,
    maskColor: '#261f24',
    accentColor: '#f5c233',
    eyeColor: '#ff2626',
  },
];

let uidCounter = 1;
export function createCardInstance(id: CardId): CardInstance {
  return {
    uid: `card_${id}_${uidCounter++}_${Math.random().toString(36).slice(2, 6)}`,
    def: CARD_DEFINITIONS[id],
  };
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createEmptyCylinderSlots(): ChamberSlot[] {
  return Array.from({ length: 6 }, (_, index) => ({
    index,
    card: null,
    spent: false,
    revealed: false,
  }));
}

/**
 * Combines 4 loaded cards (2 from Player + 2 from Opponent) with 2 default Empty/Blank
 * chambers and shuffles all 6 slots randomly.
 */
export function buildShuffledRoundCylinder(loadedCards: CardInstance[]): ChamberSlot[] {
  const rawCards: (CardInstance | null)[] = [...loadedCards.slice(0, 4)];
  while (rawCards.length < 6) {
    rawCards.push(null);
  }
  const shuffled = shuffleArray(rawCards);
  return shuffled.map((card, index) => ({
    index,
    card,
    spent: false,
    revealed: false,
  }));
}

export function countChamberCardTypes(slots: ChamberSlot[]) {
  let red = 0;
  let blue = 0;
  let purple = 0;
  let empty = 0;
  let remaining = 0;

  for (const slot of slots) {
    if (slot.spent) continue;
    remaining++;
    if (!slot.card) empty++;
    else if (slot.card.def.color === 'red') red++;
    else if (slot.card.def.color === 'blue') blue++;
    else if (slot.card.def.color === 'purple') purple++;
  }

  return { red, blue, purple, empty, remaining };
}

/**
 * Maps ChamberSlot[] to ShellType[] for the 3D Revolver3D component.
 * When hideUnrevealed is true, unspent & unrevealed chambers render as uniform 'blank'
 * shells so the exact chamber order stays hidden until fired or peeked.
 */
export function slotsToShellTypes(
  slots: ChamberSlot[],
  hideUnrevealed = true
): ShellType[] {
  return slots.map((slot) => {
    if (slot.spent) return 'empty';
    if (hideUnrevealed && !slot.revealed) return 'blank';
    if (!slot.card) return 'empty';
    if (slot.card.def.color === 'red') return 'live';
    if (slot.card.def.color === 'blue') return 'blank';
    return 'heavy';
  });
}

/**
 * AI Pre-Round Load Decision: picks 2 cards from its 4-card hand to load into the cylinder.
 * Prefers keeping strong trap cards in hand while loading a mix of Red/Purple/Blue.
 */
export function decideAiLoadSelection(aiHand: CardInstance[]): CardInstance[] {
  if (aiHand.length <= 2) return [...aiHand];
  const scored = aiHand.map((card) => {
    let loadScore = Math.random() * 5;
    if (card.def.color === 'red') loadScore += 8;
    else if (card.def.color === 'purple') loadScore += 6;
    else loadScore += 3;
    return { card, loadScore };
  });
  scored.sort((a, b) => b.loadScore - a.loadScore);
  return [scored[0].card, scored[1].card];
}

/**
 * AI Turn Decision:
 * Step A: Optionally places 1 face-down trap from hand (if AI has no active trap).
 * Step B: Picks Aim ('opponent' or 'self') based on remaining chamber probabilities.
 */
export function decideAiTurnAction(
  aiHand: CardInstance[],
  aiTrap: CardInstance | null,
  remainingCounts: { red: number; blue: number; purple: number; empty: number; remaining: number },
  aiHp: number
): { trapCard: CardInstance | null; aim: AimChoice } {
  let trapCard: CardInstance | null = null;
  if (!aiTrap && aiHand.length > 0 && Math.random() < 0.7) {
    // Prefer placing a Blue or Red defensive/counter trap
    const preferred =
      aiHand.find((c) => c.def.color === 'blue') ??
      aiHand.find((c) => c.def.color === 'red') ??
      aiHand[0];
    trapCard = preferred;
  }

  const { red, blue, empty, remaining } = remainingCounts;
  const safeCount = blue + empty;
  let aim: AimChoice = 'opponent';

  if (remaining > 0) {
    if (red === 0 && safeCount > 0) {
      aim = 'self';
    } else if (safeCount > red && aiHp >= 2 && Math.random() < 0.45) {
      aim = 'self';
    } else {
      aim = 'opponent';
    }
  }

  return { trapCard, aim };
}
