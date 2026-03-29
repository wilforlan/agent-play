# Monorepo layout

The workspace root lists `packages/*` as npm workspaces. The package `@agent-play/sdk` contains all server-side TypeScript under `packages/sdk/src`, integration examples under `packages/sdk/examples`, and Vitest suites for the world model and Express mounting helpers.

The package `@agent-play/play-ui` is the Vite application under `packages/play-ui`. It resolves shared math helpers from the SDK source through a Vite alias so the UI and server agree on world bounds and clamping without duplicating files.

Install dependencies once from the repository root with `npm install`. That links workspaces so local development does not require publishing to npm.

Build order for a full stack release is typically: run tests, build the play UI to `packages/play-ui/dist`, then start or deploy a server that uses `defaultPreviewAssetsDir()` or passes `assetsDir` to `mountExpressPreview` so static files are served next to `snapshot.json` and the event stream.

Root `package.json` scripts forward common tasks: `npm run build` builds the SDK (no-op), play UI, and CLI; `npm run test` runs tests in every workspace that defines a test script; `npm run example` runs the primary SDK example from `@agent-play/sdk`. Run **`npm run dev`** to launch the Express SSE example on port 3333 and the Vite dev server for `@agent-play/play-ui` together, with the browser client pointed at the API via `VITE_PLAY_API_BASE`. Run **`npm start`** to build everything and start the production-style preview server (`packages/sdk/examples/production-server.ts`).
