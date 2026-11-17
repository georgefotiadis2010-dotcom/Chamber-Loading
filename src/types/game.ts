export type ShellType = 'empty' | 'live' | 'blank' | 'heavy';

export type CardColor = 'red' | 'blue' | 'purple';
export type CardCategory = CardColor;

export type CardId =
  | 'red_crimsonslug'
  | 'red_hollowpoint'
  | 'blue_silverblank'
  | 'blue_hairtrigger'
  | 'purple_jinxpin'
  | 'purple_recoilcurse';

export type ActorSide = 'player' | 'opponent';
export type AimChoice = 'opponent' | 'self';

export interface ChamberFireContext {
  target: ActorSide;
  chamberIndex: number;
  card: CardInstance | null;
}

export type CardEffectType =
  | 'load_live'
  | 'load_heavy'
  | 'strip_live'
  | 'spin_drum'
  | 'peek_next'
  | 'swap_aim';

export interface ChamberFireResult {
  damageToTarget: number;
  logMessage: string;
}

export interface CardDef {
  id: CardId;
  name: string;
  color: CardColor;
  category: CardCategory;
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
}

export type TurnPhase =
  | 'PRE_ROUND_LOAD'
  | 'SPIN_CYLINDERS'
  | 'PLAYER_SELECT'
  | 'REVEAL_CARDS'
  | 'RESOLVE_CHAMBER'
  | 'FIRE_PLAYER'
  | 'FIRE_OPPONENT'
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
