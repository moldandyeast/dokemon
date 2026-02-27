import { StatusEffect } from "../../shared/types";
import { SeededRNG } from "./rng";

/**
 * Calculate residual damage from burn: 1/16 max HP (min 1).
 */
export function burnDamage(maxHp: number): number {
  return Math.max(1, Math.floor(maxHp / 16));
}

/**
 * Calculate residual damage from poison: 1/8 max HP (min 1).
 */
export function poisonDamage(maxHp: number): number {
  return Math.max(1, Math.floor(maxHp / 8));
}

/**
 * Check whether a DOkemon with a status effect can act this turn.
 * Returns { canAct, cured, message }.
 */
export function checkCanAct(
  status: StatusEffect | null,
  statusTurns: number,
  rng: SeededRNG
): { canAct: boolean; cured: boolean; newStatusTurns: number } {
  if (!status) return { canAct: true, cured: false, newStatusTurns: 0 };

  switch (status) {
    case StatusEffect.PARALYZE:
      // 25% chance of being unable to move
      return { canAct: !rng.chance(0.25), cured: false, newStatusTurns: 0 };

    case StatusEffect.SLEEP:
      // Decrement counter; wake at 0
      if (statusTurns <= 1) {
        return { canAct: false, cured: true, newStatusTurns: 0 };
      }
      return { canAct: false, cured: false, newStatusTurns: statusTurns - 1 };

    case StatusEffect.FREEZE:
      // 20% chance of thawing each turn
      const thawed = rng.chance(0.2);
      return { canAct: thawed, cured: thawed, newStatusTurns: 0 };

    case StatusEffect.BURN:
    case StatusEffect.POISON:
      // These don't prevent action
      return { canAct: true, cured: false, newStatusTurns: 0 };

    default:
      return { canAct: true, cured: false, newStatusTurns: 0 };
  }
}

/**
 * Calculate residual (end-of-turn) damage for a status.
 */
export function residualDamage(
  status: StatusEffect | null,
  maxHp: number
): number {
  if (!status) return 0;
  switch (status) {
    case StatusEffect.BURN:
      return burnDamage(maxHp);
    case StatusEffect.POISON:
      return poisonDamage(maxHp);
    default:
      return 0;
  }
}
