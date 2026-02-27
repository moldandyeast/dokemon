import { Env } from "./index";
import { PRESET_DOKEMON } from "@shared/presets";

type Handler = (
  request: Request,
  env: Env,
  params: Record<string, string>
) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

const routes: Route[] = [];

function addRoute(method: string, path: string, handler: Handler) {
  const paramNames: string[] = [];
  const pattern = path.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  routes.push({
    method,
    pattern: new RegExp(`^${pattern}$`),
    paramNames,
    handler,
  });
}

// ── POST /api/dokemon — Create a DOkemon ──
addRoute("POST", "/api/dokemon", async (request, env, _params) => {
  const playerId = request.headers.get("X-Player-Id");
  if (!playerId) {
    return Response.json({ error: "Missing X-Player-Id" }, { status: 401 });
  }

  const body = await request.json<any>();

  // Create DOkemonDO with a proper Durable Object ID
  const doId = env.DOKEMON_DO.newUniqueId();
  const dokemonId = doId.toString(); // 64-char hex string
  const stub = env.DOKEMON_DO.get(doId) as any;
  try {
    const dokemon = await stub.initialize({
      ...body,
      ownerId: playerId,
    });

    // Register with PlayerDO
    const playerDoId = env.PLAYER_DO.idFromName(playerId);
    const playerStub = env.PLAYER_DO.get(playerDoId) as any;
    await playerStub.addDOkemon(dokemonId);

    return Response.json(dokemon, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
});

// ── GET /api/dokemon/:id — Get a DOkemon snapshot ──
addRoute("GET", "/api/dokemon/:id", async (_request, env, params) => {
  const doId = env.DOKEMON_DO.idFromString(params.id);
  const stub = env.DOKEMON_DO.get(doId) as any;
  const snapshot = await stub.getSnapshot();
  if (!snapshot) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(snapshot);
});

// ── GET /api/collection — List player's DOkemon ──
addRoute("GET", "/api/collection", async (request, env, _params) => {
  const playerId = request.headers.get("X-Player-Id");
  if (!playerId) {
    return Response.json({ error: "Missing X-Player-Id" }, { status: 401 });
  }

  const playerDoId = env.PLAYER_DO.idFromName(playerId);
  const playerStub = env.PLAYER_DO.get(playerDoId) as any;
  const ids: string[] = await playerStub.getDOkemonIds();

  // Fetch all DOkemon snapshots in parallel
  const dokemon = await Promise.all(
    ids.map(async (id) => {
      const doId = env.DOKEMON_DO.idFromString(id);
      const stub = env.DOKEMON_DO.get(doId) as any;
      return stub.getSnapshot();
    })
  );

  return Response.json(dokemon.filter(Boolean));
});

// ── POST /api/seed — Seed starter DOkemon for the player ──
addRoute("POST", "/api/seed", async (request, env, _params) => {
  const playerId = request.headers.get("X-Player-Id");
  if (!playerId) {
    return Response.json({ error: "Missing X-Player-Id" }, { status: 401 });
  }

  // Check if player already has DOkemon (don't re-seed)
  const playerDoId = env.PLAYER_DO.idFromName(playerId);
  const playerStub = env.PLAYER_DO.get(playerDoId) as any;
  const existingIds: string[] = await playerStub.getDOkemonIds();
  if (existingIds.length > 0) {
    return Response.json({ seeded: 0, message: "Already has DOkemon" });
  }

  // Create all preset DOkemon for this player
  const created: string[] = [];
  for (const preset of PRESET_DOKEMON) {
    const doId = env.DOKEMON_DO.newUniqueId();
    const dokemonId = doId.toString();
    const stub = env.DOKEMON_DO.get(doId) as any;
    try {
      await stub.initialize({
        ...preset,
        ownerId: playerId,
      });
      await playerStub.addDOkemon(dokemonId);
      created.push(dokemonId);
    } catch (err: any) {
      console.error(`Failed to seed ${preset.name}:`, err.message);
    }
  }

  return Response.json({ seeded: created.length }, { status: 201 });
});

// ── GET /api/player/rating — Get player's rating ──
addRoute("GET", "/api/player/rating", async (request, env, _params) => {
  const playerId = request.headers.get("X-Player-Id");
  if (!playerId) {
    return Response.json({ error: "Missing X-Player-Id" }, { status: 401 });
  }

  const playerDoId = env.PLAYER_DO.idFromName(playerId);
  const playerStub = env.PLAYER_DO.get(playerDoId) as any;
  const rating = await playerStub.getRating();
  return Response.json({ rating });
});

export function matchRoute(
  method: string,
  pathname: string
): { handler: Handler; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { handler: route.handler, params };
    }
  }
  return null;
}
