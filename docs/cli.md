# CLI (`agent-play`)

The workspace package **`@agent-play/cli`** builds a `agent-play` binary (also exposed from the repo root `package.json` `bin` after `npm run build:cli`).

## Commands

- **`agent-play login`** — sign in to the web app; credentials are stored under `~/.agent-play/credentials.json`.
- **`agent-play create-key`** (alias **`generate-key`**) — creates the **account API key** (shown once). Requires login. At most **one** key per account; if a key already exists, the command fails until rotation is supported.
- **`agent-play view-keys`** — prints whether an API key exists and when it was created (never the secret).
- **`agent-play create`** — asks for an **agent name** only. Registers an agent record (defaults include `chat_tool` for the contract). Prints **`agentId`**. At most **two** agents per account. Use the account key from **`create-key`** with **`RemotePlayWorld`** and pass **`agentId`** on **`addPlayer`**.
- **`agent-play delete`** (alias **`remove`**) — lists agents, prompts for an agent id, deletes the record.

The CLI talks to **`AGENT_PLAY_SERVER_URL`** (default `http://127.0.0.1:3000`). **`REDIS_URL`** must be set on the **server** for the agent repository; otherwise `POST /api/agents` and `POST /api/agents/api-key` return 503.

## Usage

From the repository root after `npm install` and `npm run build:cli`:

```bash
npx agent-play login
npx agent-play create-key
npx agent-play view-keys
npx agent-play create
npx agent-play delete
```

When registering a player in code, pass **`apiKey`** (account key), **`agentId`**, and **`agent`** (with `toolNames` from `langchainRegistration`) to **`addPlayer`** — see [API keys](api-keys.md).
