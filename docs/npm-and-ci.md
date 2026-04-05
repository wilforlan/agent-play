# npm packages and CI

Published package names:

| Package | Description |
|---------|-------------|
| `@agent-play/sdk` | Node SDK (`RemotePlayWorld`, LangChain registration, types). Build output: `dist/` (ESM + `.d.ts`) via `tsup`. |
| `@agent-play/cli` | `agent-play` CLI binary (`dist/cli.js`). |
| `@agent-play/play-ui` | Static Vite bundle (`dist/`) for the watch canvas; consume files under `node_modules/@agent-play/play-ui/dist/` or serve the folder behind your API. |

All three are **public** scoped packages (`publishConfig.access: public`). Each package directory includes a **`README.md`** (listed in `files` where applicable) so the npm registry and `npm pack` show install and doc links.

## Local build

From the repository root:

```bash
npm run build:sdk
npm run build:cli
npm run build:web-ui
npm run build:play-ui
```

Or `npm run build` to run all four build steps.

## Version numbers (all published packages)

The root **`package.json`** has a **`version`** field used as the single source of truth for bumps. From the repo root, set the same semver on **root**, **`@agent-play/sdk`**, **`@agent-play/cli`**, **`@agent-play/play-ui`**, and **`@agent-play/web-ui`**:

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

Aliases: **`sdk`**, **`cli`**, **`play-ui`**, **`web-ui`**, **`root`** (root **`package.json`** only), or full names such as **`@agent-play/sdk`**.

Implementation: [`scripts/sync-package-versions.mjs`](../scripts/sync-package-versions.mjs). **`node scripts/sync-package-versions.mjs --check`** exits **0** only when the root and every workspace **`package.json`** **`version`** match.

### Git hooks (local)

Version sync is **not** run in CI. **`npm install`** runs **`prepare`**, which points Git at **`.githooks`** when **`.git`** exists. To set hooks again: **`npm run setup:git-hooks`** (same as **`git config core.hooksPath .githooks`**).

**`pre-push`** runs before **`git push`**:

1. If the outgoing push includes **no** commits that touch **`packages/`**, the hook exits (nothing to verify).
2. If there are **uncommitted** changes under **`packages/`**, the push is **blocked** (commit or stash first).
3. Otherwise it runs **`--check`**. If versions are out of sync, it runs **`sync-package-versions`**, then **blocks** the push until you **commit** the updated **`package.json`** files and push again.

See [Development guide](development.md#git-hooks).

## Publishing (manual)

1. Bump versions with **`npm run version:packages`** (see above), then commit. Use **`pre-push`** so versions stay aligned before you push.
2. `npm login` to npm.
3. From the repo root, after `npm install` and builds:

```bash
npm publish -w @agent-play/sdk --access public
npm publish -w @agent-play/cli --access public
npm publish -w @agent-play/play-ui --access public
```

`@agent-play/play-ui` runs `prepublishOnly` (tests + `vite build`).

## GitHub Actions

Workflow [`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml) runs on pushes to **`main`**, on **`v*`** tags, and on **`workflow_dispatch`**. Configure the **`NPM_TOKEN`** repository secret (automation token from npmjs.com with publish scope). **`npm publish`** fails if that version already exists on the registry—bump versions locally (and commit) before a new release.

Behavior:

- **Single workflow** — One **`publish`** job runs **`npm ci`** once, then **build + publish** in dependency order: **`@agent-play/sdk`** → **`@agent-play/cli`** → **`@agent-play/play-ui`**. Each step runs only when that package is selected (see below). A failure in an earlier step stops later ones, so the SDK is published to npm before downstream packages in the same run.
- **Path-based selection on `push`** — A **`changes`** job uses **`dorny/paths-filter`** so only packages with changes under `packages/sdk/**`, `packages/cli/**`, or `packages/play-ui/**` are built and published.
- **Manual runs** — **`workflow_dispatch`** exposes checkboxes to include or skip each package (defaults: all on).

## API documentation (TypeDoc)

- **Source:** `typedoc.json` at the repo root documents **`@agent-play/sdk`** and **`@agent-play/cli`** entry points.
- **Generate locally:** `npm run docs:api` writes HTML to `docs/api-reference/` (gitignored) and adds `.nojekyll` for GitHub Pages.
- **GitHub Pages:** [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs on pushes to **`main`**, runs `npm run docs:api`, and deploys the folder to **GitHub Pages**. Enable Pages in the repository settings (**Build and deployment** → **GitHub Actions**).

After the first successful deploy, the site URL is typically:

`https://<user-or-org>.github.io/<repository>/`

Open `index.html` under the deployed root (TypeDoc default).

**Play UI** — JSDoc/TSDoc lives in source (e.g. `packages/play-ui/src/main.ts` module overview). The generated site currently focuses on SDK + CLI; extend `typedoc.json` `entryPoints` if you add a dedicated library entry for play-ui.

## Related

- [Development guide](development.md)
- [Kubernetes deployment](kubernetes-deployment.md)
