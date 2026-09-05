# Agent Play Scanner

Agent Play Scanner is a public, read-only observability terminal at [`/scanner`](https://agent-play.com/scanner) (or `/scanner` on your deployment).

## What it shows

- **Chain head** — `snapshotRev`, `merkleRootHex`, session id (status line, not hero tiles)
- **Ledger** — USD, APU, SOL, and P2P settlements with kind badges
- **Market cards** — circulating APU, escrowed APU, open P2P orders, fee SOL, mint/burn
- **Nodes** — wallet balances and activity by main/agent node id
- **Blocks** — revision history with Merkle metadata
- **Analytics** — Segment-style in-platform events and property breakdowns
- **Spatial economy** — space GMV, talk billing, arcade APU stats from write-through hashes

Space operators can reconcile purchase GMV on [`/platform`](../platform/README.md) (overview + purchases routes use the same scanner tx indexes).

The **daily activity hash** (`econext:{host}:market:daily-activity`) is the published series for Scanner headlines. `scanner:txs` is the journal. Headlines are **Today / 7D / 30D** UTC day buckets plus `ZCARD` for all-time. Scanner does not walk the journal for KPIs.

Visual tokens live only in `packages/web-ui/src/app/scanner/scanner-page.module.css` (`--sc-*` on the Scanner root). Agent Play World chrome is untouched.

## Views

Use query params on the single `/scanner` route:

| URL | View |
|-----|------|
| `/scanner` | Overview (hero + market strip + tape) |
| `/scanner?view=txs` | Transactions tape |
| `/scanner?view=analytics` | Event analytics |
| `/scanner?view=nodes` | Node directory |
| `/scanner/nodes/:nodeId` | Node profile (USD + APU hero, amenity bars) |
| `/scanner/txs/:id` | Receipt-style transaction detail |
| `/scanner?view=blocks` | Chain revisions |
| `/scanner?view=spaces` | Space economy summary |
| `/scanner?view=talk` | Talk billing summary |

Tape filters: All / APU / SOL / USD / P2P. Search: transaction, node, or message id.

## APIs

All endpoints are read-only unless noted.

- `GET /api/scanner/head` — chain head + Today/7D/30D + market cards
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
| `GET /api/scanner/txs` | `token=APU\|USD\|SOL` | Tape token filter |
| `GET /api/scanner/txs` | `source=p2p\|transfer\|trade\|sol` | Tape source filter |
| `GET /api/scanner/analytics/events` | `since` | Live tail: stream entries after Redis stream ID |
| `GET /api/scanner/analytics/events` | `fields=summary` | Stream summary fields (default); `full` loads event bodies |
| `GET /api/scanner/blocks` | `sinceRev` | Live tail: blocks with `rev > sinceRev` |
| `GET /api/scanner/head` | `If-None-Match` | Conditional GET; returns `304` when unchanged |
| `GET /api/scanner/analytics/overview` | `If-None-Match` | Conditional GET; returns `304` when unchanged |

Live tail endpoints use `Cache-Control: no-store`. Head and analytics overview use short `max-age` with `ETag`.

### Materialized cache keys

Write-through bumps keep dashboard reads cheap:

```
econext:{hostId}:market:daily-activity              HASH (published series)
econext:{hostId}:market:daily-activity:ready        STRING
econext:{hostId}:market:apw-cap                     STRING
econext-p2p:{hostId}:escrow:apu:total               STRING
econext-p2p:{hostId}:orders:open                    ZSET

agent-play:{hostId}:scanner:txs                     ZSET (journal)
agent-play:{hostId}:scanner:cache:supply            HASH
agent-play:{hostId}:scanner:cache:space:{spaceId}   HASH
agent-play:{hostId}:scanner:cache:talk              HASH
agent-play:{hostId}:scanner:cache:game:{gameId}     HASH
agent-play:{hostId}:scanner:cache:node:{nodeId}     HASH

agent-play:{hostId}:analytics:cache:overview        HASH
agent-play:{hostId}:analytics:cache:events:hour:{yyyy-MM-dd-HH}  STRING INCR
```

`POST /api/admin/scanner/backfill` pages the journal without a 5,000 cap, indexes historical Econext ledger SOL/convert rows, rewrites the daily hash (`DEL` rebuild + `RENAME`), and rebuilds space/talk/game/supply hashes.

## APU and SOL semantics

**APU** (Agent Play Units) are logged alongside USD in the scanner ledger. Earn paths include amenity purchases, arcade games, and talk rewards. Burn paths include wallet bundle redemption (APU → platform virtual dollar). P2P and transfers do not mint or burn.

**SOL** is first-class: P2P settlements, deposits, payouts, and APU→SOL convert write scanner rows with `solLamportsDelta`. Scanner displays SOL, never lamports. P2P counts deal SOL on the seller debit only.

Market Growth on Econext still uses `txCount` / `volumeApu` (APU-related). Scanner headlines use `ledgerTxCount` plus SOL fields beside those.

## Migration

On first access, Scanner backfills indexes from existing per-player purchase lists, wallets, and Econext account ledgers. Existing Redis wallets are not modified. New wallets seed at **$10 USD** (see spatial economy note).

## Related docs

- [Scanner architecture](../notes/agent-play-scanner-architecture.md)
- [In-platform analytics](../notes/in-platform-analytics.md)
- [Spatial economy investment note](../notes/spatial-economy-investment-note.md)
- [Payments and wallets](../payments-wallets-and-talk-billing.md)
