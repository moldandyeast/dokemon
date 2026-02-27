import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { LobbyServerMessage } from "@shared/protocol";
import { getPlayerIdSync } from "../lib/api";

interface MatchmakingProps {
  dokemonId: string;
  rating: number;
  onMatchFound: (battleId: string) => void;
  onBack: () => void;
}

export default function Matchmaking({
  dokemonId,
  rating,
  onMatchFound,
  onBack,
}: MatchmakingProps) {
  const [status, setStatus] = useState("CONNECTING...");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMessage = useCallback(
    (data: LobbyServerMessage) => {
      switch (data.type) {
        case "queue_joined":
          setStatus("SEARCHING...");
          break;
        case "match_found":
          setStatus("MATCH FOUND!");
          setTimeout(() => onMatchFound(data.battleId), 500);
          break;
        case "error":
          setStatus(`ERROR: ${data.message}`);
          break;
      }
    },
    [onMatchFound]
  );

  const { send, connected } = useWebSocket({
    url: "/ws/lobby",
    onMessage: handleMessage,
    onOpen: () => {
      send({
        type: "join_queue",
        playerId: getPlayerIdSync(),
        dokemonId,
        rating,
      });
    },
  });

  const dots = ".".repeat((elapsed % 3) + 1);

  return (
    <div className="matchmaking-screen">
      <div className="matchmaking-text">{status}</div>
      {status === "SEARCHING..." && (
        <>
          <div className="matchmaking-dots">{dots}</div>
          <div className="matchmaking-text" style={{ fontSize: 7, opacity: 0.6 }}>
            {elapsed}S ELAPSED
          </div>
        </>
      )}
      <button className="gb-btn" onClick={onBack} style={{ marginTop: 20 }}>
        CANCEL
      </button>
    </div>
  );
}
