import { DOkemonType } from "../../shared/types";

/**
 * Type effectiveness chart.
 * Key: attacking type → defending type → multiplier (0.5, 1, or 2)
 *
 * From the GDD:
 * FIRE    strong vs Plant, Metal    weak vs Water, Stone
 * WATER   strong vs Fire, Stone     weak vs Plant, Spark
 * PLANT   strong vs Water, Stone    weak vs Fire, Venom
 * SPARK   strong vs Water, Metal    weak vs Stone, Plant
 * STONE   strong vs Fire, Spark     weak vs Water, Plant, Metal
 * METAL   strong vs Stone, Spirit   weak vs Fire, Spark
 * SPIRIT  strong vs Spirit, Venom   weak vs Metal
 * VENOM   strong vs Plant, Spirit   weak vs Stone, Metal
 */
const chart: Record<DOkemonType, Partial<Record<DOkemonType, number>>> = {
  [DOkemonType.FIRE]: {
    [DOkemonType.PLANT]: 2,
    [DOkemonType.METAL]: 2,
    [DOkemonType.WATER]: 0.5,
    [DOkemonType.STONE]: 0.5,
  },
  [DOkemonType.WATER]: {
    [DOkemonType.FIRE]: 2,
    [DOkemonType.STONE]: 2,
    [DOkemonType.PLANT]: 0.5,
    [DOkemonType.SPARK]: 0.5,
  },
  [DOkemonType.PLANT]: {
    [DOkemonType.WATER]: 2,
    [DOkemonType.STONE]: 2,
    [DOkemonType.FIRE]: 0.5,
    [DOkemonType.VENOM]: 0.5,
  },
  [DOkemonType.SPARK]: {
    [DOkemonType.WATER]: 2,
    [DOkemonType.METAL]: 2,
    [DOkemonType.STONE]: 0.5,
    [DOkemonType.PLANT]: 0.5,
  },
  [DOkemonType.STONE]: {
    [DOkemonType.FIRE]: 2,
    [DOkemonType.SPARK]: 2,
    [DOkemonType.WATER]: 0.5,
    [DOkemonType.PLANT]: 0.5,
    [DOkemonType.METAL]: 0.5,
  },
  [DOkemonType.METAL]: {
    [DOkemonType.STONE]: 2,
    [DOkemonType.SPIRIT]: 2,
    [DOkemonType.FIRE]: 0.5,
    [DOkemonType.SPARK]: 0.5,
  },
  [DOkemonType.SPIRIT]: {
    [DOkemonType.SPIRIT]: 2,
    [DOkemonType.VENOM]: 2,
    [DOkemonType.METAL]: 0.5,
  },
  [DOkemonType.VENOM]: {
    [DOkemonType.PLANT]: 2,
    [DOkemonType.SPIRIT]: 2,
    [DOkemonType.STONE]: 0.5,
    [DOkemonType.METAL]: 0.5,
  },
};

/**
 * Get the effectiveness multiplier for an attack type vs a defender type.
 * Returns 2 (super effective), 0.5 (not very effective), or 1 (neutral).
 * NEUTRAL type moves are always 1x.
 */
export function getEffectiveness(
  attackType: DOkemonType | "NEUTRAL",
  defenderType: DOkemonType
): number {
  if (attackType === "NEUTRAL") return 1;
  return chart[attackType]?.[defenderType] ?? 1;
}
