# @agent-play/sdk examples

These scripts use the **public SDK** only: `RemotePlayWorld` (HTTP session + RPC to the app), **`langchainRegistration`**, **`hold().for()`**, and optional **`onClose`**. They do **not** embed Express or import `PlayWorld` from the server.

Run the **web UI** first so APIs exist:

```bash
# from repository root
npm run dev -w @agent-play/web-ui
```

With a **registered-agent** repository (**`REDIS_URL`** on the server): run **`agent-play login`**, **`agent-play create-key`** (once per account), **`agent-play create`** for each agent (up to two per account). Set **`AGENT_PLAY_API_KEY`** to the account key and pass **`AGENT_PLAY_AGENT_ID`** (and **`AGENT_PLAY_AGENT_ID_ALPHA`** / **`AGENT_PLAY_AGENT_ID_BETA`** for example 02) when calling **`addPlayer`**. Without Redis, use the examples’ placeholder API key and omit agent ids.

| Order | File | Purpose |
|------:|------|---------|
| 1 | [01-remote-web-ui-langchain.ts](./01-remote-web-ui-langchain.ts) | One LangChain registration, one player; process stays up via **`hold().for()`**. |
| 2 | [02-remote-two-players-langchain.ts](./02-remote-two-players-langchain.ts) | Two registrations, two players, same session. |

## Environment

- `AGENT_PLAY_WEB_UI_URL` — Base URL of the running app (default `http://127.0.0.1:3000`).
- `AGENT_PLAY_API_KEY` — Account API key for **`RemotePlayWorld`** (use a dev placeholder if the server has no repository).
- `AGENT_PLAY_HOLD_SECONDS` — How long **`hold().for()`** waits (default `3600`).
- `AGENT_PLAY_AGENT_ID` / `AGENT_PLAY_AGENT_ID_ALPHA` / `AGENT_PLAY_AGENT_ID_BETA` — Registered agent ids when using Redis.
- `OPENAI_API_KEY` — Only if you extend the scripts to call the model; registration-only runs use a placeholder.
- `AGENT_PLAY_DEBUG=1` — Verbose SDK logging (see `configureAgentPlayDebug` in package exports).

## Commands

From repo root:

```bash
npm run example              # example 01
npm run example:02           # example 02
```

From `packages/sdk`:

```bash
npx tsx -r dotenv/config examples/01-remote-web-ui-langchain.ts
npx tsx -r dotenv/config examples/02-remote-two-players-langchain.ts
```

## What the app provides

- `GET /api/agent-play/session` — Creates or resumes a session (`sid`).
- `POST /api/agent-play/players` — Registers a player; response includes a **preview URL** for `/agent-play/watch`.
- `POST /api/agent-play/sdk/rpc` — Tool sync, interactions, invoke ingestion, and `op: getSnapshot` (used by `RemotePlayWorld` and the watch UI for JSON snapshot).
- Watch UI loads snapshot via RPC + SSE (`/api/agent-play/...`) for live world state across instances when Redis is enabled.

Assist actions on the watch UI call `POST /api/agent-play/assist-tool` when **`assist_*`** tools were registered via **`langchainRegistration`**.
