import { DOkemonData, StatBlock, DOkemonType } from "@shared/types";

function getPlayerId(): string {
  let id = localStorage.getItem("dokemon-player-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dokemon-player-id", id);
  }
  return id;
}

export function getPlayerIdSync(): string {
  return getPlayerId();
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Player-Id": getPlayerId(),
      ...init?.headers,
    },
  });
}

export async function createDOkemon(data: {
  sprite: string;
  name: string;
  type: DOkemonType;
  baseStats: StatBlock;
  moveIds: [string, string, string, string];
}): Promise<DOkemonData> {
  const res = await apiFetch("/api/dokemon", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

export async function getDOkemon(id: string): Promise<DOkemonData> {
  const res = await apiFetch(`/api/dokemon/${id}`);
  if (!res.ok) throw new Error(`Get failed: ${res.status}`);
  return res.json();
}

export async function getCollection(): Promise<DOkemonData[]> {
  const res = await apiFetch("/api/collection");
  if (!res.ok) throw new Error(`Collection failed: ${res.status}`);
  return res.json();
}

export async function seedStarterDOkemon(): Promise<number> {
  const res = await apiFetch("/api/seed", { method: "POST" });
  if (!res.ok) throw new Error(`Seed failed: ${res.status}`);
  const data = await res.json() as { seeded: number };
  return data.seeded;
}
