# Occupant model and interaction policy (developer-ready)

This note defines the current occupant taxonomy and communication rules for the world map.

It supersedes older language that treated users/tabs as generic **peers**. For implementation and docs, use **occupants** terminology.

## Occupant kinds (current contract)

Every world snapshot should model visible entities through occupants with one of these kinds:

- **`__human__`** — Human user presence on the map.
- **`__agent__`** — Business-capable agent occupant.
- **`arcade`** — Game cabinet structures on Maple Ave (`gameId` on `kind: "structure"` occupants in `zone-arcade-strip`).

Legacy snapshots may still list deprecated `mcp` occupants; new worlds use arcade cabinets instead.

These kinds are intended to be always represented in the world model.

## Product policy

### Humans are the primary actor

- Humans are the main character in occupancy.
- There can be many humans on the same world (`N + 1` and beyond).
- Humans are visible to other humans.
- Humans move in-world continuously (movement is expected behavior, not exceptional behavior).

### Interaction boundaries (safety and business constraints)

- **Disallowed:** `__human__ -> __human__` chat, assist, or other text/PTT paths (still rejected by `recordProximityAction`).
- **Allowed:** `__human__ -> __agent__` communication.
- **Allowed:** `__human__` enters arcade game cabinets on Maple Ave (no external MCP required).
- **Allowed (narrow exception):** opt-in **proximity peer voice** via `peerCall*` APIs — callee must **Accept**; not routed through `recordProximityAction`.
- `__human__` occupants can observe other humans; text/chat H2H remains disallowed.

Rationale:

- Restricting human-to-human chat/assist reduces harassment vectors.
- Opt-in Accept for peer voice keeps the exception scoped and revocable (mute/block tooling still deferred).
- Business transactions are limited to business-capable occupants (`__agent__`).
- MCP interactions are free-form service calls.

## Transaction and capability posture

- **`__agent__`** is the business/transaction-facing occupant kind.
- **Arcade cabinets** are entered via proximity (**A**) and settle PU through built-in session RPC (`applyGameOutcome`).
- `__human__` does not become a transaction endpoint for other humans.

## Modeling guidance for contributors

- Prefer naming and docs that say **occupant** (not peer).
- Keep interaction validation at API boundaries:
  - reject/disallow `__human__ -> __human__` interaction attempts,
  - permit `__human__ -> __agent__` and arcade cabinet entry on Maple Ave.
- Keep map presence independent from interaction capability:
  - visibility of occupants is broader than allowed communication paths.

## Migration guidance (terminology)

When touching docs, comments, logs, or API docs:

- Replace generic **peer** wording with occupant-specific wording where practical.
- Use occupant kind language explicitly (`__human__`, `__agent__`, arcade cabinets).
- Call out interaction direction (`source -> target`) when describing policy.

## Status and scope

This note captures the current intended policy and naming direction for developers and contributors. If implementation behavior differs in code today, treat this note as the target contract and align code paths incrementally.

