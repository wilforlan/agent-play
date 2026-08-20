# Play UI (Vite, static deploy)

The play UI is built with Vite and outputs HTML, JavaScript, and assets under `packages/play-ui/dist`. The **web-ui** package copies `play-ui/src` into `src/canvas/vendor` during prebuild and serves the watch experience at `/agent-play/watch` with `base: "/agent-play/"` in the Vite config.

**Same origin.** If the browser loads the watch page from the same host and path as the API, you do not need extra configuration. The client uses the Vite `BASE_URL` for snapshot, SSE, and proximity calls.

**Split origin (for example Vercel UI + API on Railway or AWS).** Set the environment variable `VITE_PLAY_API_BASE` at build time to the absolute origin and path prefix of your API, without a trailing slash, for example `https://agent-play.com/api/agent-play`. The UI will request `snapshot.json`, `events`, and `proximity-action` against that base. Your API must send CORS headers for those routes; the SDK sets permissive CORS on `proximity-action` and responds to `OPTIONS` preflight for that path.

**Occupancy origin (intended policy).** Root communication / occupancy server is **`https://agent-play.com`**. Aliases of the same deployment: `www.agent-play.com`, `playworld.world`, and **`world1.v0peer.org` while it still exists**. `world1` may be discontinued once world2 / worldN 3D clients exist. `https://world2.v0peer.org` (and future `worldN.v0peer.org`) are page origins / cameras, never occupancy APIs, never valid `credentials.json` `serverUrl`. New credential files should set `serverUrl` to `https://agent-play.com`.

**Restore vs intended policy.** Today play-ui restore still canonicalizes those aliases **to** `world1.v0peer.org` and treats `agent-play.com` as a legacy name (`packages/play-ui/src/preview-human-node-restore.ts`, `MAIN_WORLD_HOST` in `packages/web-ui/src/lib/main-world.ts`). That code should flip so aliases canonicalize **to** `agent-play.com`. World 2 clients must implement the intended policy from the start. Until the flip, both hosts hit the same deployment.

**World 2 CORS.** A browser 3D client at `https://world2.v0peer.org` calls session, sdk/rpc, and events on `https://agent-play.com` cross-origin. Those routes must send `Access-Control-Allow-Origin` for the World 2 origin (cookie-less; `sid` in query, identity in headers). See the World 2 repo `docs/world-protocol.md`.

**Session links.** Preview URLs always include `?sid=` with the world session id. Share that link with viewers; the id must match the server session or snapshot and SSE requests return 403.

**Chat and settings.** The floating toolbar controls theme, **your avatar** (preset colors), **gender** (session label), chat visibility, and optional debug panels. Nothing in the UI stores secrets; it only displays data the server streams.

**Who moves.** SDK-registered agents are **stationary** at their allocated grid cells. The **human** viewer (`__human__` on the server for proximity actions) is rendered as **You** and is the only figure that moves (joystick and arrow keys). **Owned spaces** appear as structure anchors on the overworld; press **A** near one to enter its yard. Proximity Assist / Chat / Zone / Yield targets the nearest **agent** when you are in range.

> **@deprecated:** “home + tool grid” described tool-derived layout removed in [World map v3](updates-world-map-v3.md).
