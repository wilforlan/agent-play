# @agent-play/play-ui

Vite-built **watch canvas** for Agent Play (Pixi.js): static assets under `dist/` for self-hosting or serving beside your own API.

## Documentation

- **[Repository](https://github.com/wilforlan/agent-play)**  
- **[Play UI](https://github.com/wilforlan/agent-play/blob/main/docs/play-ui.md)** — build, `VITE_PLAY_API_BASE`, deployment options  
- **[Release 3.1.1 — World switch & amenity stages](https://github.com/wilforlan/agent-play/blob/main/docs/releases/agent-play-3.1.1.md)** — stage controller, yard, bookstore / supermarket / car-wash stages, wallet HUD, item tooltip, exit-door + `Esc` exit semantics

## What's new in 3.1.1

The play-canvas now flips between **three game stages** through a single Pixi
application, animated via ease-in/out `alpha` and `scale` tweens:

| Stage | Module | Trigger |
|-------|--------|---------|
| **Overworld** | [`overworld-stage.ts`](./src/overworld-stage.ts) | Default |
| **Space yard** | [`space-yard-stage.ts`](./src/space-yard-stage.ts) | `A` near a structure |
| **Amenity** (bookstore / supermarket / car wash) | [`amenity-shop-stage.ts`](./src/amenity-shop-stage.ts), [`amenity-supermarket-stage.ts`](./src/amenity-supermarket-stage.ts), [`amenity-carwash-stage.ts`](./src/amenity-carwash-stage.ts) | `P` near an amenity pad |

**Stage controller** — [`stage-controller.ts`](./src/stage-controller.ts) owns
the small history stack and the tween state machine.

**Exit strategy** — every yard and amenity stage mounts an **exit door** at
stage-local `(0, 0)`. `Esc` and walking into the door's proximity both trigger
`stageController.back()` (yard → overworld, amenity → yard).

**Sold-state visuals** — when a server-authoritative item has
`sale.status === 'sold'`, the sprite is rendered with
[`desaturateColor`](../sdk/src/lib/space-content-model.ts) and a
[`buildSoldBadge`](./src/sprite-sold-overlay.ts) banner.

**Wallet HUD + item tooltip** — [`wallet-hud.ts`](./src/wallet-hud.ts) shows
the player's balance (lazily seeded at **$70** on first read), and
[`item-tooltip.ts`](./src/item-tooltip.ts) renders a Buy button or a disabled
SOLD pill depending on item state.

**Console API** — [`world-console-extensions.ts`](./src/world-console-extensions.ts)
adds `world.enter.*`, `world.wallet.*`, and `world.amenity.shop.add` /
`supermarket.add` / `carWash.add` for in-browser scripting.

## Install

```bash
npm install @agent-play/play-ui
```

Consume files from `node_modules/@agent-play/play-ui/dist/` or copy the `dist/` folder after build.
