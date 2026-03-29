# Agent Play SDK (Node.js)

The SDK centers on `PlayWorld`. After `await world.start()`, the world has a session id used in preview URLs and API authentication. Call `addPlayer` with a name, agent type, and registration payload (for example LangChain tool names). The world lays out structures on the map and exposes `getSnapshotJson()` for HTTP snapshots.

Use `mountExpressPreview(app, world, options)` to attach routes: `GET snapshot.json`, `GET events` (Server-Sent Events including `world:agent_signal`, players, structures, and chat lines), `POST proximity-action` for proximity gestures, `GET watch` plus static assets for the bundled UI. The `basePath` option defaults to `/agent-play` so you can nest under an existing app.

Optional **`repository`** on `PlayWorld` enables API key verification and Redis-backed aggregates; see [Redis / repository](redis-world.md) and [API keys](api-keys.md).

`recordInteraction` and `recordJourney` are the main write APIs when your agent pipeline produces user, assistant, or tool messages and path steps. Journey updates emit **`world:agent_signal`** for metadata (not NPC locomotion). `ingestInvokeResult` adapts LangChain invoke output into journeys and tool lines automatically when you wire `attachLangChainInvoke`.

For remote bridges, set `playApiBase` on `PlayWorld` so the same events can be POSTed to another HTTP service you control.

Publishing: the package name is `@agent-play/sdk`. Point `exports` at the TypeScript entry or add a compile step before publish if you prefer shipping JavaScript only. Peer dependency on Express matches how `mountExpressPreview` is typed.

MCP servers are not started inside the SDK. **`PlayWorld.registerMCP`** records session metadata (see [MCP registration](mcp.md)). You run real MCP servers in your process or sidecar, expose them to your agent framework, then call into `PlayWorld` when those tools run so the map and chat reflect what happened.
