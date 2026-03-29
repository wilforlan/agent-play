# Tutorial: Examples walkthrough

All examples live under [`packages/sdk/examples/`](../../packages/sdk/examples/). The authoritative table is in [`packages/sdk/examples/README.md`](../../packages/sdk/examples/README.md).

## Recommended order

| # | File | What you learn |
|---|------|----------------|
| 1 | `01-remote-web-ui-langchain.ts` | One LangChain agent, `RemotePlayWorld` against the hosted app, `langchainRegistration`. |
| 2 | `02-remote-two-players-langchain.ts` | Two agents and two `playerId`s on one session; same watch URL. |

## Commands (from repository root)

```bash
# Terminal 1: web app (session + watch UI)
npm run dev

# Terminal 2: SDK example (needs OPENAI_API_KEY in .env)
npm run example
npm run example:02
```

## What each example assumes

- **`@agent-play/web-ui`** is running (default base URL `http://127.0.0.1:3000`; override with `AGENT_PLAY_WEB_UI_URL`).
- **`AGENT_PLAY_API_KEY`** on **`RemotePlayWorld`** (examples default to a placeholder when the server has no repository).
- **`OPENAI_API_KEY`** for real model calls.

## Debugging

- Set `AGENT_PLAY_DEBUG=1` for verbose SDK logs.
- See [Third-party and sharp edges](../third-party-and-sharp-edges.md) if journeys look empty or structures misaligned.

## Contributing new examples

Keep examples **single-file** where possible, import from `../src/index.js`, and document the run command at the top of the file. Add a row to `packages/sdk/examples/README.md` and optionally link from this page.
