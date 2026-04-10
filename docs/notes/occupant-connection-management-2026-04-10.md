# Occupant Connection Management (2026-04-10)

This note documents the **lease + heartbeat** model introduced to manage agent occupants safely when agent processes disconnect, crash, or become unreachable.

## Why this change matters

Before this change, agents could remain in the world snapshot even after the runtime process disappeared. That created stale occupants and inconsistent world state.

The new model improves this by:

- **Preventing ghost occupants** with TTL-based leases.
- **Handling hard crashes** (no graceful shutdown required).
- **Supporting multi-instance deployments** because lease authority lives in Redis.
- **Reducing race risks** by binding lifecycle updates to a `connectionId`.
- **Keeping UX/state accurate** by removing stale agents automatically.

## High-level design

The system now uses three coordinated pieces:

1. **Lease creation on add**
   - When an agent is added, the server stores a presence lease with TTL.
2. **Heartbeat renewals**
   - The SDK refreshes the lease on an interval while the process is alive.
3. **Disconnect + stale sweeper**
   - On graceful close, SDK calls disconnect.
   - If no heartbeat arrives, server sweeper removes stale agent occupants.

## Data model and keys

Presence leases are stored per player in Redis:

- Key: `agent-play:{hostId}:presence:{playerId}`
- Stored fields:
  - `playerId`
  - `agentId`
  - `sid`
  - `connectionId`
  - `lastSeenAt`
- TTL: provided by client (`leaseTtlSeconds`), defaulting to server/sdk conventions.

## Server-side contract

`SessionStore` now includes presence operations:

- `upsertPresenceLease(...)`
- `touchPresenceLease(...)`
- `removePresenceLease(...)`
- `hasPresenceLease(...)`
- `listPresenceLeases()`

Implemented in:

- `RedisSessionStore` (production Redis-backed behavior)
- `TestSessionStore` (test double behavior)

## API updates

### `POST /api/agent-play/players`

Request additions:

- `connectionId` (string)
- `leaseTtlSeconds` (number)

Response additions:

- `connectionId`
- `leaseTtlSeconds`

### `POST /api/agent-play/players/heartbeat?sid=...`

Body:

- `playerId`
- `connectionId`
- optional `leaseTtlSeconds`

Behavior:

- Validates session.
- Validates lease ownership by `connectionId`.
- Extends TTL / updates `lastSeenAt`.

### `POST /api/agent-play/players/disconnect?sid=...`

Body:

- `playerId`
- `connectionId`

Behavior:

- Validates session and ownership.
- Removes lease.
- Removes occupant from world.

## PlayWorld lifecycle updates

`PlayWorld` now:

- accepts `connectionId` and `leaseTtlSeconds` in `addPlayer`.
- writes lease on successful registration.
- exposes:
  - `heartbeatPlayerConnection(...)`
  - `disconnectPlayerConnection(...)`
- removes lease inside `removePlayer(...)`.
- runs a periodic stale sweep:
  - scans agent occupants
  - checks active lease presence
  - removes occupants with missing leases

## SDK lifecycle updates

`RemotePlayWorld.addAgent(...)` now:

- generates a `connectionId`.
- sends `connectionId` + `leaseTtlSeconds` to `/players`.
- stores connection metadata on success.
- starts periodic heartbeat calls.

`RemotePlayWorld.close()` now:

- clears heartbeat timers.
- best-effort calls `/players/disconnect` for tracked players.

`RegisteredPlayer` includes optional:

- `connectionId`
- `leaseTtlSeconds`

## Operational guidance

- Keep heartbeat interval comfortably below lease TTL.
- Use disconnect endpoint for graceful shutdown, but rely on TTL for crash safety.
- Monitor stale-removal counts to detect networking/runtime instability.
- Keep `connectionId` checks strict to avoid stale-process interference.

## Testing coverage

Coverage was added for:

- lease expiry removing occupant.
- heartbeat preserving occupant.
- SDK heartbeat loop behavior.
- SDK disconnect on close behavior.

This provides confidence that both graceful and ungraceful disconnect paths are handled.
