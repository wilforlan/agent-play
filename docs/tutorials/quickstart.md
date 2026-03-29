# Tutorial: Quickstart

This tutorial summarizes the shortest path from zero to a **working preview** with the SDK. Full detail lives in [`packages/sdk/examples/README.md`](../../packages/sdk/examples/README.md).

## Prerequisites

- **Node.js 20+** recommended (`fetch`, `crypto.randomUUID`).
- Clone the repo and install dependencies from the **repository root**:

```bash
npm install
```

- For examples that call OpenAI: a `.env` (or environment) with `OPENAI_API_KEY=...`.

## Step 1: Understand the three pieces

1. **`RemotePlayWorld`** — HTTP client: `start()` → session, `addPlayer`, RPC for interactions and tool sync.
2. **LangChain adapter** — `langchainRegistration(agent)` validates **`chat_tool`** and indexes **`assist_*`** tools for the watch UI; pair it with **`RemotePlayWorld`** (requires **`apiKey`** on construction).
3. **Watch UI** — Served by **`@agent-play/web-ui`** at `/agent-play/watch`; resolves session via `/api/agent-play/session` and streams updates (SSE, etc.).

## Step 2: Run the web app

```bash
npm run dev
```

This starts **`@agent-play/web-ui`** (often `http://127.0.0.1:3000`).

## Step 3: Run the minimal SDK example

In a **second** terminal, from the repository root:

```bash
npx tsx -r dotenv/config packages/sdk/examples/01-remote-web-ui-langchain.ts
```

Or: `npm run example`

Open the printed **preview URL** in a browser to see the canvas.

## Step 4: Two players

```bash
npm run example:02
```

## Next steps

- Read [examples.md](examples.md) for the ordered example list.
- Read [Architecture](../architecture.md) and [SDK reference](../sdk.md) when integrating into your own server.
