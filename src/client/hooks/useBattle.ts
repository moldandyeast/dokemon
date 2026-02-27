import { useState, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { BattleServerMessage } from "@shared/protocol";
import { BattleSnapshot, BattleEvent } from "@shared/types";
import { getPlayerIdSync } from "../lib/api";

export type BattlePhase =
  | "connecting"
  | "waiting_for_opponent"
  | "your_turn"
  | "waiting_for_result"
  | "animating"
  | "battle_end";

export interface BattleState {
  phase: BattlePhase;
  you: BattleSnapshot | null;
  opponent: BattleSnapshot | null;
  yourRole: "player1" | "player2" | null;
  turnNumber: number;
  events: BattleEvent[];
  winner: "player1" | "player2" | null;
  xpGained: number;
  ratingChange: number;
  log: string[];
}

export function useBattle(battleId: string, dokemonId: string, rating: number, cpu = false) {
  const [state, setState] = useState<BattleState>({
    phase: "connecting",
    you: null,
    opponent: null,
    yourRole: null,
    turnNumber: 0,
    events: [],
    winner: null,
    xpGained: 0,
    ratingChange: 0,
    log: [],
  });

  const playerId = getPlayerIdSync();

  const handleMessage = useCallback((data: BattleServerMessage) => {
    switch (data.type) {
      case "battle_start":
        setState((s) => ({
          ...s,
          phase: "your_turn",
          you: data.you,
          opponent: data.opponent,
          yourRole: data.yourRole,
          turnNumber: data.turnNumber,
          log: ["BATTLE START!"],
        }));
        break;

      case "turn_result":
        setState((s) => ({
          ...s,
          phase: "animating",
          you: data.you,
          opponent: data.opponent,
          events: data.events,
          turnNumber: data.turnNumber,
          log: [...s.log, ...eventsToLog(data.events)],
        }));
        // After animation delay, go to next turn
        setTimeout(() => {
          setState((s) => {
            if (s.phase === "animating") {
              return { ...s, phase: "your_turn", events: [] };
            }
            return s;
          });
        }, 1500);
        break;

      case "battle_end":
        setState((s) => ({
          ...s,
          phase: "battle_end",
          winner: data.winner,
          xpGained: data.xpGained,
          ratingChange: data.ratingChange,
          log: [
            ...s.log,
            data.winner === s.yourRole ? "YOU WIN!" : "YOU LOSE...",
          ],
        }));
        break;

      case "opponent_disconnected":
        setState((s) => ({
          ...s,
          phase: "battle_end",
          winner: s.yourRole,
          log: [...s.log, "OPPONENT DISCONNECTED!"],
        }));
        break;

      case "error":
        setState((s) => ({
          ...s,
          log: [...s.log, `ERROR: ${data.message}`],
        }));
        break;
    }
  }, []);

  const { send, connected } = useWebSocket({
    url: `/ws/battle/${battleId}?playerId=${playerId}&dokemonId=${dokemonId}&rating=${rating}${cpu ? "&cpu=true" : ""}`,
    onMessage: handleMessage,
    onOpen: () => {
      setState((s) => ({ ...s, phase: "waiting_for_opponent" }));
    },
  });

  const submitMove = useCallback(
    (moveIndex: number) => {
      if (state.phase !== "your_turn") return;
      send({ type: "submit_move", moveIndex });
      setState((s) => ({ ...s, phase: "waiting_for_result" }));
    },
    [send, state.phase]
  );

  const forfeit = useCallback(() => {
    send({ type: "forfeit" });
  }, [send]);

  return { state, submitMove, forfeit, connected };
}

function eventsToLog(events: BattleEvent[]): string[] {
  const log: string[] = [];
  for (const { event } of events) {
    switch (event.kind) {
      case "move_used":
        log.push(`USED ${event.moveId.toUpperCase().replace(/_/g, " ")}!`);
        break;
      case "damage":
        log.push(`DEALT ${event.amount} DAMAGE!`);
        break;
      case "critical_hit":
        log.push("CRITICAL HIT!");
        break;
      case "super_effective":
        log.push("SUPER EFFECTIVE!");
        break;
      case "not_very_effective":
        log.push("NOT VERY EFFECTIVE...");
        break;
      case "status_inflicted":
        log.push(`INFLICTED ${event.status}!`);
        break;
      case "status_damage":
        log.push(`${event.status} DEALT ${event.amount}!`);
        break;
      case "status_prevented_move":
        log.push(`CAN'T MOVE! (${event.status})`);
        break;
      case "status_cured":
        log.push(`CURED ${event.status}!`);
        break;
      case "stat_changed": {
        const dir = event.stages > 0 ? "ROSE" : "FELL";
        log.push(`${event.stat.toUpperCase()} ${dir}!`);
        break;
      }
      case "fainted":
        log.push("FAINTED!");
        break;
      case "miss":
        log.push("ATTACK MISSED!");
        break;
      case "heal":
        log.push(`HEALED ${event.amount} HP!`);
        break;
    }
  }
  return log;
}
