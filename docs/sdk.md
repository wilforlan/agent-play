# Agent Play SDK (Node.js)

The package **`@agent-play/sdk`** exposes **`RemotePlayWorld`** for HTTP access to a running **web-ui** server, **`hold().for(seconds)`** and **`onClose`** for long-running processes, and **`langchainRegistration`** for validating LangChain tool lists. Construct **`RemotePlayWorld`** with **`baseUrl`** and a non-empty **`apiKey`** (see [API keys](api-keys.md)). Call **`connect()`** to align with the server session, then **`getWorldSnapshot()`** for the current world JSON (the map is **`worldMap.occupants`**: every **agent** and **MCP** placement). Call **`addPlayer`** with a required **`agentId`**, name, a **`type`** string (integration label; stored on the snapshot occupant as **`platform`**, formerly **`agentType`** — see [World map v3](updates-world-map-v3.md)), and **`agent`** from **`langchainRegistration`**. Your agent must define a **`chat_tool`**; tools named **`assist_*`** are indexed for assist buttons on the watch UI. With a **registered-agent repository** (typically Redis), **`agentId`** must be an id from **`agent-play create`** and **`apiKey`** is the account API key.

Use the **web-ui** Next.js app as the HTTP host: it exposes `/api/agent-play/session`, `/api/agent-play/players`, `/api/agent-play/sdk/rpc`, `/api/agent-play/events` (SSE), `/api/agent-play/snapshot`, the watch UI under `/agent-play/watch`, and static play-ui assets from the build pipeline. Clients (including **`RemotePlayWorld`**) talk to those routes on **`baseUrl`**; you do not mount Express preview routes yourself.

Optional **`repository`** on **`PlayWorld`** enables API key verification and Redis-backed aggregates; see [Redis / repository](redis-world.md) and [API keys](api-keys.md).

`recordInteraction` and `recordJourney` are the main write APIs: send chat-style lines with **`recordInteraction`**, and send a structured **`Journey`** with **`recordJourney`** after your pipeline has assembled it. The host does not parse LangChain invoke blobs; build the journey in your integration and call **`recordJourney`**.

For remote bridges, set **`playApiBase`** on **`PlayWorld`** so the same events can be POSTed to another HTTP service you control.

Publishing: the package name is **`@agent-play/sdk`**. Point **`exports`** at the published **`dist`** entry (see root **`npm run build:sdk`**).

How multiple users and agents stay aligned is described in [Peers, world sync, and signaling](peer-world-signaling.md) and [Events, SSE, and remote API](events-sse-and-remote.md).

MCP servers are not started inside the SDK. **`PlayWorld.registerMCP`** (and **`RemotePlayWorld.registerMcp`**) record session metadata (see [MCP registration](mcp.md)). You run real MCP servers in your process or sidecar, expose them to your agent framework, then call into **`PlayWorld`** when those tools run so the map and chat reflect what happened.

## Player chain and incremental world sync (breaking-aware)

The server maintains a **player chain** (Merkle tree over canonical leaves: **`__genesis__`**, **`__header__`**, then occupants sorted by stable id). After each snapshot persist it may attach a slim **`playerChainNotify`** to world fanout (see [Agent Play world model and player chain](notes/agent-play-world-model-and-player-chain.md)).

### RPC reads

| Op | Query | Body / response |
|----|--------|-----------------|
| **`getWorldSnapshot`** | No **`sid`** | `{}` → `{ snapshot: AgentPlaySnapshot }` |
| **`getPlayerChainNode`** | No **`sid`** | `{ stableKey }` → `{ node: PlayerChainNodeResponse }` — one leaf slice: genesis text, header **`{ sid, bounds }`**, occupant row, or **`removed: true`** for a missing occupant key |

Mutating ops (**`recordInteraction`**, **`recordJourney`**, …) still require **`?sid=`** and session validation.

### SDK: merge helpers (pure, public)

These mirror server semantics for use in your process or in custom SSE parsers:

- **`PLAYER_CHAIN_GENESIS_STABLE_KEY`**, **`PLAYER_CHAIN_HEADER_STABLE_KEY`**
- **`parsePlayerChainFanoutNotify`**, **`parsePlayerChainFanoutNotifyFromSsePayload`** — validate notify JSON
- **`sortNodeRefsForSerializedFetch`** — removal refs by descending **`leafIndex`**, then updates by ascending **`leafIndex`**
- **`parsePlayerChainNodeRpcBody`** — validate **`getPlayerChainNode`** HTTP response
- **`mergeSnapshotWithPlayerChainNode`** — immutable snapshot update from one node response

Types: **`PlayerChainNotifyNodeRef`**, **`PlayerChainFanoutNotify`**, **`PlayerChainNodeResponse`**, etc. (see **`public-types`**).

### SDK: **`RemotePlayWorld`**

- **`getPlayerChainNode(stableKey)`** — POST **`getPlayerChainNode`** (no session query param on this op; same live session as **`getWorldSnapshot`**).
- **`subscribeWorldState({ onSnapshot, onError? })`** — after **`connect()`**, opens SSE (`**/api/agent-play/events?sid=...`**) with your auth headers, seeds state from **`getWorldSnapshot`**, then on each event parses **`playerChainNotify`** from the JSON **`data`** payload (when present), fetches each referenced node **sequentially** via **`getPlayerChainNode`**, merges with **`mergeSnapshotWithPlayerChainNode`**, and calls **`onSnapshot`** with the updated **`AgentPlaySnapshot`**. Depends on **`eventsource-client`** (already a dependency). Events that carry no notify (for example many **`world:interaction`** lines) do not trigger incremental merge; your **`onSnapshot`** is only called after initial load and after successful notify-driven merges. For chat lines you still need your own SSE listener or **`recordInteraction`** flows.

### Custom SSE consumers

The web-ui **`GET /api/agent-play/events`** handler merges **`rev`**, **`merkleRootHex`**, **`merkleLeafCount`**, and **`playerChainNotify`** into each event’s JSON **`data`** (alongside event-specific fields such as **`playerId`** / **`role`** / **`text`** for interactions). Use **`parsePlayerChainFanoutNotifyFromSsePayload(parsedData)`** to read **`playerChainNotify`**.

### Limits and compatibility

- The server enforces at most **100** occupants (agents + MCP rows) per world; **`addPlayer`** and MCP registration fail when the cap is reached ([World map v3](updates-world-map-v3.md)).
- **Breaking (server fanout):** Redis/pub-sub envelopes use **`playerChainNotify`** with node metadata, not the older digest-heavy **`playerChainDelta`**. Any out-of-tree consumer that parsed **`playerChainDelta`** must switch to **notify + `getPlayerChainNode`** (or keep using full **`getWorldSnapshot`** only).

TypeDoc for this package lists every export; run **`npm run docs:api`** from the repo root ([API reference](api-reference.md)).
