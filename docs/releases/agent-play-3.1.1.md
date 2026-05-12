# Agent Play 3.1.1 (from 3.1.0)

Monorepo **3.1.1** lands the **world-switch stage architecture** for the play canvas, **server-authoritative amenity content** (bookstore / supermarket / car wash) with **sold-state** lifecycle, a **per-player wallet** seeded at **$70** on first read, and three new **AQL** statements that author this content from the playground. It also captures the structure-versus-space split that landed earlier in this line, the occupancy-grid rectangle migration, the world-layout / streets-and-zones model with browser-side migration hooks, the debug-panel additions, and the passphrase-derived node auth refactor that backs `USE AGENT NODE` / `USE SPACE NODE`.

## Headline summary

A single Pixi application now hosts three sibling stages — **overworld**, **space yard**, and **amenity** — and the new `stage-controller` tweens `alpha 1→0` plus `scale 1→0.96` over ~280 ms when one stage replaces another. The yard is a fenced compound with up to three large amenity pads; each amenity opens a dedicated scene (a bookstore for shop, four themed rows for supermarket, a nine-slot lot for car wash) authored end-to-end with AQL and persisted to Redis. Items render their **sold** state in-place via a luminance-preserving grey palette and a red diagonal SOLD banner. `Esc` exits any inner stage one level up, and an **exit-door sprite** at stage-local `(0, 0)` triggers the same transition by proximity.

## Structures

The structure-vs-space distinction is now consistent across the SDK, server, and play UI: a **structure** is the on-canvas placeable that anchors a space; a **space** is the catalog entity that owns amenities, leases, and content. Structures live inside space **zones** rather than carrying raw `x, y` coordinates on the DB record; anchoring is computed at runtime in `resolveStructureAnchorsAtRuntime` so theme rebuilds and zone moves stay deterministic. Tiered proximity placement (preferred → fallback → backup) makes side-by-side structures reproducibly non-overlapping.

**Source**

- [`packages/web-ui/src/server/agent-play/grid-allocate.ts`](../../packages/web-ui/src/server/agent-play/grid-allocate.ts) — `resolveStructureAnchorsAtRuntime`, tiered proximity placement.
- [`packages/web-ui/src/server/agent-play/play-world.ts`](../../packages/web-ui/src/server/agent-play/play-world.ts) — structure → space anchoring at snapshot time.

## Spaces

The space catalog model now declares its amenity kinds (`supermarket`, `shop`, `car_wash`), enforces a `MAX_SPACE_AMENITIES` cap, and carries a new optional **`amenityContent`** block on the snapshot (`SpaceCatalogEntryJson`). The block fans out shop items, supermarket items, and car-wash cars so clients re-render sold-state changes without a separate fetch; older snapshots that omit the block are normalised in place.

**Source**

- [`packages/web-ui/src/server/agent-play/preview-serialize.ts`](../../packages/web-ui/src/server/agent-play/preview-serialize.ts) — `SpaceCatalogEntryJson.amenityContent`, `normalizePreviewSnapshot`.
- [`packages/sdk/src/lib/space-content-model.ts`](../../packages/sdk/src/lib/space-content-model.ts) — `SaleStateSchema`, `ShopItemSchema`, `SupermarketItemSchema`, `CarWashCarSchema`, `PurchaseRecordSchema`, `isItemAvailableForPurchase`, `desaturateColor`.

## AQL

AQL gains three content-authoring statements, all of which require an active `USE SPACE NODE` and insert with `sale.status = 'available'`:

```aql
ADD SHOP ITEM TYPE "book" NAME "Hitchhiker"
  DESCRIPTION "Don't Panic" PRICE 12.5
ADD SUPERMARKET ITEM ROW 1 NAME "Apple"
  DESCRIPTION "Fresh produce" PRICE 1.25
ADD CARWASH CAR NAME "Sport Coupe" MODEL "GT 350"
  YEAR 2024 PRICE 28999 COLOR "#5a87d1"
```

The lexer now reads decimal literals so `PRICE` can carry cents. The executor returns structured errors — `ITEM_ALREADY_SOLD`, `INSUFFICIENT_FUNDS`, `AMENITY_NOT_ON_SPACE` — that surface as inline diagnostics in the playground. Full grammar, fields, defaults, error catalog, and end-to-end recipes live in the rewritten single-page reference at [`docs/aql/language-reference.md`](../aql/language-reference.md).

**Source**

- [`packages/web-ui/src/app/playground/_lib/aql-lexer.ts`](../../packages/web-ui/src/app/playground/_lib/aql-lexer.ts) — decimal-literal support.
- [`packages/web-ui/src/app/playground/_lib/aql-parser.ts`](../../packages/web-ui/src/app/playground/_lib/aql-parser.ts) — new statement productions.
- [`packages/web-ui/src/app/playground/_lib/aql-validator.ts`](../../packages/web-ui/src/app/playground/_lib/aql-validator.ts), [`aql-executor.ts`](../../packages/web-ui/src/app/playground/_lib/aql-executor.ts), [`aql-autocomplete.ts`](../../packages/web-ui/src/app/playground/_lib/aql-autocomplete.ts).
- [`docs/aql/language-reference.md`](../aql/language-reference.md) — single-page command reference.

## New game-stage architecture

A new `stage-controller` owns the small history stack of `StageHandle`s and orchestrates `enter` / `back` / `destroy`. Each stage is a thin module that exposes `attach`, `detach`, and `onSnapshot`; the controller is intentionally Pixi-agnostic so it can be exercised with stubs in tests. The same single `Pixi.Application` and `app.ticker` continue to drive every frame — only the mounted stage changes — so animation, theming, and the existing multiverse rebuild path remain unaffected.

**Source**

- [`packages/play-ui/src/stage-controller.ts`](../../packages/play-ui/src/stage-controller.ts)
- [`packages/play-ui/src/overworld-stage.ts`](../../packages/play-ui/src/overworld-stage.ts) — overworld wrapped as a `StageHandle`.
- [`packages/play-ui/src/main.ts`](../../packages/play-ui/src/main.ts) — bootstrap that mounts the overworld through the controller and ticks transitions each frame.

## Game navigation

Movement keys remain unchanged on the overworld; the new flow adds:

| From | Key | Effect |
|------|-----|--------|
| Overworld near a structure | `A` | Enter the space yard for that space |
| Yard near an amenity pad | `P` | Enter the corresponding amenity stage |
| Amenity near an item | `P` | Open the item tooltip (Buy / SOLD) |
| Yard or amenity | `Esc` | Exit one level up (yard → overworld, amenity → yard) |
| Yard or amenity | Walk into the **exit-door** proximity at stage-local `(0, 0)` | Same as `Esc` |

The proximity resolver is now object-centric (`agent | structure | amenityPad | amenityItem | exitDoor`) and the keymap is scoped per stage in `stage-input-router`. Touch parity surfaces an "Exit" affordance when the player is inside the door's proximity radius.

**Source**

- [`packages/play-ui/src/space-yard-stage.ts`](../../packages/play-ui/src/space-yard-stage.ts) — fenced compound, three pads, exit door at `(0, 0)`.
- [`packages/play-ui/src/sprite-exit-door.ts`](../../packages/play-ui/src/sprite-exit-door.ts) — door sprite and `EXIT_DOOR_PROXIMITY_RADIUS_WORLD`.
- [`packages/play-ui/src/stage-input-router.ts`](../../packages/play-ui/src/stage-input-router.ts) — pure key/proximity → action mapping.
- [`packages/play-ui/src/proximity-interaction.ts`](../../packages/play-ui/src/proximity-interaction.ts) — object-centric resolver.

## UI updates

The play canvas now carries a **wallet HUD** pill at top-right that fetches `/api/agent-play/players/<id>/wallet` on bootstrap and after every purchase response. The **item tooltip** shows name, description, price, and a Buy button for available items, and a disabled SOLD pill (with `Bought by <playerId>` when known) for sold ones. Errors from the purchase RPC (`ITEM_ALREADY_SOLD`, `INSUFFICIENT_FUNDS`) appear inline. Streets are signposted with T-shaped sign-post sprites and street lights; labels render in white; spaces are drawn in building format (no fence) with a small "x amenities" caption.

**Source**

- [`packages/play-ui/src/wallet-hud.ts`](../../packages/play-ui/src/wallet-hud.ts), [`item-tooltip.ts`](../../packages/play-ui/src/item-tooltip.ts).
- [`packages/play-ui/src/world-street-signs.ts`](../../packages/play-ui/src/world-street-signs.ts) — `buildTSignPost` shared between overworld and yard.
- [`packages/play-ui/src/sprite-shop-item.ts`](../../packages/play-ui/src/sprite-shop-item.ts), [`sprite-grocery-item.ts`](../../packages/play-ui/src/sprite-grocery-item.ts), [`sprite-car.ts`](../../packages/play-ui/src/sprite-car.ts), [`sprite-sold-overlay.ts`](../../packages/play-ui/src/sprite-sold-overlay.ts).

## Spaces and amenities actions

Content authoring goes through AQL (`ADD SHOP/SUPERMARKET/CARWASH …`) or the browser console (`world.amenity.shop.add({ … })`, `supermarket.add`, `carWash.add`). The **purchase** RPC reads the wallet and target item under `WATCH`, then writes the wallet decrement, the item's `sale = { status: 'sold', soldToPlayerId, soldAt }`, and an append-only `PurchaseRecord` inside a single `MULTI` so concurrent buyers cannot both succeed. The wallet is **lazily seeded at `DEFAULT_PLAYER_WALLET_BALANCE_USD` ($70)** on a player's first read, also inside `MULTI`, so two concurrent first-reads still leave the balance at exactly $70.

**Source**

- [`packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`](../../packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts) — `addShopItem` / `addSupermarketItem` / `addCarWashCar` / `removes` / `enterSpace` / `enterAmenity` / `purchase`.
- [`packages/web-ui/src/server/agent-play/session-store.ts`](../../packages/web-ui/src/server/agent-play/session-store.ts), [`redis-session-store.ts`](../../packages/web-ui/src/server/agent-play/redis-session-store.ts), [`session-store.test-double.ts`](../../packages/web-ui/src/server/agent-play/session-store.test-double.ts).
- [`packages/web-ui/src/app/api/agent-play/players/[id]/wallet/route.ts`](../../packages/web-ui/src/app/api/agent-play/players/[id]/wallet/route.ts) — read endpoint that triggers the lazy seed.
- [`packages/play-ui/src/world-console-extensions.ts`](../../packages/play-ui/src/world-console-extensions.ts) — `world.enter.*`, `world.wallet.*`, `world.amenity.*`.

## Occupancy grid → rectangle definitions

Occupancy is now described as rectangles rather than as discrete spatial zones. New helpers — `pointCellInRect`, `listOccupancyPointsInRect`, `isAgentSpawnOccupancyPointAvailableInRect`, `isSpaceAnchorOccupancyPointAvailableInRect` — replace the older zone-keyed lookups. Existing callers were rewired to the rect API and the deprecated names removed; older snapshots remain readable.

**Source**

- [`packages/sdk/src/lib/occupancy-grid-model.ts`](../../packages/sdk/src/lib/occupancy-grid-model.ts) — rect-based helpers.

## Streets and zones

The world layout is now a first-class model (`WorldLayout`) with Redis persistence (`WorldLayoutRepository`) and a bootstrap helper (`bootstrapWorldLayoutIfNeeded`). Bounds migrations run at runtime via `migrateWorldLayoutBounds` and `applyBoundsFieldUpdateToLayout`, exposed in the browser as `world.layout.bounds.set('maxX', 32)` and served by `POST /api/agent-play/world-layout/bounds`. Streets and zones are derived from this layout so debug overlays and signposts stay in sync after a migration.

**Source**

- [`packages/sdk/src/lib/world-layout-model.ts`](../../packages/sdk/src/lib/world-layout-model.ts).
- [`packages/web-ui/src/app/api/agent-play/world-layout/bounds/route.ts`](../../packages/web-ui/src/app/api/agent-play/world-layout/bounds/route.ts).

## Debug panel

`getDebugSnapshot()` now exposes zones with `occupantCount`, and `createPreviewDebugPanel` renders the street labels and the primary occupant group beside each street. The same data drives the debug overlay in the watch UI without an extra round trip.

**Source**

- [`packages/web-ui/src/server/agent-play/play-world.ts`](../../packages/web-ui/src/server/agent-play/play-world.ts) — `getDebugSnapshot`.
- [`packages/play-ui/src/preview-debug-panel.ts`](../../packages/play-ui/src/preview-debug-panel.ts) — debug-panel renderer.

## Node authentication refactor

`USE AGENT NODE` and `USE SPACE NODE` now derive their password material on separate paths (`nodePasswordMaterial` vs `spacePasswordMaterial` in `aql-types.ts`), so the AQL session can hold an agent context and a space context independently. The 3.1.1 amenity-content writes piggy-back on the active **space** context with no new auth surface: any client that holds a valid space passphrase can author content, and the existing `x-node-id` / `x-node-passw` checks gate the underlying RPC routes.

**Source**

- [`packages/web-ui/src/app/playground/_lib/aql-types.ts`](../../packages/web-ui/src/app/playground/_lib/aql-types.ts) — `nodePasswordMaterial`, `spacePasswordMaterial`.
- [`packages/web-ui/src/app/playground/_lib/aql-executor.ts`](../../packages/web-ui/src/app/playground/_lib/aql-executor.ts) — dispatch through the active space context.

## Upgrading

1. Bump dependencies to **`^3.1.1`** for **@agent-play/intercom**, **@agent-play/sdk**, and **@agent-play/play-ui** if you embed the canvas.
2. Run **`npm install`** at the repo root.
3. Regenerate the API reference: **`npm run docs:api`** (TypeDoc now picks up the new TSDoc on `space-content-model`, `stage-controller`, the new stages, `wallet-hud`, and `item-tooltip`).
4. Regenerate the in-app docs mirror: **`npm run dev`** runs `copy-docs.mjs` automatically so the rewritten [`docs/aql/language-reference.md`](../aql/language-reference.md) lands at `/doc/aql/language-reference`.

## Compatibility notes

- Older snapshots without `worldLayout` or `amenityContent` are normalised on read; no migration is required.
- Sold items cannot be hard-removed without the `--force` flag on `REMOVE SHOP ITEM` / `REMOVE SUPERMARKET ITEM` / `REMOVE CARWASH CAR`, so historical purchases stay reproducible.
- A player's first read of `GET /api/agent-play/players/<id>/wallet` atomically seeds the wallet at **$70**; subsequent reads return the persisted balance. Concurrent first-reads are idempotent.
- Wire-level fanout adds `space:amenity_content_updated` and `player:wallet_seeded` events; see [`packages/intercom/README.md`](../../packages/intercom/README.md).

For the full command reference, see [`docs/aql/language-reference.md`](../aql/language-reference.md); for the play-canvas exit semantics, see [`packages/play-ui/README.md`](../../packages/play-ui/README.md).
