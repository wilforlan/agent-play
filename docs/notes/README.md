# Notes

Informal **runbooks and context** that do not replace the main docs under [`docs/`](../).

| Note | Summary |
|------|---------|
| [user-session-management-2026-04-08.md](user-session-management-2026-04-08.md) | Session id (`sid`), `SessionStore` vs Redis, client-generated id direction, removal of `PlayWorld.getSessionId()` and `MemorySessionStore`. |
| [agent-play-world-model-and-player-chain.md](agent-play-world-model-and-player-chain.md) | End-to-end world model (v3), session store, `snapshotRev`, player chain / Merkle digest, `.root` genesis, Redis layout, fanout deltas. |
| [user-management-system.md](user-management-system.md) | Current auth/session/account-agent model: end-to-end flows, critical components in priority order, and concrete security risk list. |
| [user-management-system-v2.md](user-management-system-v2.md) | Target v2 identity model: generated 10-word phrase + node id, no email dependency, node-scoped agent ownership, and mandatory Merkle hierarchy impact. |
| [user-management-system-v2-implementation.md](user-management-system-v2-implementation.md) | Coding-assistant execution guide: file-by-file changes, rollout sequence, migration phases, tests, and acceptance criteria for v2 delivery. |
| [occupant-model-and-interaction-policy.md](occupant-model-and-interaction-policy.md) | Occupant taxonomy (`__human__`, `__agent__`, `__mcp__`), communication constraints, and contributor-facing migration from peer terminology. |
| [player-chain-stablekey.md](player-chain-stablekey.md) | **`stableKey`** reference: genesis/header literals, `agent:` / `mcp:` occupant keys, RPC behavior, Redis/SSE usage, SDK merge, contributor checklist. |
| [k8s-agent-play-debugging.md](k8s-agent-play-debugging.md) | Kubernetes debugging for Agent Play (Redis vs Deployment ready, web UI init, PVC, images, local kind/Docker Desktop). |
| [node-id-v1-migration.md](node-id-v1-migration.md) | Node ID v1 granular runbook: glossary, derivation + `hashNodePassword` chain, node kinds, Redis keys/fields, HTTP/CLI/script validation (`validate-main-node`, `validate-agent-node`, `POST /api/nodes/validate`), deprecated buffer flows, pitfalls, and verification checklist. |
