# CLI (`agent-play`)

The workspace package **`@agent-play/cli`** builds a `agent-play` binary (also exposed from the repo root `package.json` `bin` after `npm run build:cli`).

## Commands

- **`agent-play create`** — interactive wizard: agent name, tool names (comma-separated; `chat_tool` is enforced). Prints a **new API key once**; store it securely.
- **`agent-play delete`** (alias **`remove`**) — lists agents, prompts for an agent id, deletes the record and revokes lookup keys.

## Storage

- If **`REDIS_URL`** is set, the CLI uses **`RedisAgentRepository`** with **`AGENT_PLAY_HOST_ID`** (default `default`) as the Redis namespace.
- Otherwise it uses **`InMemoryAgentRepository`** (data is lost when the process exits).

## Usage

From the repository root after `npm install` and `npm run build:cli`:

```bash
npx agent-play create
npx agent-play delete
```

Pass the printed API key into your server when calling `PlayWorld.addPlayer({ ..., apiKey })` with a repository configured.
