# Yjs CRDT for world geography — peer-mesh multiplayer

**Status:** shipped library + host APIs + play-ui mesh session — **locked: peer mesh + AOI, 100 concurrent**  
**Audience:** engineers working on Play UI, world sync, and multiplayer presence  
**Related:** [Geography mesh package guide](../geography-mesh.md), [World model and player chain](agent-play-world-model-and-player-chain.md), [Structures and spaces](structures-and-spaces-world-model.md), [Occupant model](occupant-model-and-interaction-policy.md), [Peers and signaling](../peer-world-signaling.md)

## Implementation status

| Piece | Location |
|-------|----------|
| Shared AOI + schemas + Yjs pose helpers (npm) | `@agent-play/geography-mesh` (`packages/geography-mesh`) — see [docs/geography-mesh.md](../geography-mesh.md) |
| Host membership / coarse / signal APIs | `POST /api/agent-play/geography/{membership,coarse,signal}` |
| Redis membership hash | `agent-play:{hostId}:geography:members:{sid}` |
| Client mesh session | `GeographyMeshSession` in play-ui (copied to web-ui canvas vendor) |
| Feature flag | `worldGeographyEnabled` (default **on**) — mesh when on; Redis 30s pose path when off (rollback) |
| Peer voice (separate) | Dedicated audio PC + `peer-call/signal` — not the geography data-channel mesh |

## Decision lock

| Lock | Choice |
|------|--------|
| **Transport** | WebRTC peer mesh only (`y-webrtc` or equivalent). **No** `y-websocket` / host pose relay as primary path. |
| **Capacity** | **Up to 100** simultaneous geography participants per `sid`. |
| **How 100 works** | **Area-of-interest (AOI) mesh** — not full mesh. Each client maintains WebRTC links to at most **`GEOGRAPHY_MESH_DEGREE_MAX = 16`** nearby peers. |
| **Host role** | Signaling + membership + coarse AOI hints only. Pose bytes stay on peer data channels (TURN allowed for NAT). |

| In scope | Out of scope |
|----------|----------------|
| AOI-scoped `y-webrtc` meshes for Domain B poses | Always-on server byte-relay for every pose |
| HTTP/SSE **signaling** (join/leave, SDP/ICE, neighbor sets) | Full mesh of 100×99 data channels |
| Local-first Y.Doc + CRDT merge among neighbors | Replacing Domain A with a CRDT |
| Hard cap **100** geography humans per `sid` | Server-simulated human physics |
| Soft/hard mesh degree **≤ 16** | Silent fallback to Redis 30s pose sampling as the long-term path |

**Why not full mesh at 100:** all-to-all is O(n²) (~4,950 channels). Browsers and uplink cannot sustain that. AOI keeps **room size = 100** while **per-client degree ≤ 16**.

## One-sentence goal

Use **Yjs** for **human world geography**, synced over an **AOI WebRTC peer mesh**, so up to **100** humans share a `sid` with **near peer-RTT** motion among neighbors — replacing today’s ~30s Redis samples without a pose server or a peer-writable durable snapshot.

## Scale targets (locked)

| Metric | Locked value | Notes |
|--------|--------------|--------|
| Max geography participants per `sid` | **100** | Refuse join #101 with clear UI |
| Max WebRTC mesh degree per client | **16** | Nearest / highest-priority AOI neighbors |
| Pose publish while moving | **15–20 Hz** capped | Threshold + facing / `isMoving` flips |
| Local render | Display refresh | From local Y.Doc; never waits on mesh |
| Neighbor refresh (AOI recompute) | ~1–2 Hz or on cell change | Signaling updates neighbor set; churn connections carefully |

## What “near-zero latency” means here

It does **not** mean zero network delay or that all 100 peers see every step of every other peer.

| Layer | Latency target | How |
|-------|----------------|-----|
| **Local avatar** | ~0 ms perceived | Mutate local Yjs doc in the input frame |
| **AOI neighbor avatars** | ~1 **peer** RTT | WebRTC data channel to ≤16 neighbors |
| **Far humans (outside AOI)** | Not realtime-detailed | No mesh link required; optional sparse presence later — **v1: not shown or shown stale/absent** |
| **Late joiners in AOI** | One sync burst | Signaling → connect neighbors → state vector catch-up → live |
| **Durable world** | Unchanged | Redis snapshot + SSE |

“Near zero” applies to **you + who you can see nearby**. Capacity 100 is a **world population** target; mesh degree 16 is the **realtime fanout** target.

## Problem with geography today

World geography already exists as an **opt-in ephemeral presence layer** (not the durable snapshot):

| Piece | Today |
|-------|--------|
| Store | Redis hash `agent-play:{hostId}:geography:{sid}` |
| Publish | Client `POST /api/agent-play/geography` about every **30s** (`GEOGRAPHY_PUBLISH_INTERVAL_MS`) |
| Fanout | SSE `world:geography` + geography-scoped `playerChainNotify` |
| Consistency | Last-write-wins per human id |
| Local motion | Smooth in-browser; **remote** humans jump on the next sample |

Multiplayer “feel” is bounded by a **throttle**, not by the display refresh rate.

## Design thesis

```text
┌─────────────────────────────────────────────────────────────┐
│  Domain A — Durable world (unchanged)                       │
│  Agents, structures, spaces, amenities, wallets, journeys   │
│  Redis snapshot + snapshotRev + Merkle player chain + SSE   │
│  Server is source of truth                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Domain B — World geography (Yjs + AOI peer mesh)           │
│  Up to 100 humans per sid                                   │
│  Each client ↔ ≤16 WebRTC neighbors (AOI)                   │
│  Local-first writes; CRDT merge among neighbors             │
│  Host: signaling / membership / neighbor hints only         │
└─────────────────────────────────────────────────────────────┘
```

## Why Yjs (CRDT features that matter)

| Yjs capability | Geography use |
|----------------|---------------|
| **Local transactions** | Input writes `Y.Map` same frame → local sprite never waits |
| **Commutative updates** | Concurrent movers among neighbors converge |
| **State vectors + diff updates** | Catch-up when an AOI neighbor is added |
| **`Y.Map` of humans** | Key = human/node id; nested pose fields |
| **Awareness protocol** | Optional ephemeral hints without durable pose history |
| **`y-webrtc` (AOI-scoped)** | **Locked transport** — data channels only to current neighbor set |
| **Idempotent `applyUpdate`** | Safe replay when neighbor links flap |

## AOI peer mesh architecture (locked)

```text
                    ┌──────────────────────────┐
                    │  Agent Play host         │
                    │  Domain A: snapshot+SSE  │
                    │  Signaling:              │
                    │   - join/leave (cap 100) │
                    │   - coarse positions     │
                    │   - AOI neighbor sets    │
                    │   - SDP / ICE exchange   │
                    └────────────┬─────────────┘
                                 │
     sid population ≤ 100        │  not a pose bus
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
   Client A                 Client B                 Client C
   degree ≤16               degree ≤16               degree ≤16
        │                        │                        │
        └──── WebRTC ◄───────────┴───────────► WebRTC ───┘
              only to AOI neighbors (Yjs updates)
```

Full mesh among all 100 is **forbidden** by this lock. Topology is **dynamic AOI subgraph**.

### Area of interest (AOI)

**Purpose:** pick ≤16 peers that matter for what this client renders.

**Suggested v1 rule (implementable, tunable):**

1. Signaling maintains a membership roster for the `sid` (≤100), each with a **coarse** position (cell or quantized x,y) updated infrequently (e.g. on cell change or ≤1 Hz) — **not** the 15–20 Hz pose stream.
2. Each client (or host helper) ranks other members by distance in world space (and optionally same stage: overworld / space / amenity).
3. Take the closest **`GEOGRAPHY_MESH_DEGREE_MAX` (16)** as the neighbor set.
4. Open WebRTC + Yjs sync only to that set; tear down links that leave the set (with hysteresis to avoid flapping).

**Hysteresis:** require a peer to stay outside AOI for a short grace (e.g. 2–3 s) before disconnect; require enter for one tick before connect. Prevents mesh thrash at boundaries.

**Coarse position on host:** allowed for neighbor computation only. It is **not** a substitute for Yjs poses and must not reintroduce 30s-style LWW as the render path for AOI neighbors.

### Signaling (server allowed)

- Authenticate node identity / session membership for `sid`
- Enforce **100** cap on geography join
- Announce join/leave; distribute or compute AOI neighbor sets
- Exchange WebRTC offers/answers/ICE **between a client and its ≤16 neighbors**
- **Must not** forward continuous high-rate pose payloads as the primary sync path

### Data plane (peers only)

- Encoded Yjs updates and awareness travel on **RTCDataChannel** to current neighbors
- New AOI neighbor: connect → CRDT catch-up → live `observe`
- Neighbor leaves AOI: remove remote sprite (or freeze briefly), close channel, drop their entries from the *local view* (doc strategy below)

### Y.Doc strategy under AOI

Two acceptable approaches — pick one in implementation and stick to it:

| Approach | Behavior |
|----------|----------|
| **A — Neighborhood doc view (preferred v1)** | Each client’s relevant state is the Yjs updates received from current neighbors + self. Far humans are absent from the local render set. Simple; matches “see who is near.” |
| **B — Single logical room doc** | Harder with partial mesh (partitions). Avoid in v1 unless using CRDT gossip carefully. |

**v1 lock: Approach A.** You see and sync with AOI neighbors only. Global “every human on one Y.Doc” is not required for the 100 target.

### Mesh membership

- Only clients with `worldGeographyEnabled` join geography membership
- Local human id on the wire: `getMainNodeIdForIntercom()` (same as today)
- Leave on toggle-off, tab close, or `sid` change; delete own key among neighbors; unregister

## How the multiplayer loop works

### Happy path (in AOI)

```text
Player A input (frame N)
  → yDoc.transact(() => pose fields for A)
  → local Pixi reads A                    // immediate
  → send encoded update on ≤16 data channels
  → Neighbor B applyUpdate
  → B’s Pixi reads A                      // ~1 peer RTT
```

No `POST /geography` on the hot path. No Redis pose upsert. No 30s bucket. No WebSocket pose relay.

### Suggested publish policy (client)

- Emit when position delta exceeds a threshold **or** facing / `isMoving` changes
- Cap **15–20 Hz** while moving; silence when idle
- Separately, publish **coarse** cell/position to signaling ≤1 Hz (or on cell change) for AOI ranking
- Render locally at display refresh

## Proposed pose fields (per human)

Same payload shape whether nested in a local Y.Map or per-neighbor sync unit:

```text
{
  id: humanId          // main node id on the wire
  name: string
  x: number
  y: number
  facing: "left" | "right"
  isMoving: boolean
  stage?: "overworld" | "space" | "amenity"
  revisedAt: number    // UI / stale heuristics only
}
```

**Stable key bridge:** `human:{humanId}` for UI naming. Durable Merkle **does not** include geography.

### Encoding notes

- Nested `Y.Map` fields; `x`/`y` as LWW primitives (“latest pose wins”)
- Do **not** append infinite breadcrumbs
- Prefer small binary updates; no full roster snapshot on every move

## Authority boundaries (non-negotiable)

| Concern | Owner | Why |
|---------|--------|-----|
| Human pose (AOI) | **Yjs over WebRTC neighbors** | High frequency |
| Coarse position for AOI | **Signaling (host)** | Neighbor selection only |
| Cap 100 / degree 16 | **Host + client enforce** | Protect browsers and uplink |
| Agents, spaces, economy | **Redis snapshot + mutations** | Ledger truth |
| Human→agent proximity | **Server validates** | Policy / billing |
| Human→human interaction | **Still policy-gated** | Unchanged occupant policy |
| Mesh join | **Host authn** | Entitled peers only |

**Rule:** economy and scanner truth stay off Yjs. On-screen nearby avatars stay on the mesh.

## Latency budget — before vs after

| Path | Today | Locked AOI mesh |
|------|--------|-----------------|
| See **self** move | ~0 | ~0 (local Y.Doc) |
| Nearby peer sees **you** | ~0–30s + HTTP + Redis + SSE | ~1 **peer** RTT (degree ≤16) |
| Far peer (outside AOI) | Same 30s sample if any | **Not in realtime set** (v1) |
| Population per `sid` | Unbounded / unclear | **≤ 100** |
| Server role per pose | Upsert + fanout | **No pose relay** — signaling + coarse AOI only |

## Client integration sketch

1. Enable geography → join signaling roster for `sid` (fail if at 100).
2. Publish coarse position; receive neighbor set (≤16).
3. Maintain WebRTC + Yjs links to that set only; reconcile on AOI updates.
4. Bind local human id; input loop updates local pose; render `__human__` locally.
5. `observe` neighbor updates → remote sprites (`applyWorldGeographyOccupants` ideas).
6. Disable / unload → teardown links, unregister, clear remotes.
7. Domain A SSE unchanged.

## Server integration sketch

- **Remove hot path:** throttled `POST /api/agent-play/geography` pose upserts.
- **Add:** geography membership (cap 100), coarse position intake, AOI neighbor computation or distribution, SDP/ICE between client↔neighbor pairs.
- **Do not add:** application-level Yjs room that rebroadcasts all poses to all 100.
- **Keep:** durable snapshot, scanner, economy, agent leases.
- **Optional:** analytics on population counts / join rejects at cap.

## Risks and honest limits

1. **CRDT ≠ anti-cheat.** Fake `x,y` still possible in social overworld.
2. **AOI partitions.** Two clusters far apart do not share poses — by design. Players walking toward each other get continuity via hysteresis + catch-up on connect.
3. **Mesh churn.** Fast travel across dense crowds stresses connect/disconnect — hysteresis and degree cap are mandatory.
4. **NAT / firewalls.** Use ICE + **TURN** for connectivity. TURN is not an app-level Yjs server. If WebRTC fails: local-only / “can’t see others” — **no silent pose relay**.
5. **Dense hotspots.** If &gt;16 humans pile in one cell, farthest are dropped from mesh until someone leaves — document in UI (“showing nearest 16”).
6. **Map LWW rubber-banding:** client interpolation / light velocity.
7. **Security:** authn on signaling; cannot join arbitrary `sid` meshes.
8. **No wallets / sold-state in Yjs.**

## Success metrics

| Metric | Target |
|--------|--------|
| Geography population supported per `sid` | **100** concurrent |
| WebRTC data channels per client | **≤ 16** |
| Local input → local render | Same frame (≤16 ms at 60 Hz) |
| Median neighbor visibility of your new cell | &lt; 50 ms typical good WAN WebRTC |
| Geography HTTP pose POSTs while moving | → 0 |
| Application-level pose relay on host | → 0 |
| Durable `snapshotRev` from walking | 0 |
| Remote 30s teleports (for AOI neighbors) | Gone |

## Non-goals (locked)

- Full mesh among all 100 participants
- `y-websocket` / host WebSocket as **primary** geography sync
- Phased “ship relay first”
- SFU as v1 requirement (reopen only if AOI degree 16 fails load tests at 100)
- Replacing Redis snapshot / Merkle with a Y.Doc
- On-chain pose sync
- Human↔human combat / inventory via CRDT
- Server-side human physics
- Guaranteeing every participant sees all 99 others in realtime

## Rollout checklist

1. Spike: 3 browsers, AOI of 2 neighbors each, signaling + WebRTC + poses — zero Redis geography writes.
2. Feature-flag beside `worldGeographyEnabled`.
3. Enforce **100** join cap and **16** degree; UI for cap and “nearest 16.”
4. Load-test **100** members with clustered and spread layouts; measure CPU, channels, AOI churn.
5. TURN for NAT; confirm host never decodes Yjs pose updates.
6. Auth signaling; failure UI when WebRTC cannot connect.
7. Remove or archive the 30s Redis geography publisher once stable.

## Summary

**Today:** geography is Redis LWW sampled ~every 30s over HTTP/SSE.

**Locked proposal:** Domain A stays server-authoritative. Domain B is **Yjs over an AOI WebRTC peer mesh**: **100** humans per `sid`, **≤16** realtime neighbors per client, host limited to **signaling + coarse AOI**. That is how we get near-zero-latency multiplayer where it matters (nearby) without a 100-way full mesh or a pose relay.
