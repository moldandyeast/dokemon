import { StatBlock } from "../../shared/types";
import { STAT_STAGE_MIN, STAT_STAGE_MAX } from "../../shared/constants";

/**
 * Calculate effective HP at a given level from base stat.
 * Simplified Gen 1 formula (no IVs/EVs):
 * HP = floor((base * 2 * level) / 100) + level + 10
 */
export function calcEffectiveHP(base: number, level: number): number {
  return Math.floor((base * 2 * level) / 100) + level + 10;
}

/**
 * Calculate effective stat (ATK/DEF/SPC/SPD) at a given level from base stat.
 * stat = floor((base * 2 * level) / 100) + 5
 */
export function calcEffectiveStat(base: number, level: number): number {
  return Math.floor((base * 2 * level) / 100) + 5;
}

/**
 * Calculate all effective stats from base stats and level.
 */
export function calcAllStats(baseStats: StatBlock, level: number): StatBlock {
  return {
    hp: calcEffectiveHP(baseStats.hp, level),
    atk: calcEffectiveStat(baseStats.atk, level),
    def: calcEffectiveStat(baseStats.def, level),
    spc: calcEffectiveStat(baseStats.spc, level),
    spd: calcEffectiveStat(baseStats.spd, level),
  };
}

/**
 * Stat stage multiplier. Stages range from -6 to +6.
 * +1 = 1.5x, +2 = 2x, +3 = 2.5x, etc.
 * -1 = 2/3, -2 = 2/4, etc.
 */
export function getStatStageMultiplier(stage: number): number {
  const clamped = Math.max(STAT_STAGE_MIN, Math.min(STAT_STAGE_MAX, stage));
  if (clamped >= 0) {
    return (2 + clamped) / 2;
  } else {
    return 2 / (2 - clamped);
  }
}

/**
 * Apply stat stage modifier to a stat value.
 */
export function applyStatStage(stat: number, stage: number): number {
  return Math.floor(stat * getStatStageMultiplier(stage));
}

/**
 * XP required to reach the next level.
 * Simple quadratic: xp_to_next = level^2 * 4
 */
export function xpToNextLevel(level: number): number {
  return level * level * 4;
}

/**
 * Calculate XP gained from a battle.
 */
export function calcXPGain(
  opponentLevel: number,
  won: boolean
): number {
  const base = won ? 50 : 15;
  return Math.floor(base * (opponentLevel / 5));
}
