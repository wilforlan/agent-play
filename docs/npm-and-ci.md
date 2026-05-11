# npm packages and CI

Published package names:

| Package | Description |
|---------|-------------|
| `@agent-play/node-tools` | Node identity: passphrase generation, scrypt derivation, credential file helpers. |
| `@agent-play/intercom` | Wire types and Zod parsers for human–agent intercom (assist/chat); published **after** node-tools, **before** the SDK. |
| `@agent-play/sdk` | Node SDK (`RemotePlayWorld`, LangChain registration, types). Build output: `dist/` (ESM + `.d.ts`) via `tsup`. |
| `@agent-play/cli` | `agent-play` CLI binary (`dist/cli.js`). |
| `@agent-play/play-ui` | Static Vite bundle (`dist/`) for the watch canvas; consume files under `node_modules/@agent-play/play-ui/dist/` or serve the folder behind your API. |

These are **public** scoped packages (`publishConfig.access: public`) where applicable. Each package directory includes a **`README.md`** (listed in `files` where applicable) so the npm registry and `npm pack` show install and doc links.

## Local build

From the repository root:

```bash
npm run build:sdk
npm run build:cli
npm run build:web-ui
npm run build:play-ui
```

Or `npm run build` to run all four build steps.

## Version numbers (published packages)

Each workspace sets its own **`version`** in **`package.json`**. To align every tracked package with the **root** version (optional monorepo-wide bump), run from the repo root:

```bash
npm run version:packages -- 0.2.0
npm run version:packages -- patch
npm run version:packages -- minor
npm run version:packages -- major
```

To bump **one** workspace only (writes that **`package.json`** only; does not sync the rest of the monorepo), pass **`--workspace`** or **`-w`** and a single version or **`patch`**, **`minor`**, or **`major`** (bump is computed from that package’s current version):

```bash
npm run version:packages -- -w sdk patch
npm run version:packages -- --workspace @agent-play/cli 1.4.0
npm run version:packages -- -w web-ui minor
```

Aliases: **`node-tools`**, **`intercom`**, **`sdk`**, **`cli`**, **`play-ui`**, **`web-ui`**, **`root`** (root **`package.json`** only), or full names such as **`@agent-play/sdk`**.

Implementation: [`scripts/sync-package-versions.mjs`](../scripts/sync-package-versions.mjs).

- **`node scripts/sync-package-versions.mjs --check`** — exit **0** only when the root and every workspace **`package.json`** **`version`** match (optional consistency check).
- **`node scripts/sync-package-versions.mjs --check-semver`** — exit **0** only when each tracked **`package.json`** has a **parseable semver** (optional local or CI check).

## Publishing (manual)

The preferred entry point is **`npm run publish:packages`** (script: [`scripts/publish-packages.mjs`](../scripts/publish-packages.mjs)). It enforces the dependency-order chain (`node-tools → intercom → sdk → cli → play-ui`), builds each package before publishing, probes the registry to catch already-published versions before the chain starts, and is safe-by-default (refuses a dirty git tree, requires `npm whoami`, prompts for confirmation).

### Typical release flow

1. Bump versions with **`npm run version:packages`** (see above), then commit.
2. **`npm login`** to npm (or set up an automation token).
3. Dry-run first to inspect tarballs and confirm the plan:

   ```bash
   npm run publish:packages:dry
   ```

4. Real publish:

   ```bash
   npm run publish:packages
   ```

### Options

```bash
# Publish a subset (still in dep order)
node scripts/publish-packages.mjs --packages sdk,cli

# Pre-release / next-tag publish
node scripts/publish-packages.mjs --tag next

# 2FA accounts
node scripts/publish-packages.mjs --otp 123456

# Skip packages already on the registry instead of failing
node scripts/publish-packages.mjs --skip-existing

# Skip the build step (assumes dist/ is fresh)
node scripts/publish-packages.mjs --no-build

# Bypass the dirty-tree guard (NOT recommended for real releases)
node scripts/publish-packages.mjs --allow-dirty

# Non-interactive (CI/local automation)
node scripts/publish-packages.mjs --yes
```

Run `node scripts/publish-packages.mjs --help` for the full reference.

### Raw npm equivalents

If you ever need to bypass the script entirely (matches what `.github/workflows/publish-npm.yml` runs in CI):

```bash
npm publish -w @agent-play/node-tools --access public
npm publish -w @agent-play/intercom --access public
npm publish -w @agent-play/sdk --access public
npm publish -w @agent-play/cli --access public
npm publish -w @agent-play/play-ui --access public
```

`@agent-play/play-ui` runs `prepublishOnly` (tests + `vite build`) regardless of which entry point you use.

## GitHub Actions

Workflow [`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml) runs on pushes to **`main`**, on **`v*`** tags, and on **`workflow_dispatch`**. Configure the **`NPM_TOKEN`** repository secret (automation token from npmjs.com with publish scope). **`npm publish`** fails if that version already exists on the registry—bump versions locally (and commit) before a new release.

Behavior:

- **Single workflow** — One **`publish`** job runs **`npm install`** once, then **build + publish** in dependency order: **`@agent-play/node-tools`** → **`@agent-play/intercom`** → **`@agent-play/sdk`** → **`@agent-play/cli`** → **`@agent-play/play-ui`**. Each step runs only when that package is selected (see below). Failures stop later steps in the same run.
- **Path-based selection on `push`** — A **`changes`** job uses **`dorny/paths-filter`** so only packages with changes under `packages/node-tools/**`, `packages/intercom/**`, `packages/sdk/**`, `packages/cli/**`, or `packages/play-ui/**` are built and published.
- **Manual runs** — **`workflow_dispatch`** exposes checkboxes to include or skip each package (defaults: all on).

## API documentation (TypeDoc)

- **Source:** `typedoc.json` at the repo root documents **`@agent-play/sdk`**, **`@agent-play/intercom`**, and **`@agent-play/cli`** entry points.
- **Generate locally:** `npm run docs:api` writes HTML to `docs/api-reference/` (gitignored) and adds `.nojekyll` for GitHub Pages.
- **GitHub Pages:** [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs on pushes to **`main`**, runs `npm run docs:api`, and deploys the folder to **GitHub Pages**. Enable Pages in the repository settings (**Build and deployment** → **GitHub Actions**).

After the first successful deploy, the site URL is typically:

`https://<user-or-org>.github.io/<repository>/`

Open `index.html` under the deployed root (TypeDoc default).

**Play UI** — JSDoc/TSDoc lives in source (`packages/play-ui/src/main.ts` and per-module `@module` headers). The generated API site focuses on SDK, intercom, and CLI; the play bundle is primarily documented in prose under [Play UI](play-ui.md).

## Related

- [Development guide](development.md)
- [Kubernetes deployment](kubernetes-deployment.md)
