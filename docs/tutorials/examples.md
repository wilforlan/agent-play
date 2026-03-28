# Tutorial: Examples walkthrough

All examples live under [`play-sdk/examples/`](../../play-sdk/examples/). The authoritative table is in [`examples/README.md`](../../play-sdk/examples/README.md); this page adds narrative context for **developers navigating the platform**.

## Recommended order

| # | File | What you learn |
|---|------|----------------|
| 1 | `01-langchain-minimal-invoke.ts` | **Console-only** (no Express): one agent, `attachLangChainInvoke`, log `world:journey`. |
| 2 | `02-multi-tool-path.ts` | Multi-tool turn + Express + `mountExpressPreview`; path order vs message flow. |
| 3 | `03-two-agents-two-players.ts` | Two `playerId`s; same Express preview stack as 02, 05, 06. |
| 4 | `04-env-and-preview-link.ts` | `PLAY_PREVIEW_BASE_URL`, optional `PLAY_API_BASE`; Express + preview mount. |
| 5 | `05-express-sse-bridge.ts` | Minimal ping agent; Express + `mountExpressPreview`, SSE + snapshot. |
| 6 | `06-financial-advisor-server.ts` | Long-running server, many tools, human-in-the-loop patterns in the terminal. |

## Commands (from `play-sdk`)

```bash
# Minimal LangChain demo
npm run example

# Express + preview (build preview first)
npm run build:preview
npm run example:02
npm run example:03
npm run example:04
npm run example:sse

# Financial advisor demo
npm run example:advisor
```

## What each example assumes

- **01**: No HTTP server; optional `OPENAI_API_KEY` for a real invoke.
- **02–06**: `OPENAI_API_KEY` for model calls unless mocked; run `npm run build:preview` so `preview-ui/dist` exists for `mountExpressPreview` (and for tests that expect `dist/index.html`).

## Debugging

- Set `AGENT_PLAY_DEBUG=1` for verbose SDK logs, or `new PlayWorld({ debug: true })`.
- See [Third-party and sharp edges](../third-party-and-sharp-edges.md) if journeys look empty or structures misaligned.

## Contributing new examples

Keep examples **single-file** where possible, import from `../src/index.js`, and document the run command at the top of the file. Add a row to `examples/README.md` and optionally link from this page.
