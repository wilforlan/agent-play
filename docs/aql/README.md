# Agent Query Language (AQL)

AQL is a small, line-oriented language used in the Agent Play **Node Playground** to connect to a deployment, inspect nodes and agents against the live world snapshot, and send intercom commands. Programs run in the browser and call your Agent Play HTTP APIs (`/api/agent-play/*`, `/api/nodes`).

## Documentation map

| Document | Contents |
|----------|----------|
| [Introduction](introduction.md) | What AQL is for, mental model, execution flow |
| [Language reference](language-reference.md) | Syntax, statements, expressions, variables, macros, diagnostics |
| [Playground](playground.md) | `/playground` UI: Connect, Run, passphrase, autocomplete, headers |
| [Integration guide](integration.md) | `runAql`, execution state, runtime client, extending AQL |
| [Examples](examples.md) | Copy-paste recipes and patterns |
| [Troubleshooting](troubleshooting.md) | Common errors and fixes |

## Source of truth (implementations)

| Layer | Path |
|-------|------|
| Lexer | [`packages/web-ui/src/app/playground/_lib/aql-lexer.ts`](../../packages/web-ui/src/app/playground/_lib/aql-lexer.ts) |
| Parser | [`packages/web-ui/src/app/playground/_lib/aql-parser.ts`](../../packages/web-ui/src/app/playground/_lib/aql-parser.ts) |
| Validator | [`packages/web-ui/src/app/playground/_lib/aql-validator.ts`](../../packages/web-ui/src/app/playground/_lib/aql-validator.ts) |
| Executor | [`packages/web-ui/src/app/playground/_lib/aql-executor.ts`](../../packages/web-ui/src/app/playground/_lib/aql-executor.ts) |
| Engine entry | [`packages/web-ui/src/app/playground/_lib/aql-engine.ts`](../../packages/web-ui/src/app/playground/_lib/aql-engine.ts) |
| HTTP facade | [`packages/web-ui/src/app/playground/_lib/aql-runtime-client.ts`](../../packages/web-ui/src/app/playground/_lib/aql-runtime-client.ts) |

## Quick start

1. Enable the playground (`NEXT_PUBLIC_ENABLE_NODE_PLAYGROUND=true`) and open `/playground`.
2. Set **Server URL**, **Main node ID**, and **10-word passphrase**, then **Connect**.
3. Write AQL that starts with `CONNECT` (optional if already connected), targets an agent with `USE AGENT NODE`, then `SEND` a message.

See [Examples](examples.md) for a minimal script.
