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
| [sdk-update-2026-04-09.md](sdk-update-2026-04-09.md) | SDK update plan: network node validation, `credentials.json` + `hashedPassword`, deprecate secret file / `derivePasswordFromSecret`, session vs player events, `addAgent` vs `addPlayer`, examples and rollout checklist. |
| [occupant-connection-management-2026-04-10.md](occupant-connection-management-2026-04-10.md) | Lease + heartbeat runbook for occupant presence: TTL leases, heartbeat/disconnect routes, PlayWorld sweeper behavior, SDK lifecycle integration, and operational guidance. |
| [human-agent-interaction-ux-2026-04-10.md](human-agent-interaction-ux-2026-04-10.md) | Play UI interaction runbook: full-name/proximity prompt UX, session panel Assist+Chat workflow, mobile auto-open behavior, API payload contracts, and flow diagram. |
| [agent-human-intercom.md](agent-human-intercom.md) | Intercom runtime in `packages/intercom`, forwarding-only web adapter, human node onboarding, channel keys, `requestId` correlation, SDK `subscribeIntercomCommands` / `intercomResponse`, and troubleshooting. |
| [structures-and-spaces-world-model.md](structures-and-spaces-world-model.md) | Structure node to space model: data contracts, `PlayWorld` registration/entry APIs, transition event fanout, and follow-up persistence/API work. |
