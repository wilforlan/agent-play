# User session management (2026-04-08)

This note describes how **session identity** and **durable world state** work in Agent Play after the server-side session and single-snapshot rework.

## Server-generated session id (`sid`)

- The session id is generated on the **server side** by the session store (`loadOrCreateSessionId`), cached in the store, and exposed via `getSessionId`.
- `PlayWorld.getSessionId()` is obsolete and removed; server callers read `sid` from `SessionStore`.
- Session validation for request `sid` is still done via `validateAgentPlaySession` / `SessionStore.isValidSession`.

## Sessions are not coupled to world snapshot identity

- The world snapshot is now a **single canonical snapshot** and is no longer session-scoped.
- Snapshot `sid` is set to the **root key / main node id** (`playerChainGenesis`) at initialization time.
- Request/session `sid` and world snapshot identity are separate concerns:
  - request/session `sid` -> session authorization and SSE access control
  - world snapshot -> global world state

## Redis-only session storage

- `MemorySessionStore` has been removed from runtime paths. Local development **requires `REDIS_URL`**.
- **`loadSessionStore`** in `session-store-loader.ts` returns the default **`RedisSessionStore`**. You can inject a different implementation by calling **`setSessionStoreFactory`** with a factory that returns any object satisfying **`SessionStore`** (same contract as today’s hooks and `PlayWorld`).

## Startup world initialization

- On `PlayWorld.start()`:
  1. Load/create server session id in the store.
  2. **Delete existing world snapshot data** from the store.
  3. Initialize a fresh single world snapshot from root key/main node id.
- This ensures deterministic boot semantics: if snapshot exists, reset it; if not, create it.

## Files (starting points)

| Concern | Location |
|--------|----------|
| `SessionStore` contract | `packages/web-ui/src/server/agent-play/session-store.ts` |
| Default loader / injection | `packages/web-ui/src/server/agent-play/session-store-loader.ts` |
| Redis implementation | `packages/web-ui/src/server/agent-play/redis-session-store.ts` |
| Singleton wiring | `packages/web-ui/src/server/get-world.ts` |
| Test-only in-memory double | `packages/web-ui/src/server/agent-play/session-store.test-double.ts` |

## SDK note

The **Node SDK** `RemotePlayWorld` still exposes **`getSessionId()`** for the client’s **remote** session id returned from `connect()`; that is separate from **server** `PlayWorld` (which no longer has `getSessionId()`). Naming alignment may be refined in a later SDK revision.
