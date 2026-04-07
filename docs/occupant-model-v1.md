# Occupant Model v1

Occupant Model v1 defines how the shared world is represented and how communication flows across all clients (SDK and web-ui) as the world changes.

This document is written as a developer contract and an implementation story: why this model exists, what it guarantees, and how it enables a durable communication infrastructure.

## Why this model exists

Agent Play is moving from ad hoc "peer" language to a concrete occupancy model. The goal is to make world state and world communication predictable at scale:

- one canonical world snapshot shape,
- one fanout path for updates,
- one incremental sync strategy for clients,
- one policy layer for allowed interactions.

Occupants are the unit of presence, visibility, and synchronization.

## Occupant kinds (v1)

The world supports three occupant kinds:

- **`human`** — user presence in the world.
- **`agent`** — business-capable automated actor.
- **`mcp`** — external capability/service endpoint.

The world can contain many occupants of each kind. Humans are first-class occupants and are always modeled explicitly in world state.

## Interaction policy (v1)

Communication policy is directional and role-aware:

- **disallowed:** `human -> human`
- **allowed:** `human -> agent`
- **allowed:** `human -> mcp`

Humans can see other humans, but cannot directly interact with them. This keeps social presence while reducing harassment vectors and preserving business/automation pathways.

## Story: from world mutation to every client

When any world interaction changes state, the system follows a single end-to-end path:

1. A mutation is applied against canonical snapshot state (`worldMap.occupants`, bounds, metadata).
2. Snapshot persistence increments revision metadata and recomputes player-chain Merkle state.
3. Fanout is published with world event payloads plus chain metadata.
4. Connected clients receive events through SSE transport.
5. Clients either:
   - refresh with full `getWorldSnapshot`, or
   - apply incremental updates using `playerChainNotify` + `getPlayerChainNode`.

This is the core infrastructure guarantee: all clients converge on the same occupancy state from the same event stream.

## Player-chain (Merkle) role in Occupant Model v1

Player-chain is the integrity and convergence layer for occupant state:

- leaves are built from canonical world components (genesis, header, occupants),
- each occupant has a stable key for deterministic ordering,
- diffs are transported as lightweight node references (`playerChainNotify`),
- full row payloads are fetched on demand (`getPlayerChainNode`) and merged client-side.

Result: low fanout payload size, deterministic merge order, and consistent state across SDK and browser clients.

## Client definition

In this project, "client" means any runtime consuming world updates:

- SDK clients (`@agent-play/sdk`, including server-side agent processes),
- web-ui clients (watch UI sessions/tabs).

Occupant Model v1 is designed so both client classes consume the same world semantics and synchronization protocol.

## Developer implementation guidance

- Prefer **occupant** terminology in code/docs over "peer".
- Keep world state changes routed through canonical snapshot mutation + fanout.
- Preserve interaction policy checks at API and world-domain boundaries.
- Treat `playerChainNotify` + node RPC merge as the primary incremental sync path.
- Keep type unions and parser logic aligned between server and SDK for all occupant kinds.

## Backward-compatibility notes

Older docs and comments may still reference "peers." Treat those as legacy phrasing. New features and refactors should align with Occupant Model v1 semantics.

## Related docs

- [World map v3](updates-world-map-v3.md)
- [Events, SSE, and remote API](events-sse-and-remote.md)
- [SDK guide](sdk.md)
- [Agent Play world model and player chain (deep note)](notes/agent-play-world-model-and-player-chain.md)
- [Occupant model and interaction policy note](notes/occupant-model-and-interaction-policy.md)

