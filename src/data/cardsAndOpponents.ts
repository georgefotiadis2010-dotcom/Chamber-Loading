import {
  CardDef,
  CardId,
  CardInstance,
  CardRarity,
  ChamberSlot,
  OpponentDef,
  ShellType,
} from '../types/game';

export const RARITY_META: Record<
  CardRarity,
  { label: string; borderHex: string; badgeBg: string; textHex: string; weight: number }
> = {
  common: {
    label: 'COMMON',
    borderHex: '#a89070',
    badgeBg: '#44403c',
    textHex: '#e7e5e4',
    weight: 3,
  },
  uncommon: {
    label: 'UNCOMMON',
    borderHex: '#34d399',
    badgeBg: '#065f46',
    textHex: '#a7f3d0',
    weight: 2,
  },
  rare: {
    label: 'RARE',
    borderHex: '#60a5fa',
    badgeBg: '#1e3a8a',
    textHex: '#bfdbfe',
    weight: 1,
  },
  legendary: {
    label: 'LEGENDARY',
    borderHex: '#fbbf24',
    badgeBg: '#78350f',
    textHex: '#fef08a',
    weight: 1,
  },
};

export const CARD_DEFINITIONS: Record<CardId, CardDef> = {
  // =========================================================================
  // COMMON (7 total, including kept Load Live)
  // =========================================================================
  red_crimsonslug: {
    id: 'red_crimsonslug',
    name: 'LOAD LIVE',
    color: 'red',
    category: 'red',
    rarity: 'common',
    effectType: 'load_live',
    shortTag: '+1 LIVE (1 DMG)',
    description: 'Loads 1 Live brass shell (1 DMG) into a random Blank slot in the drum.',
    chamberEffectText: 'Load 1 Live shell (1 DMG) into the drum.',
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

  blue_brace: {
    id: 'blue_brace',
    name: 'BRACE',
    color: 'blue',
    category: 'blue',
    rarity: 'common',
    effectType: 'brace',
    shortTag: '+1 SHIELD THIS TURN',
    description: 'Gain 1 Shield for this turn. Blocks 1 DMG if the shot hits you.',
    chamberEffectText: 'Gain 1 Shield for this turn (blocks 1 DMG).',
    accentColor: '#38bdf8',
    borderColor: '#2d7a9c',
    headerBgColor: '#2d7a9c',
    artBgColor: '#193b4d',
    badgeText: 'DEFENSE • SHIELD',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  blue_dumpshell: {
    id: 'blue_dumpshell',
    name: 'DUMP SHELL',
    color: 'blue',
    category: 'blue',
    rarity: 'common',
    effectType: 'dump_shell',
    shortTag: 'REMOVE 1 LIVE',
    description: 'Removes 1 random Live shell from the drum, turning it into a Blank.',
    chamberEffectText: 'Remove 1 random Live shell from the drum.',
    accentColor: '#60a5fa',
    borderColor: '#3b6ca8',
    headerBgColor: '#3b6ca8',
    artBgColor: '#1e334f',
    badgeText: 'CONTROL • DUMP',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  blue_quickdraw: {
    id: 'blue_quickdraw',
    name: 'QUICK DRAW',
    color: 'blue',
    category: 'blue',
    rarity: 'common',
    effectType: 'quick_draw',
    shortTag: '+1 CARD NEXT TURN',
    description: 'Draw 1 extra card at the start of your next turn.',
    chamberEffectText: 'Draw +1 extra card next turn.',
    accentColor: '#2dd4bf',
    borderColor: '#0f766e',
    headerBgColor: '#0f766e',
    artBgColor: '#134e4a',
    badgeText: 'TEMPO • DRAW',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  red_doubletap: {
    id: 'red_doubletap',
    name: 'DOUBLE TAP',
    color: 'red',
    category: 'red',
    rarity: 'common',
    effectType: 'double_tap',
    shortTag: '+1 LIVE · +1 BONUS DMG',
    description:
      'Loads 1 Live shell into the drum. If any Live shell fires this turn, it deals +1 bonus DMG.',
    chamberEffectText: '+1 Live shell; Live hits deal +1 DMG this turn.',
    accentColor: '#fb923c',
    borderColor: '#c2410c',
    headerBgColor: '#c2410c',
    artBgColor: '#431407',
    badgeText: 'AMMO • +1 DMG',
    onChamberFire: () => ({
      damageToTarget: 1,
      logMessage: 'BANG! LIVE SHELL FIRED — 1 DMG!',
    }),
  },

  purple_riggedspin: {
    id: 'purple_riggedspin',
    name: 'RIGGED SPIN',
    color: 'purple',
    category: 'purple',
    rarity: 'common',
    effectType: 'rigged_spin',
    shortTag: '75% AIM AT FOE',
    description: 'Tilts this turn’s revolver spin to 75% Opponent / 25% You.',
    chamberEffectText: 'Tilt spin odds to 75% Opponent / 25% You.',
    accentColor: '#c084fc',
    borderColor: '#7e22ce',
    headerBgColor: '#7e22ce',
    artBgColor: '#3b0764',
    badgeText: 'TRICK • 75% ODDS',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  blue_fieldpatch: {
    id: 'blue_fieldpatch',
    name: 'FIELD PATCH',
    color: 'blue',
    category: 'blue',
    rarity: 'common',
    effectType: 'field_patch',
    shortTag: '-1 LIVE · HEAL ON BLANK',
    description:
      'Removes 1 random Live shell from the drum. If this turn’s shot is a Blank, heal 1 HP.',
    chamberEffectText: '-1 Live shell; heal 1 HP if shot is Blank.',
    accentColor: '#4ade80',
    borderColor: '#15803d',
    headerBgColor: '#15803d',
    artBgColor: '#14532d',
    badgeText: 'RECOVERY • PATCH',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  // =========================================================================
  // UNCOMMON (6)
  // =========================================================================
  red_concussion: {
    id: 'red_concussion',
    name: 'CONCUSSION ROUND',
    color: 'red',
    category: 'red',
    rarity: 'uncommon',
    effectType: 'concussion_round',
    shortTag: '1 DMG + DISCARD 1',
    description:
      'Loads 1 Concussion shell (1 DMG) that forces the target to discard 1 random card if hit.',
    chamberEffectText: 'Load 1 Concussion shell (1 DMG + Discard 1).',
    accentColor: '#fb7185',
    borderColor: '#be123c',
    headerBgColor: '#be123c',
    artBgColor: '#4c0519',
    badgeText: 'CONCUSSION • 1 DMG',
    onChamberFire: () => ({
      damageToTarget: 1,
      discardOnHit: 1,
      logMessage: 'BOOM! CONCUSSION ROUND — 1 DMG + DISCARD 1 CARD!',
    }),
  },

  red_twinload: {
    id: 'red_twinload',
    name: 'TWIN LOAD',
    color: 'red',
    category: 'red',
    rarity: 'uncommon',
    effectType: 'twin_load',
    shortTag: '+2 LIVE SHELLS',
    description: 'Loads 2 Live shells (1 DMG each) into random Blank slots in the drum.',
    chamberEffectText: 'Load 2 Live shells into random Blank slots.',
    accentColor: '#ef4444',
    borderColor: '#991b1b',
    headerBgColor: '#991b1b',
    artBgColor: '#450a0a',
    badgeText: 'AMMO • +2 LIVE',
    onChamberFire: () => ({
      damageToTarget: 1,
      logMessage: 'BANG! LIVE SHELL FIRED — 1 DMG!',
    }),
  },

  purple_misfire: {
    id: 'purple_misfire',
    name: 'MISFIRE',
    color: 'purple',
    category: 'purple',
    rarity: 'uncommon',
    effectType: 'misfire',
    shortTag: 'NEGATE LIVE ON YOU',
    description:
      'If a Live shell lands on You this turn, it misfires (0 DMG) and turns into a Blank.',
    chamberEffectText: 'If shot lands on You, Live deals 0 DMG.',
    accentColor: '#a78bfa',
    borderColor: '#6d28d9',
    headerBgColor: '#6d28d9',
    artBgColor: '#2e1065',
    badgeText: 'TRICK • MISFIRE',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  purple_hairtrigger: {
    id: 'purple_hairtrigger',
    name: 'HAIR TRIGGER',
    color: 'purple',
    category: 'purple',
    rarity: 'uncommon',
    effectType: 'hair_trigger',
    shortTag: 'FIRE AGAIN ON BLANK',
    description:
      'If this turn’s shot is a Blank, immediately spin and fire a 2nd chamber at the same target.',
    chamberEffectText: 'On Blank, fire another random chamber!',
    accentColor: '#e879f9',
    borderColor: '#a21caf',
    headerBgColor: '#a21caf',
    artBgColor: '#4a044e',
    badgeText: 'TRICK • DOUBLE PULL',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  purple_jammer: {
    id: 'purple_jammer',
    name: 'JAMMER',
    color: 'purple',
    category: 'purple',
    rarity: 'uncommon',
    effectType: 'jammer',
    shortTag: 'CANCEL RED CARD',
    description:
      'If your opponent played a Red (Ammo) card this turn, cancel its effect and load 1 Live shell.',
    chamberEffectText: 'Cancel foe Red card & load 1 Live shell.',
    accentColor: '#c084fc',
    borderColor: '#6b21a8',
    headerBgColor: '#6b21a8',
    artBgColor: '#3b0764',
    badgeText: 'COUNTER • JAM',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  red_bloodpact: {
    id: 'red_bloodpact',
    name: 'BLOOD PACT',
    color: 'red',
    category: 'red',
    rarity: 'uncommon',
    effectType: 'blood_pact',
    shortTag: '-1 HP · 2 DMG PIERCE',
    description:
      'Pay 1 HP (disabled at 1 HP) to load & fire a 2 DMG Piercing shell (ignores Shield & Ricochet).',
    chamberEffectText: 'Pay 1 HP: fire 2 DMG Piercing shell this turn.',
    accentColor: '#f43f5e',
    borderColor: '#881337',
    headerBgColor: '#881337',
    artBgColor: '#4c0519',
    badgeText: 'PIERCE • 2 DMG',
    onChamberFire: () => ({
      damageToTarget: 2,
      piercing: true,
      logMessage: 'PIERCING BLAST! BLOOD PACT FIRED — 2 DMG!',
    }),
  },

  // =========================================================================
  // RARE (5)
  // =========================================================================
  purple_ricochet: {
    id: 'purple_ricochet',
    name: 'RICOCHET',
    color: 'purple',
    category: 'purple',
    rarity: 'rare',
    effectType: 'ricochet',
    shortTag: 'REDIRECT LIVE SHOT',
    description:
      'If the spin lands on You and the shell is Live (non-piercing), redirect the shot to your Opponent.',
    chamberEffectText: 'Redirect a Live shot from You to Opponent.',
    accentColor: '#a3e635',
    borderColor: '#4d7c0f',
    headerBgColor: '#4d7c0f',
    artBgColor: '#1a2e05',
    badgeText: 'TRICK • RICOCHET',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  blue_bandolier: {
    id: 'blue_bandolier',
    name: 'BANDOLIER',
    color: 'blue',
    category: 'blue',
    rarity: 'rare',
    effectType: 'bandolier',
    shortTag: '+1 SHIELD · +1 DRAW',
    description: 'Gain 1 Shield this turn and draw +1 extra card at the start of next turn.',
    chamberEffectText: 'Gain 1 Shield this turn & +1 draw next turn.',
    accentColor: '#38bdf8',
    borderColor: '#0369a1',
    headerBgColor: '#0369a1',
    artBgColor: '#0c4a6e',
    badgeText: 'RARE • GEAR',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  purple_sleightofhand: {
    id: 'purple_sleightofhand',
    name: 'SLEIGHT OF HAND',
    color: 'purple',
    category: 'purple',
    rarity: 'rare',
    effectType: 'sleight_of_hand',
    shortTag: 'CANCEL & STEAL CARD',
    description:
      'Cancels your opponent’s card this turn and puts a copy of it into your hand for later.',
    chamberEffectText: 'Cancel foe card & add a copy to your hand.',
    accentColor: '#d946ef',
    borderColor: '#86198f',
    headerBgColor: '#86198f',
    artBgColor: '#4a044e',
    badgeText: 'COUNTER • STEAL',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  blue_adrenaline: {
    id: 'blue_adrenaline',
    name: 'ADRENALINE SHOT',
    color: 'blue',
    category: 'blue',
    rarity: 'rare',
    effectType: 'adrenaline_shot',
    shortTag: 'HEAL 1 (OR 2 + AIM)',
    description:
      'Heal 1 HP. If at 1 HP, heal 2 HP instead and force the gun to aim at your Opponent this turn.',
    chamberEffectText: 'Heal 1 HP (at 1 HP: Heal 2 + Aim at Foe).',
    accentColor: '#22d3ee',
    borderColor: '#0e7490',
    headerBgColor: '#0e7490',
    artBgColor: '#164e63',
    badgeText: 'RARE • HEAL',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },

  red_russianroulette: {
    id: 'red_russianroulette',
    name: 'RUSSIAN ROULETTE',
    color: 'red',
    category: 'red',
    rarity: 'rare',
    effectType: 'russian_roulette',
    shortTag: 'FILL DRUM · LOCK 50/50',
    description:
      'Fills all remaining Blank slots with Live shells. Locks target spin to 50/50 (no rig/redirect).',
    chamberEffectText: 'Fill all Blanks with Live! Lock 50/50.',
    accentColor: '#f87171',
    borderColor: '#991b1b',
    headerBgColor: '#b91c1c',
    artBgColor: '#450a0a',
    badgeText: 'CHAOS • ALL LIVE',
    onChamberFire: () => ({
      damageToTarget: 1,
      logMessage: 'BANG! RUSSIAN ROULETTE LIVE — 1 DMG!',
    }),
  },

  // =========================================================================
  // LEGENDARY (3)
  // =========================================================================
  gold_goldengun: {
    id: 'gold_goldengun',
    name: 'GOLDEN GUN',
    color: 'gold',
    category: 'gold',
    rarity: 'legendary',
    effectType: 'golden_gun',
    shortTag: '2 DMG AT FOE',
    description:
      'Loads & fires a 2 DMG Golden Bullet aimed at your Opponent this turn (can still be Ricocheted).',
    chamberEffectText: 'Fire 2 DMG Golden Bullet at Opponent!',
    accentColor: '#fde047',
    borderColor: '#ca8a04',
    headerBgColor: '#b45309',
    artBgColor: '#422006',
    badgeText: 'LEGENDARY • 2 DMG',
    onChamberFire: () => ({
      damageToTarget: 2,
      logMessage: 'GOLDEN SHOT! 2 DMG BLAST!',
    }),
  },

  gold_silverbullet: {
    id: 'gold_silverbullet',
    name: 'SILVER BULLET',
    color: 'gold',
    category: 'gold',
    rarity: 'legendary',
    effectType: 'silver_bullet',
    shortTag: '3 DMG · +2 DRAW IF SAFE',
    description:
      'Loads a 3 DMG Silver Bullet into the drum. If you take 0 DMG this turn, draw +2 cards next turn.',
    chamberEffectText: 'Load 3 DMG Silver Bullet; +2 draw if unscathed.',
    accentColor: '#facc15',
    borderColor: '#a16207',
    headerBgColor: '#92400e',
    artBgColor: '#27272a',
    badgeText: 'LEGENDARY • 3 DMG',
    onChamberFire: () => ({
      damageToTarget: 3,
      logMessage: 'SILVER BULLET! DEVASTATING 3 DMG!',
    }),
  },

  gold_rewind: {
    id: 'gold_rewind',
    name: 'REWIND CYLINDER',
    color: 'gold',
    category: 'gold',
    rarity: 'legendary',
    effectType: 'rewind_cylinder',
    shortTag: 'CHEAT DEATH · RESET DRUM',
    description:
      'If you would take lethal damage this turn, undo the shot, survive at 1 HP, and reset the drum.',
    chamberEffectText: 'Survive lethal hit at 1 HP & reset drum.',
    accentColor: '#fde047',
    borderColor: '#d97706',
    headerBgColor: '#b45309',
    artBgColor: '#3f2e08',
    badgeText: 'LEGENDARY • REWIND',
    onChamberFire: () => ({
      damageToTarget: 0,
      logMessage: 'CLICK! BLANK CHAMBER — NO DAMAGE.',
    }),
  },
};

export const ALL_CARD_IDS: CardId[] = Object.keys(CARD_DEFINITIONS) as CardId[];

// Starter 3-card hand: LOAD LIVE, BRACE, DUMP SHELL
export const HERO_TRIO_IDS: CardId[] = [
  'red_crimsonslug',
  'blue_brace',
  'blue_dumpshell',
];

// Shared deck weighted by rarity (Common x3, Uncommon x2, Rare x1, Legendary x1)
export const SHARED_DECK_IDS: CardId[] = ALL_CARD_IDS.flatMap((id) => {
  const w = RARITY_META[CARD_DEFINITIONS[id].rarity].weight;
  return Array.from({ length: w }, () => id);
});

export function getWeightedDraftCards(count = 3): CardId[] {
  const pool = ALL_CARD_IDS.flatMap((id) => {
    const r = CARD_DEFINITIONS[id].rarity;
    const w = r === 'common' ? 4 : r === 'uncommon' ? 3 : r === 'rare' ? 2 : 1;
    return Array.from({ length: w }, () => id);
  });
  const picked: CardId[] = [];
  const shuffled = shuffleArray(pool);
  for (const id of shuffled) {
    if (!picked.includes(id)) picked.push(id);
    if (picked.length >= count) break;
  }
  return picked;
}

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

export function isLiveChamberCard(card: CardInstance | null): boolean {
  if (!card) return false;
  return (
    card.def.color === 'red' ||
    card.def.id === 'gold_goldengun' ||
    card.def.id === 'gold_silverbullet'
  );
}

export function countChamberCardTypes(slots: ChamberSlot[]) {
  let red = 0;
  let blue = 0;
  let purple = 0;
  let gold = 0;
  let empty = 0;
  let remaining = 0;

  for (const slot of slots) {
    if (slot.spent) continue;
    remaining++;
    if (!slot.card) empty++;
    else if (slot.card.def.color === 'red') red++;
    else if (slot.card.def.color === 'blue') blue++;
    else if (slot.card.def.color === 'purple') purple++;
    else if (slot.card.def.color === 'gold') gold++;
  }

  return { red: red + gold, blue, purple, gold, empty, remaining };
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
      return isLiveChamberCard(slot.card) ? 'live' : 'blank';
    }
    if (!slot.card) return 'blank';
    if (slot.card.def.color === 'gold') return 'heavy';
    if (slot.card.def.color === 'red') return 'live';
    if (slot.card.def.color === 'blue') return 'blank';
    return 'heavy';
  });
}

export function decideAiLoadSelection(aiHand: CardInstance[]): CardInstance[] {
  if (aiHand.length <= 1) return [...aiHand];
  const scored = aiHand.map((card) => {
    let loadScore = Math.random() * 5;
    if (card.def.color === 'red' || card.def.color === 'gold') loadScore += 8;
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
  aiHp: number
): CardInstance | null {
  if (aiHand.length === 0) return null;

  const { red, remaining } = remainingCounts;
  const playableHand = aiHand.filter(
    (c) => !(c.def.effectType === 'blood_pact' && aiHp <= 1)
  );
  if (playableHand.length === 0) return null;

  const byEffect = (effect: CardInstance['def']['effectType']) =>
    playableHand.find((c) => c.def.effectType === effect);

  // If AI is at 1 HP, prioritize survival/heal/cheat death
  if (aiHp <= 1) {
    return (
      byEffect('adrenaline_shot') ??
      byEffect('rewind_cylinder') ??
      byEffect('misfire') ??
      byEffect('ricochet') ??
      byEffect('brace') ??
      byEffect('bandolier') ??
      byEffect('field_patch') ??
      byEffect('golden_gun') ??
      null
    );
  }

  // If there are no live shells yet, AI wants to load or force a shot
  if (red === 0 && remaining > 0) {
    return (
      byEffect('golden_gun') ??
      byEffect('silver_bullet') ??
      byEffect('twin_load') ??
      byEffect('concussion_round') ??
      byEffect('double_tap') ??
      byEffect('load_live') ??
      byEffect('quick_draw') ??
      null
    );
  }

  // If drum is dangerous (2+ live shells), AI leans defensive/tricks
  if (red >= 2) {
    return (
      byEffect('ricochet') ??
      byEffect('misfire') ??
      byEffect('sleight_of_hand') ??
      byEffect('jammer') ??
      byEffect('dump_shell') ??
      byEffect('field_patch') ??
      byEffect('brace') ??
      byEffect('rigged_spin') ??
      null
    );
  }

  // Otherwise pick a tactical card or pass occasionally
  const roll = Math.random();
  if (roll < 0.85) {
    return playableHand[Math.floor(Math.random() * playableHand.length)];
  }

  return null;
}
