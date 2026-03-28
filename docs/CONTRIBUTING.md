# Contributing

Thank you for helping improve agent-play. This document is intentionally short; details live in [`docs/`](README.md).

## Ways to contribute

- **Bug reports** — Include reproduction steps, Node version, and whether the issue is in the SDK, preview UI, or Express mount.
- **Code** — Open a focused change with tests; follow existing patterns and TypeScript strictness.
- **Documentation** — Corrections and clarifications to `docs/` are welcome.

## Project layout

- **`play-sdk/`** — Core npm package (`agent-play`): `src/`, tests, `examples/`.
- **`play-sdk/preview-ui/`** — Separate package (`agent-play-preview-ui`): Vite app, its own `npm test`.

## Before you submit

1. **Tests** — From `play-sdk`: `npm test`. From `play-sdk/preview-ui`: `npm test`.
2. **Preview build** — If you changed `preview-ui` or `mount-express-preview`, run `npm run build:preview` from `play-sdk` and ensure tests still pass.
3. **Lint** — `npm run lint` from `play-sdk` when you touch `src/`.

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
