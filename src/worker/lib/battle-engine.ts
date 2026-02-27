import {
  BattleMon,
  BattleEvent,
  BattleEventType,
  TurnResult,
  StatusEffect,
  MoveCategory,
  DOkemonType,
  StatBlock,
} from "../../shared/types";
import { STAB_MULTIPLIER, CRIT_CHANCE, CRIT_MULTIPLIER } from "../../shared/constants";
import { getMoveById } from "../../shared/moves";
import { getEffectiveness } from "./type-chart";
import { applyStatStage } from "./stat-calc";
import { checkCanAct, residualDamage } from "./status-effects";
import { SeededRNG } from "./rng";

// ── Helpers ──

function hasPriority(moveId: string): number {
  const move = getMoveById(moveId);
  for (const eff of move.effects) {
    if (eff.kind === "priority") return eff.value;
  }
  return 0;
}

function effectiveSpeed(mon: BattleMon): number {
  let spd = applyStatStage(mon.stats.spd, mon.statStages.spd);
  if (mon.status === StatusEffect.PARALYZE) {
    spd = Math.floor(spd / 4);
  }
  return spd;
}

function clampHP(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(maxHp, hp));
}

// ── Damage Calculation ──

function calcDamage(
  attacker: BattleMon,
  defender: BattleMon,
  moveId: string,
  rng: SeededRNG
): { damage: number; events: BattleEventType[] } {
  const move = getMoveById(moveId);
  const events: BattleEventType[] = [];

  if (move.category === MoveCategory.STATUS) {
    return { damage: 0, events };
  }

  const level = attacker.level;
  const power = move.power;

  // Determine atk/def stats based on move category
  const isPhysical = move.category === MoveCategory.PHYSICAL;
  let atk = isPhysical
    ? applyStatStage(attacker.stats.atk, attacker.statStages.atk)
    : applyStatStage(attacker.stats.spc, attacker.statStages.spc);
  let def = isPhysical
    ? applyStatStage(defender.stats.def, defender.statStages.def)
    : applyStatStage(defender.stats.spc, defender.statStages.spc);

  // Burn halves physical attack
  if (attacker.status === StatusEffect.BURN && isPhysical) {
    atk = Math.floor(atk / 2);
  }

  // Critical hit
  let critMultiplier = 1;
  if (rng.chance(CRIT_CHANCE)) {
    critMultiplier = CRIT_MULTIPLIER;
    events.push({ kind: "critical_hit" });
  }

  // Base damage formula (Gen 1)
  let damage = Math.floor(
    ((2 * level * critMultiplier) / 5 + 2) * power * atk / def / 50
  ) + 2;

  // STAB
  if (move.type !== "NEUTRAL" && move.type === attacker.type) {
    damage = Math.floor(damage * STAB_MULTIPLIER);
  }

  // Type effectiveness
  const effectiveness = getEffectiveness(move.type, defender.type);
  damage = Math.floor(damage * effectiveness);
  if (effectiveness > 1) events.push({ kind: "super_effective" });
  if (effectiveness < 1) events.push({ kind: "not_very_effective" });

  // Hex doubles power if target has a status
  if (moveId === "hex" && defender.status !== null) {
    damage = Math.floor(damage * 2);
  }

  // Random factor (0.85 to 1.0)
  const randomFactor = rng.range(85, 100) / 100;
  damage = Math.max(1, Math.floor(damage * randomFactor));

  return { damage, events };
}

// ── Move Execution ──

function executeMove(
  attacker: BattleMon,
  defender: BattleMon,
  moveIndex: number,
  attackerNum: 1 | 2,
  defenderNum: 1 | 2,
  rng: SeededRNG
): BattleEvent[] {
  const events: BattleEvent[] = [];
  const moveId = attacker.moveIds[moveIndex];
  const move = getMoveById(moveId);

  events.push({ event: { kind: "move_used", attacker: attackerNum, moveId } });

  // Deduct PP
  attacker.movePP[moveIndex] = Math.max(0, attacker.movePP[moveIndex] - 1);

  // Accuracy check
  if (move.accuracy > 0 && !rng.chance(move.accuracy / 100)) {
    events.push({ event: { kind: "miss", attacker: attackerNum } });
    return events;
  }

  // Deal damage
  if (move.power > 0) {
    const { damage, events: damageEvents } = calcDamage(
      attacker,
      defender,
      moveId,
      rng
    );
    for (const e of damageEvents) {
      events.push({ event: e });
    }
    defender.currentHp = clampHP(defender.currentHp - damage, defender.maxHp);
    events.push({
      event: {
        kind: "damage",
        target: defenderNum,
        amount: damage,
        remaining: defender.currentHp,
      },
    });
  }

  // Apply move effects
  for (const effect of move.effects) {
    switch (effect.kind) {
      case "burn":
      case "poison":
      case "paralyze":
      case "freeze": {
        if (defender.status !== null) break; // already has a status
        const chance = effect.chance;
        if (rng.chance(chance)) {
          const statusMap = {
            burn: StatusEffect.BURN,
            poison: StatusEffect.POISON,
            paralyze: StatusEffect.PARALYZE,
            freeze: StatusEffect.FREEZE,
          };
          defender.status = statusMap[effect.kind];
          defender.statusTurns = 0;
          events.push({
            event: {
              kind: "status_inflicted",
              target: defenderNum,
              status: defender.status,
            },
          });
        }
        break;
      }
      case "sleep": {
        // Special: if this is Rest, apply to self; otherwise apply to target
        if (moveId === "rest") {
          attacker.status = StatusEffect.SLEEP;
          attacker.statusTurns = 2;
          events.push({
            event: {
              kind: "status_inflicted",
              target: attackerNum,
              status: StatusEffect.SLEEP,
            },
          });
        } else if (moveId === "spore_cloud") {
          if (defender.status === null) {
            defender.status = StatusEffect.SLEEP;
            defender.statusTurns = rng.range(1, 3);
            events.push({
              event: {
                kind: "status_inflicted",
                target: defenderNum,
                status: StatusEffect.SLEEP,
              },
            });
          }
        }
        break;
      }
      case "stat_up": {
        const current = attacker.statStages[effect.stat];
        const newStage = Math.min(6, current + effect.stages);
        if (newStage !== current) {
          attacker.statStages[effect.stat] = newStage;
          events.push({
            event: {
              kind: "stat_changed",
              target: attackerNum,
              stat: effect.stat,
              stages: effect.stages,
            },
          });
        }
        break;
      }
      case "stat_down": {
        const current = defender.statStages[effect.stat];
        const newStage = Math.max(-6, current - effect.stages);
        if (newStage !== current) {
          defender.statStages[effect.stat] = newStage;
          events.push({
            event: {
              kind: "stat_changed",
              target: defenderNum,
              stat: effect.stat,
              stages: -effect.stages,
            },
          });
        }
        break;
      }
      case "heal_self": {
        const healed = attacker.maxHp - attacker.currentHp;
        attacker.currentHp = attacker.maxHp;
        if (healed > 0) {
          events.push({
            event: { kind: "heal", target: attackerNum, amount: healed },
          });
        }
        break;
      }
      case "priority":
      case "none":
        break;
    }
  }

  // Check faint
  if (defender.currentHp <= 0) {
    events.push({ event: { kind: "fainted", target: defenderNum } });
  }

  return events;
}

// ── Turn Resolution ──

export interface TurnInput {
  move1: number; // index 0-3
  move2: number;
}

export function resolveTurn(
  mon1: BattleMon,
  mon2: BattleMon,
  input: TurnInput,
  turnNumber: number,
  rng: SeededRNG
): TurnResult {
  const events: BattleEvent[] = [];

  // Determine turn order
  const pri1 = hasPriority(mon1.moveIds[input.move1]);
  const pri2 = hasPriority(mon2.moveIds[input.move2]);

  let first: { mon: BattleMon; move: number; num: 1 | 2 };
  let second: { mon: BattleMon; move: number; num: 1 | 2 };

  if (pri1 > pri2) {
    first = { mon: mon1, move: input.move1, num: 1 };
    second = { mon: mon2, move: input.move2, num: 2 };
  } else if (pri2 > pri1) {
    first = { mon: mon2, move: input.move2, num: 2 };
    second = { mon: mon1, move: input.move1, num: 1 };
  } else {
    // Compare speed
    const spd1 = effectiveSpeed(mon1);
    const spd2 = effectiveSpeed(mon2);
    if (spd1 > spd2 || (spd1 === spd2 && rng.chance(0.5))) {
      first = { mon: mon1, move: input.move1, num: 1 };
      second = { mon: mon2, move: input.move2, num: 2 };
    } else {
      first = { mon: mon2, move: input.move2, num: 2 };
      second = { mon: mon1, move: input.move1, num: 1 };
    }
  }

  const firstDefender = first.num === 1 ? second : first;

  // ── First attacker's turn ──
  const canAct1 = checkCanAct(first.mon.status, first.mon.statusTurns, rng);
  if (canAct1.cured) {
    events.push({
      event: {
        kind: "status_cured",
        target: first.num,
        status: first.mon.status!,
      },
    });
    first.mon.status = null;
    first.mon.statusTurns = 0;
  } else {
    first.mon.statusTurns = canAct1.newStatusTurns || first.mon.statusTurns;
  }

  if (canAct1.canAct) {
    const defender = first.num === 1 ? mon2 : mon1;
    const defenderNum = first.num === 1 ? 2 : 1;
    const moveEvents = executeMove(
      first.mon,
      defender,
      first.move,
      first.num,
      defenderNum as 1 | 2,
      rng
    );
    events.push(...moveEvents);
  } else if (!canAct1.cured) {
    events.push({
      event: {
        kind: "status_prevented_move",
        target: first.num,
        status: first.mon.status!,
      },
    });
  }

  // Check if defender fainted — if so, skip second attacker
  let winner: 1 | 2 | null = null;
  if (mon1.currentHp <= 0) {
    winner = 2;
  } else if (mon2.currentHp <= 0) {
    winner = 1;
  }

  // ── Second attacker's turn (if no one fainted) ──
  if (winner === null) {
    const canAct2 = checkCanAct(
      second.mon.status,
      second.mon.statusTurns,
      rng
    );
    if (canAct2.cured) {
      events.push({
        event: {
          kind: "status_cured",
          target: second.num,
          status: second.mon.status!,
        },
      });
      second.mon.status = null;
      second.mon.statusTurns = 0;
    } else {
      second.mon.statusTurns = canAct2.newStatusTurns || second.mon.statusTurns;
    }

    if (canAct2.canAct) {
      const defender = second.num === 1 ? mon2 : mon1;
      const defenderNum = second.num === 1 ? 2 : 1;
      const moveEvents = executeMove(
        second.mon,
        defender,
        second.move,
        second.num,
        defenderNum as 1 | 2,
        rng
      );
      events.push(...moveEvents);
    } else if (!canAct2.cured) {
      events.push({
        event: {
          kind: "status_prevented_move",
          target: second.num,
          status: second.mon.status!,
        },
      });
    }

    // Check faint after second attack
    if (mon1.currentHp <= 0) {
      winner = 2;
    } else if (mon2.currentHp <= 0) {
      winner = 1;
    }
  }

  // ── End-of-turn: residual damage ──
  if (winner === null) {
    for (const { mon, num } of [
      { mon: mon1, num: 1 as const },
      { mon: mon2, num: 2 as const },
    ]) {
      const resDmg = residualDamage(mon.status, mon.maxHp);
      if (resDmg > 0) {
        mon.currentHp = clampHP(mon.currentHp - resDmg, mon.maxHp);
        events.push({
          event: {
            kind: "status_damage",
            target: num,
            amount: resDmg,
            status: mon.status!,
          },
        });
        if (mon.currentHp <= 0) {
          events.push({ event: { kind: "fainted", target: num } });
          winner = num === 1 ? 2 : 1;
        }
      }
    }
  }

  return {
    turnNumber,
    events,
    mon1: { ...mon1 },
    mon2: { ...mon2 },
    winner,
  };
}

// ── BattleMon Factory ──

export function createBattleMon(
  dokemonId: string,
  name: string,
  sprite: string,
  type: DOkemonType,
  level: number,
  effectiveStats: StatBlock,
  moveIds: [string, string, string, string]
): BattleMon {
  const movePPs = moveIds.map((id) => getMoveById(id).pp) as [
    number,
    number,
    number,
    number,
  ];
  return {
    dokemonId,
    name,
    sprite,
    type,
    level,
    moveIds,
    movePP: movePPs,
    maxHp: effectiveStats.hp,
    currentHp: effectiveStats.hp,
    stats: effectiveStats,
    status: null,
    statusTurns: 0,
    statStages: { hp: 0, atk: 0, def: 0, spc: 0, spd: 0 },
  };
}
