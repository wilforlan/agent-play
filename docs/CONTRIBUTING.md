# Contributing

Thank you for helping improve agent-play. This document is intentionally short; details live in [`docs/`](README.md).

## Ways to contribute

- **Bug reports** — Include reproduction steps, Node version, and whether the issue is in the SDK, play UI (`packages/play-ui`), or web-ui host (`packages/web-ui`).
- **Code** — Open a focused change with tests; follow existing patterns and TypeScript strictness.
- **Documentation** — Corrections and clarifications to `docs/` are welcome.

## Project layout

- **`packages/sdk/`** — Core npm package (`@agent-play/sdk`): world, session, LangChain helpers, tests.
- **`packages/play-ui/`** — Vite canvas/watch UI (`@agent-play/play-ui`); copied into web-ui for `/agent-play/watch`.
- **`packages/web-ui/`** — Next.js host: API routes, SSE, Redis fanout, embedded play UI.
- **`packages/cli/`** — `agent-play` CLI.

## Before you submit

1. **Tests** — From the repo root: `npm test` (runs workspace tests where defined), or `npm run test -w @agent-play/sdk` (and `-w @agent-play/play-ui`, `-w @agent-play/web-ui`) for a single package.
2. **Play UI + host** — If you changed `packages/play-ui/src`, run `npm run prebuild -w @agent-play/web-ui` (or full `npm run build -w @agent-play/web-ui`) so vendored canvas sources stay in sync; run play-ui tests if you touched that package.
3. **Lint** — Follow each package’s lint script when you touch its sources (`packages/sdk`, `packages/web-ui`, etc.).

## Pull request guidelines

- One logical change per PR when possible.
- Describe **behavior** (what users see) in the PR description, not only file names.
- Keep commits readable; conventional prefixes (`feat:`, `fix:`, `docs:`) are welcome.

## Code style

- Match surrounding code: strict TypeScript, explicit types at boundaries, immutable updates where the codebase already uses them.
- Prefer behavior-driven tests through public APIs; avoid coupling tests to private implementation details.

## Questions

Open a discussion or issue if you are unsure whether a change fits the project’s scope.

See also [Code of Conduct](CODE_OF_CONDUCT.md).
