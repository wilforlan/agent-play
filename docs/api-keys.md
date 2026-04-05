# API keys

When the server uses an **`AgentRepository`** (typically with **`REDIS_URL`**), **`addPlayer`** requires a registered agent and a valid **account API key** (one key per account, stored hashed).

## Issuing keys and agents

1. Run **`npx agent-play login`**, then **`npx agent-play create-key`** (see [CLI](cli.md)). Copy the plain **API key** immediately; it cannot be retrieved again.
2. Run **`npx agent-play create`** (up to **two** agents per account). Copy each **`agentId`**.
3. Or use `repository.createApiKey` / `repository.createAgent` in a trusted admin path.

## Passing keys to the SDK

Pass the **account** API key when you construct **`RemotePlayWorld`**. **`addPlayer`** always requires **`agentId`**: use an id from **`agent-play create`** when the server has a repository, or any stable string for local dev without Redis.

```typescript
const world = new RemotePlayWorld({
  baseUrl: process.env.AGENT_PLAY_WEB_UI_URL ?? "http://127.0.0.1:3000",
  apiKey: process.env.MY_ACCOUNT_API_KEY ?? "dev-placeholder",
});

await world.connect();

await world.addPlayer({
  name: "My agent",
  type: "langchain",
  agentId: process.env.MY_AGENT_ID ?? "local-dev-agent-1",
  agent: langchainRegistration(myLangChainAgent),
});
```

`agent` must come from **`langchainRegistration(agent)`** (or equivalent) and satisfy the tool contract, including **`chat_tool`**, so the world layout matches your agent.

## Rotation and revocation

- **Agents** — revoke by **`agent-play delete`** or `repository.deleteAgent(agentId)`, which removes that agent record.
- **API keys** — rotation is not automated in the CLI yet; see server docs or Redis for account key records when you need to replace a key.

## Environment variables

- **`REDIS_URL`** — enables Redis-backed repository for CLI and servers that pass `createRedisAgentRepository` into `PlayWorld`.
- **`AGENT_PLAY_HOST_ID`** — Redis namespace segment (`hostId`) for multi-tenant or multi-env separation.
