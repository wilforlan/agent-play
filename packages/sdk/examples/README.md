# @agent-play/sdk examples

These scripts use the **public SDK** only: `RemotePlayWorld` (HTTP session + RPC to the app), **`langchainRegistration`**, **`hold().for()`**, and optional **`onClose`**. They do **not** embed Express or import `PlayWorld` from the server.

Run the **web UI** first so APIs exist:

```bash
# from repository root
npm run dev -w @agent-play/web-ui
```

With a **registered-agent** repository (**`REDIS_URL`** on the server): run **`agent-play bootstrap-node`** and **`agent-play create`** for each agent. Use **`~/.agent-play/credentials.json`** (from **`create-main-node`**) for **`passw`** and **`.root`** for **`rootKey`**, or set **`AGENT_PLAY_ROOT_KEY`** / **`AGENT_PLAY_NODE_PASSW`** to override. Pass **`AGENT_PLAY_AGENT_NODE_ID`** (or legacy **`AGENT_PLAY_AGENT_ID`**) and for example 02 **`AGENT_PLAY_AGENT_NODE_ID_ALPHA`** / **`_BETA`** so **`addAgent`** uses real agent node ids from **`agent-play create`**. Without Redis, the examples default to stable local **`nodeId`** strings.

| Order | File | Purpose |
|------:|------|---------|
| 1 | [01-remote-web-ui-langchain.ts](./01-remote-web-ui-langchain.ts) | One LangChain registration, one player; process stays up via **`hold().for()`**. |
| 2 | [02-remote-two-players-langchain.ts](./02-remote-two-players-langchain.ts) | Two registrations, two players, same session. |

## Environment

- `AGENT_PLAY_WEB_UI_URL` — Base URL of the running app (overrides **`serverUrl`** from credentials when set).
- `AGENT_PLAY_CREDENTIALS_PATH` — Optional path to **`credentials.json`** (default **`~/.agent-play/credentials.json`**).
- `AGENT_PLAY_ROOT_KEY` — Optional override: hex **`rootKey`** from **`.root`** (otherwise loaded via **`loadRootKey()`** when credentials exist).
- `AGENT_PLAY_NODE_PASSW` — Optional override: human **`passw`** from the credentials file (otherwise read from that file).
- `AGENT_PLAY_HOLD_SECONDS` — How long **`hold().for()`** waits (default `3600`).
- `AGENT_PLAY_AGENT_NODE_ID` (or `AGENT_PLAY_AGENT_ID`) / `AGENT_PLAY_AGENT_NODE_ID_ALPHA` / `AGENT_PLAY_AGENT_NODE_ID_BETA` (or `AGENT_PLAY_AGENT_ID_*`) — Agent node ids when using Redis.
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
- `POST /api/agent-play/sdk/rpc` — `getWorldSnapshot` and `getPlayerChainNode` (no `sid` query); `recordInteraction`, `recordJourney` (with `sid` for mutating ops). **`RemotePlayWorld.subscribeWorldState`** uses **`getPlayerChainNode`** when SSE **`data`** includes **`playerChainNotify`**.
- Watch UI loads snapshot via RPC + SSE (`/api/agent-play/...`) for live world state across instances when Redis is enabled.

Assist actions on the watch UI call `POST /api/agent-play/assist-tool` when **`assist_*`** tools were registered via **`langchainRegistration`**.
