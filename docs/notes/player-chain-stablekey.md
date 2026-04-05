# Player chain `stableKey` (developer reference)

This note explains **`stableKey`**: what it identifies, how it is formed, where it appears on the wire, and what code must stay in sync. It complements the broader picture in [Agent Play world model and player chain](agent-play-world-model-and-player-chain.md).

## Definition

**`stableKey`** is a **human-readable string** that names **one leaf** in the player-chain Merkle tree. It is the **field name** for that leaf everywhere the system indexes leaves by identity (Redis hash, fanout hints, RPC), **not** the leaf digest (`leafDigestHex`) and **not** arbitrary user input.

Properties:

- **Stable across a session** for a given logical row: the same agent always uses the same key until that row leaves the snapshot (removal is signaled with the same key plus `removed: true` in fanout).
- **Deterministic** for occupants: derived only from occupant **kind** and **id** fields, not from position, name, or full JSON.
- **Comparable** for ordering: occupant leaves are sorted by `localeCompare` on their `stableKey` when building the chain.

## What `stableKey` is not

- **Not** the SHA-256 digest of the leaf (that is `leafDigestHex` in server code and Redis).
- **Not** required to be unique across deployment restarts in any stronger sense than “unique among current occupants”: the chain also includes fixed **`__genesis__`** and **`__header__`** keys that are reused for every snapshot build.
- **Not** sent as `sid`: incremental fetch uses **`getPlayerChainNode`** with **`stableKey`** only (same live session as **`getWorldSnapshot`**).

## The three kinds of keys

### 1. Genesis — fixed literal

| Value | Meaning |
|-------|---------|
| `__genesis__` | First leaf; Merkle payload is **trimmed** genesis file text (see genesis loading in the world-model note). |

Constants exported for type-safe references:

- **`packages/sdk/src/lib/world-chain-keys.ts`**: `PLAYER_CHAIN_GENESIS_STABLE_KEY`
- Server: same string in **`packages/web-ui/src/server/agent-play/player-chain/index.ts`**

### 2. Header — fixed literal

| Value | Meaning |
|-------|---------|
| `__header__` | Second leaf; Merkle payload is `stableStringify({ v: 1, sid, bounds })` from the resolved snapshot. |

Constant: `PLAYER_CHAIN_HEADER_STABLE_KEY` (same locations as genesis).

### 3. Occupants — computed: `agent:{agentId}` or `mcp:{id}`

| Occupant kind | `stableKey` format | Source fields |
|---------------|-------------------|---------------|
| `agent` | `agent:` + `agentId` | `PreviewWorldMapAgentOccupantJson.agentId` (server preview types) / `AgentPlayWorldMapAgentOccupant.agentId` (SDK public types) |
| `mcp` | `mcp:` + `id` | `PreviewWorldMapMcpOccupantJson.id` / MCP occupant `id` |

**Canonical function (server):** `stableOccupantSortKey(occ)` in **`packages/web-ui/src/server/agent-play/player-chain/index.ts`**.

The SDK merge path duplicates the same string rule in **`packages/sdk/src/lib/player-chain-merge.ts`** (local `stableOccupantSortKey`) so **`mergeSnapshotWithPlayerChainNode`** can filter and upsert occupants without importing server modules. **Any change to the key format must update both** (and tests).

## Leaf order

Order is fixed:

1. `__genesis__`
2. `__header__`
3. All occupants, sorted ascending by `stableOccupantSortKey(occ)` via `localeCompare`.

This order defines the Merkle leaf list and must match **diff/fanout** logic in the same module as `buildLeafEntriesFromSnapshot`.

## Where `stableKey` is used

| Location | Role |
|----------|------|
| **`buildLeafEntriesFromSnapshot`** | Each leaf row: `{ stableKey, leafDigestHex }`. |
| **Redis** `agent-play:{hostId}:player-chain:leaves` | Hash: **field name** = `stableKey`, **value** = leaf digest hex (full map replace on persist). |
| **`playerChainNotify` (SSE / fanout)** | Each affected leaf: `{ stableKey, leafIndex, removed? }` so clients know what to fetch. |
| **`getPlayerChainNode` RPC** | Request body `{ stableKey }` (trimmed); response **`PlayerChainNodeResponse`** echoes `stableKey` on every variant. |
| **Client merge** | `sortNodeRefsForSerializedFetch` orders refs by removal index then additions; fetches use **`stableKey`** from each ref. |

## RPC and validation (`getPlayerChainNode`)

Implementation: **`packages/web-ui/src/server/agent-play/read-player-chain-node.ts`** and **`packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`**.

- **`stableKey`** is **trimmed** for lookup.
- **Empty** after trim → rejected at the API layer (`invalid payload` / `readPlayerChainNode` returns `null` for empty key).
- **`__genesis__`** → genesis node (trimmed genesis text from the store).
- **`__header__`** → header node (`sid`, `bounds` from resolved snapshot).
- **Any other string** → treat as occupant key: find occupant where `stableOccupantSortKey(o) === stableKey`. If none match → **`{ kind: "occupant", stableKey, removed: true }`** (incremental sync uses this to drop a row locally).

So “unknown” occupant keys still yield a **valid** RPC response (removed occupant), not a 400, as long as the key string is non-empty.

## Client types (SDK)

Public shapes in **`packages/sdk/src/public-types.ts`**:

- **`PlayerChainNotifyNodeRef`**: `stableKey`, `leafIndex`, optional `removed`, optional `updatedAt`.
- **`PlayerChainNodeResponse`**: discriminated by `kind`; genesis and header nodes use branded stable key types; occupant nodes use `stableKey: string` for the `agent:` / `mcp:` keys.

Parsing and merge: **`packages/sdk/src/lib/player-chain-merge.ts`** (`parsePlayerChainFanoutNotify`, `parsePlayerChainNodeRpcBody`, `mergeSnapshotWithPlayerChainNode`).

## Contributor checklist when touching keys

1. **Occupant identity** — If you add a new occupant kind or change how agents/MCP rows are keyed, you must define a **single** canonical `stableKey` format and implement it in **server** `stableOccupantSortKey` and **SDK** merge helper (or share a tiny shared package if you dedupe).
2. **Sorting** — Leaf order must remain **`localeCompare`** on those keys unless you version the chain format.
3. **Wire/SSE** — Fanout builders must emit the same strings Redis uses for leaf fields.
4. **Tests** — **`player-chain/index.test.ts`**, **`read-player-chain-node.test.ts`**, **`player-chain-merge.test.ts`**, **`remote-play-world.test.ts`** cover behavior; extend them when key rules change.

## Code map

| Topic | Path |
|-------|------|
| Leaf entries, Merkle, `stableOccupantSortKey`, Redis map, fanout diff | `packages/web-ui/src/server/agent-play/player-chain/index.ts` |
| RPC slice by `stableKey` | `packages/web-ui/src/server/agent-play/read-player-chain-node.ts` |
| SDK constants | `packages/sdk/src/lib/world-chain-keys.ts` |
| Merge + fetch ordering + SSE parse | `packages/sdk/src/lib/player-chain-merge.ts` |
| Public API types | `packages/sdk/src/public-types.ts` |
