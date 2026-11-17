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
    name: 'LOAD LIVE',
    color: 'red',
    category: 'red',
    shortTag: '+1 LIVE SHELL',
    description:
      'Loads a Live brass shell into the cylinder. Deals 1 DMG & forces target to discard 1.',
    chamberEffectText: 'Load Live brass shell. Deals 1 DMG + target discards 1.',
    tableTrapText: 'Reflects an incoming Live shot back at shooter.',
    accentColor: '#60a5fa',
    borderColor: '#477ba2',
    headerBgColor: '#477ba2',
    artBgColor: '#2d3f50',
    badgeText: 'LIVE • REVOLVER',
    onChamberFire: (ctx) => {
      if (ctx.cancelledChamberEffect) {
        return {
          damageToTarget: 0,
          damageToShooter: 0,
          keepTurn: false,
          logMessage: 'LOAD LIVE was blocked by a Table Trap!',
        };
      }
      if (ctx.reflectedToShooter) {
        return {
          damageToTarget: 0,
          damageToShooter: 1,
          keepTurn: false,
          logMessage: 'LOAD LIVE reflected! Shooter takes 1 DMG.',
        };
      }
      return {
        damageToTarget: 1,
        damageToShooter: 0,
        keepTurn: false,
        discardTargetCard: true,
        logMessage: 'LOAD LIVE FIRED! 1 Brass DMG + target discards 1 card!',
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
        logMessage: 'COUNTER LOCKED: Load Live reflected the incoming Live shot!',
      };
    },
  },

  blue_silverblank: {
    id: 'blue_silverblank',
    name: 'STRIP SHELL',
    color: 'blue',
    category: 'blue',
    shortTag: 'STRIP & RACK',
    description:
      'Load/blank ammo: Strips & ejects shell. Safe 0 DMG self-shot keeps your turn & peeks next!',
    chamberEffectText: 'Load/blank ammo: 0 DMG. Self-shot keeps turn & peeks next.',
    tableTrapText: 'Strips & cancels 1 incoming shot aimed at you.',
    accentColor: '#f59e0b',
    borderColor: '#cf6726',
    headerBgColor: '#cf6726',
    artBgColor: '#4e2515',
    badgeText: 'SHELL • STRIP',
    onChamberFire: (ctx) => {
      const selfShot = ctx.aim === 'self';
      return {
        damageToTarget: 0,
        damageToShooter: 0,
        keepTurn: selfShot,
        peekNextChamber: true,
        logMessage: selfShot
          ? 'STRIP SHELL! Chamber stripped clean — keep your turn & peek next!'
          : 'STRIP SHELL! Ejected shell harmlessly across the table.',
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
        logMessage: 'STRIP SHELL TRIGGERED: Ejected the opponent’s live round mid-pull!',
      };
    },
  },

  purple_jinxpin: {
    id: 'purple_jinxpin',
    name: 'PAD CYLINDER',
    color: 'purple',
    category: 'purple',
    shortTag: 'PAD + BLANK',
    description:
      'Pad cylinder with Blank shells. Self-shot keeps turn; opponent shot jams their next turn.',
    chamberEffectText: 'Pad cylinder with Blanks. Self-shot keeps turn; foe skips turn.',
    tableTrapText: 'Pads chamber & forces attacker to discard 1 card.',
    accentColor: '#84cc16',
    borderColor: '#588448',
    headerBgColor: '#588448',
    artBgColor: '#2f3d27',
    badgeText: 'CYLINDER • PAD',
    onChamberFire: (ctx) => {
      if (ctx.cancelledChamberEffect) {
        return {
          damageToTarget: 0,
          damageToShooter: 0,
          keepTurn: false,
          logMessage: 'PAD CYLINDER was nullified!',
        };
      }
      const selfShot = ctx.aim === 'self';
      return {
        damageToTarget: 0,
        damageToShooter: 0,
        keepTurn: selfShot,
        skipShooterNextTurn: !selfShot,
        peekNextChamber: selfShot,
        logMessage: selfShot
          ? 'PAD CYLINDER! Padded blank clicked safely — you keep your turn!'
          : 'PAD CYLINDER! Cylinder padded & opponent’s mechanism is jammed!',
      };
    },
    onTableTrigger: (ctx) => {
      const isOppShot = ctx.shooter !== ctx.trapOwner;
      if (!isOppShot) {
        return { triggered: false, logMessage: '' };
      }
      return {
        triggered: true,
        discardShooterCard: true,
        cancelChamberEffect: true,
        logMessage: 'PAD CYLINDER SPRUNG: Padded the chamber & stripped 1 card from foe!',
      };
    },
  },

  red_hollowpoint: {
    id: 'red_hollowpoint',
    name: 'HEAVY SLUG',
    color: 'red',
    category: 'red',
    shortTag: '1 DMG + DRAW 1',
    description:
      'Heavy brass load. Deals 1 DMG & draws 1 card. As slot reaction: deals 1 counter-DMG.',
    chamberEffectText: 'Heavy brass shell: 1 DMG + draw 1 card from deck.',
    tableTrapText: 'Deals 1 counter-DMG if opponent fires a Live round.',
    accentColor: '#f97316',
    borderColor: '#b93829',
    headerBgColor: '#b93829',
    artBgColor: '#4c1d1a',
    badgeText: 'LIVE • HEAVY',
    onChamberFire: (ctx) => {
      if (ctx.cancelledChamberEffect) {
        return {
          damageToTarget: 0,
          damageToShooter: 0,
          keepTurn: false,
          logMessage: 'HEAVY SLUG was nullified!',
        };
      }
      if (ctx.reflectedToShooter) {
        return {
          damageToTarget: 0,
          damageToShooter: 1,
          keepTurn: false,
          logMessage: 'HEAVY SLUG reflected! Shooter takes 1 DMG.',
        };
      }
      return {
        damageToTarget: 1,
        damageToShooter: 0,
        keepTurn: false,
        drawCards: 1,
        logMessage: 'HEAVY SLUG FIRED! 1 DMG + shooter draws 1 card.',
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
        logMessage: 'HEAVY SLUG COUNTER: Dealt 1 counter-DMG to the shooter!',
      };
    },
  },

  blue_hairtrigger: {
    id: 'blue_hairtrigger',
    name: 'HAIR TRIGGER',
    color: 'blue',
    category: 'blue',
    shortTag: 'SAFE • DRAW 1',
    description:
      'Polished silver blank. Self-shot keeps turn & draws 1 card. Steals bonus turn as trap.',
    chamberEffectText: 'Silver blank: 0 DMG. Self-shot keeps turn & draws 1 card.',
    tableTrapText: 'Steals opponent’s extra self-shot turn.',
    accentColor: '#38bdf8',
    borderColor: '#36639c',
    headerBgColor: '#36639c',
    artBgColor: '#223654',
    badgeText: 'BLANK • SPEED',
    onChamberFire: (ctx) => {
      const selfShot = ctx.aim === 'self';
      return {
        damageToTarget: 0,
        damageToShooter: 0,
        keepTurn: selfShot,
        drawCards: selfShot ? 1 : 0,
        logMessage: selfShot
          ? 'HAIR TRIGGER! Safe click — keep your turn & draw 1 card!'
          : 'HAIR TRIGGER! Silver blank click across the wood table.',
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
        logMessage: 'HAIR TRIGGER SPRUNG: Stole the opponent’s bonus turn!',
      };
    },
  },

  purple_recoilcurse: {
    id: 'purple_recoilcurse',
    name: 'SPIN & RECOIL',
    color: 'purple',
    category: 'purple',
    shortTag: 'FORCE NEXT SHOT',
    description:
      'Spins the cylinder & force-fires the next chamber at the shooter. Strips 1 card on defense.',
    chamberEffectText: '0 DMG. Force-fires next chamber at the shooter!',
    tableTrapText: 'Attacker discards 1 card when aiming at you.',
    accentColor: '#c084fc',
    borderColor: '#764594',
    headerBgColor: '#764594',
    artBgColor: '#382246',
    badgeText: 'TRICK • RECOIL',
    onChamberFire: (ctx) => {
      if (ctx.cancelledChamberEffect) {
        return {
          damageToTarget: 0,
          damageToShooter: 0,
          keepTurn: false,
          logMessage: 'SPIN & RECOIL was nullified!',
        };
      }
      return {
        damageToTarget: 0,
        damageToShooter: 0,
        keepTurn: false,
        forceFireNextAtShooter: true,
        logMessage: 'SPIN & RECOIL! Next chamber is force-fired at the shooter!',
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
        logMessage: 'SPIN & RECOIL: Forced the attacker to drop 1 card!',
      };
    },
  },
};

export const ALL_CARD_IDS: CardId[] = [
  'red_crimsonslug',
  'blue_silverblank',
  'purple_jinxpin',
  'red_hollowpoint',
  'blue_hairtrigger',
  'purple_recoilcurse',
];

// Hero cards from image_0.png, image_1.png, image_2.png
export const HERO_TRIO_IDS: CardId[] = [
  'red_crimsonslug', // LOAD LIVE
  'blue_silverblank', // STRIP SHELL
  'purple_jinxpin', // PAD CYLINDER
];

// 18-card shared deck weighted toward the 3 iconic tabletop cards
export const SHARED_DECK_IDS: CardId[] = [
  'red_crimsonslug',
  'blue_silverblank',
  'purple_jinxpin',
  'red_crimsonslug',
  'blue_silverblank',
  'purple_jinxpin',
  'red_crimsonslug',
  'blue_silverblank',
  'purple_jinxpin',
  'red_hollowpoint',
  'blue_hairtrigger',
  'purple_recoilcurse',
  'red_hollowpoint',
  'blue_hairtrigger',
  'purple_recoilcurse',
];

export const LADDER_OPPONENTS: OpponentDef[] = [
  {
    stage: 1,
    id: 'counter',
    name: 'THE COUNTER',
    title: 'Sharp-Eyed Card Shark',
    maxHp: 3,
    tauntIntro: '"1 Live, 5 Empty in the drum. Choose your card & target!"',
    tauntLockIn: [
      '"I’ve counted every brass shell on that tray."',
      '"Locking my card onto the wood. Ring that bell!"',
      '"Let’s see if you aim at me or yourself."',
    ],
    tauntHitPlayer: [
      '"BANG! Right across the planks!"',
      '"Told you I knew which slot held the brass!"',
    ],
    tauntSelfSafe: [
      '"Click! Silver blank — I keep the turn!"',
      '"Calculated odds. My trigger pull again!"',
    ],
    tauntDamaged: [
      '"Gah! You slipped a live shell in there!"',
      '"Lucky spin, partner..."',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_counter.glb`,
    maskColor: '#7c3f1c',
    accentColor: '#c84b24',
    eyeColor: '#fbbf24',
  },
  {
    stage: 2,
    id: 'dealer',
    name: 'THE DEALER',
    title: 'Proprietor of the Tavern Table',
    maxHp: 3,
    tauntIntro: '"Welcome to my table. Lock your card and test the cylinder."',
    tauntLockIn: [
      '"The House always knows when to pad the cylinder."',
      '"Cards on the wood. Pull the trigger."',
      '"Will you strip that shell or load live lead?"',
    ],
    tauntHitPlayer: [
      '"The House collects a heart!"',
      '"Brass in the chamber! Down a life!"',
    ],
    tauntSelfSafe: [
      '"A clean click. The House retains the turn."',
      '"Safe chamber. Watch closely."',
    ],
    tauntDamaged: [
      '"Impressive read on the cylinder..."',
      '"You play a bold hand, stranger!"',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_dealer.glb`,
    maskColor: '#6b3416',
    accentColor: '#d95326',
    eyeColor: '#f59e0b',
  },
  {
    stage: 3,
    id: 'rookie',
    name: 'THE BANDIT',
    title: 'Masked Tavern Outlaw',
    maxHp: 3,
    tauntIntro: '"Hands on your cards! Let’s see who walks out of this tavern!"',
    tauntLockIn: [
      '"Two brass shells gleaming in my tray..."',
      '"Hit that brass bell if you’ve got the nerve!"',
      '"I’m aiming right across the wood!"',
    ],
    tauntHitPlayer: [
      '"HAH! Smoked you across the table!"',
      '"Nothing beats a freshly loaded live round!"',
    ],
    tauntSelfSafe: [
      '"Click! Still grinning, and it’s still my turn!"',
      '"Blank shell! Here comes another!"',
    ],
    tauntDamaged: [
      '"Argh! Singed my bandana!"',
      '"Hey! Who loaded that chamber?!"',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_rookie.glb`,
    maskColor: '#7c3f1c',
    accentColor: '#c84b24',
    eyeColor: '#fbbf24',
  },
  {
    stage: 4,
    id: 'heavy',
    name: 'IRON BUCK',
    title: 'Heavy Cylinder Bruiser',
    maxHp: 4,
    tauntIntro: '"More brass in the cylinder, heavier kick on the table."',
    tauntLockIn: [
      '"Load Live all day long."',
      '"No padding this cylinder, friend."',
      '"Ring the bell and take your shot!"',
    ],
    tauntHitPlayer: [
      '"BOOM! Feel that snub-nose kick?!"',
      '"Another heart off the board!"',
    ],
    tauntSelfSafe: [
      '"Click! My lucky silver blank!"',
      '"Still my turn at the table!"',
    ],
    tauntDamaged: [
      '"Oof! That one had some powder in it!"',
      '"You’ll pay for that shot!"',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_heavy.glb`,
    maskColor: '#5c2d14',
    accentColor: '#b83b1a',
    eyeColor: '#f97316',
  },
  {
    stage: 5,
    id: 'saboteur',
    name: 'THE TRICKSTER',
    title: 'Master of Shell Sleight',
    maxHp: 5,
    tauntIntro: '"Five lives. Stripped shells and padded cylinders. Good luck!"',
    tauntLockIn: [
      '"Did I just strip a live shell or pad a blank?"',
      '"Watch the slots on the wood..."',
      '"Go ahead, flip your aim chip!"',
    ],
    tauntHitPlayer: [
      '"Surprise! That chamber was live brass!"',
      '"Right past your guard!"',
    ],
    tauntSelfSafe: [
      '"Harmless silver click! I go again!"',
      '"Sleight of hand pays off!"',
    ],
    tauntDamaged: [
      '"Tch! You saw right through my bluff!"',
      '"Clever card lock..."',
    ],
    glbPath: `${import.meta.env.BASE_URL}models/opponent_saboteur.glb`,
    maskColor: '#683218',
    accentColor: '#d44620',
    eyeColor: '#eab308',
  },
];

let uidCounter = 1;
export function createCardInstance(id: CardId): CardInstance {
  return {
    uid: `card_${id}_${uidCounter++}_${Math.random().toString(36).slice(2, 6)}`,
    def: CARD_DEFINITIONS[id],
  };
}

export function createHeroTrioHand(): CardInstance[] {
  return HERO_TRIO_IDS.map((id) => createCardInstance(id));
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
 * Builds the 6-chamber cylinder for a round.
 * By default starts with 1 Live shell + 5 Empty/Blank slots (matching "1 LIVE, 5 EMPTY" in image_1.png
 * and "1 LIVE / 5 BLANKS" in image_2.png) or incorporates any cards loaded into the cylinder.
 */
export function buildShuffledRoundCylinder(loadedCards: CardInstance[]): ChamberSlot[] {
  const rawCards: (CardInstance | null)[] = [...loadedCards.slice(0, 6)];
  if (rawCards.length === 0) {
    rawCards.push(createCardInstance('red_crimsonslug'));
  }
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
 */
export function slotsToShellTypes(
  slots: ChamberSlot[],
  hideUnrevealed = false
): ShellType[] {
  return slots.map((slot) => {
    if (slot.spent) return 'empty';
    if (hideUnrevealed && !slot.revealed) {
      return slot.card?.def.color === 'red' ? 'live' : 'blank';
    }
    if (!slot.card) return 'blank';
    if (slot.card.def.color === 'red') return 'live';
    if (slot.card.def.color === 'blue') return 'blank';
    return 'heavy';
  });
}

export function decideAiLoadSelection(aiHand: CardInstance[]): CardInstance[] {
  if (aiHand.length <= 1) return [...aiHand];
  const scored = aiHand.map((card) => {
    let loadScore = Math.random() * 5;
    if (card.def.color === 'red') loadScore += 8;
    else if (card.def.color === 'purple') loadScore += 6;
    else loadScore += 3;
    return { card, loadScore };
  });
  scored.sort((a, b) => b.loadScore - a.loadScore);
  return [scored[0].card];
}

export function decideAiTurnAction(
  aiHand: CardInstance[],
  aiTrap: CardInstance | null,
  remainingCounts: { red: number; blue: number; purple: number; empty: number; remaining: number },
  aiHp: number
): { trapCard: CardInstance | null; aim: AimChoice } {
  let trapCard: CardInstance | null = null;
  if (!aiTrap && aiHand.length > 0) {
    const preferred =
      aiHand.find((c) => c.def.color === 'red') ??
      aiHand.find((c) => c.def.color === 'blue') ??
      aiHand[0];
    trapCard = preferred;
  }

  const { red, blue, empty, remaining } = remainingCounts;
  const safeCount = blue + empty;
  let aim: AimChoice = 'opponent';

  if (remaining > 0) {
    if (red === 0 && safeCount > 0) {
      aim = 'self';
    } else if (safeCount > red * 2 && aiHp >= 2 && Math.random() < 0.42) {
      aim = 'self';
    } else {
      aim = 'opponent';
    }
  }

  return { trapCard, aim };
}
