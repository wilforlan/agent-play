# Preview UI (`agent-play-preview-ui`)

Location: [`play-sdk/preview-ui/`](../play-sdk/preview-ui/). Built with **Vite 6** and **TypeScript**. Production assets are emitted to `preview-ui/dist/` and served by `mountExpressPreview` under the configured `basePath` (default `/agent-play`).

## Runtime stack

| Technology | Role |
|------------|------|
| **Pixi.js v8** | WebGL/Canvas renderer: scene background, grid, structures, agent avatars, layering. |
| **DOM** | Settings toolbar, debug panel, agent chat overlays (HTML/CSS), virtual joystick. |
| **marked** + **dompurify** | Safe markdown rendering for chat content where applicable. |
| **Server-Sent Events** | `EventSource` on `/agent-play/events?sid=` — `world:journey`, `world:player_added`, `world:structures`, `world:interaction`. |

## Entry and bootstrap

- [`src/main.ts`](../play-sdk/preview-ui/src/main.ts) — Fetches `snapshot.json?sid=`, applies world bounds, maintains `playerWorldPos`, waypoint queues for path animation, connects SSE, drives Pixi `onTick` / `onFrame`.

## Module map (conceptual)

| Area | Files (examples) |
|------|------------------|
| Canvas / Pixi | `pixi-multiverse.ts`, `main.ts`, `crowd-draw.ts`, `structure-art.ts`, `hero-puppet.ts` |
| Chat / UI chrome | `preview-chat-panel.ts`, `preview-agent-chat-overlays.ts`, `preview-chat-log.ts` |
| Settings | `preview-view-settings.ts` (persisted), `preview-settings-toolbar.ts`, theme and agent panels |
| Debug | `preview-debug-panel.ts`, `preview-debug-joystick.ts` |
| Layout / math | `agent-chat-panel-position.ts`, imports `clampWorldPosition` from `@play-sdk/lib/world-bounds.js` |

## Path alias

[`vite.config.ts`](../play-sdk/preview-ui/vite.config.ts) maps `@play-sdk/lib` → `../src/lib` (the main `play-sdk` package’s `lib` folder) so the browser bundle can share **world bounds** logic with the server.

## Base URL

Vite `base: "/agent-play/"` — deploy or mount the app under that path to match Express defaults.

## Scripts

```bash
cd play-sdk/preview-ui
npm install
npm run dev      # local dev server
npm run build    # output to dist/
npm test         # Vitest
```

The root `play-sdk` script `npm run build` runs `build:preview`, which builds this package.

## Testing

Vitest runs in `preview-ui/`; tests cover chat layout, joystick math, view settings, etc. `mount-express-preview` tests in the main package expect `preview-ui/dist/index.html` to exist after a preview build.
