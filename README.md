# DOkemon

A multiplayer, browser-based monster battler built with React + Cloudflare Workers + Durable Objects.

DOkemon combines a retro-inspired UI with server-authoritative battle logic, collection management, and matchmaking-ready state handling.

## Features

- Create custom DOkemon with type, stats, sprite, and moves
- Auto-seeded starter roster for first-time players
- View and manage a personal collection
- Battle flow for player-vs-player style sessions and CPU mode
- Durable Object-backed persistence for players, battles, lobbies, and DOkemon entities
- Test coverage for core battle engine behavior

## Tech Stack

- Frontend: React + Vite + TypeScript
- Backend: Cloudflare Workers
- State/Persistence: Durable Objects (SQLite classes)
- Tooling: Wrangler, Vitest

## Project Structure

- `src/client/` React UI, screens, hooks, and canvas rendering helpers
- `src/worker/` Worker entrypoint, API routing, Durable Object classes, battle logic
- `src/shared/` Shared game constants, types, protocol, move data, presets
- `test/` Battle engine tests

## Local Development

### Prerequisites

- Node.js 20+ (recommended)
- npm

### Install

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Build

```bash
npm run build
```

## Deploy (Cloudflare)

1. Authenticate with Cloudflare (for Wrangler).
2. Ensure your account has Durable Objects enabled.
3. Deploy:

```bash
npm run deploy
```

Configuration is defined in `wrangler.jsonc`, including:
- Worker entrypoint
- SPA asset handling
- Durable Object bindings
- Durable Object migration tag (`v1`)

## API Overview

Defined in `src/worker/router.ts`:

- `POST /api/dokemon` create a DOkemon
- `GET /api/dokemon/:id` fetch a DOkemon snapshot
- `GET /api/collection` list the player's DOkemon
- `POST /api/seed` seed starter DOkemon for a new player
- `GET /api/player/rating` get player rating

Most player-scoped routes require the `X-Player-Id` request header.

## Security and Publishing Notes

- Local/runtime files are ignored via `.gitignore` (`.env*`, `.dev.vars`, `.claude/`, etc.)
- No secrets or API keys are required in the repository to run the core project locally
- If adding credentials for deployment, keep them in environment variables or local-only config

## License

No license file has been added yet. If you plan to accept contributions or reuse externally, add a license (for example MIT) in `LICENSE`.
