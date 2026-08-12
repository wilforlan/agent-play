# Geography mesh (`@agent-play/geography-mesh`)

**Package:** [`packages/geography-mesh`](../packages/geography-mesh) → npm **`@agent-play/geography-mesh`**  
**Related design note:** [Yjs world geography multiplayer](notes/yjs-world-geography-multiplayer.md)  
**In-product client:** `GeographyMeshSession` in `@agent-play/play-ui`  
**Host APIs:** `POST /api/agent-play/geography/{membership,coarse,signal}`

## Why this package exists

Agent Play’s durable world (agents, spaces, amenities, wallets) stays **server-authoritative** over Redis + SSE. Human **world geography** — walking presence on the overworld — needs much lower latency than a ~30s Redis sample.

`@agent-play/geography-mesh` is the shared library for that **Domain B** layer:

- Up to **100** humans per session (`sid`)
- Each client meshes with at most **16** nearby peers (AOI)
- Poses sync via **Yjs** over **WebRTC data channels**
- The host only does **membership, coarse positions, and signaling** — not continuous pose relay

## Install

```bash
npm install @agent-play/geography-mesh
```

From this monorepo:

```bash
npm run build:geography-mesh
```

## Architecture (short)

```text
┌──────────────────────────────────────────────────────────┐
│ Domain A — Durable world (unchanged)                     │
│ Redis snapshot + SSE + player chain                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Domain B — World geography                               │
│                                                          │
│  @agent-play/geography-mesh                              │
│    constants · Zod schemas · AOI select · Yjs pose map   │
│                                                          │
│  Host: join/leave (cap 100), coarse AOI, SDP/ICE signal  │
│  Client: WebRTC ≤16 neighbors, Y.Doc merge, render       │
└──────────────────────────────────────────────────────────┘
```

| Concern | Owner |
|---------|--------|
| Cap, degree, Hz, event name constants | `geography-mesh` |
| Membership / coarse / signal HTTP + SSE | `web-ui` |
| Opening peer links + applying remote poses | `play-ui` (`GeographyMeshSession`) |
| Feature default | `worldGeographyEnabled: true` in preview view settings |

## How AOI neighbor selection works

`selectAoiNeighbors` ranks other members by:

1. **Same stage** preferred (overworld / space / amenity)
2. **Distance** (closer first)
3. Stable **id** tie-break

It returns at most `GEOGRAPHY_MESH_DEGREE_MAX` (16) ids, with **hysteresis** so neighbors do not flap every frame when someone hovers near the cutoff.

```ts
import { selectAoiNeighbors, GEOGRAPHY_MESH_DEGREE_MAX } from "@agent-play/geography-mesh";

const selection = selectAoiNeighbors({
  selfId: "me",
  selfPos: { x: 10, y: 4 },
  selfStage: "overworld",
  members: [
    { humanId: "me", x: 10, y: 4, stage: "overworld" },
    { humanId: "near", x: 10.5, y: 4.1, stage: "overworld" },
    { humanId: "far", x: 80, y: 80, stage: "overworld" },
  ],
  degreeMax: GEOGRAPHY_MESH_DEGREE_MAX,
  nowMs: performance.now(),
  previous: undefined,
});

// selection.neighborIds — who to keep WebRTC links to
// selection.truncated — true if more candidates existed than degreeMax
```

Pass `previous` on subsequent ticks so enter/leave hysteresis can apply.

## How pose publish throttling works

`shouldPublishPose` decides whether a local pose should go out on the mesh:

- Always publish the **first** sample
- Respect **max Hz** (`GEOGRAPHY_POSE_PUBLISH_MAX_HZ`, default 20)
- Publish on **facing** or **isMoving** flips
- Publish when position moves at least **minDistance** (default `0.05` world units)

```ts
import { shouldPublishPose } from "@agent-play/geography-mesh";

const decision = shouldPublishPose({
  previous: lastPose,
  next: nextPose,
  nowMs: performance.now(),
  lastPublishMs,
});

if (decision.shouldPublish) {
  // write local Y.Doc + send update on data channels
}
```

## How Yjs pose storage works

Poses live under a root `Y.Map` keyed by `GEOGRAPHY_MAP_KEY` (`"geography"`). Each human id maps to a nested map of pose fields.

```ts
import * as Y from "yjs";
import {
  applyPoseToGeographyMap,
  readPoseFromGeographyMap,
  removePoseFromGeographyMap,
  listGeographyHumanIds,
  GeographyPoseSchema,
} from "@agent-play/geography-mesh";

const doc = new Y.Doc();
const pose = GeographyPoseSchema.parse({
  id: "node-abc",
  name: "Ada",
  x: 1,
  y: 2,
  facing: "left",
  isMoving: false,
  stage: "overworld",
});

applyPoseToGeographyMap(doc, pose);
readPoseFromGeographyMap(doc, pose.id);
listGeographyHumanIds(doc);
removePoseFromGeographyMap(doc, pose.id);
```

Clients typically:

1. Mutate the **local** doc immediately on input (local avatar feels instant)
2. Encode a Yjs update and send it only to **current AOI neighbors**
3. `Y.applyUpdate` remote bytes into the same doc and paint remote pawns

## Wire schemas (host APIs)

Zod schemas mirror the host JSON bodies. Import them at HTTP boundaries instead of hand-rolled validators:

| Schema | Typical use |
|--------|-------------|
| `GeographyMembershipBodySchema` | Join / leave membership |
| `GeographyCoarseBodySchema` | Coarse position for AOI hints |
| `GeographySignalBodySchema` | SDP / ICE signal relay |
| `GeographyNeighborsPayloadSchema` | Neighbor-set fanout payload |
| `GeographyPoseSchema` | Pose object shape |
| `GeographyMemberSchema` | Membership roster row |

Event name constants for SSE:

- `WORLD_GEOGRAPHY_MEMBERSHIP_EVENT`
- `WORLD_GEOGRAPHY_NEIGHBORS_EVENT`
- `WORLD_GEOGRAPHY_SIGNAL_EVENT`

## Using it in a custom client

Minimum integration sketch:

1. **Join** — `POST …/geography/membership` with `{ humanId, action: "join", … }`. Respect cap **100**.
2. **Coarse** — Periodically `POST …/geography/coarse` with your position so the host can compute neighbor hints.
3. **Neighbors** — On neighbor SSE / response, open WebRTC data channels to the new set; close dropped peers carefully.
4. **Signal** — Exchange SDP/ICE via `POST …/geography/signal` (and the matching SSE event).
5. **Pose** — Keep a local `Y.Doc`; use `applyPoseToGeographyMap` + `shouldPublishPose`; send Yjs updates on channels; apply remote updates into the same doc.
6. **Leave** — Membership leave on unload / disable.

Agent Play’s reference client is `GeographyMeshSession` in play-ui. Prefer reusing that session when embedding the watch canvas; use this package directly when building a custom mesh client or host validator.

## Feature flag in the watch UI

Preview setting `worldGeographyEnabled` defaults to **on**. When enabled, the watch canvas starts the mesh after the world snapshot loads. When disabled, the older Redis ~30s geography path remains available as rollback.

## Publishing

`@agent-play/geography-mesh` is part of the npm publish workflow and `npm run publish:packages` chain, **before** `@agent-play/play-ui`:

```bash
npm run version:packages -- -w geography-mesh patch
npm run publish:packages -- --packages geography-mesh
```

See [npm & CI](npm-and-ci.md).

## Constants reference

| Constant | Value | Meaning |
|----------|-------|---------|
| `GEOGRAPHY_MEMBER_CAP` | `100` | Max geography humans per `sid` |
| `GEOGRAPHY_MESH_DEGREE_MAX` | `16` | Max WebRTC neighbors per client |
| `GEOGRAPHY_POSE_PUBLISH_MAX_HZ` | `20` | Pose publish rate cap |
| `GEOGRAPHY_COARSE_MAX_HZ` | `1` | Coarse host update rate guidance |
| `GEOGRAPHY_AOI_HYSTERESIS_MS` | `2500` | Neighbor enter/leave sticky window |
| `GEOGRAPHY_MAP_KEY` | `"geography"` | Root key on the `Y.Doc` |
