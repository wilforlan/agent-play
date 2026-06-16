# AQL and platform operations

Environment configuration, facilitator setup, AQL changes, and operator runbooks for x402 + Solana payments.

**See also:** [Migration](08-migration-from-internal-wallet.md) · [Observability](10-observability.md) · [Security](09-security-and-compliance.md)

---

## Environment variables

### Payments mode

| Variable | Values | Description |
|----------|--------|-------------|
| `AGENT_PLAY_PAYMENTS_MODE` | `internal` \| `dual` \| `x402` | Settlement backend (default `internal` until cutover) |

### Solana + x402

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_PLAY_SETTLEMENT_NETWORK` | yes (x402) | `solana:devnet` or `solana:mainnet-beta` |
| `AGENT_PLAY_USDC_MINT` | yes | SPL USDC mint address |
| `AGENT_PLAY_TREASURY_SOLANA` | yes | Platform receive address (base58) |
| `X402_FACILITATOR_URL` | yes | Verify/settle API base URL |
| `X402_FACILITATOR_AUTH` | optional | Bearer token for hosted facilitator |
| `SOLANA_RPC_URL` | recommended | Confirmation polling / fallback verify |

### Fees and policy

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_PLAY_PLATFORM_FEE_BPS` | `0` | Platform fee on applicable SKUs |
| `AGENT_PLAY_REQUIRE_AGENT_PAYEE_LINK` | `true` | Block talk if agent operator unlinked |
| `AGENT_PLAY_USDC_BUFFER_BPS` | `0` | Optional quote buffer for mainnet |

### Existing (unchanged)

| Variable | Purpose |
|----------|---------|
| `AGENT_SERVICE_KEY` | Platform ops (`CREATE SPACE`, content authoring) — orthogonal to user x402 |
| `AGENT_PLAY_HOST_ID` | Redis namespace isolation |

### Example `.env` block (devnet)

```bash
AGENT_PLAY_PAYMENTS_MODE=dual
AGENT_PLAY_SETTLEMENT_NETWORK=solana:devnet
AGENT_PLAY_USDC_MINT=4zMMC9srt5Ri5X14GPhXNGKMEAvVaeuxTMbq6R3__NYw
AGENT_PLAY_TREASURY_SOLANA=<your-platform-devnet-pubkey>
X402_FACILITATOR_URL=https://facilitator.example.com
SOLANA_RPC_URL=https://api.devnet.solana.com
AGENT_SERVICE_KEY=<min-16-chars>
```

Mint addresses must be validated per environment in host runbook — do not copy mainnet mints to devnet.

---

## Facilitator operations

### Hosted (e.g. Coinbase CDP)

- Register seller resource server URL
- Use facilitator auth header
- Free tier limits — monitor monthly tx count

### Self-hosted

- Deploy verify + settle endpoints matching x402 v2 spec
- Agent Play calls only HTTPS endpoints you control
- You operate Solana RPC and key management for settlement wallet (hot wallet risk)

### SLA expectations

| Facilitator state | Agent Play behavior |
|-------------------|---------------------|
| Healthy | Normal 402 → verify → commit |
| Degraded (slow) | Increase RPC timeouts; show UI spinner |
| Down | **503** on new paid ops; fail closed (no sold items) |
| Partial (verify OK, settle fail) | Reconciliation job — [10 — Observability](10-observability.md) |

---

## Kubernetes / production deploy

Add to deployment checklist ([kubernetes deployment](../../kubernetes-deployment.md)):

1. Secrets for `X402_FACILITATOR_AUTH`, treasury keys (if any server-side)
2. Network policy: egress to facilitator + Solana RPC
3. Probes: `/health` should include facilitator ping optional subcheck
4. Rolling deploy: `dual` mode during rollout to avoid stranding users

---

## AQL changes

### Deprecated (x402 mode)

| Statement | Replacement |
|-----------|-------------|
| `SET WALLET` | Remove — no internal balance |
| Assumption of free `$70` in seed scripts | Document paid flows; use devnet USDC |

### Unchanged

- `CREATE SPACE`, `ADD AMENITY`, content `ADD SHOP ITEM` / etc. still require `AGENT_SERVICE_KEY` when env set
- Content authoring is **not** user-wallet gated (platform ops)

### Planned (ops)

Optional future statements for scripted ops:

```aql
# Illustrative — not implemented
INSPECT SETTLEMENT
UNLINK SETTLEMENT FORCE
```

Paid user-facing ops go through watch UI + x402, not AQL playground, in v1.

### Seed script updates

Update `scripts/seed-amenities.aql` header:

- Phase 0 creates spaces; users need USDC for purchases in x402 mode
- Remove “wallet starts at $70” note when host is x402-only

---

## Operator runbooks

### Runbook: facilitator outage

1. Confirm `x402_verify_fail` spike in metrics
2. Set banner in watch UI: “Payments temporarily unavailable”
3. Optional: set `AGENT_PLAY_PAYMENTS_MODE=internal` **only** on private demo hosts (not production mixed)
4. Page facilitator provider
5. After recovery: run reconciliation job for `committed` intents without `txSignature`

### Runbook: wrong treasury address

1. Halt new `space.create` quotes via env freeze flag (planned)
2. Fix `AGENT_PLAY_TREASURY_SOLANA`
3. Reconcile misrouted txs manually on-chain
4. Post-mortem in audit log

### Runbook: stuck payment intent

1. Query Redis `payment-intent:*` with `status=verified` age > 15m
2. Check item still available
3. Either retry commit from ops tool or mark failed + refund off-chain policy
4. Document in incident log

### Runbook: user reports “paid but not sold”

1. Get `idempotencyKey` from client logs
2. Lookup intent + purchase list
3. Compare facilitator tx vs commit timestamp
4. If verify OK but no commit → manual commit or refund

---

## Platform UI

**Settlement tab** (platform page):

- Link / unlink wallet (SIWS)
- Show payee address for agent developers
- Export CSV of settlement rows
- Display `AGENT_PLAY_PAYMENTS_MODE` for host

---

## Production checklist

- [ ] All env vars in secrets manager (not git)
- [ ] Devnet vs mainnet mint documented per environment
- [ ] Facilitator outage runbook tested in staging
- [ ] `AGENT_SERVICE_KEY` rotation procedure unchanged
- [ ] On-call knows Redis key layout for payment intents

---

## Related

- [Master plan — Appendix B](../../x402-solana-payments-plan.md#appendix-b--environment-example)
- [Redis world](../../redis-world.md)
- [API keys](../../api-keys.md)
