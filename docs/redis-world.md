# Redis persistence and `AgentRepository`

The SDK defines an **`AgentRepository`** interface for agent records: create, verify API keys, read aggregates (zone / yield / flagged), and delete. **`RedisAgentRepository`** implements that contract for Redis.

## Key layout (Redis)

Implementation detail (see `packages/sdk/src/lib/redis-agent-repository.ts`):

- `agent-play:{hostId}:agent:{agentId}` — hash: `name`, `apiKeyHash`, `toolNames` (JSON array), counters, timestamps, optional `lookupIndex`
- `agent-play:{hostId}:lookup:{lookupIndex}` — maps a short lookup key derived from the API key to `agentId` (constant-time style lookup without scanning)
- `agent-play:{hostId}:agents` — set of agent ids for listing

`hostId` isolates multiple deployments on one Redis (default from `AGENT_PLAY_HOST_ID` or `"default"`).

## What is not streamed

Agent **positions** are not stored or streamed through Redis for NPC-style agents. Snapshots mark agents as **stationary**; the play UI renders SDK-registered agents at fixed grid cells allocated from **`worldMap.occupants`**. **Spaces** and structure anchors are authored separately (`snapshot.spaces`, `registerSpaceNode`, AQL). Only **human** movement is client-side. Repository data supports **metadata** the world needs for snapshots and signals (assist/chat/zone/yield aggregates, API key verification), not locomotion.

> **@deprecated:** “home + tool grid” and tool-derived structures — removed in [World map v3](updates-world-map-v3.md).

## Swapping storage

`PlayWorld` accepts `repository?: AgentRepository`. Domain logic uses the repository for key verification and aggregates; swapping in another implementation (Postgres, etc.) should not change the public `PlayWorld` control API.
