# User management system (current state)

This note documents the **current** user management system for developers. It covers authentication, session tokens, account API keys, agent ownership, runtime registration, and the main security boundaries.

It is intentionally definitive and implementation-oriented.

## System scope

The current user management model has two identity layers:

1. **Account identity** (email/password login, bearer token session)
2. **Runtime agent identity** (account-owned `agentId` + account API key used by SDK `addPlayer`)

World session identity (`sid`) is separate and is used to scope world mutations.

## Most important components (in priority order)

1. **Auth session store** (`auth-store.ts`, `auth-session.ts`)
   - Creates and validates bearer tokens.
   - Maps token -> `userId` in Redis with TTL.
   - Gates account-level API endpoints (`/api/agents`, `/api/agents/api-key`, `/api/auth/me`, MCP register).

2. **Agent repository** (`agent-repository.ts`, `redis-agent-repository.ts`, `in-memory-agent-repository.ts`)
   - Stores account-owned agents and account API key metadata.
   - Enforces ownership checks (`agent.userId === userId`) for management actions.
   - Verifies account API keys for runtime registration.

3. **PlayWorld ownership gate** (`play-world.ts` `addPlayer`)
   - Validates `apiKey` -> `userId` -> `agentId` ownership before an agent can join the world.
   - Prevents cross-account agent impersonation at runtime.

4. **Session validator for world RPC/mutations** (`session-validation.ts` + route-level checks)
   - Validates `sid` for routes that mutate world state.
   - Ensures runtime operations target an active session.

5. **API key crypto** (`api-key-crypto.ts`)
   - Uses `scrypt` + salt for stored key hash.
   - Uses constant-time comparison for verification.
   - Uses SHA-256 lookup index for keyed retrieval path.

## End-to-end flows (all steps)

### A) Account registration and login

1. Client calls `POST /api/auth/lookup` with email.
2. If new account: `POST /api/auth/register` with email, name, password.
3. If existing account: `POST /api/auth/login` with email, password.
4. Server creates session token (`createSession`) and returns bearer token.
5. Client stores token and sends `Authorization: Bearer <token>` on account routes.

### B) Account API key lifecycle

1. Authenticated user calls `POST /api/agents/api-key`.
2. Server verifies bearer token -> `userId`.
3. Repository creates one account API key (current limit: `MAX_API_KEYS_PER_ACCOUNT = 1`).
4. Plain key is returned once; only hash + lookup index are persisted.
5. `GET /api/agents/api-key` returns metadata (`hasKey`, `createdAt`) only.

### C) Agent record lifecycle (account-owned)

1. Authenticated user calls `POST /api/agents` with `name` and `toolNames`.
2. Repository creates account-owned `agentId` (`MAX_AGENTS_PER_ACCOUNT = 2`).
3. User lists via `GET /api/agents`.
4. User deletes via `DELETE /api/agents?id=...` (ownership check required).

### D) Runtime world registration (`addPlayer`)

1. SDK/browser calls `POST /api/agent-play/players?sid=...` with:
   - `agentId` (required)
   - `agent` registration (tool contract)
   - `apiKey` (required when repository is configured)
2. Route validates `sid` and calls `PlayWorld.addPlayer`.
3. `PlayWorld.addPlayer` verifies:
   - API key -> account `userId`
   - `agentId` exists
   - agent belongs to that `userId`
4. If valid, agent is added as world occupant and fanout is emitted.

### E) World mutation calls from SDK (`sdk/rpc`)

1. `getWorldSnapshot` and `getPlayerChainNode` use live session scope and do not require query `sid`.
2. Mutating ops (`recordInteraction`, `recordJourney`) require valid `sid`.
3. Route-level validation rejects missing/invalid `sid`.
4. `PlayWorld` applies mutation and publishes world fanout.

## Data model summary

- **Auth keys (Redis)**:
  - `auth:email:<normalized-email>` -> `userId`
  - `auth:user:<userId>` hash includes `passwordHash`
  - `auth:session:<token>` -> `userId` (TTL)

- **Agent/account keys (Redis)**:
  - `account:<userId>:apiKey` hash (`apiKeyHash`, `lookupIndex`, `createdAt`)
  - `lookup:<sha256(apiKey)>` -> `u:<userId>`
  - `agent:<agentId>` hash includes `userId`, name, toolNames, counters
  - `user:<userId>:agents` set of owned `agentId`s

## Security boundaries that currently work

1. **Password verification** uses hashed passwords (not plaintext).
2. **Session tokens** are random and time-bounded (30-day TTL).
3. **API keys** are not stored plaintext; verification uses `scrypt` + timing-safe compare.
4. **Ownership enforcement** blocks attaching another user’s agent with your API key.
5. **Route auth split** is explicit:
   - bearer token for account management endpoints,
   - `sid` for world session mutation endpoints.

## Potential security issues (current risk list)

1. **Long session TTL with no rotation/revocation endpoint**
   - Tokens are valid for 30 days.
   - There is no explicit logout/revoke API to invalidate active tokens server-side.
   - Risk: stolen bearer token has long replay window.

2. **Single API key per account, no key rotation workflow**
   - Operational friction encourages key reuse.
   - If key leaks, replacement path is limited and disruptive.

3. **No rate limiting on auth and key-sensitive routes**
   - `lookup`, `login`, `register`, and key-bearing calls can be brute-forced or abused.
   - Requires edge/API rate limiting to reduce credential-stuffing risk.

4. **No explicit CSRF strategy for browser-origin bearer usage**
   - Current model is bearer-header based, which is good for non-cookie auth.
   - If browser clients persist tokens insecurely, XSS becomes high impact.

5. **User enumeration signal in lookup flow**
   - `/api/auth/lookup` returns account existence.
   - Useful UX, but leaks registration state for arbitrary emails.

6. **No audited authorization policy layer**
   - Authorization checks are implemented in route handlers and world methods.
   - Works now, but policy is distributed across files and may drift as features grow.

## Developer checklist before touching user management

1. Preserve ownership checks (`apiKey -> userId -> agent.userId`) in runtime registration.
2. Preserve route-level auth checks (`Bearer` for account routes, `sid` for world mutation routes).
3. Never persist plaintext API keys or passwords.
4. Keep `getWorldSnapshot` / `getPlayerChainNode` semantics stable unless intentionally changing client contract.
5. Add tests for both success and explicit unauthorized/forbidden paths.

## Source map

- Auth/session: `packages/web-ui/src/server/auth-store.ts`, `auth-session.ts`
- Account/agent APIs: `packages/web-ui/src/app/api/auth/*`, `packages/web-ui/src/app/api/agents/*`
- Repository: `packages/web-ui/src/server/agent-play/*agent-repository*.ts`
- Runtime ownership gate: `packages/web-ui/src/server/agent-play/play-world.ts` (`addPlayer`)
- World session validation: `packages/web-ui/src/server/agent-play/session-validation.ts`
- SDK runtime caller: `packages/sdk/src/lib/remote-play-world.ts`

