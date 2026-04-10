# SDK update (2026-04-09)

This note defines the **target SDK and platform contract** for credentials-backed `RemotePlayWorld`, **network node validation**, **event taxonomies**, and the **`addAgent` / `addPlayer` split**. It is implementation guidance for `@agent-play/sdk`, `packages/agents`, `web-ui` server, and examples. It does not replace shipping docs until the work lands.

---

## 1. Network node validation strategy

- **Prefer server truth** for identity checks: after loading credentials locally, call **`POST /api/nodes/validate`** with `{ nodeId, rootKey, mainNodeId? }` and authenticated headers (`x-node-id` / `x-node-passw` as today) so validation matches Redis-backed `validateNodeIdentity`.
- **Local checks** (derivation only) may run first for fast failure without network; **network validation** is the authoritative success path for “this SDK session matches the server’s account.”
- Align with CLI **`validate-main-node`** / **`validate-agent-node`** semantics and **`docs/notes/node-id-v1-migration.md`**.

---

## 2. Credentials file and `RemotePlayWorld` auth material

- Load **`credentials.json`** (default path `~/.agent-play/credentials.json`, override via **`AGENT_PLAY_CREDENTIALS_PATH`** or constructor option).
- **`passw`** in the file is the **human-readable phrase**; material sent on the wire and compared server-side is **`hashNodePassword(passw)`** (see Node ID v1).

### Internal field naming (SDK)

- In **`RemotePlayWorld`**, store **`hashedPassword`** (hex) derived from credentials `passw`, **not** a misleading `password` name for raw phrase.
- **`this.mainNodeId`** (or equivalent) comes from **`credentials.nodeId`** after validation, or from **`deriveNodeIdFromPassword({ password: hashedPassword, rootKey })`** when it must match file.
- **Do not** persist raw passphrase on the class except where explicitly needed for display in dev tools (prefer never).

---

## 3. Deprecations (SDK)

Mark deprecated and remove in a later major release:

| Deprecated | Replacement |
|------------|-------------|
| **`secretFilePath`** option | **`credentialsPath`** + default path, or env `AGENT_PLAY_CREDENTIALS_PATH` |
| **`readFileSync` secret buffer** for auth | Credentials JSON + `hashNodePassword` |
| **`derivePasswordFromSecret`** for `RemotePlayWorld` auth | `hashNodePassword(credentials.passw)` + `deriveNodeIdFromPassword` where needed |
| Docs / examples referencing “secret file” for login | CLI bootstrap + `credentials.json` |

Keep **`derivePasswordFromSecret`** in **`@agent-play/node-tools`** only if non-SDK flows still need it; SDK examples must not use it for node login.

---

## 4. Session events (define)

**Session events** concern the **HTTP/SDK session** (`sid`), connection lifecycle, and transport—not a single occupant row.

| Concept | Examples |
|--------|----------|
| Session acquired | `session:connected` — `sid` assigned after `GET /api/agent-play/session` succeeds |
| Session invalid / expired | `session:invalid` — RPC returns 401/403 or missing `sid` |
| Session closed | `session:closed` — client `close()` or explicit teardown |
| Transport | `session:sse_open` / `session:sse_error` (optional) for SSE subscription state |

Emit these from **`RemotePlayWorld`** via optional callbacks or a small `EventEmitter`-like API so integrations can log without mixing with world occupancy.

**Existing server-side** names (`world:*`) remain for **world** fanout; **session** names should be distinct (prefix `session:`) to avoid collisions.

---

## 5. Player events (define)

**Player events** concern **occupants / players** on the world map and their interactions: visible to all occupants per Occupant Model v1.

| Constant / name | Meaning |
|-----------------|--------|
| **`world:player_added`** | A player/occupant was added (existing `PLAYER_ADDED_EVENT` in `packages/sdk/src/world-events.ts`) |
| **`world:interaction`** | Chat/interaction line (`WORLD_INTERACTION_EVENT`) |
| **`world:agent_signal`** | Zone/yield/assist/metadata (`WORLD_AGENT_SIGNAL_EVENT`) |
| **`world:journey`** | Journey updates (`WORLD_JOURNEY_EVENT`) |

**Distinction:** **Session events** = client↔server session; **Player events** = world state and chat/signals. Document both in SDK TypeDoc and wire **`RemotePlayWorld.subscribeWorldState`** / future listeners so they can filter by category.

---

## 6. `addAgent` vs `addPlayer` (semantic split)

| API | Intended caller | Behavior |
|-----|-----------------|----------|
| **`addAgent`** | SDK integrations, **`packages/agents`**, automation | Registers an **agent** tied to **node identity** (main + agent node credentials); attaches LangChain tools; **not** the same as “spawn a human-controllable avatar” for a game. |
| **`addPlayer`** | Game developers | Adds a **controllable player** on the world, **visible to all occupants** (per product rules); used for playable characters / human-driven slots. |

**Migration:** Introduce **`addAgent`** on **`RemotePlayWorld`** (and parallel server-side entry if today everything goes through `addPlayer`). **Deprecate** using **`addPlayer`** for SDK/agent examples; replace with **`addAgent`** in:

- `packages/sdk/examples/*`
- `packages/agents` (all call sites)
- **Web UI** server (`PlayWorld` / RPC handlers) — route agent registration through **`addAgent`** internally, keep **`addPlayer`** for game-facing map slots.

Exact names on the server (`playWorld.addAgent` vs RPC op `addAgent`) should mirror `addPlayer` for consistency.

---

## 7. SDK examples: include field for the agent

- Every example that registers an agent must expose **`agentId`** (and **`mainNodeId`** / **`password`** where required) **explicitly** in the example config object or top-level constants so readers see the shape without reading `PlayWorld` internals.
- Prefer a single **`exampleAgent`** or **`agents[]`** block in the file header or `const config = { … }` with `agentId`, `name`, `toolNames`.

---

## 8. Rollout checklist (implementation order)

1. **Credentials loader + validation** in SDK (network + local); **hashedPassword** + rename internal fields.
2. **`RemotePlayWorld`**: remove secret-file path; wire **`x-node-id` / `x-node-passw`** from credentials.
3. **Session vs player** event types exported and documented; optional `onSessionEvent` / narrow `onPlayerEvent`.
4. **`addAgent`** + server `addAgent`; migrate **`packages/agents`** and examples; **deprecate** `addPlayer` for those paths.
5. **Web-ui** `PlayWorld`: internal rename/split; **RPC** `addAgent` if needed.
6. **Docs**: `docs/sdk.md`, main READMEs, migration note from `secretFilePath`.

---

## 9. Related files (starting points)

| Area | Path |
|------|------|
| Remote client | `packages/sdk/src/lib/remote-play-world.ts` |
| World event constants | `packages/sdk/src/world-events.ts` |
| Server world | `packages/web-ui/src/server/agent-play/play-world.ts` |
| Node validation API | `packages/web-ui/src/app/api/nodes/validate/route.ts` |
| Node ID v1 | `docs/notes/node-id-v1-migration.md` |

---

## 10. Status

**Partially implemented (2026-04-09+)** — in tree today:

- **`addAgent`** on **`RemotePlayWorld`** with **`nodeId`** (wired to server `agentId`); **`addPlayer`** deprecated alias; session lifecycle constants **`session:*`** and optional **`onSessionEvent`**.
- Examples and **`packages/agents`** use **`addAgent`**.

Still **planned**: credentials JSON + **`hashNodePassword`** replacing secret-file auth for **`RemotePlayWorld`**, **`POST /api/nodes/validate`** from the SDK, server **`PlayWorld.addAgent`** rename vs internal **`addPlayer`**, full TypeDoc pass.
