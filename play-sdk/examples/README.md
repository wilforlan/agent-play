# agent-play SDK examples

Read these in order for the shortest path to understanding the LangChain adapter.

| Order | File | Purpose |
|------:|------|---------|
| 1 | [01-langchain-minimal-invoke.ts](./01-langchain-minimal-invoke.ts) | **No Express** — single agent, one tool, `attachLangChainInvoke`, log `world:journey` to the console. |
| 2 | [02-multi-tool-path.ts](./02-multi-tool-path.ts) | Multi-tool turn; Express + `mountExpressPreview` + sample invoke. |
| 3 | [03-two-agents-two-players.ts](./03-two-agents-two-players.ts) | Two agents, two player ids, separate journeys; same Express preview stack. |
| 4 | [04-env-and-preview-link.ts](./04-env-and-preview-link.ts) | `PLAY_PREVIEW_BASE_URL`, optional `PLAY_API_BASE`; Express + preview mount. |
| 5 | [05-express-sse-bridge.ts](./05-express-sse-bridge.ts) | Minimal ping agent; documents SSE + snapshot routes (same pattern as 02–04, 06). |
| 6 | [06-financial-advisor-server.ts](./06-financial-advisor-server.ts) | Long-running Express + preview; financial advisor agent + CLI human-in-the-loop. Tools: [lib/financial-advisor-tools.ts](./lib/financial-advisor-tools.ts). |

Examples **02–06** use **`express`** + **`mountExpressPreview`** (static preview under `/agent-play`, `snapshot.json`, SSE). Example **01** stays minimal (in-memory bus only, no HTTP server).

## Prerequisites

- Node 20+ recommended (global `fetch`, `crypto.randomUUID`).
- `OPENAI_API_KEY` in `.env` for examples that call the model (01–06 when invoking the model).
- Optional: `PLAY_PREVIEW_BASE_URL`, `PLAY_API_BASE` (see example 04).

## Preview URL and `sid`

- Call `PlayWorld.start()` first; `getSessionId()` / `getPreviewUrl()` use that session id as `sid`.
- Point `previewBaseUrl` at your real watch entry (including path), e.g. `http://localhost:3333/agent-play/watch`, so generated links open the preview app (Vite-built canvas in `preview-ui/`).
- The browser loads `snapshot.json?sid=` on startup, then subscribes to `events?sid=` over SSE for live updates (`world:journey`, `world:player_added`, `world:structures`, **`world:interaction`**).
- Snapshot JSON includes **`worldMap`**: merged structures and **bounds** for the preview canvas. After `addPlayer`, **`attachLangChainInvoke`** can call **`syncPlayerStructuresFromTools`** when tools change; the server may emit **`world:structures`** over SSE.

## Debug logging

- Set `AGENT_PLAY_DEBUG=1` for verbose `console.debug` across the SDK.
- Or pass `{ debug: true }` to `new PlayWorld({ ... })`. If you pass `debug: false`, it overrides the env (useful in tests).

## Browser preview (examples 02–06)

1. From `play-sdk` root: `npm run build:preview` (builds [preview-ui](../preview-ui/)).
2. Run an example, e.g. `npm run example:02` or `npm run example:sse`.
3. Open the printed `previewUrl` in a browser.

## Example 06 (financial advisor, long-running)

1. `npm run build:preview`
2. `npm run example:advisor` (optional `PORT`, `OPENAI_MODEL`)
3. Open the printed preview URL while you chat in the **same terminal** for human-in-the-loop tools.

## Commands

```bash
cd play-sdk
npm install

# Minimal (no Express)
npx tsx -r dotenv/config examples/01-langchain-minimal-invoke.ts

# With preview UI (build first)
npm run build:preview
npm run example:02
npm run example:03
npm run example:04
npm run example:sse
npm run example:advisor
```

## Tests

```bash
npm run build:preview
npm test
```

`mount-express-preview` tests expect `preview-ui/dist/index.html` to exist.
