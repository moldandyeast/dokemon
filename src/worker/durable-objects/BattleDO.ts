import { DurableObject } from "cloudflare:workers";
import { BattleMon, BattleSnapshot, DOkemonData } from "../../shared/types";
import { MOVE_TIMEOUT_MS } from "../../shared/constants";
import { calcAllStats } from "../lib/stat-calc";
import {
  resolveTurn,
  createBattleMon,
  TurnInput,
} from "../lib/battle-engine";
import { SeededRNG } from "../lib/rng";
import { BattleServerMessage } from "../../shared/protocol";
import { getMoveById } from "../../shared/moves";
import { PRESET_DOKEMON } from "../../shared/presets";

type BattlePhase =
  | "WAITING_FOR_PLAYERS"
  | "BATTLE_START"
  | "WAITING_FOR_MOVES"
  | "RESOLVING"
  | "BATTLE_END";

interface PlayerInfo {
  playerId: string;
  dokemonId: string;
  rating: number;
}

// All state that needs to survive hibernation
interface BattleState {
  phase: BattlePhase;
  mon1: BattleMon | null;
  mon2: BattleMon | null;
  turnNumber: number;
  rngState: number[] | null; // serialized RNG state
  pendingMoves: Record<string, number>;
  player1Info: PlayerInfo | null;
  player2Info: PlayerInfo | null;
  cpuMode: boolean;
  cpuRngState: number[] | null;
}

export class BattleDO extends DurableObject {
  // In-memory cache — restored from storage on each wake
  private state: BattleState | null = null;
  private rng: SeededRNG | null = null;
  private cpuRng: SeededRNG | null = null;

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  private async loadState(): Promise<BattleState> {
    if (this.state) return this.state;
    const stored = await this.ctx.storage.get<BattleState>("battleState");
    if (stored) {
      this.state = stored;
      // Restore RNG from state
      if (stored.rngState) {
        this.rng = SeededRNG.fromState(stored.rngState);
      }
      if (stored.cpuRngState) {
        this.cpuRng = SeededRNG.fromState(stored.cpuRngState);
      }
    } else {
      this.state = {
        phase: "WAITING_FOR_PLAYERS",
        mon1: null,
        mon2: null,
        turnNumber: 0,
        rngState: null,
        pendingMoves: {},
        player1Info: null,
        player2Info: null,
        cpuMode: false,
        cpuRngState: null,
      };
    }
    return this.state;
  }

  private async saveState(): Promise<void> {
    if (!this.state) return;
    // Serialize RNG state
    if (this.rng) {
      this.state.rngState = this.rng.getState();
    }
    if (this.cpuRng) {
      this.state.cpuRngState = this.cpuRng.getState();
    }
    await this.ctx.storage.put("battleState", this.state);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const upgrade = request.headers.get("Upgrade");
    const state = await this.loadState();

    if (upgrade !== "websocket") {
      return Response.json({ phase: state.phase });
    }

    // Parse connection params
    const playerId = url.searchParams.get("playerId") ?? "unknown";
    const dokemonId = url.searchParams.get("dokemonId") ?? "";
    const rating = parseInt(url.searchParams.get("rating") ?? "1000");
    const isCpu = url.searchParams.get("cpu") === "true";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Determine player role
    const sockets = this.ctx.getWebSockets();
    let tag: string;

    if (sockets.length === 0) {
      tag = "player1";
      state.player1Info = { playerId, dokemonId, rating };
    } else if (sockets.length === 1 && !state.cpuMode) {
      tag = "player2";
      state.player2Info = { playerId, dokemonId, rating };
    } else {
      return new Response("Battle full", { status: 409 });
    }

    this.ctx.acceptWebSocket(server, [tag]);
    server.serializeAttachment({ playerId, dokemonId, tag });

    // CPU mode: set up a virtual opponent and start immediately
    if (isCpu && tag === "player1") {
      state.cpuMode = true;
      this.cpuRng = new SeededRNG(Date.now() ^ 0xdeadbeef);
      const presetIdx = Math.floor(Math.random() * PRESET_DOKEMON.length);
      const preset = PRESET_DOKEMON[presetIdx];
      state.player2Info = {
        playerId: "cpu",
        dokemonId: "cpu",
        rating: 1000,
      };
      await this.initializeBattleCPU(preset);
      return new Response(null, { status: 101, webSocket: client });
    }

    // If both players connected, start the battle
    if (this.ctx.getWebSockets().length === 2 && state.phase === "WAITING_FOR_PLAYERS") {
      await this.initializeBattle();
    } else {
      await this.saveState();
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private async initializeBattle() {
    const state = await this.loadState();
    if (!state.player1Info || !state.player2Info) return;

    const snap1 = await this.fetchDOkemonSnapshot(state.player1Info.dokemonId);
    const snap2 = await this.fetchDOkemonSnapshot(state.player2Info.dokemonId);

    if (!snap1 || !snap2) {
      this.broadcast({ type: "error", message: "Failed to load DOkemon data" });
      return;
    }

    const stats1 = calcAllStats(snap1.baseStats, snap1.level);
    const stats2 = calcAllStats(snap2.baseStats, snap2.level);

    state.mon1 = createBattleMon(snap1.id, snap1.name, snap1.sprite, snap1.type, snap1.level, stats1, snap1.moveIds);
    state.mon2 = createBattleMon(snap2.id, snap2.name, snap2.sprite, snap2.type, snap2.level, stats2, snap2.moveIds);

    this.rng = new SeededRNG(Date.now());
    state.turnNumber = 1;
    state.phase = "WAITING_FOR_MOVES";

    this.sendToPlayer("player1", {
      type: "battle_start",
      you: this.makeSnapshot(state.mon1),
      opponent: this.makeSnapshot(state.mon2),
      yourRole: "player1",
      turnNumber: state.turnNumber,
    });
    this.sendToPlayer("player2", {
      type: "battle_start",
      you: this.makeSnapshot(state.mon2),
      opponent: this.makeSnapshot(state.mon1),
      yourRole: "player2",
      turnNumber: state.turnNumber,
    });

    await this.saveState();
    await this.ctx.storage.setAlarm(Date.now() + MOVE_TIMEOUT_MS);
  }

  private async initializeBattleCPU(preset: typeof PRESET_DOKEMON[number]) {
    const state = await this.loadState();
    if (!state.player1Info) return;

    const snap1 = await this.fetchDOkemonSnapshot(state.player1Info.dokemonId);
    if (!snap1) {
      this.sendToPlayer("player1", { type: "error", message: "Failed to load your DOkemon data" });
      return;
    }

    const stats1 = calcAllStats(snap1.baseStats, snap1.level);
    state.mon1 = createBattleMon(snap1.id, snap1.name, snap1.sprite, snap1.type, snap1.level, stats1, snap1.moveIds);

    const cpuLevel = snap1.level;
    const cpuStats = calcAllStats(preset.baseStats, cpuLevel);
    state.mon2 = createBattleMon("cpu", preset.name, preset.sprite, preset.type, cpuLevel, cpuStats, preset.moveIds);

    this.rng = new SeededRNG(Date.now());
    state.turnNumber = 1;
    state.phase = "WAITING_FOR_MOVES";

    this.sendToPlayer("player1", {
      type: "battle_start",
      you: this.makeSnapshot(state.mon1),
      opponent: this.makeSnapshot(state.mon2),
      yourRole: "player1",
      turnNumber: state.turnNumber,
    });

    await this.saveState();
    await this.ctx.storage.setAlarm(Date.now() + MOVE_TIMEOUT_MS);
  }

  private cpuPickMove(state: BattleState): number {
    if (!state.mon2 || !this.cpuRng) return 0;
    const available = state.mon2.movePP
      .map((pp, i) => (pp > 0 ? i : -1))
      .filter((i) => i >= 0);
    if (available.length === 0) return 0;
    return available[this.cpuRng.range(0, available.length - 1)];
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const data = JSON.parse(message as string);
    const attachment = ws.deserializeAttachment() as { tag: string };
    const tag = attachment.tag;
    const state = await this.loadState();

    if (data.type === "submit_move" && state.phase === "WAITING_FOR_MOVES") {
      const moveIndex = data.moveIndex as number;
      if (moveIndex < 0 || moveIndex > 3) return;

      const mon = tag === "player1" ? state.mon1 : state.mon2;
      if (mon && mon.movePP[moveIndex] <= 0) return;

      state.pendingMoves[tag] = moveIndex;

      // In CPU mode, auto-pick the CPU's move when player submits
      if (state.cpuMode && tag === "player1" && !("player2" in state.pendingMoves)) {
        state.pendingMoves["player2"] = this.cpuPickMove(state);
      }

      // If both moves received, resolve turn
      if ("player1" in state.pendingMoves && "player2" in state.pendingMoves) {
        await this.resolveTurnAndBroadcast();
      } else {
        await this.saveState();
      }
    }

    if (data.type === "forfeit") {
      const winner = tag === "player1" ? "player2" : "player1";
      await this.endBattle(winner === "player1" ? 1 : 2);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    const attachment = ws.deserializeAttachment() as { tag: string } | null;
    if (!attachment) return;
    const state = await this.loadState();

    if (state.phase === "WAITING_FOR_MOVES" || state.phase === "RESOLVING") {
      const winner = attachment.tag === "player1" ? 2 : 1;
      this.broadcastExcept(attachment.tag, { type: "opponent_disconnected" });
      await this.endBattle(winner);
    }

    ws.close(code, reason);
  }

  async alarm() {
    const state = await this.loadState();

    if (state.phase === "WAITING_FOR_MOVES") {
      if (!("player1" in state.pendingMoves) && state.mon1) {
        const available = state.mon1.movePP
          .map((pp, i) => (pp > 0 ? i : -1))
          .filter((i) => i >= 0);
        state.pendingMoves["player1"] =
          available[Math.floor(Math.random() * available.length)] ?? 0;
      }
      if (!("player2" in state.pendingMoves) && state.mon2) {
        const available = state.mon2.movePP
          .map((pp, i) => (pp > 0 ? i : -1))
          .filter((i) => i >= 0);
        state.pendingMoves["player2"] =
          available[Math.floor(Math.random() * available.length)] ?? 0;
      }
      await this.resolveTurnAndBroadcast();
    } else if (state.phase === "BATTLE_END") {
      await this.ctx.storage.deleteAll();
    }
  }

  private async resolveTurnAndBroadcast() {
    const state = await this.loadState();
    if (!state.mon1 || !state.mon2 || !this.rng) return;
    state.phase = "RESOLVING";

    const input: TurnInput = {
      move1: state.pendingMoves["player1"] ?? 0,
      move2: state.pendingMoves["player2"] ?? 0,
    };

    const result = resolveTurn(state.mon1, state.mon2, input, state.turnNumber, this.rng);

    state.mon1 = result.mon1;
    state.mon2 = result.mon2;

    this.sendToPlayer("player1", {
      type: "turn_result",
      turnNumber: state.turnNumber,
      events: result.events,
      you: this.makeSnapshot(state.mon1),
      opponent: this.makeSnapshot(state.mon2),
    });
    this.sendToPlayer("player2", {
      type: "turn_result",
      turnNumber: state.turnNumber,
      events: result.events,
      you: this.makeSnapshot(state.mon2),
      opponent: this.makeSnapshot(state.mon1),
    });

    if (result.winner !== null) {
      await this.endBattle(result.winner);
    } else {
      state.turnNumber++;
      state.pendingMoves = {};
      state.phase = "WAITING_FOR_MOVES";
      await this.saveState();
      await this.ctx.storage.setAlarm(Date.now() + MOVE_TIMEOUT_MS);
    }
  }

  private async endBattle(winner: 1 | 2) {
    const state = await this.loadState();
    state.phase = "BATTLE_END";

    const winnerTag = winner === 1 ? "player1" : "player2";

    if (state.player1Info && state.mon2) {
      try {
        const doId = (this.env as any).DOKEMON_DO.idFromString(state.player1Info.dokemonId);
        const stub = (this.env as any).DOKEMON_DO.get(doId);
        await stub.applyBattleResult({ won: winner === 1, opponentLevel: state.mon2.level });
      } catch (e) {
        console.error("Failed to apply battle result to mon1:", e);
      }
    }

    if (state.player2Info && state.mon1 && !state.cpuMode) {
      try {
        const doId = (this.env as any).DOKEMON_DO.idFromString(state.player2Info.dokemonId);
        const stub = (this.env as any).DOKEMON_DO.get(doId);
        await stub.applyBattleResult({ won: winner === 2, opponentLevel: state.mon1.level });
      } catch (e) {
        console.error("Failed to apply battle result to mon2:", e);
      }
    }

    this.sendToPlayer("player1", {
      type: "battle_end",
      winner: winnerTag,
      xpGained: 50,
      ratingChange: winner === 1 ? 25 : -25,
    });
    this.sendToPlayer("player2", {
      type: "battle_end",
      winner: winnerTag,
      xpGained: 50,
      ratingChange: winner === 2 ? 25 : -25,
    });

    await this.saveState();
    await this.ctx.storage.setAlarm(Date.now() + 60_000);
  }

  private async fetchDOkemonSnapshot(dokemonId: string): Promise<DOkemonData | null> {
    try {
      const doId = (this.env as any).DOKEMON_DO.idFromString(dokemonId);
      const stub = (this.env as any).DOKEMON_DO.get(doId);
      return await stub.getSnapshot();
    } catch {
      return null;
    }
  }

  private makeSnapshot(mon: BattleMon): BattleSnapshot {
    return {
      name: mon.name,
      sprite: mon.sprite,
      type: mon.type,
      level: mon.level,
      maxHp: mon.maxHp,
      currentHp: mon.currentHp,
      moveIds: mon.moveIds,
      movePP: mon.movePP,
    };
  }

  private sendToPlayer(tag: string, message: BattleServerMessage) {
    const sockets = this.ctx.getWebSockets(tag);
    for (const ws of sockets) {
      try { ws.send(JSON.stringify(message)); } catch {}
    }
  }

  private broadcast(message: BattleServerMessage) {
    const sockets = this.ctx.getWebSockets();
    const json = JSON.stringify(message);
    for (const ws of sockets) {
      try { ws.send(json); } catch {}
    }
  }

  private broadcastExcept(excludeTag: string, message: BattleServerMessage) {
    const sockets = this.ctx.getWebSockets();
    const json = JSON.stringify(message);
    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as { tag: string } | null;
      if (attachment?.tag !== excludeTag) {
        try { ws.send(json); } catch {}
      }
    }
  }
}
