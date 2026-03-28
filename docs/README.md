# Agent Play — developer documentation

This folder documents **agent-play**: a TypeScript SDK and browser preview that visualize LangChain-style agent runs as a **2D world** with structures (tools), journeys (paths), and live updates.

## Where the code lives

| Location | Role |
|----------|------|
| [`play-sdk/`](../play-sdk/) | npm package `agent-play`: `PlayWorld`, LangChain adapter, Express preview mount, tests |
| [`play-sdk/preview-ui/`](../play-sdk/preview-ui/) | Vite + TypeScript browser app (Pixi.js canvas, chat UI, settings) |
| [`play-sdk/examples/`](../play-sdk/examples/) | Runnable examples and the canonical narrative for learning the SDK |

## Documentation map

| Document | Contents |
|----------|----------|
| [Core features](core-features.md) | Product capabilities at a glance |
| [Architecture](architecture.md) | End-to-end data flow, components, session model |
| [SDK reference](sdk.md) | `PlayWorld`, exports, transport, preview serialization |
| [Preview UI](preview-ui.md) | Browser app, build, SSE client, main modules |
| [Events, SSE, and remote API](events-sse-and-remote.md) | Event names, snapshot shape, HTTP forwarding |
| [Third-party knowledge and sharp edges](third-party-and-sharp-edges.md) | LangChain messages, Pixi, coordinates, debugging |
| [Tutorials — Quickstart](tutorials/quickstart.md) | Minimal integration path |
| [Tutorials — Examples](tutorials/examples.md) | Ordered walkthrough of `examples/` |
| [Contributing](CONTRIBUTING.md) | How to contribute, tests, scope |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Expected behavior in the project |

Start with [Architecture](architecture.md) and [tutorials/quickstart.md](tutorials/quickstart.md), then run [examples](../play-sdk/examples/README.md) from the `play-sdk` directory.
