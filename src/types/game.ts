export type ShellType = 'empty' | 'live' | 'blank' | 'heavy';

export type CardColor = 'red' | 'blue' | 'purple' | 'gold';
export type CardCategory = CardColor;
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type CardId =
  | 'red_crimsonslug' // Kept: Load Live (Common)
  | 'blue_brace'
  | 'blue_dumpshell'
  | 'blue_quickdraw'
  | 'red_doubletap'
  | 'purple_riggedspin'
  | 'blue_fieldpatch'
  | 'red_concussion'
  | 'red_twinload'
  | 'purple_misfire'
  | 'purple_hairtrigger'
  | 'purple_jammer'
  | 'red_bloodpact'
  | 'purple_ricochet'
  | 'blue_bandolier'
  | 'purple_sleightofhand'
  | 'blue_adrenaline'
  | 'red_russianroulette'
  | 'gold_goldengun'
  | 'gold_silverbullet'
  | 'gold_rewind';

export type ActorSide = 'player' | 'opponent';
export type AimChoice = 'opponent' | 'self';

export interface ChamberFireContext {
  target: ActorSide;
  chamberIndex: number;
  card: CardInstance | null;
}

export type CardEffectType =
  | 'load_live'
  | 'brace'
  | 'dump_shell'
  | 'quick_draw'
  | 'double_tap'
  | 'rigged_spin'
  | 'field_patch'
  | 'concussion_round'
  | 'twin_load'
  | 'misfire'
  | 'hair_trigger'
  | 'jammer'
  | 'blood_pact'
  | 'ricochet'
  | 'bandolier'
  | 'sleight_of_hand'
  | 'adrenaline_shot'
  | 'russian_roulette'
  | 'golden_gun'
  | 'silver_bullet'
  | 'rewind_cylinder';

export interface ChamberFireResult {
  damageToTarget: number;
  logMessage: string;
  piercing?: boolean;
  discardOnHit?: number;
}

export interface LastFiredShotInfo {
  label: string;
  cardId: CardId | null;
  color: CardColor | 'blank';
  rarity?: CardRarity;
  damage: number;
  target: ActorSide;
  wasBlank: boolean;
  note?: string;
}

export interface CardDef {
  id: CardId;
  name: string;
  color: CardColor;
  category: CardCategory;
  rarity: CardRarity;
  effectType: CardEffectType;
  shortTag: string;
  description: string;
  chamberEffectText: string;
  accentColor: string;
  borderColor: string;
  headerBgColor: string;
  artBgColor: string;
  badgeText: string;
  onChamberFire: (ctx: ChamberFireContext) => ChamberFireResult;
}

export interface CardInstance {
  uid: string;
  def: CardDef;
}

export interface ChamberSlot {
  index: number;
  card: CardInstance | null; // null = Default Empty/Blank chamber
  spent: boolean;
  revealed: boolean;
  loadedAt?: number; // Monotonic load sequence for FIFO eviction when drum is full
}

export type TurnPhase =
  | 'PRE_ROUND_LOAD'
  | 'SPIN_CYLINDERS'
  | 'PLAYER_SELECT'
  | 'REVEAL_CARDS'
  | 'PICK_TARGET'
  | 'RESOLVE_CHAMBER'
  | 'FIRE_PLAYER'
  | 'FIRE_OPPONENT'
  | 'TURN_RESULT'
  | 'RELOAD_ROUND'
  | 'POST_MATCH_DRAFT'
  | 'GAME_OVER'
  | 'VICTORY';

export type OpponentStyle = 'rookie' | 'counter' | 'heavy' | 'saboteur' | 'dealer';

export interface OpponentDef {
  stage: number;
  id: OpponentStyle;
  name: string;
  title: string;
  maxHp: number;
  tauntIntro: string;
  tauntLockIn: string[];
  tauntHitPlayer: string[];
  tauntSelfSafe: string[];
  tauntDamaged: string[];
  glbPath: string;
  maskColor: string;
  accentColor: string;
  eyeColor: string;
}
