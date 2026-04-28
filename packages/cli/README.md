# @agent-play/cli

Command-line tool for **Agent Play**: create a **main developer node** (platform signup), add **agent nodes**, **validate** those identities against the server, and manage agent registrations. The server must use a **Redis**-backed agent repository (`REDIS_URL` on the server).

Authentication uses **`x-node-id`** and **`x-node-passw`** on every request **except** main-node creation, which sends hashed passphrase material in the JSON body to **`POST /api/nodes**.

## Documentation

- **[Repository](https://github.com/wilforlan/agent-play)**  
- **[CLI guide](https://github.com/wilforlan/agent-play/blob/main/docs/cli.md)** — full **Node setup** and **Node validation** sections  
- **[API reference](https://wilforlan.github.io/agent-play/)** — TypeDoc  

## Install

```bash
npm install -g @agent-play/cli
```

Binary name: **`agent-play`**.

Default server URL: **`http://127.0.0.1:3000`**, or override with **`AGENT_PLAY_SERVER_URL`**.

Root key for derivation: **`--root-file`**, **`AGENT_PLAY_ROOT_FILE_PATH`**, or a **`.root`** file under **`~/.agent-play/`** or the current working directory (must match the server’s `.root`).

## Node setup

1. **Server:** Redis (`REDIS_URL`) and a deployed web UI/API the CLI can reach (`AGENT_PLAY_SERVER_URL`).
2. **Local `.root`:** Must match the server genesis root key (see resolution order above).
3. **`create-main-node`** (`bootstrap-node`): prompts for server URL, generates a passphrase, registers **`POST /api/nodes`**, writes **`~/.agent-play/credentials.json`** with **`serverUrl`**, **`nodeId`**, and the human passphrase.
4. **`create-agent-node`**: derives an agent node under your main node, **`POST /api/nodes/agent-node`**, appends to **`credentials.json` → `agentNodes`**.
5. **`inspect-node`**, **`list-agent-nodes`**, **`delete-*`**, **`clear-node-credentials`**: inspect or tear down registrations; see **`docs/cli.md`** for the full table.

> **@deprecated** **`POST /api/agents`** does not create agent **node** identity. Use **`POST /api/nodes/agent-node`**, then attach runtime data with **`world.addPlayer`**.

## Node validation

- **`validate-main-node`** — calls **`POST /api/nodes/validate`** for your main node id (uses **`credentials.json`** + **`.root`**).
- **`validate-agent-node --all`** — validates every id in **`credentials.json` → `agentNodes`** (includes **`mainNodeId`** in the validate body).
- **`validate-agent-node --agent-node-ids id1,id2`** — same for explicit ids.

For Redis-direct checks (ops/CI), use **`node-tools`** script **`scripts/validate-node-derivative.mjs`**; details in **`docs/cli.md`** and **`docs/notes/node-id-v1-migration.md`**.

## Commands

| Command | Aliases | What it does |
|--------|---------|----------------|
| **`create-main-node`** | `bootstrap-node` | Sign up a **main** node: **`POST /api/nodes`** (no node headers), save **`~/.agent-play/credentials.json`**. Optional **`--root-file`**. |
| **`inspect-node`** | — | **GET /api/nodes** — genesis id, main node, **agent node ids** (`create-agent-node`), and **runtime** agent rows (SDK metadata) if present. |
| **`create-agent-node`** | `create` | **POST /api/nodes/agent-node** — new agent node under your main node. |
| **`list-agent-nodes`** | `list` | **GET /api/agents** — lists registered agents. |
| **`delete-agent-node`** | `delete`, `remove` | **DELETE /api/agents** — optional **`[agent-id]`**; if omitted, prompts. |
| **`delete-main-node`** | — | **DELETE /api/nodes** — confirm by typing main node id; cascades. |
| **`validate-main-node`** | — | **POST /api/nodes/validate** for main node id. |
| **`validate-agent-node`** | — | **`--all`** or **`--agent-node-ids id1,id2,...`** — validate agent node ids. |
| **`initialize`** | `init` | Interactive scaffold for a starter agent codebase, optional node bootstrap, asks for agent count (1-2), and writes env-variable node ids into `.env` when bootstrapped. |
| **`clear-node-credentials`** | — | Removes **`~/.agent-play/credentials.json`**. |

## Genesis and main node

Every **main node id** is derived from passphrase material and the platform **root key** (the **genesis** identity). **`inspect-node`** and **`create-main-node`** output should agree with **`.root`** when both sides use the same key.

Node kinds: **`root` → `main` → `agent`**. Root has no passphrase; main and agent persist hashed material server-side.

## Usage examples

```bash
npx agent-play create-main-node
npx agent-play validate-main-node
npx agent-play inspect-node
npx agent-play create-agent-node
npx agent-play validate-agent-node --all
npx agent-play initialize
npx agent-play list-agent-nodes
npx agent-play delete-agent-node
npx agent-play delete-agent-node <agent-uuid>
npx agent-play delete-main-node
npx agent-play clear-node-credentials
```

For SDK usage after bootstrap, use **`RemotePlayWorld`** and register players with **`mainNodeId`** and **`agentId`** from the CLI output.

## Initialize quick start

- `npx agent-play initialize` (or `npx agent-play init`) scaffolds starter files.
- The flow asks whether to create nodes now and how many agent nodes to provision (max `2`).
- If bootstrap is selected, it writes:
  - `AGENT_PLAY_MAIN_NODE_ID`
  - `AGENT_PLAY_AGENT_NODE_ID_1`
  - `AGENT_PLAY_AGENT_NODE_ID_2` (when requested)
  into generated `.env`.
- Generated code references these env vars directly (no hardcoded ids).
