# x402 + Solana payments

Production-grade payment documentation for Agent Play: **x402** settlement on **Solana USDC**, replacing the internal Redis wallet (`balanceUsd`, lazy `$70` seed).

**Status:** planning / not shipped. For the system that runs today, see [Payments, wallets, and talk billing](../../payments-wallets-and-talk-billing.md).

**Architecture anchor:** [x402 + Solana payments plan](../../x402-solana-payments-plan.md)

---

## Who should read what

| Role | Start here |
|------|------------|
| New to x402 | [01 — x402 overview](01-x402-overview.md) |
| Integrating wallet link | [02 — Solana wallet linking](02-solana-wallet-linking.md) |
| Backend / pricing | [03 — Payment catalog](03-payment-catalog.md), [04 — Settlement & idempotency](04-settlement-and-idempotency.md) |
| Agent-service host | [05 — Agent developer payouts](05-agent-developer-payouts.md) |
| Play UI engineer | [06 — Overworld user flows](06-overworld-user-flows.md) |
| Ops / AQL | [07 — AQL & platform ops](07-aql-and-platform-ops.md) |
| Migrating existing hosts | [08 — Migration from internal wallet](08-migration-from-internal-wallet.md) |
| Security review | [09 — Security & compliance](09-security-and-compliance.md) |
| SRE | [10 — Observability](10-observability.md) |

---

## Documentation map

| # | Document | Summary |
|---|----------|---------|
| 1 | [01-x402-overview.md](01-x402-overview.md) | Protocol, 402 flow, facilitator, Solana USDC, Agent Play fit |
| 2 | [02-solana-wallet-linking.md](02-solana-wallet-linking.md) | SIWS, link/unlink API, settlement profiles, Redis keys |
| 3 | [03-payment-catalog.md](03-payment-catalog.md) | SKUs, payee routing, prices, resource ids |
| 4 | [04-settlement-and-idempotency.md](04-settlement-and-idempotency.md) | Payment intents, atomic commit, retries, failure modes |
| 5 | [05-agent-developer-payouts.md](05-agent-developer-payouts.md) | Receive talk/service revenue on main node wallet |
| 6 | [06-overworld-user-flows.md](06-overworld-user-flows.md) | Connect wallet, pay agents, buy items, acquire spaces |
| 7 | [07-aql-and-platform-ops.md](07-aql-and-platform-ops.md) | Env vars, facilitator config, AQL ops, runbooks |
| 8 | [08-migration-from-internal-wallet.md](08-migration-from-internal-wallet.md) | `dual` mode, cutover, deprecations |
| 9 | [09-security-and-compliance.md](09-security-and-compliance.md) | Threat model, SIWS replay, facilitator trust |
| 10 | [10-observability.md](10-observability.md) | Metrics, alerts, reconciliation, tracing |

---

## Quick reference

### Environment

```bash
AGENT_PLAY_PAYMENTS_MODE=internal   # today | dual | x402
AGENT_PLAY_SETTLEMENT_NETWORK=solana:devnet
X402_FACILITATOR_URL=https://...
AGENT_PLAY_TREASURY_SOLANA=<base58>
AGENT_PLAY_USDC_MINT=<spl-mint>
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Identity model

- **Auth:** main node passphrase (`x-node-id`, `x-node-passw`) — unchanged.
- **Settlement:** Solana pubkey linked to main node via SIWS — new.
- **Payer:** overworld user’s linked wallet.
- **Payee (agent):** agent operator’s **main node** linked wallet.
- **Payee (amenity sales):** **space owner** `owner.nodeId` → linked wallet.

### External spec

- [x402 specification v2](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md)
- [Coinbase x402 docs](https://docs.cdp.coinbase.com/x402/welcome)

---

## Production checklist (summary)

Before mainnet:

- [ ] SIWS nonce TTL and domain binding verified ([09](09-security-and-compliance.md))
- [ ] Idempotency on all priced RPCs ([04](04-settlement-and-idempotency.md))
- [ ] Facilitator outage runbook ([07](07-aql-and-platform-ops.md), [10](10-observability.md))
- [ ] Devnet E2E: link → purchase → sold + tx ([06](06-overworld-user-flows.md))
- [ ] Migration plan signed off ([08](08-migration-from-internal-wallet.md))
