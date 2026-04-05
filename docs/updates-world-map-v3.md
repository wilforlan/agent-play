# World map model v3 (protocol updates)

This note summarizes a breaking-ish cleanup: one spatial model for “who is on the grid,” simpler RPC names, and no tool-derived **`WorldStructure`** tiles in the snapshot.

## Snapshot shape

- **`worldMap.bounds`** — Axis-aligned extents in world units.
- **`worldMap.occupants`** — Every **agent** and **MCP** registration appears here with **`kind: "agent" | "mcp"`**, **`x` / `y`**, and identity fields. Agents carry journey/chat/assist metadata that used to live on separate `players` rows.
- **Agent `platform`** — Optional string mirroring **`POST /api/agent-play/players`** body **`type`** (e.g. `langchain`). The field was previously named **`agentType`** on the wire; **`agentType` is deprecated.** The **`@agent-play/sdk`** parser still accepts **`agentType`** in JSON for older snapshots and maps it to **`platform`** on the typed result.
- **No top-level `players`** array and no **`AgentPlaySnapshotPlayerRow`** in the SDK.
- **Coordinate rule** — The server allocates cells so two occupants do not share the same **`(x, y)`**; the SDK rejects unknown JSON that violates that.

## RPC (`POST /api/agent-play/sdk/rpc`)

| Op | Query |
|----|--------|
| **`getWorldSnapshot`** | No **`sid`** required. Returns the resolved snapshot for the live server session. |
| **`getPlayerChainNode`** | No **`sid`** required. Body **`{ stableKey }`** returns one player-chain node payload (genesis string, header bounds+sid, or occupant row / removed) slice from the same resolved snapshot as **`getWorldSnapshot`**. |
| **`recordInteraction`**, **`recordJourney`** | **`?_sid=`** still required and must pass session validation. |

Removed: **`getSnapshot`** (renamed), **`syncPlayerStructuresFromTools`** (and SSE **`world:structures`**).

## SDK (`@agent-play/sdk`)

- **`RemotePlayWorld.connect()`** replaces **`start()`**.
- **`getWorldSnapshot()`** — HTTP POST without `sid`; parses **`AgentPlaySnapshot`** with typed **`worldMap`**.
- **`getPlayerChainNode(stableKey)`** — HTTP POST without `sid`; merges server slices into a local snapshot with **`mergeSnapshotWithPlayerChainNode`**. **`subscribeWorldState`** uses SSE **`playerChainNotify`** plus serialized node RPCs to update an in-memory snapshot.
- **`addPlayer`** — **`agentId`** is required; response includes **`registeredAgent`** (repository summary or synthesized stats for local dev).
- Removed **`syncPlayerStructuresFromTools`** and structure parsing helpers from the public surface.

## SSE / WebSocket

- Still use **`world:player_added`** (not `world:agent_added`) for new agents.
- **`world:structures`** is gone; refresh via **`getWorldSnapshot`** or **incremental** **`playerChainNotify`** + **`getPlayerChainNode`** (see [SDK](sdk.md), [Events, SSE, and remote API](events-sse-and-remote.md)).
- SSE **`data`** JSON may include **`rev`**, **`merkleRootHex`**, **`merkleLeafCount`**, and **`playerChainNotify`** merged alongside event-specific fields.

## Opt-in verbose snapshot logs

On the server, **`AGENT_PLAY_VERBOSE=1`** (or **`AGENT_PLAY_DEBUG=1`**) logs full **`getWorldSnapshot`** payloads from the RPC route for inspection.

## Server architecture (Redis-first world state)

World grid and session snapshot **do not live in `PlayWorld` Maps**. The session store (Redis when `REDIS_URL` is set, otherwise **`MemorySessionStore`**) owns the canonical **`PreviewSnapshotJson`**.

**Intended flows**

1. **Player / preview client** — Create or resume session → **`GET` snapshot** (or RPC **`getWorldSnapshot`**) reads from the store → subscribe to **`world:*`** fanout (Redis pub/sub, or in-process dispatch when using the memory store).
2. **Agent / SDK** — Register via HTTP → mutations run under an exclusive I/O chain: **`getSnapshotJson`** → apply change (cell allocation is derived from current occupants; Redis persists snapshot and a derived **`grid:occupied`** SET in the same **`MULTI`** as the JSON for fast occupancy bookkeeping) → **`persistSnapshotReturningRev`** → **`publishWorldFanout`**.

**Removed from `PlayWorld`** (v3 persistence path): in-memory **`playerOrder`**, **`playerTypes`**, journey/interaction Maps, **`mcpServers` array** on the snapshot writer (MCP integrations appear only as **`kind: "mcp"`** occupants), **`enrichJourneyPath`**, hydrate-from-snapshot, and legacy snapshot/player-row types.

**Helpers:** **`runStoredWorldMutation`**, **`grid-allocate`** (`computeFreeMapCell` / **`occupiedKeysFromSnapshot`**), **`world-snapshot-helpers`**.

### Player chain (Merkle snapshot digest)

Each persist of the world snapshot computes a **player chain**: canonical leaves are **`__genesis__`** (trimmed UTF-8 contents of the workspace **`.root`** file, or the path in **`AGENT_PLAY_ROOT_FILE`**), then **`__header__`** (session id + bounds), then **occupants** sorted by stable id → SHA-256 domain-separated leaf digests → binary Merkle root. The root and leaf count are written to the session hash (`merkleRootHex`, `merkleLeafCount`) in the same Redis **`MULTI`** as **`persistSnapshot`** / **`persistSnapshotReturningRev`**. **`publishWorldFanout`** attaches **`merkleRootHex`**, **`merkleLeafCount`**, and a slim **`playerChainNotify`** (`updatedAt` + **`nodes`** with **`stableKey`**, **`leafIndex`**, **`removed`**) so clients fetch full rows via **`getPlayerChainNode`** and merge locally (SDK **`subscribeWorldState`**, watch UI). The world allows at most **100** occupants (agents + MCP rows). Implementation lives under **`packages/web-ui/.../player-chain/`** and **`load-player-chain-genesis.ts`**.

For a full developer-oriented walkthrough (world model, Redis keys, **`playerChainNotify`**, operational notes), see **[Agent Play world model and player chain](notes/agent-play-world-model-and-player-chain.md)**.

## Migrating integrations

1. Replace **`start`** → **`connect`**, **`getSnapshot`** → **`getWorldSnapshot`**.
2. Read agents only from **`snapshot.worldMap.occupants`** where **`kind === "agent"`**.
3. Pass **`agentId`** on every **`addPlayer`**; read **`registeredAgent`** from the HTTP response instead of **`structures`**.
4. Drop any client code that depended on **`world:structures`** or tool-sync RPC.
5. If you consumed Redis fanout **`playerChainDelta`** (per-leaf digests on the wire), migrate to **`playerChainNotify`** + **`getPlayerChainNode`** or keep using **`getWorldSnapshot`** only.
