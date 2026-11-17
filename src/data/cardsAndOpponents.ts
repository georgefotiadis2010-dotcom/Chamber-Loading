import {
  ActorSide,
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
    effectType: 'load_live',
    shortTag: '+1 LIVE (1 DMG)',
    description: 'Loads 1 Live brass shell (1 DMG) into a remaining chamber.',
    chamberEffectText: 'Load 1 Live shell (1 DMG) into the cylinder.',
    accentColor: '#f87171',
    borderColor: '#b93829',
    headerBgColor: '#b93829',
    artBgColor: '#4c1d1a',
    badgeText: 'LIVE • 1 DMG',
    onChamberFire: () => ({
      damageToTarget: 1,
      logMessage: 'BANG! LIVE SHELL FIRED — 1 DMG!',
    }),
  },

  blue_silverblank: {
    id: 'blue_silverblank',
    name: 'STRIP SHELL',
    color: 'blue',
    category: 'blue',
    effectType: 'strip_live',
    shortTag: 'REMOVE 1 LIVE',
    description:
      'Removes 1 Live shell from the remaining chambers, turning it into a Blank.',
    chamberEffectText: 'Remove 1 Live shell from the cylinder (to Blank).',
    accentColor: '#60a5fa',
    borderColor: '#3b6ca8',
    headerBgColor: '#3b6ca8',
    artBgColor: '#1e334f',
    badgeText: 'SABOTAGE • STRIP',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  purple_recoilcurse: {
    id: 'purple_recoilcurse',
    name: 'SPIN DRUM',
    color: 'purple',
    category: 'purple',
    effectType: 'spin_drum',
    shortTag: 'SHUFFLE DRUM',
    description:
      'Spins and shuffles all remaining chambers in the cylinder before the shot.',
    chamberEffectText: 'Spin & shuffle all remaining chambers.',
    accentColor: '#c084fc',
    borderColor: '#764594',
    headerBgColor: '#764594',
    artBgColor: '#382246',
    badgeText: 'TRICK • SPIN',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  red_hollowpoint: {
    id: 'red_hollowpoint',
    name: 'HEAVY SLUG',
    color: 'red',
    category: 'red',
    effectType: 'load_heavy',
    shortTag: '+1 HEAVY (2 DMG)',
    description:
      'Loads 1 Heavy Live shell (2 DMG) into a remaining chamber.',
    chamberEffectText: 'Load 1 Heavy Live shell (2 DMG) into cylinder.',
    accentColor: '#fb923c',
    borderColor: '#cf5b1d',
    headerBgColor: '#cf5b1d',
    artBgColor: '#4e2515',
    badgeText: 'HEAVY • 2 DMG',
    onChamberFire: () => ({
      damageToTarget: 2,
      logMessage: 'BOOM! HEAVY SLUG FIRED — 2 DMG!',
    }),
  },

  blue_hairtrigger: {
    id: 'blue_hairtrigger',
    name: 'PEEK CHAMBER',
    color: 'blue',
    category: 'blue',
    effectType: 'peek_next',
    shortTag: 'PEEK NEXT SHOT',
    description:
      'Peeks at the next chamber in the cylinder so you know if it is Live or Blank.',
    chamberEffectText: 'Reveal whether the next chamber is Live or Blank.',
    accentColor: '#38bdf8',
    borderColor: '#2d7a9c',
    headerBgColor: '#2d7a9c',
    artBgColor: '#193b4d',
    badgeText: 'INTEL • PEEK',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  purple_jinxpin: {
    id: 'purple_jinxpin',
    name: 'SWAP AIM',
    color: 'purple',
    category: 'purple',
    effectType: 'swap_aim',
    shortTag: 'FLIP TARGET',
    description:
      'Flips who the revolver is aimed at this turn (You ↔ Opponent).',
    chamberEffectText: 'Flip who the gun shoots this turn.',
    accentColor: '#a3e635',
    borderColor: '#588448',
    headerBgColor: '#588448',
    artBgColor: '#2f3d27',
    badgeText: 'TRICK • AIM',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },
};

export const ALL_CARD_IDS: CardId[] = [
  'red_crimsonslug',
  'blue_silverblank',
  'purple_recoilcurse',
  'red_hollowpoint',
  'blue_hairtrigger',
  'purple_jinxpin',
];

// Simple, iconic 3-card starter hand: LOAD LIVE, STRIP SHELL, SPIN DRUM
export const HERO_TRIO_IDS: CardId[] = [
  'red_crimsonslug',
  'blue_silverblank',
  'purple_recoilcurse',
];

// Shared deck weighted toward core shell manipulation + tactical tricks
export const SHARED_DECK_IDS: CardId[] = [
  'red_crimsonslug',
  'red_crimsonslug',
  'red_crimsonslug',
  'blue_silverblank',
  'blue_silverblank',
  'blue_silverblank',
  'purple_recoilcurse',
  'purple_recoilcurse',
  'red_hollowpoint',
  'red_hollowpoint',
  'blue_hairtrigger',
  'blue_hairtrigger',
  'purple_jinxpin',
  'purple_jinxpin',
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
  remainingCounts: { red: number; blue: number; purple: number; empty: number; remaining: number },
  aiHp: number,
  currentTarget: ActorSide = 'player'
): CardInstance | null {
  if (aiHand.length === 0) return null;

  const { red, remaining } = remainingCounts;
  const byEffect = (effect: CardInstance['def']['effectType']) =>
    aiHand.find((c) => c.def.effectType === effect);

  if (currentTarget === 'opponent') {
    // Gun is aimed at the AI! AI wants to survive:
    // 1. Flip aim onto player if possible
    // 2. Strip a live shell if there are any live shells
    // 3. Spin the drum if there are live shells
    // 4. Otherwise pass (save cards) or peek
    const swap = byEffect('swap_aim');
    if (swap && (red > 0 || aiHp <= 2)) return swap;

    if (red > 0) {
      const strip = byEffect('strip_live');
      if (strip) return strip;
      const spin = byEffect('spin_drum');
      if (spin && Math.random() < 0.7) return spin;
    }

    const peek = byEffect('peek_next');
    if (peek && Math.random() < 0.45) return peek;

    return null;
  }

  // Gun is aimed at the PLAYER! AI wants a Live shell in the cylinder:
  if (red < remaining) {
    const heavy = byEffect('load_heavy');
    if (heavy) return heavy;
    const live = byEffect('load_live');
    if (live) return live;
  }

  const peek = byEffect('peek_next');
  if (peek && Math.random() < 0.5) return peek;

  const spin = byEffect('spin_drum');
  if (spin && red > 0 && Math.random() < 0.35) return spin;

  return null;
}
