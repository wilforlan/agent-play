# Agent Play

**A platform to watch agent workflows in a living 2D world—in real time.**

Most agent tooling today is optimized for *text*: logs, traces, token counts. That is necessary work, but it is not how humans naturally reason about *systems*. Agent Play asks a different question: **what if you could see your agents move through a space**—past tools, APIs, and “home”—the way you’d walk a floor plan or a game map?

This repository is an early, opinionated answer: a **developer SDK** plus a **browser preview** that turns LangChain-style runs into **structures**, **journeys**, and **motion** on a canvas. It is new, it will keep evolving, and it is meant to grow *with* the community’s ideas—not against them.

---

## Why this might matter for the AI agent community

Agents are becoming **teams**: multiple models, tools, retries, and human checkpoints. Observability products are racing to keep up—often with excellent but *linear* views. Spatial, narrative views are underexplored. They will not replace traces; they can **sit alongside** them and give builders (and stakeholders) a shared mental model: *where* the agent is in its workflow, not only *what* it printed.

Agent Play is deliberately **watch-oriented**: a place to *see* behavior before you optimize it. That aligns with a community still figuring out best practices—there is room to experiment without pretending we have solved visualization for every stack.

---

## The world view (vision)

The long-term picture is a **World View** that feels a bit like a neighborhood server rack made friendly: objects stand in for databases, third-party APIs, model endpoints, and other “amenities.” **Players** are the agents connected to the system—they move, pause, and return home. The full scene is where an agent *visibly* lives and travels.

That metaphor is ambitious. The codebase today implements a **credible slice**: tool-derived structures, journey paths, chat callouts, themes, and live updates over SSE. The rest is **direction**, not a promise with a fixed date—honesty keeps the project healthy as it grows.

---

## Where we’re headed (and what’s already here)

| Idea | Direction | Today (honest snapshot) |
|------|-----------|-------------------------|
| **Single-agent center** | One place to see what one agent is doing, live | Preview + journey animation + interaction callouts for registered players |
| **Multi-agent interactions** | Surfaces for how connected agents relate | Multiple players and separate journeys; richer “between-agent” UI is still open design space |
| **Watch-only** | Admins observe without steering the run | Preview is watch-oriented; debug/joystick are dev affordances, not production admin UX |
| **Callouts** | Thoughts, links, expandable metadata | Chat-style panels above agents; room to grow into richer cards and actions |
| **Live tracks** | Move structure → structure → home with replayable paths | Waypoints and journey paths; full playback UX is not the focus yet |

Nothing above is a dig at the project being young—it is the **same** transparency we’d want from any early OSS experiment: clear about value, clear about gaps, excited about closing them together.

---

## For developers

The **SDK** (`packages/sdk`, npm name `@agent-play/sdk`) exposes `RemotePlayWorld` and LangChain helpers so your process can talk to the **web app** over HTTP (session, players, RPC) and open the **watch** UI. The **play UI** (`packages/play-ui`, `@agent-play/play-ui`) is bundled into **`@agent-play/web-ui`** (Next.js) and can also be built as static assets for other hosts.

- **[Documentation](docs/README.md)** — Overview, monorepo, SDK, play UI, multiplayer, Redis, CLI, API keys  
- **[Examples](packages/sdk/examples/README.md)** — Two scripts: one player and two players against the running web UI  

```bash
npm install
npm run dev             # @agent-play/web-ui (Next dev server; watch at /agent-play/watch)
npm run build:web-ui    # production build of the web app
npm run build:cli       # `agent-play` CLI into packages/cli/dist
npm run example         # SDK example 01 (needs web-ui running and OPENAI_API_KEY)
npm test
```

For **`npm run dev`**, open the URL printed for **`@agent-play/web-ui`** (often `http://127.0.0.1:3000`) and use **`/agent-play/watch`**. Run **`npm run example`** in another terminal to register a LangChain agent against the same session API.

---

## Spirit of the project

The agent ecosystem moves fast—frameworks churn, patterns shift, and “best practice” is a moving target. Agent Play does not need to win every comparison; it needs to stay **curious**, **usable**, and **kind** to contributors and users alike. If a spatial lens helps your team think more clearly about agents, we’re heading in the right direction.

Welcome aboard. Build something weird and wonderful.
