import { DurableObject } from "cloudflare:workers";
import { LobbyServerMessage, ClientMessage } from "../../shared/protocol";

interface QueuedPlayer {
  playerId: string;
  dokemonId: string;
  rating: number;
  joinedAt: number;
}

export class LobbyDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return Response.json({
        queueSize: this.ctx.getWebSockets("waiting").length,
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept but don't tag as "waiting" yet — wait for join_queue message
    this.ctx.acceptWebSocket(server, ["connected"]);
    server.serializeAttachment({ state: "connected" });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const data = JSON.parse(message as string) as ClientMessage;

    if (data.type === "join_queue") {
      const { playerId, dokemonId, rating } = data;

      // Store queue info on the WebSocket attachment
      const queueInfo: QueuedPlayer = {
        playerId,
        dokemonId,
        rating,
        joinedAt: Date.now(),
      };
      ws.serializeAttachment({ state: "waiting", ...queueInfo });

      // Notify position
      const waitingCount = this.getWaitingPlayers().length;
      this.send(ws, {
        type: "queue_joined",
        position: waitingCount,
      });

      // Try to match
      await this.tryMatch();
    }
  }

  async webSocketClose(ws: WebSocket) {
    ws.close();
  }

  async alarm() {
    // Periodic match attempt with widened rating window
    await this.tryMatch();
  }

  private getWaitingPlayers(): { ws: WebSocket; info: QueuedPlayer }[] {
    const sockets = this.ctx.getWebSockets();
    const waiting: { ws: WebSocket; info: QueuedPlayer }[] = [];

    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as any;
      if (attachment?.state === "waiting") {
        waiting.push({
          ws,
          info: {
            playerId: attachment.playerId,
            dokemonId: attachment.dokemonId,
            rating: attachment.rating,
            joinedAt: attachment.joinedAt,
          },
        });
      }
    }

    return waiting;
  }

  private async tryMatch() {
    const waiting = this.getWaitingPlayers();
    if (waiting.length < 2) {
      // Schedule retry if someone is waiting
      if (waiting.length === 1) {
        await this.ctx.storage.setAlarm(Date.now() + 5000);
      }
      return;
    }

    // Sort by rating for better matches
    waiting.sort((a, b) => a.info.rating - b.info.rating);

    // Find closest pair within rating window
    // Window widens based on wait time
    for (let i = 0; i < waiting.length - 1; i++) {
      const a = waiting[i];
      const b = waiting[i + 1];

      const waitTime = Math.min(
        Date.now() - a.info.joinedAt,
        Date.now() - b.info.joinedAt
      );
      const ratingWindow = 50 + Math.floor(waitTime / 10000) * 25; // Widen by 25 every 10s

      if (Math.abs(a.info.rating - b.info.rating) <= ratingWindow) {
        // Match found!
        const battleId = crypto.randomUUID();

        // Create battle by sending battle ID to both players
        const matchMsg: LobbyServerMessage = {
          type: "match_found",
          battleId,
        };

        this.send(a.ws, matchMsg);
        this.send(b.ws, matchMsg);

        // Mark both as matched (so they're excluded from future matching)
        a.ws.serializeAttachment({ state: "matched" });
        b.ws.serializeAttachment({ state: "matched" });

        // Close their lobby connections after a brief delay
        // (give client time to receive the match message)
        setTimeout(() => {
          try { a.ws.close(1000, "matched"); } catch {}
          try { b.ws.close(1000, "matched"); } catch {}
        }, 1000);

        return;
      }
    }

    // No match yet, retry in 5 seconds
    await this.ctx.storage.setAlarm(Date.now() + 5000);
  }

  private send(ws: WebSocket, message: LobbyServerMessage) {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Socket may have closed
    }
  }
}
