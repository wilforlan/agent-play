# Tutorial: Quickstart

This tutorial summarizes the shortest path from zero to a **working preview** with the SDK. Full detail lives in [`play-sdk/examples/README.md`](../../play-sdk/examples/README.md).

## Prerequisites

- **Node.js 20+** recommended (`fetch`, `crypto.randomUUID`).
- Clone the repo and install dependencies under **`play-sdk/`**:

```bash
cd play-sdk
npm install
cd preview-ui && npm install && cd ..
```

- For examples that call OpenAI: create a `.env` in `play-sdk` with `OPENAI_API_KEY=...`.

## Step 1: Understand the three pieces

1. **`PlayWorld`** — Session, players, journeys, snapshot.
2. **LangChain adapter** — `langchainRegistration` + `attachLangChainInvoke` connect your agent’s `invoke` to the world.
3. **Preview** — Static Vite build + Express routes (`mountExpressPreview`) or your own hosting of `dist/` with matching `sid` URLs.

## Step 2: Run the minimal example

From `play-sdk`:

```bash
npx tsx -r dotenv/config examples/01-langchain-minimal-invoke.ts
```

Watch the console for `[world:journey]` logs. This confirms journey extraction without a browser.

## Step 3: Build the preview assets

The canvas UI must be built before Express can serve it:

```bash
npm run build:preview
```

This runs `npm run build` inside `preview-ui/` and produces `preview-ui/dist/`.

## Step 4: Run the SSE bridge example

```bash
npm run example:sse
# or: tsx -r dotenv/config examples/05-express-sse-bridge.ts
```

Open the printed **preview URL** (includes `sid=`). The page loads `snapshot.json`, subscribes to SSE, and animates the world.

## Step 5: Point URLs at your server

- Set `PLAY_PREVIEW_BASE_URL` to the **watch** URL base (including path), e.g. `http://localhost:3333/agent-play/watch`, so `getPreviewUrl()` opens the correct page.
- Optional `PLAY_API_BASE` for HTTP event forwarding (advanced).

## Next steps

- Read [examples.md](examples.md) for the ordered example list.
- Read [Architecture](../architecture.md) and [SDK reference](../sdk.md) when integrating into your own server.
