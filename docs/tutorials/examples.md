# Tutorial: Examples walkthrough

All examples live under [`play-sdk/examples/`](../../play-sdk/examples/). The authoritative table is in [`examples/README.md`](../../play-sdk/examples/README.md); this page adds narrative context for **developers navigating the platform**.

## Recommended order

| # | File | What you learn |
|---|------|----------------|
| 1 | `01-langchain-minimal-invoke.ts` | One agent, one tool, `attachLangChainInvoke`, console logging of `world:journey`. |
| 2 | `02-multi-tool-path.ts` | Multiple tools in one turn; path order vs message flow. |
| 3 | `03-two-agents-two-players.ts` | Two `playerId`s, separate journeys and structures. |
| 4 | `04-env-and-preview-link.ts` | Environment variables for preview base URL and optional HTTP bridge. |
| 5 | `05-express-sse-bridge.ts` | **Full stack**: Express + `mountExpressPreview`, browser preview, SSE. |
| 6 | `06-financial-advisor-server.ts` | Long-running server, many tools, human-in-the-loop patterns in the terminal. |

## Commands (from `play-sdk`)

```bash
# Minimal LangChain demo
npm run example

# Express + SSE + browser preview (build preview first)
npm run build:preview
npm run example:sse

# Financial advisor demo
npm run example:advisor
```

## What each example assumes

- **01–03, 05–06**: Real LLM calls need `OPENAI_API_KEY` unless you substitute a mock.
- **05–06**: Run `npm run build:preview` so `preview-ui/dist` exists (required by tests and Express static serving).

## Debugging

- Set `AGENT_PLAY_DEBUG=1` for verbose SDK logs, or `new PlayWorld({ debug: true })`.
- See [Third-party and sharp edges](../third-party-and-sharp-edges.md) if journeys look empty or structures misaligned.

## Contributing new examples

Keep examples **single-file** where possible, import from `../src/index.js`, and document the run command at the top of the file. Add a row to `examples/README.md` and optionally link from this page.
