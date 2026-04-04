# In-browser documentation (`/doc`)

The **web-ui** Next app serves a read-only mirror of this repository’s **`docs/`** tree as HTML so you can explore markdown in the browser (sidebar, GitHub-flavored markdown, sanitized HTML).

## URL

- **Documentation home:** `/doc` (maps to `docs/README.md` in the repo).
- **Nested pages:** `/doc/<path>` matches a `.md` file under `docs/` (for example `/doc/k8s/startup` for `docs/k8s/startup.md`). Folder indexes use `README.md` (for example `/doc/k8s` for `docs/k8s/README.md`).

The route lives in the App Router at **`packages/web-ui/src/app/doc/`** (layout, optional catch-all `[[...slug]]`, navigation client component). It is **not** under the `/agent-play/...` API prefix.

## How content gets into the app

1. **`node packages/web-ui/scripts/copy-docs.mjs`** copies **`docs/`** → **`packages/web-ui/content/docs/`** (ignored by git).
2. **`predev`** and **`prebuild`** run **`copy-docs`** after **`copy-sources`** (see **`packages/web-ui/package.json`**).
3. **Docker:** **`k8s/Dockerfile.web-ui`** runs **`COPY docs ./content/docs`** at the image app root before **`npm install`** / **`next build`** so production images include the same tree without relying on a prior local copy.

## Implementation notes

| Piece | Purpose |
|-------|---------|
| **`src/lib/docs/doc-public-path.ts`** | **`DOC_BROWSER_ROUTE`** (`/doc`); shared by the nav, markdown link rewriting, and the watch UI link. |
| **`src/lib/docs/slug-url.ts`** | Pure slug ↔ path helpers (safe for client bundles). |
| **`src/lib/docs/paths.ts`** | **`getDocsRoot()`** → `content/docs` under **`process.cwd()`**. |
| **`src/lib/docs/list-markdown.ts`** | Recursive `*.md` listing for the sidebar. |
| **`src/lib/docs/resolve-doc-path.ts`** | Resolves URL segments to a file (file vs folder `README`, rejects `..`). |
| **`src/lib/docs/render-doc-markdown.ts`** | **marked** (GFM) + **isomorphic-dompurify**; rewrites relative `.md` links to stay under **`DOC_BROWSER_ROUTE`**. |
| **`src/app/doc/doc-nav.tsx`** | Client sidebar with active state via **`usePathname`**. |

## From the watch canvas

On the **home** route (`/`) and anywhere that mounts **`WatchBootstrap`**, a fixed **Documentation** control appears at the **bottom-left** linking to **`/doc`**.

## Changing the mount path

Update **`DOC_BROWSER_ROUTE`** in **`doc-public-path.ts`** and keep **`next.config`** rewrites (if any) aligned if you add path-prefix routing later.
