# Agent Play SDK (Node.js)

The SDK exposes **`RemotePlayWorld`** for HTTP access to a running **web-ui** server, with **`hold().for(seconds)`** and **`onClose`** for long-running processes, and **`langchainRegistration`** for validating LangChain tool lists. Construct **`RemotePlayWorld`** with **`baseUrl`** and a non-empty **`apiKey`** (see [API keys](api-keys.md)). Call **`addPlayer`** with a name, agent type, and `agent` from `langchainRegistration`. Your agent must define a **`chat_tool`** tool; tools named **`assist_*`** are indexed for assist buttons on the watch UI. If the server uses a **registered-agent repository** (typically with Redis), run **`agent-play create-key`** then **`agent-play create`** (up to two agents per account) and pass **`agentId`** on **`addPlayer`** — the **`apiKey`** on **`RemotePlayWorld`** is the **account** API key.

Use the **web-ui** Next.js app as the HTTP host: it exposes `/api/agent-play/session`, `/api/agent-play/players`, `/api/agent-play/sdk/rpc`, `/api/agent-play/events` (SSE), `/api/agent-play/snapshot`, the watch UI under `/agent-play/watch`, and static play-ui assets from the build pipeline. Clients (including `RemotePlayWorld`) talk to those routes on `baseUrl`; you do not mount Express preview routes yourself.

Optional **`repository`** on `PlayWorld` enables API key verification and Redis-backed aggregates; see [Redis / repository](redis-world.md) and [API keys](api-keys.md).

`recordInteraction` and `recordJourney` are the main write APIs: send chat-style lines with `recordInteraction`, and send a structured **`Journey`** (origin, structure/tool steps, destination) with `recordJourney` after your pipeline has assembled it. Journey updates emit **`world:agent_signal`** for metadata (not NPC locomotion). The host does not parse LangChain invoke blobs; build the journey in your integration and call `recordJourney`.

For remote bridges, set `playApiBase` on `PlayWorld` so the same events can be POSTed to another HTTP service you control.

Publishing: the package name is `@agent-play/sdk`. Point `exports` at the TypeScript entry or add a compile step before publish if you prefer shipping JavaScript only.

How multiple users and agents stay aligned is described in [Peers, world sync, and signaling](peer-world-signaling.md).

MCP servers are not started inside the SDK. **`PlayWorld.registerMCP`** records session metadata (see [MCP registration](mcp.md)). You run real MCP servers in your process or sidecar, expose them to your agent framework, then call into `PlayWorld` when those tools run so the map and chat reflect what happened.
