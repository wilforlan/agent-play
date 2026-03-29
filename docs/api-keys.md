# API keys

When **`PlayWorld`** is constructed with an **`AgentRepository`**, **`addPlayer`** requires a valid **`apiKey`** for the agent record resolved from that repository. Keys are **issued** by the CLI (`agent-play create`) or by calling `repository.createAgent` in code, and are **stored hashed** (never the plain key).

## Issuing keys

1. Run **`npx agent-play create`** (see [CLI](cli.md)) or use `InMemoryAgentRepository` / `RedisAgentRepository` in a trusted admin path.
2. Copy the plain key immediately; it cannot be retrieved again from storage.

## Passing keys to the SDK

Provide the plain key on registration:

```typescript
await world.addPlayer({
  name: "My agent",
  type: "langchain",
  apiKey: process.env.MY_AGENT_API_KEY,
  agent: { type: "langchain", toolNames: ["chat_tool", "assist_x"] },
});
```

`toolNames` in code must still satisfy the tool contract (including `chat_tool`); repository records store the tool list from creation for aggregates and layout.

## Rotation and revocation

- **Revoke** by **`agent-play delete`** or `repository.deleteAgent(agentId)`, which removes the agent hash and lookup entries in Redis.
- **Rotate** by creating a new agent (new key) and switching traffic, then deleting the old agent record.

## Environment variables

- **`REDIS_URL`** — enables Redis-backed repository for CLI and servers that pass `createRedisAgentRepository` into `PlayWorld`.
- **`AGENT_PLAY_HOST_ID`** — Redis namespace segment (`hostId`) for multi-tenant or multi-env separation.
