export { DOkemonDO } from "./durable-objects/DOkemonDO";
export { BattleDO } from "./durable-objects/BattleDO";
export { LobbyDO } from "./durable-objects/LobbyDO";
export { PlayerDO } from "./durable-objects/PlayerDO";

import { matchRoute } from "./router";

export interface Env {
  DOKEMON_DO: DurableObjectNamespace;
  BATTLE_DO: DurableObjectNamespace;
  LOBBY_DO: DurableObjectNamespace;
  PLAYER_DO: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok", game: "DOkemon" });
    }

    // WebSocket upgrades
    if (url.pathname.startsWith("/ws/")) {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      // /ws/lobby
      if (url.pathname === "/ws/lobby") {
        const lobbyId = env.LOBBY_DO.idFromName("global");
        const stub = env.LOBBY_DO.get(lobbyId);
        return stub.fetch(request);
      }

      // /ws/battle/:battleId
      const battleMatch = url.pathname.match(/^\/ws\/battle\/([^/]+)$/);
      if (battleMatch) {
        const battleId = env.BATTLE_DO.idFromName(battleMatch[1]);
        const stub = env.BATTLE_DO.get(battleId);
        return stub.fetch(request);
      }

      return new Response("Not Found", { status: 404 });
    }

    // REST API routes
    if (url.pathname.startsWith("/api/")) {
      const route = matchRoute(request.method, url.pathname);
      if (route) {
        return route.handler(request, env, route.params);
      }
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    // Everything else falls through to static assets (SPA)
    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
