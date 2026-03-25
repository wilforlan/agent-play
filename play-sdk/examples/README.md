# agent-play SDK examples

Read these in order for the shortest path to understanding the LangChain adapter.

| Order | File | Purpose |
|------:|------|---------|
| 1 | [01-langchain-minimal-invoke.ts](./01-langchain-minimal-invoke.ts) | Single agent, one tool, `attachLangChainInvoke`, log `world:journey`. |
| 2 | [02-multi-tool-path.ts](./02-multi-tool-path.ts) | Multi-tool turn; path order matches `about.md` message flow. |
| 3 | [03-two-agents-two-players.ts](./03-two-agents-two-players.ts) | Two agents, two player ids, separate journeys. |
| 4 | [04-env-and-preview-link.ts](./04-env-and-preview-link.ts) | `PLAY_PREVIEW_BASE_URL`, optional `PLAY_API_BASE` HTTP forwarder. |
| 5 | [05-express-sse-bridge.ts](./05-express-sse-bridge.ts) | `mountExpressPreview`: custom **Multiverse** canvas preview at `/agent-play/watch?sid=`, SSE + snapshot JSON. |
| 6 | [06-financial-advisor-server.ts](./06-financial-advisor-server.ts) | Long-running Express + preview; **financial advisor** agent with many planning tools + CLI `request_human_approval` / `request_human_input`. Tools live in [examples/lib/financial-advisor-tools.ts](./lib/financial-advisor-tools.ts). |

## Prerequisites

- Node 20+ recommended (global `fetch`, `crypto.randomUUID`).
- `OPENAI_API_KEY` in `.env` for examples that call the model (01–03, 05–06).
- Optional: `PLAY_PREVIEW_BASE_URL`, `PLAY_API_BASE` (see example 04).

## Preview URL and `sid`

- Call `PlayWorld.start()` first; `getSessionId()` / `getPreviewUrl()` use that session id as `sid`.
- Point `previewBaseUrl` at your real watch entry (including path), e.g. `http://localhost:3333/agent-play/watch`, so generated links open the preview app (Vite-built canvas **Multiverse** engine in `preview-ui/`).
- The browser loads `snapshot.json?sid=` on startup to show structures and the last journey, then subscribes to `events?sid=` over SSE for live updates (`world:journey`, `world:player_added`, `world:structures`, and **`world:interaction`** for user/assistant/tool transcript lines shown as callouts above each agent on the canvas).
- Snapshot JSON includes a top-level **`worldMap`**: merged structures (deduped by `structure.id`) and axis-aligned **bounds** for the preview canvas. After `addPlayer`, **`attachLangChainInvoke`** calls **`syncPlayerStructuresFromTools`** with the agent’s current `tools`, so late-bound tool lists still refresh the map; the server emits **`world:structures`** over SSE and the preview reloads the snapshot.

## Debug logging

- Set environment variable `AGENT_PLAY_DEBUG=1` for verbose `console.debug` lines across the SDK (play-world, LangChain attach, journey extraction, structure layout, HTTP transport, Express mount).
- Or pass `{ debug: true }` to `new PlayWorld({ ... })`. If you pass `debug: false`, it **overrides** the env (useful in tests).

## Example 05 and the canvas

1. From `play-sdk` root: `npm run build:preview` (builds [preview-ui](../preview-ui/): custom Canvas 2D **Multiverse** runtime, no external game engine deps).
2. `tsx -r dotenv/config examples/05-express-sse-bridge.ts`
3. Open the printed `previewUrl` in a browser.

## Example 06 (financial advisor, long-running)

1. `npm run build:preview`
2. `npm run example:advisor` (requires `OPENAI_API_KEY`; optional `PORT`, `OPENAI_MODEL`)
3. Open the printed preview URL while you chat on the **same terminal**—human-in-the-loop tools block there for approval or typed answers.

## Commands

```bash
cd play-sdk
npx tsx -r dotenv/config examples/01-langchain-minimal-invoke.ts
```

## Tests

```bash
npm run build:preview
npm test
```

`mount-express-preview` tests expect `preview-ui/dist/index.html` to exist.
