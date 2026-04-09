# Node ID v1 migration (granular runbook)

This document is the **authoritative implementation map** for Node ID v1: root-key–scoped derivation, node kinds, Redis storage shape, HTTP and CLI contracts, and validation tooling. Use it when onboarding, debugging identity mismatches, or extending the platform.

---

## 1. Purpose and scope

| Topic | What v1 guarantees |
|--------|---------------------|
| **Identity** | Every non-root `nodeId` is derivable with `deriveNodeIdFromPassword({ password, rootKey })` where `rootKey` is the platform genesis string from `.root`. |
| **Hierarchy** | Exactly one logical tree: **`root` → `main` → `agent`**. |
| **Server storage** | For `main` and `agent`, Redis stores **hashed** password material (see §5). Plaintext 10-word phrases are **not** written to Redis. |
| **Client storage** | Local `~/.agent-play/credentials.json` holds the **human-readable phrase** for the main node (and per-agent phrases under `agentNodes`) so the developer can authenticate; the server never needs that plaintext. |
| **Validation** | Same rules can be checked via **HTTP** (`POST /api/nodes/validate`), **CLI** (`validate-main-node`, `validate-agent-node`), or **ops script** (`validate-node-derivative.mjs` against Redis). |

Out of scope here: player chain / Merkle fanout, session store, and SDK `RemotePlayWorld` wiring—only **node identity v1**.

---

## 2. Glossary

| Term | Meaning |
|------|---------|
| **root key** | Hex string read from `.root` (trimmed, lowercased). Same as **genesis node id** on the server (`getGenesisNodeId()`). |
| **password (derivation input)** | The string passed into `deriveNodeIdFromPassword`. For v1 main/agent flows this is **`hashNodePassword(humanPhrase)`** (SHA-256 hex of the trimmed phrase), not the raw phrase. |
| **human phrase** | 10-word string from `generateNodePassw()`; stored in local credentials for UX; used to compute headers/body hashes. |
| **`passw` (Redis field)** | Stored **hashed** value (same bytes the server compares on `verifyNodePassw`). |
| **`passwHash` (Redis field)** | Mirrored copy of the same hashed value for scripts/compatibility; **not** a second independent hash algorithm in current code. |

---

## 3. Cryptographic primitives (`@agent-play/node-tools`)

**Source:** `packages/node-tools/src/index.ts`

### 3.1 Root key loading

- **`loadRootKey(rootFilePath?)`** — reads `.root` (default: `cwd/.root`), returns trimmed lowercase hex.

### 3.2 Node id derivation

- **`deriveNodeIdFromPassword({ password, rootKey })`** — `scrypt` over UTF-8 `password` with salt derived from `hashLabel(\`agent-play:node-id:v1:${normalizedRootKey}\`)`.
- **Invariant (main/agent):**  
  `nodeId === deriveNodeIdFromPassword({ password: storedPasswMaterial, rootKey })`  
  where `storedPasswMaterial` is the **hashed** passphrase material stored in Redis (`passw` field).

### 3.3 Passphrase hashing (transport + storage)

- **`hashNodePassword(password: string)`** — `SHA-256` hex over **trimmed** UTF-8 input. Used to turn the human phrase into the **derivation password** and the value persisted as `passw` / `passwHash`.

### 3.4 Optional checks

- **`validateNodePassword({ nodeId, password, rootKey })`** — `deriveNodeIdFromPassword` equals `nodeId` (case-normalized). Useful in tests and client-side checks.

### 3.5 Deprecated / legacy

Do **not** build new flows on:

- `loadGenesisRootKeyFromBufferFile`, `validateNodeDerivativeFromBufferFile`, `validateNodeDerivativeFromGenesisSecret`
- Any **`buffer.txt`**-centric validation

---

## 4. Node kinds and hierarchy

| Kind | `nodeId` | Parent | `passw` in Redis | Notes |
|------|-----------|--------|------------------|--------|
| **root** | `=== rootKey` | — | Absent | Pre-created (`ensureRootNodeExists`). |
| **main** | Derived from hashed material + `rootKey` | `parentNodeId = rootKey` | Hashed string | Created via `POST /api/nodes` (`kind: "main"`). |
| **agent** | Derived from hashed material + `rootKey` | `parentNodeId = main node id` | Hashed string | Created via `POST /api/nodes/agent-node` (`kind: "agent"`). |

**Rule:** `validateNodeIdentity` for an agent may include **`mainNodeId`**; the server checks it matches `parentNodeId` on the agent record.

---

## 5. Redis storage (implementation truth)

**Implementation:** `packages/web-ui/src/server/agent-play/redis-agent-repository.ts`

### 5.1 Key patterns

| Key | Pattern |
|-----|---------|
| Node auth hash | `agent-play:{hostId}:node:{nodeId}:auth` |
| Agent node owner pointer | `agent-play:{hostId}:node:{mainNodeId}:auth:agent-node:{agentId}` → JSON `{ "passw": "<hashed>" }` |

### 5.2 Main node auth hash fields (`kind: main`)

- `nodeId`, `kind`, `parentNodeId`, `createdAt`, `agentNodeIds` (JSON array string)
- **`passw`**, **`passwHash`**: both set to the **same** hashed value (the output of `hashNodePassword` on the human phrase at create time, also used as `deriveNodeIdFromPassword` input for id generation and checks).

### 5.3 Agent node auth hash fields (`kind: agent`)

- Same idea: **`passw`** and **`passwHash`** equal the hashed material; **`parentNodeId`** is the main node.

### 5.4 Root node auth hash

- `kind: root`, no `passw`.

---

## 6. HTTP API contracts

### 6.1 Create main node

- **Route:** `POST /api/nodes`
- **Auth:** none
- **Body:** `{ "kind": "main", "passw": "<hashed passphrase material>" }`
- **Behavior:** Server derives `nodeId` with `deriveNodeIdFromPassword({ password: passw, rootKey })` and stores hashed fields as in §5.

**Parsing:** `packages/web-ui/src/server/agent-play/create-node-account.ts`

### 6.2 Create agent node

- **Route:** `POST /api/nodes/agent-node`
- **Headers:** `x-node-id` (main), `x-node-passw` (hashed main passphrase material — see §7)
- **Body:** `{ "kind": "agent", "parentNodeId"?: "<main>", "agentNodeId", "agentNodePassw": "<hashed agent passphrase material>" }`
- **Route guard:** If `parentNodeId` is present, it must equal the authenticated main `x-node-id`.

**Parsing:** `packages/web-ui/src/server/agent-play/create-agent-node-account.ts`  
**Route:** `packages/web-ui/src/app/api/nodes/agent-node/route.ts`

**Removed from contract:** `agentNodePasswHash` (do not send).

### 6.3 Validate node identity (machine-readable)

- **Route:** `POST /api/nodes/validate`
- **Auth:** optional for the handler as written; typical use is with node headers when validating “as” a logged-in developer. Body is the authority for **which** node is being checked:
  - `{ "nodeId", "rootKey", "mainNodeId?" }`
- **Response:** `{ "ok": boolean, "reason"?: string, "nodeKind"?: "root" | "main" | "agent" }`

**Implementation:** `packages/web-ui/src/app/api/nodes/validate/route.ts` → `repository.validateNodeIdentity`

### 6.4 Repository: `validateNodeIdentity`

For `main` / `agent`: loads `passw` from Redis, checks  
`deriveNodeIdFromPassword({ password: passw, rootKey: input.rootKey }) === nodeId`.  
For `agent` with `mainNodeId`, checks parent.

---

## 7. CLI (`@agent-play/cli`)

**Source:** `packages/cli/src/cli.ts`

### 7.1 Root file resolution

Order: `--root-file` → `AGENT_PLAY_ROOT_FILE_PATH` → `~/.agent-play/.root` → `./.root`

### 7.2 Main node bootstrap (`create-main-node` / `bootstrap-node`)

1. `generateNodePassw()` → human phrase.
2. `hashedPassw = hashNodePassword(phrase)`.
3. `createNodeCredentialFromPassw({ passw: hashedPassw, rootKey })` → `nodeId` + credential (phrase in memory for display).
4. `POST /api/nodes` with `{ kind: "main", passw: hashedPassw }`.
5. Save **`credentials.json`** with **`passw: phrase`** (human output), not the hex hash.

**No `secretFilePath`** requirement for bootstrap in current flow.

### 7.3 Headers for authenticated calls

- `x-node-id`: main node id  
- `x-node-passw`: **`hashNodePassword(savedHumanPhrase)`** (must match Redis `passw`)

### 7.4 Create agent node

1. `generateNodePassw()` → human phrase for the agent (saved locally).
2. `hashedAgentPassw = hashNodePassword(agentPhrase)`.
3. `agentNodeId = deriveNodeIdFromPassword({ password: hashedAgentPassw, rootKey })`.
4. `POST /api/nodes/agent-node` with `agentNodePassw: hashedAgentPassw`, `kind: "agent"`, `parentNodeId: mainNodeId`.

### 7.5 Validation commands (CLI)

| Command | Behavior |
|---------|----------|
| **`validate-main-node`** | Loads credentials + `.root`, `POST /api/nodes/validate` with `nodeId = main`, `rootKey`. |
| **`validate-agent-node --all`** | Every `agentNodes[].nodeId` in credentials; each call includes `mainNodeId: cred.nodeId`. |
| **`validate-agent-node --agent-node-ids id1,id2`** | Same as above for listed ids. |

Requires prior `create-main-node` so credentials exist.

---

## 8. Ops script: `validate-node-derivative.mjs`

**Path:** `packages/node-tools/scripts/validate-node-derivative.mjs`  
**Imports:** `../dist/index.js` — build **`@agent-play/node-tools`** first so `dist` exists.

### 8.1 Arguments

```
node scripts/validate-node-derivative.mjs \
  --root-key <hex> \
  --node-id <id> \
  --redis-url <url> \
  [--host-id <id>] \
  [--main-node-id <id>]
```

- **`--main-node-id`:** when validating an **agent** under a main, reads the owner key that stores JSON `{ passw }`.
- Without it, reads the **main** auth hash for `--node-id` (or root handling if `kind: root`).

### 8.2 What it loads

- Passphrase material **from Redis** (not interactive stdin): `passw` / owner JSON.
- Emits JSON with **`derivativeOk`**, **`hashOk`**, **`ok`**.

### 8.3 `hashOk` meaning (current implementation)

For non-root rows, **`hashOk`** reflects internal consistency (e.g. stored `passw`/`passwHash` alignment). **`derivativeOk`** is the strict **node id** derivation check.

---

## 9. Granular file map

| Area | File |
|------|------|
| Derivation + hashing | `packages/node-tools/src/index.ts` |
| Word list | `packages/node-tools/src/wordlist.ts` (via `generateNodePassw`) |
| Redis repository | `packages/web-ui/src/server/agent-play/redis-agent-repository.ts` |
| Repository types | `packages/web-ui/src/server/agent-play/agent-repository.ts` |
| Parse/create main | `packages/web-ui/src/server/agent-play/create-node-account.ts` |
| Parse/create agent | `packages/web-ui/src/server/agent-play/create-agent-node-account.ts` |
| API routes | `packages/web-ui/src/app/api/nodes/route.ts`, `agent-node/route.ts`, `validate/route.ts` |
| CLI | `packages/cli/src/cli.ts` |
| Validation script | `packages/node-tools/scripts/validate-node-derivative.mjs` |
| Tests (representative) | `create-node-account.test.ts`, `create-agent-node-account.test.ts`, `redis-agent-repository.test.ts` |
| Public docs | `docs/cli.md`, `packages/cli/README.md`, `docs/sdk.md` |

---

## 10. Ordered migration / verification checklist

Run in a clean checkout when validating v1 end-to-end.

1. **Build node-tools**  
   `npm run build -w @agent-play/node-tools` (script needs `dist/`).

2. **Unit tests (web-ui server)**  
   `npm run test -w @agent-play/web-ui -- src/server/agent-play/create-node-account.test.ts src/server/agent-play/create-agent-node-account.test.ts src/server/agent-play/redis-agent-repository.test.ts`

3. **CLI build**  
   `npm run build -w @agent-play/cli`

4. **Manual smoke**  
   - `agent-play create-main-node` (note phrase + main id)  
   - `agent-play validate-main-node`  
   - `agent-play create-agent-node` then `agent-play validate-agent-node --all`

5. **Script smoke (needs Redis URL + host id matching deployment)**  
   `node packages/node-tools/scripts/validate-node-derivative.mjs --help`

---

## 11. Known pitfalls

| Pitfall | Symptom | Mitigation |
|---------|-----------|------------|
| **Wrong root file** | Derived `nodeId` ≠ server’s expected id | Same `.root` as server; verify `loadRootKey` path. |
| **Mixing human phrase vs hash in derivation** | Random node ids / auth failures | Main/agent **`deriveNodeIdFromPassword`** uses **hashed** material for v1; human phrase only in local file + for computing `hashNodePassword(phrase)` for headers. |
| **Stale docs mentioning `agentNodePasswHash`** | 400 from API | Remove field; only `agentNodePassw` (hashed). |
| **Buffer / `passwEncrypted` flows** | Confusion with old migrations | Treat as deprecated; see §3.5. |
| **Validation script without `dist`** | Module not found | Build `node-tools` first. |
| **Agent validation without `mainNodeId`** | Parent check skipped | Use CLI validate-agent or pass `--main-node-id` in script when checking agents. |

---

## 12. Quick reference: derivative chain (v1)

```
humanPhrase (local file only)
    → hashNodePassword(humanPhrase) = storedPasswMaterial
    → nodeId = deriveNodeIdFromPassword({ password: storedPasswMaterial, rootKey })
    → Redis passw = passwHash = storedPasswMaterial
    → x-node-passw header = hashNodePassword(humanPhrase) === storedPasswMaterial
```

This runbook should be updated whenever the **storage field names**, **derivation labels**, or **HTTP/CLI contracts** change; prefer a single PR that updates code and this file together.
