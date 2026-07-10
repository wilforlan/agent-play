# Space platform (`/platform`)

The space owner platform is a purchase-focused admin console for operators who hold a **space node** credential.

## Authentication

1. Open `/platform`.
2. Enter server URL, **space node id**, and **ten-word passphrase**.
3. Optionally enter a **platform key** when the deployment sets `AGENT_SERVICE_KEY` (required for `addShopItem` and related RPCs).
4. **Remember me (7 days):** stores a non-secret preview card (space name, node id, last auth). Resume requires re-entering the passphrase — credentials are never persisted in the browser.

Login flow: `/api/nodes/validate` → `/api/nodes` → `/api/agent-play/session`.

## Routes

| Route | Purpose |
|-------|---------|
| `/platform` | Login / resume |
| `/platform/overview` | GMV, purchase counts, item availability KPIs |
| `/platform/purchases` | Purchase ledger (scanner txs) |
| `/platform/amenities` | Amenity list |
| `/platform/amenities/[kind]` | Item catalog for `shop`, `supermarket`, or `car_wash` |
| `/platform/activity` | Amenity logs (`action: "purchase"` highlighted) |
| `/platform/wallet` | Space owner settlement wallet (sales credit here) |
| `/platform/aql` | Embedded AQL runner |

## Purchase KPIs

Overview and purchases BFF routes read Scanner indexes:

- `GET /api/platform/spaces/{spaceId}/overview`
- `GET /api/platform/spaces/{spaceId}/purchases?sinceMs=&limit=`

Auth headers match sdk/rpc space operations: `x-node-id`, `x-node-passw`, optional `x-agent-service-key`.

Metrics include:

- **GMV** — sum of `priceUsd` on `purchase` scanner txs for the space
- **Purchase count** — count of those txs (24h window available)
- **Items available / sold** — from shop, supermarket, and car wash catalogs

Reconcile revenue with [Scanner](../scanner/README.md) space summaries and per-tx detail.

## Amenity item management

Use `/platform/amenities/[kind]` or AQL:

- `ADD SHOP ITEM` / `ADD SUPERMARKET ITEM` / `ADD CARWASH CAR`
- Remove via platform UI or `removeShopItem`, `removeSupermarketItem`, `removeCarWashCar` RPCs

In-world buyers use the `purchase` RPC; sold items show `sale.status: "sold"`.

## Leases removed

**Amenity tenancy leases** (`CREATE LEASE AMENITY`, `createAmenityLease`, `cancelAmenityLease`) are no longer supported. `inspectSpace` and `inspectAmenity` no longer return a `leases` field.

Presence TTL leases (agent heartbeat) and the Lease Locker mini-game are unchanged.

## Related docs

- [AQL language reference](../aql/language-reference.md)
- [Architecture — purchases](../architecture.md)
- [Structures and spaces](../notes/structures-and-spaces-world-model.md)
