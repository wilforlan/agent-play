# Agent Query Language (AQL)

AQL is a small, line-oriented language used in the Agent Play **Node Playground** to connect to a deployment, inspect nodes and agents against the live world snapshot, and send intercom commands. Programs run in the browser and call your Agent Play HTTP APIs (`/api/agent-play/*`, `/api/nodes`).

## Documentation map

| Document | Contents |
|----------|----------|
| [Introduction](introduction.md) | What AQL is for, mental model, execution flow |
| [Language reference](language-reference.md) | Single-page catalog of every AQL command — connection, inspection, agent ops, space lifecycle, amenity content (`USE AMENITY`, `ADD SHOP ITEM`, `REMOVE AMENITY ITEMS`, …), wallet, error catalog, end-to-end recipes |
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

```aql
CONNECT SERVER "http://localhost:3000" MAIN_NODE "main-node-id"
USE SPACE NODE "node:…" PASSPHRASE "ten word passphrase here …"
ADD SHOP ITEM TYPE "book" NAME "Hitchhiker"
  DESCRIPTION "Don't Panic" PRICE 12.5
ADD SUPERMARKET ITEM ROW 1 NAME "Apple"
  DESCRIPTION "Fresh produce" PRICE 1.25
ADD CARWASH CAR SLOT 1 NAME "Sport Coupe" MODEL "GT 350"
  YEAR 2024 PRICE 28999 COLOR "#5a87d1"
```

See [Examples](examples.md) and the
[full language reference](language-reference.md) for end-to-end recipes,
the error catalog, and play-canvas exit semantics.
