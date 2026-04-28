# Initialize agent server and template

This guide covers the full workflow for creating a new Agent Play agent server
project using the CLI initializer, provisioning node identities, and running the
generated template with P2A and assist tool capability wiring.

## What this command does

`agent-play initialize` (alias `agent-play init`) scaffolds a runnable starter
codebase and optionally bootstraps node identities during setup.

The scaffold includes:

- LangChain agent definitions via `createAgent` and `ChatOpenAI`
- SDK registration via `langchainRegistration`
- Tool capability registry and executor
- P2A enabled by default for generated `addAgent` calls
- `.env`-driven node identity configuration (no hardcoded node ids)
- server runtime choice:
  - `bare` (minimal process entry)
  - `express` (HTTP server with `/health` for remote deployment)

## Prerequisites

Before running initialize, confirm:

- Node.js 20+ is installed.
- Agent Play server/web UI is reachable (local or remote).
- Server has Redis configured.
- You have a matching `.root` key available locally:
  - `--root-file <path>`, or
  - `AGENT_PLAY_ROOT_FILE_PATH`, or
  - `~/.agent-play/.root`, or
  - `./.root`

If local and server `.root` values do not match, derived node IDs will not be valid.

## Initialize command

Basic interactive usage:

```bash
npx agent-play initialize
```

You will be prompted for:

1. environment (`development`, `test`, or `production`)
2. server type (`bare` or `express`)
3. whether to create node identities now (`yes/no`)
4. how many agents to provision (`1` or `2`)

### Flags

```bash
npx agent-play initialize \
  --dir ./my-agent-server \
  --name my-agent-server \
  --template langchain \
  --server-type express \
  --yes \
  --force \
  --bootstrap-nodes \
  --agent-count 2
```

- `--dir`: scaffold target directory
- `--name`: project/package name used in template placeholders
- `--template`: currently `langchain`
- `--environment`: `development|test|production`
- `--server-type`: `bare|express`
- `--yes`: non-interactive mode
- `--force`: overwrite scaffold-managed files
- `--bootstrap-nodes`: create nodes during initialize
- `--agent-count <1|2>`: choose number of generated agent registrations

## Bootstrap behavior

If bootstrap is enabled, initialize will:

1. Ensure main node credentials exist (or create/register a main node)
2. Create/register the requested number of agent nodes (max 2)
3. Hydrate `.env` in the generated project with:
  - `AGENT_PLAY_WEB_UI_URL` from selected environment
  - `AGENT_PLAY_MAIN_NODE_ID`
  - `AGENT_PLAY_AGENT_NODE_ID_1`
  - `AGENT_PLAY_AGENT_NODE_ID_2` (when `agent-count=2`)

The CLI keeps credentials in:

- `~/.agent-play/credentials.json`

## Generated template structure

The template is generated under:

- `packages/cli/templates/agent-starter/langchain`

A scaffolded project includes:

- `src/builtins/definitions.ts`
  - builds agents with `createAgent`
  - model from `ChatOpenAI`
  - random name + random system prompt per generated agent
  - explicit tool list (`starterTools`)
- `src/register/register-builtins.ts`
  - configures `RemotePlayWorld`
  - calls `world.initAudio(...)` when `OPENAI_API_KEY` is present
  - registers agents through `langchainRegistration(...)`
  - sets `enableP2a: "on"` by default
  - subscribes intercom tool execution via `executeToolCapability`
- `src/tool-handlers/tool-capability-registry.ts`
  - maps tool names to handlers
- `src/tool-handlers/execute-tool-capability.ts`
  - resolves and executes tool capability handlers
- `src/builtins/toolkits/starter-tools.ts`
  - defines `chat_tool` and `assist_brainstorm` tools

## Environment contract

Expected runtime env vars in generated project:

- `AGENT_PLAY_WEB_UI_URL`
- `AGENT_PLAY_MAIN_NODE_ID`
- `AGENT_PLAY_AGENT_NODE_ID_1`
- `AGENT_PLAY_AGENT_NODE_ID_2` (optional if using one agent)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, defaults in template)

`AGENT_PLAY_MAIN_NODE_ID` and `AGENT_PLAY_AGENT_NODE_ID_*` are required for registration.

Environment mapping used by initialize:

- `development` → `http://127.0.0.1:3000`
- `test` → `https://test-agent-play.com`
- `production` → `https://agent-play.com`

## Running the generated project

From generated project root:

```bash
npm install
cp .env.example .env
# if bootstrap was skipped, fill node ids manually
npm run dev
```

## Common flows

### Flow A: fully interactive local bootstrap

```bash
npx agent-play initialize
```

Choose:

- bootstrap now: `yes`
- agent count: `1` or `2`

Then run:

```bash
cd <generated-dir>
npm install
npm run dev
```

### Flow B: CI/non-interactive scaffold only

```bash
npx agent-play initialize --yes --dir ./agent-service --name agent-service
```

This creates project files without network/bootstrap prompts.

### Flow C: CI/non-interactive with node bootstrap

```bash
npx agent-play initialize \
  --yes \
  --bootstrap-nodes \
  --agent-count 2 \
  --dir ./agent-service \
  --name agent-service
```

Requires valid server reachability and `.root` discovery in the execution environment.

## Troubleshooting

### Target directory not empty

Error:

- target directory contains files and `--force` is not set

Fix:

- use an empty directory, or
- re-run with `--force` if overwrite is intended

### Missing `.root` or mismatch

Symptoms:

- node creation fails
- derived IDs rejected by server

Fix:

- pass `--root-file`, or set `AGENT_PLAY_ROOT_FILE_PATH`
- verify local and server root keys match

### Missing `OPENAI_API_KEY`

Symptoms:

- model creation fails in generated builtins

Fix:

- set `OPENAI_API_KEY` in `.env`

### Agent count > 2

Behavior:

- initialize rejects invalid values

Fix:

- use `--agent-count 1` or `--agent-count 2`

## Related docs

- [CLI reference](cli.md)
- [SDK reference](sdk.md)
- [P2A realtime hub](p2a/index.md)

