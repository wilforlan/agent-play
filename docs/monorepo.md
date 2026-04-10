# Monorepo layout

The workspace root lists `packages/*` as npm workspaces. The package `@agent-play/sdk` contains the published Node SDK under `packages/sdk/src` (built to `dist/` with `tsup` for npm), integration examples under `packages/sdk/examples`, and Vitest suites.

The package `@agent-play/play-ui` is the Vite application under `packages/play-ui`. It resolves shared math helpers from the SDK source through a Vite alias so the UI and server agree on world bounds and clamping without duplicating files.

Install dependencies once from the repository root with `npm install`. That links workspaces so local development does not require publishing to npm.

**npm publish order** (each package depends on the previous where applicable):

1. **`@agent-play/node-tools`** — identity and credentials helpers.
2. **`@agent-play/intercom`** — intercom wire types and Zod parsers (depends only on **zod**; conceptually second after node-tools for release planning).
3. **`@agent-play/sdk`** — depends on node-tools and intercom.
4. **`@agent-play/cli`**, **`@agent-play/play-ui`**, and other consumers.

The GitHub Action **`.github/workflows/publish-npm.yml`** builds and publishes in that order when the corresponding path filters or manual toggles apply.

Build order for a full stack release is typically: run tests, build the play UI to `packages/play-ui/dist`, then build or start **web-ui** (`@agent-play/web-ui`). The Next build runs `copy-sources` so `play-ui` sources are available under `src/canvas/vendor`, and the app serves `/agent-play/watch` and API routes for snapshot, RPC, and SSE.

Root `package.json` scripts forward common tasks: `npm run build` builds the SDK, CLI, web UI, and play UI (`npm run build:play-ui`); `npm run test` runs tests in every workspace that defines a test script; `npm run example` runs the primary SDK example from `@agent-play/sdk` (expects **`npm run dev`** for `@agent-play/web-ui` in another terminal). **`npm run dev`** and **`npm start`** both start the web UI dev server (`@agent-play/web-ui`).
