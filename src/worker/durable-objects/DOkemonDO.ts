import { DurableObject } from "cloudflare:workers";
import { DOkemonData, DOkemonType, StatBlock } from "../../shared/types";
import { STAT_BUDGET, STAT_MIN, STAT_MAX, STAT_NAMES, NAME_MAX_LENGTH, MAX_MOVES, LEVEL_MIN, LEVEL_MAX } from "../../shared/constants";
import { MOVE_MAP } from "../../shared/moves";
import { calcAllStats, calcXPGain, xpToNextLevel } from "../lib/stat-calc";

interface CreateRequest {
  sprite: string;
  name: string;
  type: DOkemonType;
  baseStats: StatBlock;
  moveIds: [string, string, string, string];
  ownerId: string;
}

export class DOkemonDO extends DurableObject {
  private validate(data: CreateRequest): string | null {
    // Name
    if (!data.name || data.name.length > NAME_MAX_LENGTH) {
      return `Name must be 1-${NAME_MAX_LENGTH} characters`;
    }
    if (!/^[A-Z0-9 ]+$/.test(data.name)) {
      return "Name must be uppercase letters, numbers, or spaces";
    }

    // Type
    if (!Object.values(DOkemonType).includes(data.type)) {
      return "Invalid type";
    }

    // Stats
    const total = STAT_NAMES.reduce(
      (sum, s) => sum + (data.baseStats[s] ?? 0),
      0
    );
    if (total !== STAT_BUDGET) {
      return `Stats must total ${STAT_BUDGET} (got ${total})`;
    }
    for (const s of STAT_NAMES) {
      const v = data.baseStats[s];
      if (v < STAT_MIN || v > STAT_MAX) {
        return `${s} must be ${STAT_MIN}-${STAT_MAX} (got ${v})`;
      }
    }

    // Moves
    if (!data.moveIds || data.moveIds.length !== MAX_MOVES) {
      return `Must have exactly ${MAX_MOVES} moves`;
    }
    const seen = new Set<string>();
    for (const id of data.moveIds) {
      if (!MOVE_MAP.has(id)) return `Unknown move: ${id}`;
      if (seen.has(id)) return `Duplicate move: ${id}`;
      seen.add(id);
    }

    // Sprite
    if (!data.sprite) return "Sprite is required";
    try {
      const decoded = atob(data.sprite);
      if (decoded.length !== 256) return "Sprite must be 256 bytes";
    } catch {
      return "Invalid sprite data";
    }

    return null;
  }

  async initialize(data: CreateRequest): Promise<DOkemonData> {
    const error = this.validate(data);
    if (error) throw new Error(error);

    const id = this.ctx.id.toString();
    const dokemon: DOkemonData = {
      id,
      name: data.name,
      sprite: data.sprite,
      type: data.type,
      baseStats: data.baseStats,
      moveIds: data.moveIds,
      level: LEVEL_MIN,
      xp: 0,
      wins: 0,
      losses: 0,
      ownerId: data.ownerId,
      createdAt: Date.now(),
    };

    await this.ctx.storage.put("data", dokemon);
    return dokemon;
  }

  async getSnapshot(): Promise<DOkemonData | null> {
    return (await this.ctx.storage.get<DOkemonData>("data")) ?? null;
  }

  async applyBattleResult(result: {
    won: boolean;
    opponentLevel: number;
  }): Promise<void> {
    const data = await this.ctx.storage.get<DOkemonData>("data");
    if (!data) return;

    if (result.won) {
      data.wins++;
    } else {
      data.losses++;
    }

    const xpGain = calcXPGain(result.opponentLevel, result.won);
    data.xp += xpGain;

    // Level up loop
    while (data.level < LEVEL_MAX) {
      const needed = xpToNextLevel(data.level);
      if (data.xp < needed) break;
      data.xp -= needed;
      data.level++;
    }

    await this.ctx.storage.put("data", data);
  }

  async fetch(request: Request): Promise<Response> {
    const snapshot = await this.getSnapshot();
    if (!snapshot) {
      return Response.json({ error: "Not initialized" }, { status: 404 });
    }
    return Response.json(snapshot);
  }
}
