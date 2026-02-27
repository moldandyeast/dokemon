import { BattleSnapshot, BattleEvent, StatusEffect } from "./types";

// ── Client → Server ──

export type ClientMessage =
  | { type: "join_queue"; dokemonId: string; playerId: string; rating: number }
  | { type: "submit_move"; moveIndex: number }
  | { type: "forfeit" };

// ── Server → Client (Lobby) ──

export type LobbyServerMessage =
  | { type: "queue_joined"; position: number }
  | { type: "match_found"; battleId: string }
  | { type: "error"; message: string };

// ── Server → Client (Battle) ──

export type BattleServerMessage =
  | {
      type: "battle_start";
      you: BattleSnapshot;
      opponent: BattleSnapshot;
      yourRole: "player1" | "player2";
      turnNumber: number;
    }
  | { type: "waiting_for_move"; turnNumber: number; timeLimit: number }
  | {
      type: "turn_result";
      turnNumber: number;
      events: BattleEvent[];
      you: BattleSnapshot;
      opponent: BattleSnapshot;
    }
  | {
      type: "battle_end";
      winner: "player1" | "player2";
      xpGained: number;
      ratingChange: number;
    }
  | { type: "opponent_disconnected" }
  | { type: "error"; message: string };
