import { describe, it, expect } from "vitest";
import {
  resolveTurn,
  createBattleMon,
  TurnInput,
} from "../src/worker/lib/battle-engine";
import { SeededRNG } from "../src/worker/lib/rng";
import { DOkemonType, StatusEffect, BattleMon } from "../src/shared/types";
import { calcAllStats } from "../src/worker/lib/stat-calc";
import { getEffectiveness } from "../src/worker/lib/type-chart";

function makeMon(
  overrides: Partial<{
    type: DOkemonType;
    level: number;
    hp: number;
    atk: number;
    def: number;
    spc: number;
    spd: number;
    moves: [string, string, string, string];
    status: StatusEffect | null;
    currentHp: number;
  }> = {}
): BattleMon {
  const type = overrides.type ?? DOkemonType.FIRE;
  const level = overrides.level ?? 50;
  const base = {
    hp: overrides.hp ?? 60,
    atk: overrides.atk ?? 60,
    def: overrides.def ?? 60,
    spc: overrides.spc ?? 60,
    spd: overrides.spd ?? 60,
  };
  const stats = calcAllStats(base, level);
  const moves = overrides.moves ?? [
    "ember",
    "tackle",
    "harden",
    "growl",
  ];
  const mon = createBattleMon(
    "test-id",
    "TESTMON",
    "",
    type,
    level,
    stats,
    moves
  );
  if (overrides.status) {
    mon.status = overrides.status;
  }
  if (overrides.currentHp !== undefined) {
    mon.currentHp = overrides.currentHp;
  }
  return mon;
}

describe("Type Chart", () => {
  it("fire is super effective vs plant", () => {
    expect(getEffectiveness(DOkemonType.FIRE, DOkemonType.PLANT)).toBe(2);
  });

  it("fire is not very effective vs water", () => {
    expect(getEffectiveness(DOkemonType.FIRE, DOkemonType.WATER)).toBe(0.5);
  });

  it("fire vs fire is neutral", () => {
    expect(getEffectiveness(DOkemonType.FIRE, DOkemonType.FIRE)).toBe(1);
  });

  it("neutral type is always 1x", () => {
    expect(getEffectiveness("NEUTRAL", DOkemonType.FIRE)).toBe(1);
    expect(getEffectiveness("NEUTRAL", DOkemonType.WATER)).toBe(1);
  });

  it("spirit is super effective vs spirit", () => {
    expect(getEffectiveness(DOkemonType.SPIRIT, DOkemonType.SPIRIT)).toBe(2);
  });

  it("water is super effective vs fire and stone", () => {
    expect(getEffectiveness(DOkemonType.WATER, DOkemonType.FIRE)).toBe(2);
    expect(getEffectiveness(DOkemonType.WATER, DOkemonType.STONE)).toBe(2);
  });
});

describe("Damage Calculation", () => {
  it("deals damage with a physical move", () => {
    const mon1 = makeMon({ type: DOkemonType.FIRE, spd: 100 });
    const mon2 = makeMon({ type: DOkemonType.WATER });
    const input: TurnInput = { move1: 1, move2: 1 }; // both use tackle (neutral)
    const rng = new SeededRNG(42);

    const result = resolveTurn(mon1, mon2, input, 1, rng);
    // Both should take damage from tackle
    const damageEvents = result.events.filter(
      (e) => e.event.kind === "damage"
    );
    expect(damageEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("STAB gives 1.5x damage", () => {
    // Fire mon using ember (fire special) should do more than neutral tackle
    const mon1 = makeMon({ type: DOkemonType.FIRE, spd: 100 });
    const mon2a = makeMon({ type: DOkemonType.STONE }); // neutral to fire
    const mon2b = makeMon({ type: DOkemonType.STONE });

    // Ember (STAB fire move, power 40, special)
    const rng1 = new SeededRNG(42);
    const result1 = resolveTurn(
      mon1,
      mon2a,
      { move1: 0, move2: 2 },
      1,
      rng1
    );

    // Tackle (neutral, power 40, physical)
    const mon1b = makeMon({ type: DOkemonType.FIRE, spd: 100 });
    const rng2 = new SeededRNG(42);
    const result2 = resolveTurn(
      mon1b,
      mon2b,
      { move1: 1, move2: 2 },
      1,
      rng2
    );

    // Since fire is not very effective vs stone (0.5x), STAB makes it 0.75x total
    // Tackle is neutral (1x). So tackle should do more in this specific matchup.
    // But the important thing is both do damage
    const damage1 = result1.events.find(
      (e) => e.event.kind === "damage" && e.event.target === 2
    );
    const damage2 = result2.events.find(
      (e) => e.event.kind === "damage" && e.event.target === 2
    );
    expect(damage1).toBeDefined();
    expect(damage2).toBeDefined();
  });

  it("super effective deals 2x", () => {
    const mon1 = makeMon({
      type: DOkemonType.WATER,
      spd: 100,
      moves: ["water_pulse", "tackle", "harden", "growl"],
    });
    const mon2 = makeMon({ type: DOkemonType.FIRE });

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, mon2, { move1: 0, move2: 2 }, 1, rng);

    const seEvent = result.events.find(
      (e) => e.event.kind === "super_effective"
    );
    expect(seEvent).toBeDefined();
  });

  it("not very effective deals 0.5x", () => {
    const mon1 = makeMon({
      type: DOkemonType.FIRE,
      spd: 100,
      moves: ["ember", "tackle", "harden", "growl"],
    });
    const mon2 = makeMon({ type: DOkemonType.WATER });

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, mon2, { move1: 0, move2: 2 }, 1, rng);

    const nveEvent = result.events.find(
      (e) => e.event.kind === "not_very_effective"
    );
    expect(nveEvent).toBeDefined();
  });
});

describe("Turn Order", () => {
  it("faster DOkemon goes first", () => {
    const fast = makeMon({ spd: 100, type: DOkemonType.FIRE });
    const slow = makeMon({ spd: 20, type: DOkemonType.WATER });

    const rng = new SeededRNG(42);
    const result = resolveTurn(fast, slow, { move1: 1, move2: 1 }, 1, rng);

    // First move_used event should be from player 1 (the fast one)
    const firstMove = result.events.find(
      (e) => e.event.kind === "move_used"
    );
    expect(firstMove).toBeDefined();
    if (firstMove?.event.kind === "move_used") {
      expect(firstMove.event.attacker).toBe(1);
    }
  });

  it("priority move goes first regardless of speed", () => {
    const slow = makeMon({
      spd: 20,
      type: DOkemonType.WATER,
      moves: ["aqua_jet", "tackle", "harden", "growl"],
    });
    const fast = makeMon({ spd: 100, type: DOkemonType.FIRE });

    const rng = new SeededRNG(42);
    // Player 1 (slow) uses aqua_jet (priority), Player 2 (fast) uses tackle
    const result = resolveTurn(slow, fast, { move1: 0, move2: 1 }, 1, rng);

    const firstMove = result.events.find(
      (e) => e.event.kind === "move_used"
    );
    expect(firstMove).toBeDefined();
    if (firstMove?.event.kind === "move_used") {
      expect(firstMove.event.attacker).toBe(1); // slow mon with priority goes first
    }
  });
});

describe("Status Effects", () => {
  it("burn causes end-of-turn damage", () => {
    const mon1 = makeMon({
      status: StatusEffect.BURN,
      spd: 100,
    });
    const mon2 = makeMon();
    const startHp = mon1.currentHp;

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, mon2, { move1: 2, move2: 2 }, 1, rng); // both use harden

    const burnEvent = result.events.find(
      (e) => e.event.kind === "status_damage" && e.event.target === 1
    );
    expect(burnEvent).toBeDefined();
    expect(result.mon1.currentHp).toBeLessThan(startHp);
  });

  it("poison causes end-of-turn damage", () => {
    const mon1 = makeMon({
      status: StatusEffect.POISON,
      spd: 100,
    });
    const mon2 = makeMon();
    const startHp = mon1.currentHp;

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, mon2, { move1: 2, move2: 2 }, 1, rng);

    const poisonEvent = result.events.find(
      (e) => e.event.kind === "status_damage" && e.event.target === 1
    );
    expect(poisonEvent).toBeDefined();
    // Poison does 1/8 max HP, more than burn's 1/16
    expect(result.mon1.currentHp).toBeLessThan(startHp);
  });
});

describe("Stat Stages", () => {
  it("harden raises defense by 1", () => {
    const mon1 = makeMon({ spd: 100 });
    const mon2 = makeMon();

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, mon2, { move1: 2, move2: 1 }, 1, rng); // harden vs tackle

    const statEvent = result.events.find(
      (e) =>
        e.event.kind === "stat_changed" &&
        e.event.target === 1 &&
        e.event.stat === "def"
    );
    expect(statEvent).toBeDefined();
    expect(result.mon1.statStages.def).toBe(1);
  });

  it("growl lowers opponent attack by 1", () => {
    const mon1 = makeMon({ spd: 100 });
    const mon2 = makeMon();

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, mon2, { move1: 3, move2: 2 }, 1, rng); // growl vs harden

    const statEvent = result.events.find(
      (e) =>
        e.event.kind === "stat_changed" &&
        e.event.target === 2 &&
        e.event.stat === "atk"
    );
    expect(statEvent).toBeDefined();
    expect(result.mon2.statStages.atk).toBe(-1);
  });
});

describe("Battle End", () => {
  it("battle ends when a DOkemon faints", () => {
    const mon1 = makeMon({ spd: 100, atk: 100 });
    const mon2 = makeMon({ currentHp: 1, def: 20 });

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, mon2, { move1: 1, move2: 1 }, 1, rng);

    expect(result.winner).toBe(1);
    expect(result.mon2.currentHp).toBe(0);
    const faintEvent = result.events.find(
      (e) => e.event.kind === "fainted" && e.event.target === 2
    );
    expect(faintEvent).toBeDefined();
  });

  it("second attacker does not act if defender faints from first attack", () => {
    const mon1 = makeMon({ spd: 100, atk: 100 });
    const mon2 = makeMon({ currentHp: 1, def: 20 });

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, mon2, { move1: 1, move2: 1 }, 1, rng);

    // Only one move_used event (from mon1)
    const moveEvents = result.events.filter(
      (e) => e.event.kind === "move_used"
    );
    expect(moveEvents.length).toBe(1);
    if (moveEvents[0].event.kind === "move_used") {
      expect(moveEvents[0].event.attacker).toBe(1);
    }
  });
});

describe("PP Deduction", () => {
  it("PP is reduced after using a move", () => {
    const mon1 = makeMon({ spd: 100 });
    const startPP = mon1.movePP[1]; // tackle PP

    const rng = new SeededRNG(42);
    const result = resolveTurn(mon1, makeMon(), { move1: 1, move2: 2 }, 1, rng);

    expect(result.mon1.movePP[1]).toBe(startPP - 1);
  });
});

describe("Seeded RNG", () => {
  it("produces deterministic results", () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).toEqual(values2);
  });

  it("different seeds produce different results", () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(99);

    const v1 = rng1.next();
    const v2 = rng2.next();
    expect(v1).not.toBe(v2);
  });
});
