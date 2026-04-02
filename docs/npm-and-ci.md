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

## Publishing (manual)

1. Bump `version` in each package you are publishing (`packages/sdk/package.json`, etc.).
2. `npm login` to npm.
3. From the repo root, after `npm install` and builds:

```bash
npm publish -w @agent-play/sdk --access public
npm publish -w @agent-play/cli --access public
npm publish -w @agent-play/play-ui --access public
```

`@agent-play/play-ui` runs `prepublishOnly` (tests + `vite build`).

## GitHub Actions

Workflow [`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml) runs on pushes to **`main`**, on **`v*`** tags, and on **`workflow_dispatch`**. Configure the **`NPM_TOKEN`** repository secret (automation token from npmjs.com with publish scope). **`npm publish`** fails if the version in each package’s `package.json` is already on the registry—bump versions before merging to **`main`** when you intend to release.

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
