# Agent Play world model and player chain

This note is for **software developers** who need one place to understand how **shared world state**, **session storage**, **revision numbering**, and the **player chain** (Merkle digest over the snapshot) fit together. It complements the shorter protocol summary in [World map v3](../updates-world-map-v3.md), the transport overview in [Peers, world sync, and signaling](../peer-world-signaling.md), and occupant-policy direction in [Occupant model and interaction policy](occupant-model-and-interaction-policy.md).

## World model (v3)

### Canonical state

The **canonical world** for a deployment is **`PreviewSnapshotJson`**: `sid`, `worldMap.bounds`, `worldMap.occupants` (agents and MCP registrations as map rows), and optional `mcpServers`. There is no separate top-level `players` array in the v3 snapshot shape.

**`PlayWorld`** (server) orchestrates business logic, events, and HTTP/SDK entry points, but it **does not** own the durable snapshot. Ownership belongs to a **`WorldSessionStore`** implementation:

| Store | When | Canonical snapshot |
|-------|------|----------------------|
| **`RedisSessionStore`** | `REDIS_URL` is set | Redis: JSON blob + session hash metadata + auxiliary keys (grid occupancy, player-chain leaf hash, event log, …) |
| **`MemorySessionStore`** | No Redis | In-process only; same APIs, no cross-process consistency |

Reads for the browser/SDK go through routes that **resolve** the stored snapshot (see `readResolvedSnapshot` in the web-ui server). Mutations that change the world run through a **serialized pipeline** when Redis is used: load snapshot, apply change, persist, publish fanout.

### Session identity

- **`sid`**: Session id created or reused when the store initializes the session (`loadOrCreateSessionId`). It appears in preview URLs and validates mutating RPC calls.
- **`AGENT_PLAY_HOST_ID`**: Partitions Redis keys per logical host (default `default`). Fanout channel: `agent-play:{hostId}:world:events`.

### Snapshot revision (`snapshotRev`)

On Redis, each successful **`persistSnapshotReturningRev`** increments **`snapshotRev`** in the **same `MULTI`/`EXEC`** as writing the snapshot JSON and Merkle metadata. That gives a **monotonic integer** per session so subscribers can order fanout relative to persists.

The player chain adds a **content** fingerprint (**`merkleRootHex`**) and **leaf count**; revision and Merkle root answer different questions (ordering vs “did the committed tree change?”).

## Player chain

The **player chain** is a **deterministic Merkle tree** over **canonical leaves** derived from the current snapshot. It is **not** a blockchain: there is no distributed consensus or linked list of blocks. It **is** a compact, reproducible digest so clients (or other services) can detect when the **logical** occupant set and header changed without fetching the full snapshot.

### Leaf order and stable keys

Leaves are built **in this order** (order matters for the Merkle root):

1. **`__genesis__`** — Anchors every deployment to a **static string** loaded once from the **genesis file** (see below). Payload is the **trimmed UTF-8** file contents. Leaf digest: `digestLeaf(genesisTrimmed)`.
2. **`__header__`** — Session header: `stableStringify({ v: 1, sid, bounds })` where `bounds` is `snapshot.worldMap.bounds`. Leaf digest: `digestLeaf(headerPayload)`.
3. **Occupants** — `snapshot.worldMap.occupants` sorted by **`stableOccupantSortKey`**: `agent:{agentId}` for agents, `mcp:{id}` for MCP rows. Each occupant leaf is `digestLeaf(stableStringify(occ))`.

Sorting by stable key ensures **order-invariant** roots for the same multiset of occupants.

A dedicated contributor reference for **`stableKey`** (literals, occupant key format, RPC, Redis, SDK merge) is in [Player chain `stableKey`](player-chain-stablekey.md).

### Cryptographic details (implementation)

Implementation: **`packages/web-ui/src/server/agent-play/player-chain/index.ts`**.

- **Leaf hash:** `SHA256( LEAF_DOMAIN + payloadUtf8 )` with `LEAF_DOMAIN = "wilforlan:player-chain:leaf\0"` (see `player-chain/index.ts`), output as **hex**.
- **Internal node hash:** `SHA256( NODE_DOMAIN + leftHex + rightHex )` with `NODE_DOMAIN = "wilforlan:player-chain:node\0"`, where children are **hex-encoded** digests concatenated as UTF-8 text.
- **Binary tree reduction:** Pairs combine left-to-right; an **odd** count at a level duplicates the last sibling (standard Merkle odd-handling).
- **Empty leaf list:** `buildMerkleRootHex([])` resolves to `digestLeaf("")` (edge case; normal snapshots always have at least genesis + header).

Domain separation between **leaf** and **internal** hashing avoids ambiguous interpretations of “is this bytes a user leaf or a pair of child digests?” when reasoning about the tree.

### Genesis file (`.root`)

The genesis string is loaded **synchronously** at first use and **cached** for the process.

- **Resolver:** `packages/web-ui/src/server/agent-play/load-player-chain-genesis.ts`
- **Default:** Walk **up** the filesystem from that module’s directory until a file named **`.root`** exists (typically the **repository/workspace root**).
- **Override:** Set **`AGENT_PLAY_ROOT_FILE`** to an absolute path (recommended in containers where the walk might not find the repo layout).

If neither finds a file, **`getPlayerChainGenesisSync()`** throws. Deployments **must** ship a `.root` or set **`AGENT_PLAY_ROOT_FILE`**.

Changing `.root` **changes every `merkleRootHex`** for the same logical snapshot. Treat that as a **compatibility break** for any client caching roots.

### Where the genesis string lives at runtime

**`WorldSessionStore`** exposes **`playerChainGenesis`**: the trimmed genesis string used for all chain operations for that store.

- **`MemorySessionStore`**: Optional constructor `playerChainGenesis`; otherwise **`getPlayerChainGenesisSync()`**.
- **`RedisSessionStore`**: Same optional override via options.

All call sites that build or diff the chain must use **the same** genesis value as the store: **`buildPlayerChainFromSnapshot`**, **`buildLeafEntriesFromSnapshot`**, **`diffPlayerChainLeaves`**, Redis leaf maps, and fanout deltas.

## Persistence and Redis layout

### Session hash fields (Redis)

In the same transaction as persisting the snapshot, the Redis store writes **`merkleRootHex`** and **`merkleLeafCount`** (and **`snapshotRev`** for the returning-rev path) into the session hash (`agent-play:{hostId}:session`).

### Player-chain leaf hash

Redis also maintains **`agent-play:{hostId}:player-chain:leaves`**: a hash field per **stable key** (`__genesis__`, `__header__`, `agent:…`, `mcp:…`) mapping to the **leaf digest hex**. It is replaced on each persist (delete key + `HSET` the new map).

The **Merkle root** is **not** stored as an intermediate in that hash; it is computed from the ordered list of leaf digests and stored on the session hash.

### Memory store

No Redis keys; **`merkleRootHex`** / **`merkleLeafCount`** are kept on the `MemorySessionStore` instance for metadata APIs and local fanout.

## Fanout and `playerChainNotify`

When the snapshot changes, the server computes **`diffPlayerChainLeaves(prev, next, playerChainGenesis)`**: which stable keys were removed and which leaf digests changed.

That diff is turned into a slim **`PlayerChainFanoutNotify`**: **`updatedAt`** plus **`nodes`**, each with **`stableKey`**, **`leafIndex`** (index in the pre-removal leaf list for removed keys, or in the post-update list for added/updated keys), optional **`removed: true`**, and optional per-node **`updatedAt`**. Removals are ordered by descending previous index, then additions/updates by ascending next index, so clients can replay fetches in a stable order. The notify is attached to **world fanout** envelopes alongside **`merkleRootHex`** and **`merkleLeafCount`** (and top-level **`rev`**, **`event`**, **`data`**).

Wire format parsing: **`packages/web-ui/src/server/agent-play/redis-world-fanout.ts`** (`parseWorldFanoutMessage`).

**Client merge:** Subscribers do **not** receive leaf digests on the wire. They call **`POST /api/agent-play/sdk/rpc`** with **`op: "getPlayerChainNode"`** and **`payload: { stableKey }`** (no **`sid`**; same session as **`getWorldSnapshot`**) to load the genesis string, header **`{ sid, bounds }`**, or full occupant JSON (or **`removed: true`** when the occupant left the snapshot). The **`@agent-play/sdk`** exposes **`mergeSnapshotWithPlayerChainNode`**, **`sortNodeRefsForSerializedFetch`**, **`parsePlayerChainFanoutNotifyFromSsePayload`**, and **`RemotePlayWorld.subscribeWorldState`** to keep an in-memory **`AgentPlaySnapshot`** in sync. The embedded watch UI resolves **`playerChainNotify`** from SSE payloads the same way and caps serialized RPC steps per event (see implementation in **`play-ui`** / canvas **`main.ts`**).

**Occupant cap:** At most **100** occupants (agents + MCP) may appear in **`worldMap.occupants`**; **`addPlayer`** and **`registerMCP`** reject further adds.

## Code map

| Concern | Location |
|---------|----------|
| Leaf building, Merkle root, diff, `playerChainNotify` builder | `packages/web-ui/src/server/agent-play/player-chain/index.ts` |
| Genesis file resolution | `packages/web-ui/src/server/agent-play/load-player-chain-genesis.ts` |
| Store interface (`playerChainGenesis`, persist, fanout) | `packages/web-ui/src/server/agent-play/world-session-store.ts` |
| Redis + `MULTI` persist | `packages/web-ui/src/server/agent-play/redis-session-store.ts` |
| In-memory store | `packages/web-ui/src/server/agent-play/memory-session-store.ts` |
| After mutation: diff, persist, publish | `packages/web-ui/src/server/agent-play/world-redis-sync.ts`, `world-mutation-pipeline.ts` |
| PlayWorld reset / fanout | `packages/web-ui/src/server/agent-play/play-world.ts` |
| Singleton wiring | `packages/web-ui/src/server/get-world.ts` |
| Fanout envelope parsing | `packages/web-ui/src/server/agent-play/redis-world-fanout.ts` |
| RPC slice `getPlayerChainNode` | `packages/web-ui/src/server/agent-play/read-player-chain-node.ts`, `app/api/agent-play/sdk/rpc/route.ts` |
| Client merge helpers + SSE subscriber | `packages/sdk/src/lib/player-chain-merge.ts`, `remote-play-world.ts` |
| Tests | `packages/web-ui/src/server/agent-play/player-chain/index.test.ts`, `read-player-chain-node.test.ts` |

## Operational checklist

1. **Ship `.root`** (or **`AGENT_PLAY_ROOT_FILE`**) in every environment; missing file fails at runtime when the chain is built.
2. **Do not rotate `.root`** casually: all Merkle roots and cached client comparisons change.
3. **Same genesis everywhere:** All processes that participate in the same logical world must use the **same** genesis bytes, or `merkleRootHex` will disagree.
4. **Revision vs root:** Use **`snapshotRev`** for “which persist happened first?” and **`merkleRootHex`** for “what world content was committed?”.
5. For protocol-shaped details (RPC names, snapshot fields), keep [World map v3](../updates-world-map-v3.md) as the normative short reference.
6. **Verbose player-chain tracing:** Set **`AGENT_PLAY_VERBOSE=1`** (or **`AGENT_PLAY_DEBUG=1`**) to log Merkle metadata, `buildPlayerChainFanoutNotify` diff summaries, Redis leaf hash field counts, `readPlayerChainNode` kinds, and fanout parse issues. Logs include stable keys and counts only, not full occupant JSON.
