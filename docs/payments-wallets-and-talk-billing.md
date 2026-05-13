# Payments, wallets, and talk billing

This page describes how **player wallets**, **amenity purchases** (payments for shop / supermarket / car-wash items), and **realtime voice talk billing** work in Agent Play. It complements the amenity and wallet introduction in [Release 3.1.1](releases/agent-play-3.1.1.md) and the P2A voice overview in [P2A realtime hub](p2a/index.md).

## Who the wallet is for (identity)

Wallets, purchase history, and inventory RPCs are keyed by the **viewer’s credentialed main node id** (the human’s signed-in node), **not** by the shared in-world pawn id `__human__`.

- The play UI resolves the wallet player id from the same source used for intercom credentials (main node id).
- If the viewer is not signed in, wallet and purchase clients cannot run; the HUD shows a loading or sign-in state.

**Source**

- [`packages/play-ui/src/preview-human-credentials.ts`](../packages/play-ui/src/preview-human-credentials.ts) — `getMainNodeIdForIntercom()`.
- [`packages/play-ui/src/main.ts`](../packages/play-ui/src/main.ts) — `getViewerWalletPlayerId()`, `refreshWalletHud`, `refreshWalletInventoryPanel`, `buyAmenityItem`.

## Wallet data model

Each wallet is a small JSON document stored per session host and player id. It includes:

| Field | Meaning |
|-------|---------|
| `playerId` | Wallet owner (node id string). |
| `balanceUsd` | Non-negative balance in USD. |
| `powerUps` | Non-negative integer counter; see [Power-ups](#power-ups) below. |
| `currency` | Currently always `"USD"`. |
| `updatedAt` | ISO timestamp of last mutation. |

**Lazy seeding:** the first read for a player id seeds a new wallet at the default balance (`DEFAULT_PLAYER_WALLET_BALANCE_USD`, currently **$70**), using `WATCH`/`MULTI` so concurrent first reads do not double-seed.

**Legacy data:** older Redis payloads without `powerUps` are accepted at parse time; missing values default to **0**.

**Source**

- [`packages/sdk/src/lib/space-content-model.ts`](../packages/sdk/src/lib/space-content-model.ts) — `PlayerWalletSchema`, `createInitialPlayerWallet`.
- [`packages/web-ui/src/server/agent-play/redis-session-store.ts`](../packages/web-ui/src/server/agent-play/redis-session-store.ts) — `getPlayerWallet`, `setPlayerWalletBalance`, `adjustPlayerWalletBalance`.
- [`packages/web-ui/src/server/agent-play/session-store.ts`](../packages/web-ui/src/server/agent-play/session-store.ts) — `SessionStore` contract.

## Reading and adjusting the balance

- **Browser GET:** `GET /api/agent-play/players/:id/wallet?sid=…` (rewritten from `/agent-play/players/...` in the play UI) returns the wallet JSON, including `powerUps`.
- **RPC:** `getPlayerWallet` with `{ playerId }` (requires valid preview `sid`).

Admin-style overwrites use `setPlayerWalletBalance` on the store; that path **preserves** `powerUps` while replacing `balanceUsd`.

**Source**

- [`packages/web-ui/src/app/api/agent-play/players/[id]/wallet/route.ts`](../packages/web-ui/src/app/api/agent-play/players/[id]/wallet/route.ts).
- [`packages/play-ui/src/wallet-client.ts`](../packages/play-ui/src/wallet-client.ts) — `WalletDto`, `fetchPlayerWallet`.

## Payments (amenity purchases)

A **payment** in this sense is an **atomic purchase** of one shop, supermarket, or car-wash item:

1. The item must still be `sale.status === "available"`.
2. The buyer’s `balanceUsd` must be at least `item.priceUsd`.
3. Under Redis `WATCH`/`MULTI`, the server writes: item → sold, wallet debited, purchase record appended.

If two clients race, one `EXEC` wins; the other gets **`ITEM_ALREADY_SOLD`**. If funds are short, the item is unchanged and the RPC returns **`INSUFFICIENT_FUNDS`**.

**RPC:** `purchase` with `{ playerId, spaceId, amenityKind, itemRef }`. Response includes `wallet`, `purchase` (record), and `item` (updated sold state).

**Source**

- [`packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`](../packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts) — `purchase` case, `fanoutAmenityContentUpdated`.
- [`packages/play-ui/src/purchase-client.ts`](../packages/play-ui/src/purchase-client.ts) — `executePurchase`.

## Power-ups

`powerUps` is an integer persisted on the wallet. It is **not** currency; it is a separate counter shown next to the balance in the UI (silver diamond strip).

**Earn rule (purchases only):** on each successful amenity purchase, the wallet gains **`Math.floor(priceUsd) * 3`** power-ups in the **same** atomic transaction as the debit and sold flag. Fractional dollars do not earn a partial block of three (e.g. **$3.50** → floor **3** → **+9** power-ups).

**Talk billing does not** credit power-ups; only the purchase path applies the earn rule.

**Helper:** `addPowerUps({ playerId, amount, now })` on the session store exists for future earn paths; it uses CAS (`WATCH`/`MULTI`) on the wallet key.

**UI:** shared strip in [`packages/play-ui/src/wallet-display-strip.ts`](../packages/play-ui/src/wallet-display-strip.ts), used by the HUD and inventory header.

**Source**

- [`packages/web-ui/src/server/agent-play/redis-session-store.ts`](../packages/web-ui/src/server/agent-play/redis-session-store.ts) — `executePurchase`, `addPowerUps`.
- [`packages/play-ui/src/wallet-hud.ts`](../packages/play-ui/src/wallet-hud.ts), [`wallet-inventory-panel.ts`](../packages/play-ui/src/wallet-inventory-panel.ts).

## Talk billing (realtime voice)

When the human uses **push-to-talk** with OpenAI Realtime, the server tracks a **talk session** per pair **`(viewerNodeId, agentId)`** and bills the **viewer’s wallet** in wall-clock time.

### Rates and rounding

Constants and the per-second cost helper live in the SDK (shared by server and tests):

- **`TALK_PRICE_PER_60S_USD`** = **1.5**
- **`TALK_PRICE_PER_SECOND_USD`** = **0.025**
- **`TALK_TICK_SECONDS`** = **10** (how often the browser asks the server to bill)

`costForSeconds(seconds)` bills whole seconds with stable rounding (`Math.round(wholeSeconds * 25) / 1000` USD) so long calls do not accumulate floating-point drift.

**Source**

- [`packages/sdk/src/lib/talk-billing.ts`](../packages/sdk/src/lib/talk-billing.ts) (re-exported from `@agent-play/sdk` on the server and from `@agent-play/sdk/browser` in the canvas bundle).

### Server session

Redis key (conceptually):

`agent-play:{hostId}:talk:{viewerNodeId}:{agentId}`

Stored fields include start time, last billed time, cumulative billed seconds, and cumulative charged USD. **`tickTalkSession`** computes elapsed whole seconds since the last bill (ceiling of elapsed wall time in seconds), applies `costForSeconds`, debits the wallet in a **`WATCH`/`MULTI`** together with the session update, and on **insufficient funds** deletes the session and returns an error so the client can stop voice.

**`stopTalkSession`** applies a final partial period, removes the key, and returns totals.

**Source**

- [`packages/web-ui/src/server/agent-play/redis-session-store.ts`](../packages/web-ui/src/server/agent-play/redis-session-store.ts) — `startTalkSession`, `tickTalkSession`, `stopTalkSession`.
- [`packages/web-ui/src/server/agent-play/session-store.test-double.ts`](../packages/web-ui/src/server/agent-play/session-store.test-double.ts) — in-memory mirror for tests.

### RPCs (all `sid`-gated)

| Op | Payload | Purpose |
|----|-----------|---------|
| `talkSessionStart` | `{ viewerNodeId, agentId }` | Start session if wallet balance is positive; fails with `ALREADY_ACTIVE` or `INSUFFICIENT_FUNDS`. |
| `talkSessionTick` | `{ viewerNodeId, agentId }` | Bill elapsed time since last tick; may return `INSUFFICIENT_FUNDS` and clear the session. |
| `talkSessionStop` | `{ viewerNodeId, agentId }` | Final bill and delete session. |

**Source**

- [`packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`](../packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts).

### Client behavior

After Realtime connects, the interaction panel starts a billing session and sets an interval of **`TALK_TICK_SECONDS`** to POST `talkSessionTick`. Successful ticks update the wallet HUD balance (and power-up count unchanged from talk). On **`INSUFFICIENT_FUNDS`**, the mic is muted, an error message is shown, and the realtime session is closed. Closing voice or leaving the page runs **`talkSessionStop`**.

The preview panel imports **`TALK_TICK_SECONDS`** from **`@agent-play/sdk/browser`** so the Webpack game bundle does not pull the Node SDK entry (`node:crypto`).

**Source**

- [`packages/play-ui/src/preview-session-interaction-panel.ts`](../packages/play-ui/src/preview-session-interaction-panel.ts) (and the vendored copy under `packages/web-ui/src/canvas/vendor/`).

### Liability cap (v1)

If the browser disappears between ticks, at most one tick interval of wall time may go unbilled before the session key is orphaned. Worst-case underbilling is on the order of **one tick × $0.025/s** (currently **10 s** → up to **$0.25**). Tighter ticks reduce that at the cost of more RPCs.

## Inventory and purchase list

`listPurchases` returns `{ wallet, purchases, items }` where `items` is a dictionary keyed by `kind:spaceId:id` for rendering rows without extra fetches.

**Source**

- [`packages/play-ui/src/wallet-purchases-client.ts`](../packages/play-ui/src/wallet-purchases-client.ts).

## Related tests

Behavior is covered in the SDK (`talk-billing`, wallet schema), web-ui session store tests (purchase power-ups, talk start/tick/stop), RPC tests (distinct wallets), and play-ui HUD/inventory tests. Search for `talkSession`, `powerUps`, and `talk billing` under `packages/` when extending the system.
