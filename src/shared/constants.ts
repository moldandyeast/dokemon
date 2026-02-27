import { DOkemonType } from "./types";

// ── Game Boy Palette ──
export const GB_PALETTE = ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"] as const;
export const GB_DARKEST = 0;
export const GB_DARK = 1;
export const GB_LIGHT = 2;
export const GB_LIGHTEST = 3;

// ── Screen ──
export const SCREEN_WIDTH = 160;
export const SCREEN_HEIGHT = 144;

// ── Sprites ──
export const SPRITE_SIZE = 16;
export const SPRITE_BYTES = SPRITE_SIZE * SPRITE_SIZE; // 256

// ── Stats ──
export const STAT_BUDGET = 300;
export const STAT_MIN = 20;
export const STAT_MAX = 100;
export const STAT_NAMES = ["hp", "atk", "def", "spc", "spd"] as const;

// ── Levels ──
export const LEVEL_MIN = 5;
export const LEVEL_MAX = 50;
export const XP_PER_WIN_BASE = 50;
export const XP_PER_LOSS_BASE = 15;

// ── Battle ──
export const MOVE_TIMEOUT_MS = 30_000;
export const STAB_MULTIPLIER = 1.5;
export const CRIT_CHANCE = 1 / 16; // ~6.25%
export const CRIT_MULTIPLIER = 2;
export const MAX_MOVES = 4;
export const NAME_MAX_LENGTH = 10;
export const STAT_STAGE_MIN = -6;
export const STAT_STAGE_MAX = 6;

// ── Player ──
export const INITIAL_RATING = 1000;

// ── Type Metadata ──
export const TYPE_INFO: Record<
  DOkemonType,
  { label: string; description: string }
> = {
  [DOkemonType.FIRE]: {
    label: "FIRE",
    description: "Flames, heat, magma",
  },
  [DOkemonType.WATER]: {
    label: "WATER",
    description: "Oceans, ice, rain",
  },
  [DOkemonType.PLANT]: {
    label: "PLANT",
    description: "Forests, vines, growth",
  },
  [DOkemonType.SPARK]: {
    label: "SPARK",
    description: "Lightning, static, energy",
  },
  [DOkemonType.STONE]: {
    label: "STONE",
    description: "Rocks, earth, crystals",
  },
  [DOkemonType.METAL]: {
    label: "METAL",
    description: "Steel, machines, armor",
  },
  [DOkemonType.SPIRIT]: {
    label: "SPIRIT",
    description: "Ghosts, psychic, shadow",
  },
  [DOkemonType.VENOM]: {
    label: "VENOM",
    description: "Poison, acid, toxins",
  },
};
