# AQL language reference

The Agent Query Language (AQL) is the in-browser command surface for
agent-play. This page is the **single canonical reference** for every
statement the playground supports, including the amenity-content and
wallet commands introduced in 3.1.1 and the scoped amenity commands
(`USE AMENITY`, `REMOVE AMENITY ITEMS`, extended `INSPECT AMENITY`) in 3.1.2.
[`packages/web-ui/src/app/playground/_lib`](../../packages/web-ui/src/app/playground/_lib).

> The play canvas (overworld → space yard → amenity stage) is driven by
> the [stage controller](../../packages/play-ui/README.md). Exit keys
> and the exit-door sprite are documented in
> [Play canvas exits](#play-canvas-exits-non-aql) below.

## Contents

1. [At a glance](#at-a-glance)
2. [Connection and session](#connection-and-session)
3. [Inspection](#inspection)
4. [Agent + intercom](#agent--intercom)
5. [Space lifecycle](#space-lifecycle)
6. [Amenity content (new)](#amenity-content-new)
7. [Wallet and purchases (new)](#wallet-and-purchases-new)
8. [World layout (browser console)](#world-layout-browser-console)
9. [Play canvas exits (non-AQL)](#play-canvas-exits-non-aql)
10. [Error catalog](#error-catalog)
11. [End-to-end recipes](#end-to-end-recipes)

## At a glance

- Execution model: each line is a statement; statements run in order via
  [`executeAqlProgram`](../../packages/web-ui/src/app/playground/_lib/aql-executor.ts).
- Comments: `#` starts a line comment.
- Strings: double-quoted; escape `\"` and `\\`.
- Numbers: integers and decimals (e.g. `12.5`).
- Variables: `$name` and `$obj.field`.
- Lexer / parser / validator entry points: see
  [`aql-lexer.ts`](../../packages/web-ui/src/app/playground/_lib/aql-lexer.ts),
  [`aql-parser.ts`](../../packages/web-ui/src/app/playground/_lib/aql-parser.ts),
  [`aql-validator.ts`](../../packages/web-ui/src/app/playground/_lib/aql-validator.ts).

### `LET`

```aql
LET name = expr
```

Binds a value to `$name` for later statements in the same program.

### `WITH HEADER` / `WITH TIMEOUT`

```aql
WITH HEADER "X-Trace" = "abc"
WITH TIMEOUT 5000
```

Set per-request headers and operation timeouts.

### `MACRO` / `CALL` / `RETURN`

```aql
MACRO stockShelf(items) {
  CALL items
  RETURN $items
}
```

Defines reusable statement lists; `CALL name(args)` runs them.

**Source:**
[`aql-parser.ts`](../../packages/web-ui/src/app/playground/_lib/aql-parser.ts),
[`aql-executor.ts`](../../packages/web-ui/src/app/playground/_lib/aql-executor.ts).

## Connection and session

### `CONNECT`

```aql
CONNECT "http://localhost:3000"
```

Selects the runtime client. Required for `FETCH`, `SEND`, and every RPC.

### `USE AGENT NODE` / `SHIFT AGENT NODE`

```aql
USE AGENT NODE "alice"
SHIFT AGENT NODE
```

Targets an agent by node id. `SHIFT` rotates to the next agent in the
catalog.

### `USE SPACE NODE`

```aql
USE SPACE NODE "node:…" PASSPHRASE "word1 word2 … word10"
```

Activates a space context for `ADD SHOP ITEM`, `ADD SUPERMARKET ITEM`,
`ADD CARWASH CAR`, lease operations, `USE AMENITY`, `REMOVE AMENITY ITEMS`,
and amenity content removals. **Requires** a ten-word `PASSPHRASE` after the
node id (see [`aql-parser.ts`](../../packages/web-ui/src/app/playground/_lib/aql-parser.ts)).

## Inspection

### `INSPECT MAIN NODE`

```aql
INSPECT MAIN NODE
```

Reads metadata about the main intercom node.

### `INSPECT SPACE` / `INSPECT AMENITY` / `INSPECT AGENT`

```aql
INSPECT SPACE
USE AMENITY "shop"
INSPECT AMENITY
INSPECT AMENITY "supermarket"
INSPECT AGENT
```

- `INSPECT SPACE` calls `inspectSpace` and returns `{ catalog, leases, logs }`.
- `INSPECT AMENITY` calls `inspectAmenity`. With an explicit kind string
  (`"shop"`, `"supermarket"`, or `"car_wash"`), the response includes
  `kind`, `items` (array for that kind), `logs`, and `leases`. With **no**
  kind argument, the executor sends no `kind` filter; the server returns
  `items` as `{ shopItems, supermarketItems, carWashCars }` plus `logs` and
  `leases`. If you omit the kind expression but have run `USE AMENITY
  "<kind>"`, the executor supplies that kind so `INSPECT AMENITY` alone
  inspects the scoped amenity.
- `INSPECT AGENT` reads the active agent context.

### `FETCH OCCUPANTS | METADATA | SNAPSHOT`

```aql
FETCH SNAPSHOT
SHOW RESPONSE
```

Pulls a slice of state from the runtime. `INTO name` copies the last
response into `$name`.

### `SHOW RESPONSE | HEADERS | <var>`

```aql
SHOW RESPONSE
SHOW HEADERS
SHOW $myVar
```

`SHOW <var>` overrides the last response for display.

## Agent + intercom

### `SEND`

```aql
SEND "ring the bell"
```

Routes a message to the active agent node. **Requires** `USE AGENT NODE`.

## Space lifecycle

### `CREATE SPACE` / `REMOVE SPACE`

```aql
CREATE SPACE "SandMill Circle"
REMOVE SPACE "space-sandmill-circle"
```

### `ADD SPACE AMENITY` / `REMOVE SPACE AMENITY`

```aql
ADD SPACE AMENITY "shop"
REMOVE SPACE AMENITY "shop"
```

Mutates the amenity set on the active space. Both require
`USE SPACE NODE`.

### `CREATE LEASE`

```aql
CREATE LEASE "shop"
```

Records an amenity lease; see the session-store implementation in
[`session-store.ts`](../../packages/web-ui/src/server/agent-play/session-store.ts).

## Amenity content (new)

### `USE AMENITY`

After `USE SPACE NODE`, selects which amenity kind subsequent commands target
when the kind would otherwise be ambiguous. Required before
`REMOVE AMENITY ITEMS`. Cleared when you switch to another space node or to
an agent node.

```aql
USE AMENITY "shop"
USE AMENITY "supermarket"
USE AMENITY "car_wash"
```

### `REMOVE AMENITY ITEMS`

Deletes persisted amenity **content** rows (shop items, supermarket items,
or car-wash cars) for the active space. Does **not** remove the amenity slot
from the space catalog; for that, use `REMOVE AMENITY "<spaceId>" "<kind>"`
(space lifecycle section).

```aql
USE AMENITY "shop"
REMOVE AMENITY ITEMS ALL

USE AMENITY "supermarket"
REMOVE AMENITY ITEMS "sm-uuid-1", "sm-uuid-2"
```

- `ALL` — delete every item of the scoped kind in this space.
- Comma-separated quoted ids — delete only those rows (must match the
  current `USE AMENITY` kind).

The RPC is `removeAmenityItems` with `{ spaceId, kind, all: true }` or
`{ spaceId, kind, itemIds: [...] }`. Each successful removal fans out like
the single-item `removeShopItem` / `removeSupermarketItem` /
`removeCarWashCar` operations.

Every amenity content row is created with `sale.status: "available"`.
Buying an item flips `sale.status` to `"sold"` and records
`soldToPlayerId` + `soldAt`. Items in the sold state can be removed
only with the `--force` flag (see
[`removeShopItem`](../../packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts)).

### `ADD SHOP ITEM`

**Syntax**

```aql
ADD SHOP ITEM TYPE "book" NAME "Hitchhiker"
  DESCRIPTION "Don't Panic" PRICE 9.99
```

**Fields**

- `TYPE` — one of `"book"`, `"music"`, `"coffee"`.
- `NAME` — display label.
- `DESCRIPTION` — tooltip body.
- `PRICE` — USD, decimal accepted.

**Returns** the persisted item (with `sale.status: "available"`).

**Source:**
[`aql-parser.ts`](../../packages/web-ui/src/app/playground/_lib/aql-parser.ts),
[`route.ts`](../../packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts).

### `ADD SUPERMARKET ITEM`

**Syntax**

```aql
ADD SUPERMARKET ITEM ROW 1 NAME "Apple"
  DESCRIPTION "fresh and crisp" PRICE 1.25 COLUMN 2
```

**Fields**

- `ROW` — 1 (Fruits), 2 (Mens), 3 (Womens), 4 (Kids).
- `COLUMN` — optional, 1..5; the server auto-picks a free slot when
  omitted.
- `NAME`, `DESCRIPTION`, `PRICE` — same as above.

**Returns** the persisted item.

### `ADD CARWASH CAR`

**Syntax**

```aql
ADD CARWASH CAR SLOT 3 NAME "Sport Coupe" MODEL "GT 350"
  YEAR 2024 PRICE 28999 COLOR "#5a87d1"
```

**Fields**

- `NAME`, `MODEL`, `YEAR`, `PRICE`, `COLOR` (hex `#rrggbb`).
- `SLOT` — optional, 1..9; auto-assigned when omitted.

**Returns** the persisted car.

### Sold-state semantics

When a purchase succeeds, the server atomically:

1. Sets `sale.status = "sold"`, `sale.soldToPlayerId = playerId`,
   `sale.soldAt = ISO-timestamp`.
2. Decrements the player wallet by `priceUsd`.
3. Appends a purchase audit row.
4. Fans out the updated snapshot so every connected client repaints the
   card with a desaturated body and the red `SOLD` banner (see
   [`sprite-sold-overlay.ts`](../../packages/play-ui/src/sprite-sold-overlay.ts)).

Re-attempting a purchase against the same item returns
`ITEM_ALREADY_SOLD`.

## Wallet and purchases (new)

Every player starts with a wallet seeded at
`DEFAULT_PLAYER_WALLET_BALANCE_USD = $70` on **first** read. The seeding
is lazy and atomic — see
[`redis-session-store.ts`](../../packages/web-ui/src/server/agent-play/redis-session-store.ts).
No manual setup is required for a new player to start spending.

### `INSPECT WALLET`

```aql
INSPECT WALLET OF PLAYER "player-42"
SHOW RESPONSE
```

Returns the persisted wallet (or seeds one at $70 on first call).

### `SET WALLET BALANCE`

```aql
SET WALLET BALANCE OF PLAYER "player-42" 100
```

Sets the wallet balance directly. Useful for resetting test environments.

### Purchases

Purchases are issued by the play-canvas tooltip (the `Buy` button calls
the `purchase` RPC). They are not currently authored from AQL —
authoring purchases through the language reference is not exposed
because real purchases must originate from a player session, not a
script. The RPC contract is documented in
[`route.ts`](../../packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts).

## World layout (browser console)

`world.layout.bounds.set(field, value)` adjusts world layout bounds at
runtime. This is a browser console API, not AQL. See
[`world-layout-model.ts`](../../packages/sdk/src/lib/world-layout-model.ts).

## Play canvas exits (non-AQL)

When the player is inside the **space yard** or any **amenity stage**:

- Press **`Esc`** to leave the current inner stage (amenity → yard,
  yard → overworld).
- Walk into the **exit door** sprite anchored at stage-local `(0, 0)`
  for the same effect. The proximity radius is
  `EXIT_DOOR_PROXIMITY_RADIUS_WORLD ≈ 1.5` world cells (see
  [`sprite-exit-door.ts`](../../packages/play-ui/src/sprite-exit-door.ts)).
- On touch devices, the bottom action bar exposes an `Exit` chip when
  the door is the active proximity partner.

The keymap is implemented by
[`stage-input-router.ts`](../../packages/play-ui/src/stage-input-router.ts).

## Error catalog

| Code | Where it surfaces | Remediation |
|------|------------------|-------------|
| `AQL_PARSE_ERROR` | Lexer / parser | Fix the offending token; the message points at line/col. |
| `AQL_SEMANTIC_ERROR` | Validator | Add the missing context (e.g. `USE SPACE NODE`), define the variable, supply the required field. |
| `AQL_RUNTIME_ERROR` | Executor | Confirm `CONNECT` has been issued and the active context is correct. |
| `AMENITY_NOT_ON_SPACE` | RPC route | Run `ADD SPACE AMENITY` before adding content of that kind. |
| `ITEM_ALREADY_SOLD` | `purchase` RPC | The tooltip refreshes to the sold view; no action needed beyond informing the player. |
| `INSUFFICIENT_FUNDS` | `purchase` RPC | Top up the wallet (`SET WALLET BALANCE`) or pick a cheaper item. |

## End-to-end recipes

### 1. Stock a bookstore and let a player buy a book

```aql
CONNECT "http://localhost:3000"
USE SPACE NODE "space-sandmill-circle"

ADD SPACE AMENITY "shop"

ADD SHOP ITEM TYPE "book" NAME "Hitchhiker"
  DESCRIPTION "Don't Panic" PRICE 12.5

ADD SHOP ITEM TYPE "music" NAME "Symphony No. 9"
  DESCRIPTION "Beethoven's choral finale" PRICE 9.99

ADD SHOP ITEM TYPE "coffee" NAME "House Blend"
  DESCRIPTION "Locally roasted, medium body" PRICE 4
```

Then in the play canvas, walk the human into the shop and press **`P`**
near the card. The tooltip's `Buy` button calls the `purchase` RPC.

### 2. Stock a supermarket row via a macro

```aql
CONNECT "http://localhost:3000"
USE SPACE NODE "space-sandmill-circle"

ADD SPACE AMENITY "supermarket"

MACRO stockFruit(name, price) {
  ADD SUPERMARKET ITEM ROW 1 NAME $name
    DESCRIPTION "Fresh produce" PRICE $price
}

CALL stockFruit("Apple", 1.25)
CALL stockFruit("Banana", 0.75)
CALL stockFruit("Mango", 2.10)
```

### 3. Stock the car-wash lot, then inspect inventory

```aql
CONNECT SERVER "http://localhost:3000" MAIN_NODE "main-1"
USE SPACE NODE "node:…" PASSPHRASE "ten word passphrase here …"

ADD SPACE AMENITY "car_wash"

ADD CARWASH CAR SLOT 1 NAME "Sport Coupe" MODEL "GT 350"
  YEAR 2024 PRICE 28999 COLOR "#5a87d1"

USE AMENITY "car_wash"
INSPECT AMENITY
SHOW RESPONSE
```

The `inspectAmenity` response includes `items` (the cars when scoped), plus
`logs` and `leases`. Sold cars in `items` have `sale.status: "sold"` and a
`sale.soldToPlayerId`.
