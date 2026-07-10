# In-platform analytics

Agent Play uses a **Segment-style** events + properties model stored in **separate Redis keys** from the Scanner ledger.

## Event envelope

Defined in [`packages/sdk/src/lib/analytics-event-model.ts`](../../packages/sdk/src/lib/analytics-event-model.ts):

- `messageId` — idempotent dedup key
- `event` — canonical name (e.g. `Purchase Completed`)
- `distinctId` — main node id (wallet player id)
- `timestamp` — ISO-8601
- `properties` — flat key/value (string | number | boolean | null)
- `context` — `hostId`, optional `sid`, `snapshotRev`, `library`

## Redis keys

```
agent-play:{hostId}:analytics:events              STREAM
agent-play:{hostId}:analytics:event:{name}      ZSET
agent-play:{hostId}:analytics:by-user:{id}        ZSET
agent-play:{hostId}:analytics:event-body:{id}   STRING (90d TTL)
agent-play:{hostId}:analytics:traits:{id}         HASH
agent-play:{hostId}:analytics:agg:count:{event}   INCR
agent-play:{hostId}:analytics:agg:prop:{event}:{property}  HASH
agent-play:{hostId}:analytics:migration:state   HASH
```

## Canonical server events

| Event | Source |
|-------|--------|
| `Purchase Completed` | `executePurchase` / backfill |
| `Wallet Bundle Redeemed` | `redeemWalletBundle` |
| `Game Round Completed` | `applyGameOutcome` APU rows |
| `Talk Session Billed` | talk billing |
| `Wallet Seeded` | first `getPlayerWallet` |
| `Space Entered` | `enterSpace` RPC |
| `Amenity Entered` | `enterAmenity` RPC |
| `World Journey Recorded` | `recordJourney` RPC |
| `World Interaction Recorded` | `recordInteraction` RPC |
| `Chain Revision Published` | `persistSnapshotReturningRev` |

Client events (lower trust) via `POST /api/analytics/track?sid=`:

- `UI Presentation Action`
- `Scanner View Opened`

Vercel Analytics in [`presentation-analytics.ts`](../../packages/play-ui/src/presentation-analytics.ts) remains parallel; in-platform analytics is the Scanner dashboard source of truth.

## Backfill

[`analytics-backfill.ts`](../../packages/web-ui/src/server/analytics/analytics-backfill.ts) derives events from:

1. Per-player purchase lists (`messageId = backfill:purchase:{id}`)
2. Session event log (`messageId = backfill:log:{index}`)

Properties include `backfilled: true`.

## Scanner UI

`/scanner?view=analytics` reads:

- `GET /api/scanner/analytics/overview`
- `GET /api/scanner/analytics/events`
- Funnel: `?view=funnel&steps=Space Entered,Amenity Entered,Purchase Completed`

## Funnels and KPIs

Recommended funnels under **$10 wallet seed**:

1. `Wallet Seeded` → `Game Round Completed` → `Wallet Bundle Redeemed`
2. `Space Entered` → `Amenity Entered` → `Purchase Completed`

Track **APU velocity** (mint vs burn) and **bundle redemption rate** in Scanner head KPIs.
