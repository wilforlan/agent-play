# Play UI (Vite, static deploy)

The play UI is built with Vite and outputs HTML, JavaScript, and assets under `packages/play-ui/dist`. The **web-ui** package copies `play-ui/src` into `src/canvas/vendor` during prebuild and serves the watch experience at `/agent-play/watch` with `base: "/agent-play/"` in the Vite config.

**Same origin.** If the browser loads the watch page from the same host and path as the API, you do not need extra configuration. The client uses the Vite `BASE_URL` for snapshot, SSE, and proximity calls.

**Split origin (for example Vercel UI + API on Railway or AWS).** Set the environment variable `VITE_PLAY_API_BASE` at build time to the absolute origin and path prefix of your API, without a trailing slash, for example `https://api.example.com/agent-play`. The UI will request `snapshot.json`, `events`, and `proximity-action` against that base. Your API must send CORS headers for those routes; the SDK sets permissive CORS on `proximity-action` and responds to `OPTIONS` preflight for that path.

**Session links.** Preview URLs always include `?sid=` with the world session id. Share that link with viewers; the id must match the server session or snapshot and SSE requests return 403.

**Chat and settings.** The floating toolbar controls theme, **your avatar** (preset colors), **gender** (session label), chat visibility, and optional debug panels. Nothing in the UI stores secrets; it only displays data the server streams.

**Who moves.** SDK-registered agents are **stationary** (fixed layout: home + tool grid). The **human** viewer (`__human__` on the server for proximity actions) is rendered as **You** and is the only figure that moves (joystick and arrow keys). Proximity Assist / Chat / Zone / Yield targets the nearest **agent** when you are in range.
