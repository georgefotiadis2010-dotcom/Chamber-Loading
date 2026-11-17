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
  shooter: ActorSide;
  target: ActorSide;
  aim: AimChoice;
  chamberIndex: number;
  card: CardInstance | null;
  reflectedToShooter: boolean;
  cancelledChamberEffect: boolean;
}

export interface ChamberFireResult {
  damageToTarget: number;
  damageToShooter: number;
  keepTurn: boolean;
  discardTargetCard?: boolean;
  peekNextChamber?: boolean;
  drawCards?: number;
  skipShooterNextTurn?: boolean;
  forceFireNextAtShooter?: boolean;
  logMessage: string;
}

export interface TableTriggerContext {
  trapOwner: ActorSide;
  shooter: ActorSide;
  target: ActorSide;
  aim: AimChoice;
  chamberCard: CardInstance | null; // null = Empty/Blank
}

export interface TableTriggerResult {
  triggered: boolean;
  reflectDamage?: boolean;
  cancelChamberEffect?: boolean;
  damageShooter?: number;
  discardShooterCard?: boolean;
  stealTurn?: boolean;
  logMessage: string;
}

export interface CardDef {
  id: CardId;
  name: string;
  color: CardColor;
  category: CardCategory;
  shortTag: string;
  description: string;
  chamberEffectText: string;
  tableTrapText: string;
  accentColor: string;
  borderColor: string;
  headerBgColor: string;
  artBgColor: string;
  badgeText: string;
  onChamberFire: (ctx: ChamberFireContext) => ChamberFireResult;
  onTableTrigger: (ctx: TableTriggerContext) => TableTriggerResult;
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
  | 'AI_THINKING'
  | 'RESOLVE_CHAMBER'
  | 'RESOLVE_TRAP'
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
