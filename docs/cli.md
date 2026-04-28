# CLI (`agent-play`)

The workspace package **`@agent-play/cli`** builds an **`agent-play`** binary (also exposed from the repo root `package.json` `bin` after `npm run build:cli`).

---

## Node setup

This section describes how to provision **main** and **agent** nodes from the CLI and what must be true on the server and on your machine.

### Prerequisites

| Requirement | Why it matters |
|-------------|----------------|
| **Web UI / API reachable** | Set **`AGENT_PLAY_SERVER_URL`** (default `http://127.0.0.1:3000`) to your Agent Play server. |
| **Redis on the server** | Node and agent records live in Redis; set **`REDIS_URL`** on the **server** (not necessarily on the CLI host). |
| **Matching `.root` file** | The platform **root key** (genesis identity) comes from `.root`. The CLI resolves it via **`--root-file`**, **`AGENT_PLAY_ROOT_FILE_PATH`**, **`~/.agent-play/.root`**, or **`./.root`** (first match). It **must** match the server’s root key or derived node ids will not line up. |

### First-time main node (`create-main-node` / `bootstrap-node`)

1. Run **`agent-play create-main-node`** (or **`bootstrap-node`**). The CLI prompts for **server URL** (or uses the default / env).
2. The CLI generates a **10-word passphrase** (`generateNodePassw`), hashes it for registration, derives your **main node id** under the active root key, and calls **`POST /api/nodes`** with **`{ "kind": "main", "passw": "<hashed material>" }`**. No **`x-node-id` / `x-node-passw`** headers are sent for this call.
3. Credentials are saved to **`~/.agent-play/credentials.json`**: **`serverUrl`**, **`nodeId`** (main), and the **human-readable passphrase** (for you to store safely). Losing the phrase means losing access to that node identity.
4. The CLI prints the **genesis / root key** string and your **main node id**; the genesis value should match **`.root`** when both sides use the same file.

Optional: **`--root-file /path/to/.root`** if your root file is not in the default search paths.

### Hierarchy (mental model)

Node kinds are fixed: **`root` → `main` → `agent`**.

- **`root`** exists on the server only (from `.root`); it has no passphrase.
- **`main`** is your developer account node (what you create with **`create-main-node`**).
- **`agent`** nodes are children of **your main node**; you add them with **`create-agent-node`**.

### Agent nodes (`create-agent-node` / `create`)

1. Requires a successful **`create-main-node`** so **`credentials.json`** exists.
2. The CLI generates a new passphrase, derives an **agent node id**, and calls **`POST /api/nodes/agent-node`** with **`kind: "agent"`**, **`parentNodeId`** set to your main node id, **`agentNodeId`**, and **`agentNodePassw`** (hashed material). Requests use **`x-node-id`** / **`x-node-passw`** (see [Auth model](#auth-model)).
3. Agent entries are merged into **`credentials.json`** under **`agentNodes`** (per-agent **`nodeId`**, **`passw`**, **`createdAt`**).

### Inspect and lifecycle

| Action | Command | Notes |
|--------|---------|--------|
| Show genesis id, main node, agent node ids, and runtime agent rows | **`inspect-node`** | **`GET /api/nodes`**: **`mainNode.agentNodeIds`** (from **`create-agent-node`**) plus **`agentNodes`** (SDK **`StoredAgentRecord`** list, if any). |
| List agents (SDK registrations) | **`list-agent-nodes`** | **`GET /api/agents`**. |
| Remove one agent registration | **`delete-agent-node`** `[agent-id]` | **`DELETE /api/agents`**; can prompt if id omitted. |
| Remove main node and cascade | **`delete-main-node`** | **`DELETE /api/nodes`**; requires typing your main node id; then consider **`clear-node-credentials`**. |
| Drop local file only | **`clear-node-credentials`** | Does not delete server-side nodes. |

> **@deprecated** **`POST /api/agents`** does not create agent identities. Register agent **nodes** with **`POST /api/nodes/agent-node`**; runtime tool/metadata is attached via **`world.addPlayer`** in your app.

---

## Node validation

Use these when you want to confirm that **stored server state** still matches the **root-key derivative rules** for your main node or agent nodes—without guessing ids by hand.

### CLI validation commands

| Command | Purpose |
|---------|---------|
| **`validate-main-node`** | Checks your **main** node id from **`credentials.json`** against the server via **`POST /api/nodes/validate`** (body includes **`nodeId`**, **`rootKey`** from **`.root`**). Uses saved credentials for **`x-node-id`** / **`x-node-passw`**. |
| **`validate-agent-node --all`** | Validates **every** agent node id listed under **`credentials.json` → `agentNodes`**, with **`mainNodeId`** set to your main node id so parent checks apply. |
| **`validate-agent-node --agent-node-ids id1,id2,...`** | Same checks for an explicit comma-separated list of agent node ids. |

**Requirements:** run **`create-main-node`** first so **`credentials.json`** and the passphrase exist; use the same **`.root`** resolution as for setup. If **`--all`** finds no **`agentNodes`**, the CLI reports that there is nothing to validate (exit success).

### What “passing” means

The server’s **`validateNodeIdentity`** implementation confirms (among other things) that the **`nodeId`** is derivable from the stored hashed material under the given **`rootKey`**, and for agents that **`parentNodeId`** matches the given **`mainNodeId`** when provided.

### Ops / CI: `node-tools` script

For validation that reads **directly from Redis** (same host/namespace as the server), build **`@agent-play/node-tools`** and run:

```bash
node packages/node-tools/scripts/validate-node-derivative.mjs \
  --root-key <hex> \
  --node-id <id> \
  --redis-url <url> \
  [--host-id <id>] \
  [--main-node-id <main-id>]
```

Use **`--main-node-id`** when validating an **agent** node id. See **`docs/notes/node-id-v1-migration.md`** for key layout and field semantics.

Deprecated for new work: **`buffer.txt`**-only flows and **`validateNodeDerivativeFromBufferFile`**.

---

## Commands (summary)

- **`create-main-node`** (alias **`bootstrap-node`**) — sign up main node; optional **`--root-file`**. Saves **`~/.agent-play/credentials.json`**.
- **`inspect-node`** — **`GET /api/nodes`** (authenticated).
- **`create-agent-node`** (alias **`create`**) — **`POST /api/nodes/agent-node`**.
- **`list-agent-nodes`** (alias **`list`**) — **`GET /api/agents`**.
- **`delete-agent-node`** (aliases **`delete`**, **`remove`**) — **`DELETE /api/agents`**.
- **`delete-main-node`** — **`DELETE /api/nodes`** with confirmation.
- **`validate-main-node`** — server validation for main node (see [Node validation](#node-validation)).
- **`validate-agent-node`** — **`--all`** or **`--agent-node-ids id1,id2,...`** (see [Node validation](#node-validation)).
- **`initialize`** (alias **`init`**) — interactive starter scaffold, optional node bootstrap, prompts for agent count (max `2`), and hydrates `.env` node-id env vars when bootstrapped.
- **`clear-node-credentials`** — remove local credentials file.

---

## Auth model

- **`POST /api/nodes`** (create main node) does **not** require node auth headers.
- All other node/agent management requests use:
  - **`x-node-id`**
  - **`x-node-passw`** (derived from the saved passphrase as implemented in the CLI; must match stored server material)

---

## Genesis and root key

- The platform genesis identity is the **root key** from **`.root`** (exposed as genesis node id in **`inspect-node`**).
- Main and agent node ids are **derivatives** of passphrase material + that root key.
- Keep CLI **`.root`** discovery aligned with the server so local derivation and server validation agree.

---

## Usage

From the repository root after **`npm install`** and **`npm run build:cli`**:

```bash
npx agent-play create-main-node
npx agent-play initialize
npx agent-play validate-main-node
npx agent-play inspect-node
npx agent-play create-agent-node
npx agent-play validate-agent-node --all
npx agent-play list-agent-nodes
npx agent-play delete-agent-node
npx agent-play delete-main-node
npx agent-play clear-node-credentials
```

When registering players in code, use **`mainNodeId`**, agent **`agentId`**, and node credentials with **`RemotePlayWorld`** / **`addPlayer`** as described in the SDK docs.

## Initialize quick start

`npx agent-play initialize` creates a starter agent repository skeleton and asks:

1. which environment to target (`development`, `test`, `production`)
2. server runtime to scaffold (`bare` or `express`)
3. whether to bootstrap node identities now
4. how many agent nodes to prepare (`1` or `2`)

When bootstrap is selected, generated `.env` is hydrated with:

- `AGENT_PLAY_WEB_UI_URL` (derived from selected environment)
- `AGENT_PLAY_MAIN_NODE_ID`
- `AGENT_PLAY_AGENT_NODE_ID_1`
- `AGENT_PLAY_AGENT_NODE_ID_2` (if `2` agents selected)

The scaffolded runtime reads these env vars directly, so node IDs stay configurable per environment.

For a full end-to-end walkthrough (initializer prompts, bootstrap paths, generated project layout, and troubleshooting), see [Initialize agent server and template](initialize-agent-server-and-template.md).
