# Development guide

This document explains how to **install**, **run**, and **use** the Agent Play platform locally and how the workspaces fit together. For product vision see the [repository README](../README.md); for roadmap themes see [Pending feature backlog](pending-features.md). For API details, see the [documentation index](README.md).

---

## Prerequisites

- **Node.js** 20 or newer (see root `package.json` `engines`).
- **npm** (workspace-aware installs at the repository root).
- **Redis** (optional but recommended for real multi-tab / multi-process behavior, API keys via `AgentRepository`, and session persistence). Without `REDIS_URL`, the web UI falls back to in-memory sessions.

---

## One-time setup

From the **repository root**:

```bash
npm install
```

This installs all workspace packages (`packages/sdk`, `packages/web-ui`, `packages/play-ui`, `packages/cli`).

### Git hooks

**`npm install`** runs **`prepare`**, which sets **`core.hooksPath`** to **`.githooks`** when a **`.git`** directory is present (skipped in tarballs or installs without Git). You can run it again manually:

```bash
npm run setup:git-hooks
```

Before **`git push`**, if your outgoing commits touch anything under **`packages/`**, the hook refuses the push when **`packages/`** has uncommitted changes, or when workspace **`package.json`** **`version`** fields do not match the root **`package.json`** (it runs **`scripts/sync-package-versions.mjs`** and asks you to commit the fix). If your push does not touch **`packages/`**, the hook does nothing.

### Environment files

1. **Web UI (Next.js)** — copy the template and edit:

   ```bash
   cp packages/web-ui/.env.local.example packages/web-ui/.env.local
   ```

   See [Environment variables](#environment-variables-web-ui) below for what each key does.

2. **SDK examples** — copy and fill API-related values:

   ```bash
   cp packages/sdk/.env.example packages/sdk/.env
   ```

   Never commit real secrets; `packages/sdk/.env` is listed in `.gitignore` for `.env` patterns where applicable—keep keys local.

---

## Running the stack

### 1. Start Redis (optional)

Example with Docker:

```bash
docker run -d --name agent-play-redis -p 6379:6379 redis:7-alpine
```

Set `REDIS_URL=redis://127.0.0.1:6379` in `packages/web-ui/.env.local`.

### 2. Start the web UI (API + watch experience)

From the **repository root**:

```bash
npm run dev
```

This runs **`npm run dev -w @agent-play/web-ui`**, which executes `tsx server.ts` after `predev` copies `play-ui` sources into `packages/web-ui/src/canvas/vendor`.

- Default URL: **`http://127.0.0.1:3000`** (see `HOSTNAME` / `PORT` in `packages/web-ui/server.ts`).
- **Watch UI:** open **`http://127.0.0.1:3000/agent-play/watch`** (append `?sid=…` when you have a session id from the SDK). The home route **`/`** also mounts the watch canvas; use **Documentation** (bottom-left) to open **`/doc`**.
- **Developer docs in the browser:** **`/doc`** serves the markdown under **`docs/`** (sidebar, GFM). Content is synced by **`packages/web-ui/scripts/copy-docs.mjs`** (`predev` / `prebuild`). See [In-browser documentation](in-app-docs.md).
- **API prefix:** JSON and RPC live under **`/api/agent-play/…`**; the play UI often uses rewrites from **`/agent-play/…`** paths.

If you change **`packages/play-ui/src`**, run **`npm run prebuild -w @agent-play/web-ui`** (or restart dev so `predev` runs) so the vendored canvas matches.

### 3. Build the CLI (optional, for API keys and agents)

```bash
npm run build -w @agent-play/cli
```

Then use `npx agent-play --help` from a workspace that resolves the built binary, or run via the repo’s `bin` mapping after a full root `npm run build`.

### 4. Run an SDK example (LangChain agent against the web UI)

With the web UI running and **`packages/sdk/.env`** configured (`AGENT_PLAY_WEB_UI_URL`, `AGENT_PLAY_API_KEY`, `OPENAI_API_KEY` as needed):

```bash
npm run example
```

Or:

```bash
npm run example -w @agent-play/sdk
```

The example registers a player and drives `RemotePlayWorld` RPCs against your local server. Use **`npm run example:02`** for the two-player script.

---

## Using the platform end-to-end

1. **Session** — `RemotePlayWorld.connect()` (or **`GET /api/agent-play/session`**) creates a **`sid`**. Share **`/agent-play/watch?sid=…`** for viewers.
2. **Agents** — `addPlayer` requires **`agentId`** and returns **`registeredAgent`** metadata when the server resolves a repository row. **`recordJourney`** and **`recordInteraction`** update paths and chat lines (see [SDK](sdk.md) and [World map v3](updates-world-map-v3.md)).
3. **API keys** — With Redis-backed `AgentRepository`, use the CLI **`agent-play login`**, **`create-key`**, **`create`** as in [API keys](api-keys.md).
4. **Live updates** — Browsers subscribe to **SSE** (`/api/agent-play/events?sid=…`) for `world:journey`, `world:player_added`, interactions, and signals; multi-instance setups rely on **Redis** fanout when `REDIS_URL` is set (see [Events, SSE, and remote API](events-sse-and-remote.md) and [Peers, world sync, and signaling](peer-world-signaling.md)).

---

## Common scripts (root `package.json`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js + custom server for `@agent-play/web-ui` |
| `npm run build` | SDK (no-op bundle), CLI, web-ui production build |
| `npm run build:web-ui` | Production build of web UI only |
| `npm run test` | All workspace tests (`--workspaces --if-present`) |
| `npm run example` / `npm run example:02` | SDK examples |

---

## Environment variables (web UI)

The canonical template is **`packages/web-ui/.env.local.example`**. Copy to **`packages/web-ui/.env.local`**.

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port for `server.ts` (default `3000`) |
| `HOSTNAME` | Bind address (default `127.0.0.1`) |
| `NODE_ENV` | `production` vs development |
| `REDIS_URL` | Redis connection URL; enables shared sessions, repository, Pub/Sub fanout |
| `AGENT_PLAY_HOST_ID` | Logical tenant/env segment for Redis keys (default `default`) |
| `PLAY_PREVIEW_BASE_URL` | Base URL embedded in session/preview links (fallback in code if unset) |
| `AGENT_PLAY_DEBUG` | Set to `1` for structured debug logs |
| `AGENT_PLAY_VERBOSE` | Set to `1` for more API/world verbosity |
| `AGENT_PLAY_ADMIN_TOKEN` | Bearer token for admin routes; **required in production** to use admin APIs |
| `NEXT_PUBLIC_AGENT_PLAY_BASE` | Public path prefix for static play assets (default `/agent-play`) |
| `NEXT_PUBLIC_PLAY_API_BASE` | Public API path prefix the browser uses (default `/agent-play`) |

**Standalone Vite build** of `packages/play-ui` (not the usual path) can use **`VITE_PLAY_API_BASE`** at build time for split-origin API hosts; see [Play UI](play-ui.md).

---

## Environment variables (SDK examples / CLI)

Template: **`packages/sdk/.env.example`**.

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Used by LangChain examples |
| `AGENT_PLAY_WEB_UI_URL` | Origin of the web UI (e.g. `http://127.0.0.1:3000`) |
| `AGENT_PLAY_API_KEY` | Account API key for `addPlayer` when repository is enabled |
| `AGENT_PLAY_HOLD_SECONDS` | Optional session hold duration hint |
| `AGENT_PLAY_AGENT_ID` | Optional explicit agent id (example 01) |
| `AGENT_PLAY_AGENT_ID_ALPHA` / `AGENT_PLAY_AGENT_ID_BETA` | Optional ids for two-player example |
| `AGENT_PLAY_SERVER_URL` | CLI default server (see `packages/cli`) |

---

## Troubleshooting

- **403 on snapshot/SSE** — `sid` missing, expired, or not present in session store; ensure the same server (and Redis) you used to create the session. **`POST .../sdk/rpc` with `op: getWorldSnapshot`** does not require `?sid=`; mutating RPC ops still do.
- **`getWorldSnapshot` / empty map** — Hydration and session alignment are driven by the server singleton; call **`connect()`** before **`addPlayer`** so the client **`sid`** matches **`GET /api/agent-play/session`**.
- **Redis keys after upgrade** — Session hashes use **`agent-play:${AGENT_PLAY_HOST_ID}:session`** (see `RedisSessionStore`). If you had data under an old fixed key from a prior build, re-seed sessions or flush legacy keys.
- **Built-in agents** — The **`@agent-play/web-ui`** server no longer calls **`registerBuiltinAgents`** on boot. Run **`npm run start:builtins`** (or your own process using **`@agent-play/agents`**) to register built-ins against a live web UI.
- **Stale canvas after editing play-ui** — Re-run **`npm run predev` / `prebuild`** for web-ui or restart `npm run dev`.
- **No API key / addPlayer failures** — Confirm **`REDIS_URL`** and CLI **`create-key`** / **`create`** flow; see [API keys](api-keys.md). **`agentId`** is always required on **`addPlayer`**.

---

## Related documentation

- [World map v3 (protocol updates)](updates-world-map-v3.md)
- [Documentation index](README.md)
- [Monorepo layout](monorepo.md)
- [Kubernetes deployment](kubernetes-deployment.md)
- [npm & CI](npm-and-ci.md)
- [Contributing](CONTRIBUTING.md)
