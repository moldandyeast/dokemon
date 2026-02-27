// ── Type System ──

export enum DOkemonType {
  FIRE = "FIRE",
  WATER = "WATER",
  PLANT = "PLANT",
  SPARK = "SPARK",
  STONE = "STONE",
  METAL = "METAL",
  SPIRIT = "SPIRIT",
  VENOM = "VENOM",
}

export enum MoveCategory {
  PHYSICAL = "PHYSICAL",
  SPECIAL = "SPECIAL",
  STATUS = "STATUS",
}

export enum StatusEffect {
  BURN = "BURN",
  POISON = "POISON",
  PARALYZE = "PARALYZE",
  SLEEP = "SLEEP",
  FREEZE = "FREEZE",
}

// ── Stats ──

export interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  spc: number;
  spd: number;
}

// ── Moves ──

export type MoveEffectType =
  | { kind: "none" }
  | { kind: "burn"; chance: number }
  | { kind: "poison"; chance: number }
  | { kind: "paralyze"; chance: number }
  | { kind: "sleep" }
  | { kind: "freeze"; chance: number }
  | { kind: "stat_up"; stat: keyof StatBlock; stages: number }
  | { kind: "stat_down"; stat: keyof StatBlock; stages: number }
  | { kind: "heal_self" }
  | { kind: "priority"; value: number };

export interface Move {
  id: string;
  name: string;
  type: DOkemonType | "NEUTRAL";
  category: MoveCategory;
  power: number; // 0 for status moves
  pp: number;
  accuracy: number; // 1-100, or 0 for never-miss
  effects: MoveEffectType[];
  description: string;
}

// ── Creature Data ──

export interface DOkemonData {
  id: string;
  name: string;
  sprite: string; // base64-encoded 256-byte array
  type: DOkemonType;
  baseStats: StatBlock;
  moveIds: [string, string, string, string];
  level: number;
  xp: number;
  wins: number;
  losses: number;
  ownerId: string;
  createdAt: number;
}

// ── Battle Types ──

export interface BattleMon {
  dokemonId: string;
  name: string;
  sprite: string;
  type: DOkemonType;
  level: number;
  moveIds: [string, string, string, string];
  movePP: [number, number, number, number];
  maxHp: number;
  currentHp: number;
  stats: StatBlock; // level-scaled effective stats
  status: StatusEffect | null;
  statusTurns: number; // for sleep countdown
  statStages: StatBlock; // -6 to +6 for each stat
}

export type BattleEventType =
  | { kind: "move_used"; attacker: 1 | 2; moveId: string }
  | { kind: "damage"; target: 1 | 2; amount: number; remaining: number }
  | { kind: "critical_hit" }
  | { kind: "super_effective" }
  | { kind: "not_very_effective" }
  | { kind: "status_inflicted"; target: 1 | 2; status: StatusEffect }
  | { kind: "status_damage"; target: 1 | 2; amount: number; status: StatusEffect }
  | { kind: "status_prevented_move"; target: 1 | 2; status: StatusEffect }
  | { kind: "status_cured"; target: 1 | 2; status: StatusEffect }
  | { kind: "stat_changed"; target: 1 | 2; stat: keyof StatBlock; stages: number }
  | { kind: "heal"; target: 1 | 2; amount: number }
  | { kind: "fainted"; target: 1 | 2 }
  | { kind: "miss"; attacker: 1 | 2 };

export interface BattleEvent {
  event: BattleEventType;
}

export interface TurnResult {
  turnNumber: number;
  events: BattleEvent[];
  mon1: BattleMon;
  mon2: BattleMon;
  winner: 1 | 2 | null;
}

export interface BattleSnapshot {
  name: string;
  sprite: string;
  type: DOkemonType;
  level: number;
  maxHp: number;
  currentHp: number;
  moveIds: [string, string, string, string];
  movePP: [number, number, number, number];
}
