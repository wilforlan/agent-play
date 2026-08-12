# `@agent-play/geography-mesh`

Shared **constants**, **Zod wire schemas**, **AOI neighbor selection**, and **Yjs pose helpers** for Agent Play world geography — the peer-mesh presence layer for humans on the overworld.

This package is the reusable core used by `@agent-play/play-ui` and the web host. It does **not** open WebRTC sockets itself; clients and hosts compose transport on top of these helpers.

Full design lock: [Yjs world geography multiplayer](../../docs/notes/yjs-world-geography-multiplayer.md).  
Integrator guide: [Geography mesh docs](../../docs/geography-mesh.md).

## Install

```bash
npm install @agent-play/geography-mesh
```

Peer runtime deps are declared normally (`yjs`, `zod`, `lib0`, `y-protocols`).

## What it provides

| Export area | Purpose |
|-------------|---------|
| **Constants** | Cap **100** members / `sid`, mesh degree **≤16**, pose Hz caps, SSE event names |
| **Schemas** | Zod parsers for membership, coarse pose, neighbors, and WebRTC signal bodies |
| **`selectAoiNeighbors`** | Pick ≤16 nearby peers with stage preference + hysteresis |
| **`shouldPublishPose`** | Throttle pose fanout (distance / facing / moving / Hz) |
| **Yjs helpers** | Read/write/remove poses on a shared `Y.Doc` geography map |

## Quick start

```ts
import * as Y from "yjs";
import {
  GEOGRAPHY_MEMBER_CAP,
  GEOGRAPHY_MESH_DEGREE_MAX,
  applyPoseToGeographyMap,
  readPoseFromGeographyMap,
  selectAoiNeighbors,
  shouldPublishPose,
  GeographyPoseSchema,
} from "@agent-play/geography-mesh";

const doc = new Y.Doc();
const pose = GeographyPoseSchema.parse({
  id: "human-a",
  name: "Ada",
  x: 12.5,
  y: 8.0,
  facing: "right",
  isMoving: true,
});

applyPoseToGeographyMap(doc, pose);
const local = readPoseFromGeographyMap(doc, "human-a");

const neighbors = selectAoiNeighbors({
  selfId: "human-a",
  selfPos: { x: pose.x, y: pose.y },
  selfStage: "overworld",
  members: [
    { humanId: "human-a", x: pose.x, y: pose.y, stage: "overworld" },
    { humanId: "human-b", x: 13, y: 8.2, stage: "overworld" },
  ],
  degreeMax: GEOGRAPHY_MESH_DEGREE_MAX,
  nowMs: Date.now(),
});

const decision = shouldPublishPose({
  previous: null,
  next: pose,
  nowMs: Date.now(),
  lastPublishMs: null,
});

console.log({
  cap: GEOGRAPHY_MEMBER_CAP,
  neighborIds: neighbors.neighborIds,
  shouldPublish: decision.shouldPublish,
  local,
});
```

## Host vs client roles

| Layer | Responsibility |
|-------|----------------|
| **This package** | Pure selection, schemas, Yjs map mutations |
| **Host (`web-ui`)** | Membership join/leave (cap 100), coarse AOI hints, SDP/ICE signal relay over HTTP/SSE |
| **Client (`play-ui`)** | `GeographyMeshSession`: WebRTC data channels to ≤16 AOI neighbors, apply Yjs updates, render remote pawns |

Pose bytes stay on the peer mesh. The host does **not** relay continuous pose streams.

## Publish

Included in the monorepo publish chain (before `@agent-play/play-ui`):

```bash
npm run publish:packages -- --packages geography-mesh
```

See [npm & CI](../../docs/npm-and-ci.md).
