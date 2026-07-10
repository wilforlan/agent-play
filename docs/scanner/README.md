# Agent Play Scanner

Agent Play Scanner is a public, read-only observability terminal at [`/scanner`](https://agent-play.com/scanner) (or `/scanner` on your deployment).

## What it shows

- **Chain head** — `snapshotRev`, `merkleRootHex`, session id
- **Ledger** — global USD and **APU** transactions with debit/credit sources
- **Nodes** — wallet balances and activity by main/agent node id
- **Blocks** — revision history with Merkle metadata
- **Analytics** — Segment-style in-platform events and property breakdowns
- **Spatial economy** — space GMV, talk billing, arcade APU stats

## Views

Use query params on the single `/scanner` route:

| URL | View |
|-----|------|
| `/scanner` | Dashboard |
| `/scanner?view=txs` | All transactions |
| `/scanner?view=apu` | APU-only transactions |
| `/scanner?view=analytics` | Event analytics |
| `/scanner?view=nodes` | Node directory |
| `/scanner/nodes/:nodeId` | Node profile (wallet, txs, analytics, game stats) |
| `/scanner?view=blocks` | Chain revisions |
| `/scanner?view=spaces` | Space economy summary |
| `/scanner?view=talk` | Talk billing summary |

Search: `/scanner?search=<txId|nodeId|messageId>`

## APIs

All endpoints are read-only unless noted.

- `GET /api/scanner/head` — chain head + platform cards
- `GET /api/scanner/txs` — paginated global transactions
- `GET /api/scanner/txs/:id` — transaction detail
- `GET /api/scanner/nodes` — node directory
- `GET /api/scanner/nodes/:id` — `{ profile: ScannerNodeProfile }` (public analytics, no PII)
- `GET /api/scanner/nodes/:id?section=txs&cursor=` — paginated tx slice
- `GET /api/scanner/nodes/:id?section=events&cursor=` — paginated analytics timeline
- `GET /api/scanner/search?q=` — unified search
- `GET /api/scanner/analytics/overview` — event KPIs
- `GET /api/scanner/analytics/events` — event stream / funnel / breakdowns
- `GET /api/scanner/blocks` — revision blocks
- `GET /api/scanner/leaves/:stableKey` — player-chain leaf digest
- `GET /api/scanner/spaces` — space GMV summary
- `GET /api/scanner/games/:gameId` — arcade stats
- `GET /api/scanner/talk` — talk billing summary
- `POST /api/analytics/track?sid=` — client UI events (requires valid session)
- `POST /api/admin/scanner/backfill` — ops backfill + materialized cache rebuild (admin token)

### Incremental query params

| Endpoint | Param | Purpose |
|----------|-------|---------|
| `GET /api/scanner/txs` | `sinceMs` | Live tail: txs at or after timestamp (ms) |
| `GET /api/scanner/txs` | `cursor` | Older pagination (scroll up) |
| `GET /api/scanner/analytics/events` | `since` | Live tail: stream entries after Redis stream ID |
| `GET /api/scanner/analytics/events` | `fields=summary` | Stream summary fields (default); `full` loads event bodies |
| `GET /api/scanner/blocks` | `sinceRev` | Live tail: blocks with `rev > sinceRev` |
| `GET /api/scanner/head` | `If-None-Match` | Conditional GET; returns `304` when unchanged |
| `GET /api/scanner/analytics/overview` | `If-None-Match` | Conditional GET; returns `304` when unchanged |

Live tail endpoints use `Cache-Control: no-store`. Head and analytics overview use short `max-age` with `ETag`.

### Materialized cache keys

Write-through bumps keep dashboard reads cheap:

```
agent-play:{hostId}:scanner:cache:head              HASH
agent-play:{hostId}:scanner:cache:tx:hour:{yyyy-MM-dd-HH}     STRING INCR
agent-play:{hostId}:scanner:cache:apu:mint:hour:{...}         STRING INCR
agent-play:{hostId}:scanner:cache:apu:burn:hour:{...}         STRING INCR
agent-play:{hostId}:scanner:cache:node:{nodeId}               HASH

agent-play:{hostId}:analytics:cache:overview                  HASH
agent-play:{hostId}:analytics:cache:events:hour:{yyyy-MM-dd-HH}  STRING INCR
```

`POST /api/admin/scanner/backfill` rebuilds hourly buckets from indexes after backfill completes.

## APU semantics

**APU** (Agent Play Units) are logged alongside USD in the scanner ledger. Earn paths include amenity purchases, arcade games, and talk rewards. Burn paths include wallet bundle redemption (APU → platform virtual dollar).

## Migration

On first access, Scanner backfills indexes from existing per-player purchase lists and wallets. Existing Redis wallets are not modified. New wallets seed at **$10 USD** (see spatial economy note).

## Related docs

- [Scanner architecture](../notes/agent-play-scanner-architecture.md)
- [In-platform analytics](../notes/in-platform-analytics.md)
- [Spatial economy investment note](../notes/spatial-economy-investment-note.md)
- [Payments and wallets](../payments-wallets-and-talk-billing.md)
