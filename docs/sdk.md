# Agent Play SDK (Node.js)

The package **`@agent-play/sdk`** exposes **`RemotePlayWorld`** for HTTP access to a running **web-ui** server, **`hold().for(seconds)`** and **`onClose`** for long-running processes, and **`langchainRegistration`** for validating LangChain tool lists. Construct **`RemotePlayWorld`** with **`baseUrl`** and a non-empty **`apiKey`** (see [API keys](api-keys.md)). Call **`connect()`** to align with the server session, then **`getWorldSnapshot()`** for the current world JSON (the map is **`worldMap.occupants`**: every **agent** and **MCP** placement). Call **`addAgent`** with a required **`nodeId`** (the **agent node id**; sent to the server as `agentId` for compatibility), name, a **`type`** string (integration label; stored on the snapshot occupant as **`platform`**, formerly **`agentType`** — see [World map v3](updates-world-map-v3.md)), and **`agent`** from **`langchainRegistration`**. Optional **`enableP2a: "on" | "off"`** registers intent for OpenAI Realtime audio bridging on the automation host (see [P2A realtime hub](p2a/index.md)); omit or use **`"off"`** to keep audio handling unchanged. Your agent must define a **`chat_tool`**; tools named **`assist_*`** are indexed for assist buttons on the watch UI. **Map layout is not derived from tool names** — author **spaces** with **`owner`** metadata (AQL, `registerSpaceNode`; see [Structures and spaces world model](notes/structures-and-spaces-world-model.md)). With a **registered-agent repository** (typically Redis), **`nodeId`** must be an id from **`agent-play create`** and **`apiKey`** is the account API key. **`addPlayer`** remains as a deprecated alias that passes **`agentId`** through the same path.

> **@deprecated** `repository.createAgent` and `POST /api/agents` create flow are removed. Register agent-node identity with `POST /api/nodes/agent-node` (or `agent-play create-agent-node`), then provide runtime metadata through `world.addAgent` (or `addPlayer`). **`syncPlayerStructuresFromTools`** and tool-derived map tiles were removed in [World map v3](updates-world-map-v3.md).

## Node auth contract (current)

- Node identity is root-key derivative based: `nodeId === deriveNodeIdFromMaterial({ material: passwHash, rootKey })`.
- The human passphrase is hashed **once** on the client (CLI, SDK, or preview browser onboarding) via `nodeCredentialsMaterialFromHumanPassphrase` (or the higher-level `nodeCredentialFromHumanPhrase` / `createNodeCredentialMaterial`). The resulting `passwHash` is what the server stores and what is sent as the `x-node-passw` header.
- **Dual credentials on `RemotePlayWorld`:** pass **`mainNodeCredentials`** (alias **`nodeCredentials`**) with the **main node** phrase for session bootstrap (`connect`, `getWorldSnapshot`, SSE subscribe). Pass **`agentPassphrase`** on each **`addAgent`** call with that agent node's human phrase for validate, players registration, heartbeat, intercom response, and mutating RPC (`recordInteraction`, `recordJourney`). When **`agentPassphrase`** is omitted, the SDK falls back to the main passphrase (local dev only).
- **`POST /api/nodes`** body for main nodes is `{ kind: "main", nodeId, passwHash }`. The server verifies that `nodeId` is derivable from `passwHash` under the current root key and never re-hashes the supplied material.
- **`POST /api/nodes/agent-node`** body is `{ kind: "agent", parentNodeId, agentNodeId, agentNodePasswHash }`; same verify-don't-rehash rule applies.
- `RemotePlayWorld.addAgent` posts the **agent** `passwHash` (not the raw phrase) on the players route body; the server verifies it against the **agent node id**, not the main node.
- Space nodes are the documented exception: when the client omits `passwHash`, the server generates a phrase, hashes it, stores the hash, and returns the phrase **once** to the caller.
- Node kind contract is `root -> main -> agent` (with `space` as a parallel kind); root records do not require `passwHash`.

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

- The server enforces at most **100** occupants (agents + MCP rows) per world; **`addAgent`** / **`addPlayer`** and MCP registration fail when the cap is reached ([World map v3](updates-world-map-v3.md)).
- **Breaking (server fanout):** Redis/pub-sub envelopes use **`playerChainNotify`** with node metadata, not the older digest-heavy **`playerChainDelta`**. Any out-of-tree consumer that parsed **`playerChainDelta`** must switch to **notify + `getPlayerChainNode`** (or keep using full **`getWorldSnapshot`** only).

TypeDoc for this package lists every export; run **`npm run docs:api`** from the repo root ([API reference](api-reference.md)).
