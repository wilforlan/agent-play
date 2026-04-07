# Notes

Informal **runbooks and context** that do not replace the main docs under [`docs/`](../).

| Note | Summary |
|------|---------|
| [agent-play-world-model-and-player-chain.md](agent-play-world-model-and-player-chain.md) | End-to-end world model (v3), session store, `snapshotRev`, player chain / Merkle digest, `.root` genesis, Redis layout, fanout deltas. |
| [occupant-model-and-interaction-policy.md](occupant-model-and-interaction-policy.md) | Occupant taxonomy (`__human__`, `__agent__`, `__mcp__`), communication constraints, and contributor-facing migration from peer terminology. |
| [player-chain-stablekey.md](player-chain-stablekey.md) | **`stableKey`** reference: genesis/header literals, `agent:` / `mcp:` occupant keys, RPC behavior, Redis/SSE usage, SDK merge, contributor checklist. |
| [k8s-agent-play-debugging.md](k8s-agent-play-debugging.md) | Kubernetes debugging for Agent Play (Redis vs Deployment ready, web UI init, PVC, images, local kind/Docker Desktop). |
