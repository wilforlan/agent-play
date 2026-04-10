# Agent Play 3.1.0 (from 3.0.x)

Monorepo **3.1.0** aligns published packages (**@agent-play/node-tools**, **@agent-play/intercom**, **@agent-play/sdk**, **@agent-play/cli**, **@agent-play/play-ui**, **@agent-play/web-ui**) on a single semver line. Highlights below summarize improvements since the **3.0.0** baseline.

## Packaging and release

- **@agent-play/intercom** is now a **public npm package** (version **3.1.0**), published **after** **@agent-play/node-tools** and **before** **@agent-play/sdk** because the SDK and play UI depend on shared wire types and Zod parsers.
- **`scripts/sync-package-versions.mjs`** includes **intercom** in the default version bump list (order: root → node-tools → intercom → sdk → cli → play-ui → web-ui).
- **TypeDoc** (`npm run docs:api`) documents **sdk**, **intercom**, and **cli** entry points; build fixes include **`skipLibCheck`**, iterator compatibility in **`RemotePlayWorld`**, and **intercom** validator types derived with **`z.infer`** (no duplicate hand-written payload types vs Zod output).

## SDK (`@agent-play/sdk`)

- **Occupant connections** — Lease and heartbeat model for player connections; clearer close/disconnect behavior.
- **Intercom** — **`subscribeIntercomCommands`** and related paths aligned with **@agent-play/intercom** contracts; incremental world merge helpers unchanged in spirit but covered by ongoing tests.
- **Credential / registration** flows refined for agent registration and node inspection scenarios.

## Built-in agents and tooling (`packages/agents`)

- **Assist tools** — Expanded handlers (e.g. sales/CFO assist), **OpenAI enrichment** for tool results, async tool execution paths, and UI-friendly loading/result presentation in the web stack.
- **Docker Compose** — **Agents** image and compose files so the **main server** (web UI + Redis) and **agents** process run on **separate containers**, connected only by **`AGENT_PLAY_WEB_UI_URL`** (HTTP).

## Play UI (`@agent-play/play-ui`)

- **Session interaction** — Assist tool UI, loading states, markdown/JSON views for results, and intercom channel key handling improvements.
- **Preview chat overlays** — Chat cards show for the **proximity-focused** agent only so panels do not obscure other occupants when you move away.
- **Proximity** — Player id normalization and interaction policy refinements.

## Web UI (`@agent-play/web-ui`)

- Parity with play-ui vendor copies where applicable; mobile/side panel and in-app docs features from the 3.0.x line remain available depending on deployment.

## CLI (`@agent-play/cli`)

- **Bootstrap** — Environment selection (local / test / main server URLs) and node/bootstrap flows for credentials and inspection.

## Documentation

- **API reference** — Generated under **`docs/api-reference`**; **@packageDocumentation** and module docs expanded for SDK entry, CLI, intercom, and the play-ui canvas **`main.ts`** (existing).
- **Monorepo** — [monorepo.md](../monorepo.md) updated for publish order.
- **Docker** — [docker-compose.md](../k8s/docker-compose.md) describes full stack vs agents-only compose.

## Upgrading

1. Bump dependencies to **`^3.1.0`** for **@agent-play/node-tools**, **@agent-play/intercom**, and **@agent-play/sdk** (and **@agent-play/play-ui** if you embed the canvas).
2. Run **`npm install`** at the repo root if you use workspaces.
3. Regenerate API docs: **`npm run docs:api`**.

For wire-level intercom payloads, import types and parsers from **@agent-play/intercom** (or via the SDK where re-exported) so runtime validation matches the server.
