# Payments, wallets, and talk billing

> **Legacy internal wallet (current default):** This page describes the Redis-backed `$10` wallet, atomic `purchase`, power-ups, and talk billing.  
> **Planned replacement:** [x402 + Solana payments](payments/x402-solana/README.md) — production settlement via HTTP 402 and USDC. See [integration plan](x402-solana-payments-plan.md).

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

**Lazy seeding:** the first read for a player id seeds a new wallet at the default balance (`DEFAULT_PLAYER_WALLET_BALANCE_USD`, currently **$10**), using `WATCH`/`MULTI` so concurrent first reads do not double-seed.

**Agent talk-reward wallets:** agents that receive PU from voice billing use a **$0 USD / 0 PU** shell created by `getOrCreateAgentWalletForTalkRewards` (see `createInitialAgentRewardWallet` in the SDK) so hosts do not receive the human lazy-seed grant.

**Legacy data:** older Redis payloads without `powerUps` are accepted at parse time; missing values default to **0**.

**Source**

- [`packages/sdk/src/lib/space-content-model.ts`](../packages/sdk/src/lib/space-content-model.ts) — `PlayerWalletSchema`, `createInitialPlayerWallet`, `createInitialAgentRewardWallet`.
- [`packages/web-ui/src/server/agent-play/redis-session-store.ts`](../packages/web-ui/src/server/agent-play/redis-session-store.ts) — `getPlayerWallet`, `getOrCreateAgentWalletForTalkRewards`, `setPlayerWalletBalance`, `adjustPlayerWalletBalance`.
- [`packages/web-ui/src/server/agent-play/session-store.ts`](../packages/web-ui/src/server/agent-play/session-store.ts) — `SessionStore` contract.

## Reading and adjusting the balance

- **Browser GET:** `GET /api/agent-play/players/:id/wallet?sid=…` (rewritten from `/agent-play/players/...` in the play UI) returns the wallet JSON, including `powerUps`.
- **RPC:** `getPlayerWallet` with `{ playerId }` (requires valid preview `sid`).
- **RPC:** `redeemWalletBundle` with `{ playerId, bundleId }` — burns `powerUps` per catalog and credits `balanceUsd`; returns `wallet`. HTTP **409** with `INVALID_BUNDLE` or `INSUFFICIENT_POWER_UPS` on failure.

Admin-style overwrites use `setPlayerWalletBalance` on the store; that path **preserves** `powerUps` while replacing `balanceUsd`.

**Source**

- [`packages/web-ui/src/app/api/agent-play/players/[id]/wallet/route.ts`](../packages/web-ui/src/app/api/agent-play/players/[id]/wallet/route.ts).
- [`packages/play-ui/src/wallet-client.ts`](../packages/play-ui/src/wallet-client.ts) — `WalletDto`, `fetchPlayerWallet`.
- [`packages/play-ui/src/wallet-bundle-client.ts`](../packages/play-ui/src/wallet-bundle-client.ts) — `redeemWalletBundle` (vendored copy for the canvas bundle).

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

**Spend path (wallet bundles):** the inventory panel can redeem fixed **PU → USD balance** offers (`redeemWalletBundle` RPC). Each offer debits `powerUps` and credits `balanceUsd` in one Redis transaction; a **`wallet_bundle`** purchase row is appended for audit (see [Wallet bundle redemption](#wallet-bundle-redemption)).

**Talk billing (host agent):** when the viewer is charged for realtime voice, the **agent’s** wallet gains power-ups via `computeTalkAgentPowerUpsEarned` in the SDK (same tick/stop transaction as the viewer debit). This is separate from the purchase earn rule above.

**Helper:** `addPowerUps({ playerId, amount, now })` on the session store exists for future earn paths; it uses CAS (`WATCH`/`MULTI`) on the wallet key.

**UI:** shared strip in [`packages/play-ui/src/wallet-display-strip.ts`](../packages/play-ui/src/wallet-display-strip.ts), used by the HUD and inventory header. Bundle offers use `WALLET_BUNDLE_OFFERS` from [`@agent-play/sdk/browser`](../packages/sdk/src/browser.ts) in [`packages/play-ui/src/wallet-inventory-panel.ts`](../packages/play-ui/src/wallet-inventory-panel.ts) (vendored under `packages/web-ui/src/canvas/vendor/`).

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

Stored fields include start time, last billed time, cumulative billed seconds, and cumulative charged USD. `tickTalkSession` / `stopTalkSession` compute elapsed whole seconds since the last bill, apply `costForSeconds`, and under Redis **`WATCH`/`MULTI`** update:

- the **talk session** key,
- the **viewer** wallet (`balanceUsd` debit),
- the **agent** wallet (`powerUps` credit from `computeTalkAgentPowerUpsEarned` when `costUsd > 0`).

All three keys are watched so the debit, session advance, and host reward succeed or fail together (CAS retries match the existing purchase pattern). Before the transaction, `getOrCreateAgentWalletForTalkRewards` ensures the agent wallet exists with **$0** balance (not the human `$10` lazy seed).

On **insufficient funds** the session is cleared and the RPC returns an error so the client can stop voice. After a successful charge, the viewer’s **`talk_time`** purchase row is appended as today; optional agent-side audit rows are not required for MVP.

**Source**

- [`packages/sdk/src/lib/talk-agent-reward.ts`](../packages/sdk/src/lib/talk-agent-reward.ts) — `computeTalkAgentPowerUpsEarned` (default policy: **1 PU per 10 billed whole seconds**, capped per leg).
- [`packages/web-ui/src/server/agent-play/redis-session-store.ts`](../packages/web-ui/src/server/agent-play/redis-session-store.ts) — `startTalkSession`, `tickTalkSession`, `stopTalkSession`, `getOrCreateAgentWalletForTalkRewards`.
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

After Realtime connects, the interaction panel starts a billing session and sets an interval of **`TALK_TICK_SECONDS`** to POST `talkSessionTick`. Successful ticks update the wallet HUD balance. The HUD **power-up count** can change after bundle redemption; the **agent** earns PU from billing on the server only (no live agent HUD in the preview unless extended). On **`INSUFFICIENT_FUNDS`**, the mic is muted, an error message is shown, and the realtime session is closed. Closing voice or leaving the page runs **`talkSessionStop`**.

The preview panel imports **`TALK_TICK_SECONDS`** from **`@agent-play/sdk/browser`** so the Webpack game bundle does not pull the Node SDK entry (`node:crypto`).

**Source**

- [`packages/play-ui/src/preview-session-interaction-panel.ts`](../packages/play-ui/src/preview-session-interaction-panel.ts) (and the vendored copy under `packages/web-ui/src/canvas/vendor/`).

### Liability cap (v1)

If the browser disappears between ticks, at most one tick interval of wall time may go unbilled before the session key is orphaned. Worst-case underbilling is on the order of **one tick × $0.025/s** (currently **10 s** → up to **$0.25**). Tighter ticks reduce that at the cost of more RPCs.

## Wallet bundle redemption

Fixed offers are defined in **`WALLET_BUNDLE_OFFERS`** ([`packages/sdk/src/lib/wallet-bundle-catalog.ts`](../packages/sdk/src/lib/wallet-bundle-catalog.ts)): each row has `id`, `powerUpsCost`, and `creditUsd`.

**RPC:** `redeemWalletBundle` with `{ playerId, bundleId }`.

**Server:** `SessionStore.redeemWalletBundle` validates the bundle id, checks `powerUps`, then in one **`WATCH`/`MULTI`**: debits PU, credits `balanceUsd`, writes the wallet, and **`LPUSH`** a purchase record with:

- `amenityKind: "wallet_bundle"`
- optional `powerUpsSpent`
- sentinel `spaceId` **`"__wallet__"`**
- `itemRef.kind: "shop"`, `itemRef.id` = bundle id
- `priceUsd` = credited USD
- `detail` human-readable summary

**UI:** the wallet inventory panel renders an **Exchange power-ups** strip when the host passes `onRedeemBundle` (see [`packages/play-ui/src/main.ts`](../packages/play-ui/src/main.ts)); purchase rows use the `wallet_bundle` chip styling and subtitles from `buildPurchaseSubtitle`.

**Source**

- [`packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`](../packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts) — `redeemWalletBundle`.
- [`packages/play-ui/src/wallet-bundle-client.ts`](../packages/play-ui/src/wallet-bundle-client.ts), [`packages/play-ui/src/wallet-inventory-panel.ts`](../packages/play-ui/src/wallet-inventory-panel.ts).

## Inventory and purchase list

`listPurchases` returns `{ wallet, purchases, items }` where `items` is a dictionary keyed by `kind:spaceId:id` for rendering rows without extra fetches. Records may include **`talk_time`**, amenity kinds, and **`wallet_bundle`** redemptions (`__wallet__` space sentinel).

**Source**

- [`packages/play-ui/src/wallet-purchases-client.ts`](../packages/play-ui/src/wallet-purchases-client.ts).

## Related tests

Behavior is covered in the SDK (`talk-billing`, `talk-agent-reward`, `wallet-bundle-catalog`, wallet schema), web-ui session store tests (purchase power-ups, talk tick/stop with agent PU, `redeemWalletBundle`), RPC tests, and play-ui HUD/inventory tests. Search for `redeemWalletBundle`, `computeTalkAgentPowerUpsEarned`, `WALLET_BUNDLE_OFFERS`, `talkSession`, `powerUps`, and `talk billing` under `packages/` when extending the system.
