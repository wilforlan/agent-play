# Agent Play — developer documentation

For project vision and community framing, read the [repository README](../README.md).

Agent Play is a TypeScript SDK plus a browser client that visualize agent runs as a **2D world** with structures (tools), journeys (paths), and live updates.

## Where the code lives

The repository uses npm workspaces. **`packages/sdk`** is the Node.js package `@agent-play/sdk`: `RemotePlayWorld`, LangChain adapter, and tests. **`packages/play-ui`** is the Vite application `@agent-play/play-ui` (Pixi.js canvas, chat UI, settings), vendored into **`packages/web-ui`** for the Next.js app. **`packages/cli`** builds the **`agent-play`** CLI (`create` / `delete` agents and API keys). **`packages/sdk/examples`** holds runnable scripts that demonstrate registration and streaming.

## Documentation map

| Document | Contents |
|----------|----------|
| [Development guide](development.md) | Local setup, env templates, running the stack, troubleshooting |
| [Kubernetes deployment](kubernetes-deployment.md) | Index; [`k8s/`](k8s/README.md) (startup, [deployment](k8s/deployment.md), Redis, server) |
| [npm & CI](npm-and-ci.md) | `@agent-play/sdk`, `@agent-play/cli`, `@agent-play/play-ui`, publish workflow, TypeDoc / GitHub Pages |
| [API reference (generated)](api-reference.md) | How HTML docs are built and deployed |
| [Pending feature backlog](pending-features.md) | Roadmap themes and scope notes |
| [Overview](overview.md) | How the SDK and UI relate, and why they are separate deployables |
| [Monorepo](monorepo.md) | Workspaces, build order, root scripts |
| [SDK](sdk.md) | `PlayWorld`, preview mount, registering agents, MCP at the integration layer |
| [Play UI](play-ui.md) | Static build, same-origin vs split deployment, `VITE_PLAY_API_BASE` |
| [Multiplayer](multiplayer.md) | Human movement, proximity, A/C/Z/Y actions |
| [Redis / repository](redis-world.md) | `AgentRepository`, Redis key layout, no agent position streams |
| [CLI](cli.md) | `agent-play create` / `delete` |
| [API keys](api-keys.md) | Issuing keys, SDK usage, rotation |
| [MCP registration](mcp.md) | `PlayWorld.registerMCP` and snapshot |

Older topic-specific pages such as [Architecture](architecture.md), [Core features](core-features.md), and [Events, SSE, and remote API](events-sse-and-remote.md) may still describe paths as `play-sdk/`; treat **`packages/sdk`** and **`packages/play-ui`** as the current locations.

Run examples from the repo root with `npm run example` (see root `package.json`) or `npm run example -w @agent-play/sdk`.
