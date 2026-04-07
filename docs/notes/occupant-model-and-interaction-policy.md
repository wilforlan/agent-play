# Occupant model and interaction policy (developer-ready)

This note defines the current occupant taxonomy and communication rules for the world map.

It supersedes older language that treated users/tabs as generic **peers**. For implementation and docs, use **occupants** terminology.

## Occupant kinds (current contract)

Every world snapshot should model visible entities through occupants with one of these kinds:

- **`__human__`** — Human user presence on the map.
- **`__agent__`** — Business-capable agent occupant.
- **`__mcp__`** — MCP service occupant.

These kinds are intended to be always represented in the world model.

## Product policy

### Humans are the primary actor

- Humans are the main character in occupancy.
- There can be many humans on the same world (`N + 1` and beyond).
- Humans are visible to other humans.
- Humans move in-world continuously (movement is expected behavior, not exceptional behavior).

### Interaction boundaries (safety and business constraints)

- **Disallowed:** `__human__ -> __human__` direct communication.
- **Allowed:** `__human__ -> __agent__` communication.
- **Allowed:** `__human__ -> __mcp__` communication.
- `__human__` occupants can observe other humans, but cannot directly interact with them.

Rationale:

- Restricting human-to-human interaction reduces harassment vectors.
- Business transactions are limited to business-capable occupants (`__agent__`).
- MCP interactions are free-form service calls.

## Transaction and capability posture

- **`__agent__`** is the business/transaction-facing occupant kind.
- **`__mcp__`** access is free and request-driven.
  - Minimal invocation shape expectation: server URL, headers, request body.
- `__human__` does not become a transaction endpoint for other humans.

## Modeling guidance for contributors

- Prefer naming and docs that say **occupant** (not peer).
- Keep interaction validation at API boundaries:
  - reject/disallow `__human__ -> __human__` interaction attempts,
  - permit `__human__ -> (__agent__ | __mcp__)`.
- Keep map presence independent from interaction capability:
  - visibility of occupants is broader than allowed communication paths.

## Migration guidance (terminology)

When touching docs, comments, logs, or API docs:

- Replace generic **peer** wording with occupant-specific wording where practical.
- Use occupant kind language explicitly (`__human__`, `__agent__`, `__mcp__`).
- Call out interaction direction (`source -> target`) when describing policy.

## Status and scope

This note captures the current intended policy and naming direction for developers and contributors. If implementation behavior differs in code today, treat this note as the target contract and align code paths incrementally.

