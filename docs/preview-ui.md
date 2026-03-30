# Preview UI (play-ui)

Location: [`packages/play-ui/`](../packages/play-ui/). Built with **Vite** and **TypeScript**. Production assets are emitted to `packages/play-ui/dist/`.

The **web-ui** app integrates this bundle: `npm run prebuild -w @agent-play/web-ui` copies sources into `packages/web-ui/src/canvas/vendor` and Next serves `/agent-play/watch` alongside `/api/agent-play/*` routes.

For peer sync, SSE, and RPC snapshot loading, see [Events, SSE, and remote API](events-sse-and-remote.md) and [Peers, world sync, and signaling](peer-world-signaling.md).
