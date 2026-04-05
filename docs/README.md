# Agent Play — developer documentation

For project vision and community framing, read the [repository README](../README.md).

Agent Play is a TypeScript SDK plus a browser client that visualize agent runs as a **2D world**: agents and MCP servers sit on a shared grid (**`worldMap.occupants`**), journeys draw paths, and SSE delivers live updates.

## Where the code lives

The repository uses npm workspaces. **`packages/sdk`** is the Node.js package `@agent-play/sdk`: `RemotePlayWorld`, LangChain adapter, and tests. **`packages/play-ui`** is the Vite application `@agent-play/play-ui` (Pixi.js canvas, chat UI, settings), vendored into **`packages/web-ui`** for the Next.js app. **`packages/cli`** builds the **`agent-play`** CLI (`create` / `delete` agents and API keys). **`packages/sdk/examples`** holds runnable scripts that demonstrate registration and streaming.

## Documentation map

| Document | Contents |
|----------|----------|
| [Development guide](development.md) | Local setup, env templates, running the stack, troubleshooting |
| [World map v3](updates-world-map-v3.md) | Snapshot/RPC: occupants-only map, `getWorldSnapshot`, **`getPlayerChainNode`**, fanout **`playerChainNotify`**, 100-occupant cap |
| [Kubernetes deployment](kubernetes-deployment.md) | Index; [`k8s/`](k8s/README.md) (startup, [deployment](k8s/deployment.md), Redis, server) |
| [Notes / runbooks](notes/README.md) | World model + player chain ([deep dive](notes/agent-play-world-model-and-player-chain.md)), k8s debugging ([runbook](notes/k8s-agent-play-debugging.md)) |
| [npm & CI](npm-and-ci.md) | `@agent-play/sdk`, `@agent-play/cli`, `@agent-play/play-ui`, publish workflow, TypeDoc / GitHub Pages |
| [API reference (generated)](api-reference.md) | How HTML docs are built and deployed |
| [Pending feature backlog](pending-features.md) | Roadmap themes and scope notes |
| [Overview](overview.md) | How the SDK and UI relate, and why they are separate deployables |
| [Monorepo](monorepo.md) | Workspaces, build order, root scripts |
| [SDK](sdk.md) | **`RemotePlayWorld`**, player-chain incremental sync (`getPlayerChainNode`, `subscribeWorldState`, merge helpers), LangChain adapter |
| [Play UI](play-ui.md) | Static build, same-origin vs split deployment, `VITE_PLAY_API_BASE` |
| [Multiplayer](multiplayer.md) | Human movement, proximity, A/C/Z/Y actions |
| [Redis / repository](redis-world.md) | `AgentRepository`, Redis key layout, no agent position streams |
| [CLI](cli.md) | `agent-play create` / `delete` |
| [API keys](api-keys.md) | Issuing keys, SDK usage, rotation |
| [MCP registration](mcp.md) | `PlayWorld.registerMCP` and snapshot |
| [In-browser docs (`/doc`)](in-app-docs.md) | How `docs/` is copied into web-ui, App Router layout, Docker |

Older topic-specific pages such as [Architecture](architecture.md), [Core features](core-features.md), and [Events, SSE, and remote API](events-sse-and-remote.md) may still describe paths as `play-sdk/`; treat **`packages/sdk`** and **`packages/play-ui`** as the current locations.

Run examples from the repo root with `npm run example` (see root `package.json`) or `npm run example -w @agent-play/sdk`.

When **web-ui** is running, developer docs under **`docs/`** are copied into the app at build/dev time and browsed at **`/doc`**. See **[In-browser documentation](in-app-docs.md)** for URLs, copy pipeline, and implementation details. The watch canvas links to **`/doc`** from the bottom-left.
