# API reference (TypeDoc)

Internal APIs for **`@agent-play/sdk`** and **`@agent-play/cli`** are documented with **TSDoc/JSDoc** in source and rendered with [TypeDoc](https://typedoc.org/) into static HTML.

The **SDK entry** (`packages/sdk/src/index.ts`) documents **`RemotePlayWorld`** (`connect`, `getWorldSnapshot`, **`getPlayerChainNode`**, **`subscribeWorldState`**, mutations, `hold`, `onClose`), **`langchainRegistration`**, world bounds helpers, event constants, **player-chain merge exports** (`mergeSnapshotWithPlayerChainNode`, `parsePlayerChainFanoutNotify`, `parsePlayerChainFanoutNotifyFromSsePayload`, `parsePlayerChainNodeRpcBody`, `sortNodeRefsForSerializedFetch`), stable key constants, and the **`public-types`** surface (including **`PlayerChainFanoutNotify`**, **`PlayerChainNodeResponse`**, …).

**Breaking changes reflected in docs:** Server world fanout carries **`playerChainNotify`** (node ids + metadata), not legacy **`playerChainDelta`** digests on the wire. Integrators should use **`getPlayerChainNode`** + merge helpers or full **`getWorldSnapshot`**.

## Generate locally

```bash
npm run docs:api
```

Output directory: `docs/api-reference/` (listed in `.gitignore`). Open `docs/api-reference/index.html` in a browser.

## GitHub Pages

Workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) deploys the same output to **GitHub Pages** on pushes to `main`. In the repository **Settings → Pages**, set **Source** to **GitHub Actions**.

The public URL is typically:

`https://<owner>.github.io/<repo>/`

(Exact path depends on your GitHub Pages configuration.)

## Play UI

The watch canvas (`@agent-play/play-ui`) carries module-level TSDoc in `packages/play-ui/src/main.ts` and related files. It is not included in the default TypeDoc entry list; extend root `typedoc.json` if you add a dedicated library entry point.
