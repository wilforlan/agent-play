# Kubernetes

| File | Role |
|------|------|
| **`namespace.yaml`** | Namespace **`wilforlan-agent-play`**. |
| **`redis.yaml`** | Redis **PVC**, **Deployment**, **Service**. |
| **`web-ui.yaml`** | **ConfigMap** (`PLAY_PREVIEW_BASE_URL`), web UI **Deployment**, **Service**. |
| **`kustomization.yaml`** | Composes the above; sets apply namespace, image **`ghcr.io/wilforlan/agent-play-web-ui:<tag>`**, shared labels. |
| **`Dockerfile.web-ui`** | Multi-stage image: monorepo install, `next build` for `@agent-play/web-ui`, `tsx server.ts` on port **8888**. |
| **`Dockerfile.agents`** | Multi-stage image: builds **`@agent-play/node-tools`**, **`@agent-play/intercom`**, **`@agent-play/sdk`**, **`@agent-play/agents`**; runs **`express-server`** (health on **3100**, HTTP to main server only). |
| **`package.agents-workspace.json`** | Minimal npm workspaces manifest used only by **`Dockerfile.agents`** (avoids copying the whole monorepo into the build context). |
| **`../docker-compose.yml`** | **Redis + web-ui + agents** — three services; Redis and HTTP API stay on the main container, agents are decoupled. |
| **`../docker-compose.agents.yml`** | **Agents only** — for a standalone host; set **`AGENT_PLAY_WEB_UI_URL`** to your deployed main server. |
| **`build-push-web-ui.sh`** | Builds and pushes **`ghcr.io/wilforlan/agent-play-web-ui`** (override with `REGISTRY`). |
| **`deploy.sh`** | Invoked via **`npm run deploy`** — apply/update, rollout status, rollback, history, restart, **`clean`**. Reads defaults from **`rollout-config.sh`**. |
| **`clean-cluster.sh`** | **`kubectl delete -k k8s/`** with context + namespace confirmation (or **`--yes`**). Also **`npm run deploy:clean`**. |
| **`create-ghcr-pull-secret.sh`** | Creates **`ghcr-pull`** in the app namespace from **`GHCR_*`** / **`~/.agent-play-config/ghcr.env`** (needed when GHCR returns **403** on anonymous pull). |
| **`patches/web-ui-ghcr-pull.yaml`** | Optional Kustomize patch: **`imagePullSecrets: ghcr-pull`**. Uncomment **`patches`** in **`kustomization.yaml`** when using it. |
| **`setup.sh`** | **Linux and macOS.** Interactive install for **Docker**, **kubectl**, **git**, **curl**; optional **GHCR** + **`~/.agent-play-config/ghcr.env`**; optional **cluster `ghcr-pull` secret** + **kustomize patch** (when **`kubectl`** is available); optional **`build-push-web-ui.sh`**; checks port **8888** and offers **first `kubectl` deployment** (same rollout defaults as **`deploy.sh`**). |
| **`rollout-config.sh`** | Single source of truth for **`NAMESPACE`**, deployment names, rollout timeouts, and **`APP_HTTP_PORT`** (used by **`deploy.sh`** and **`setup.sh`**). |

## Server toolchain

On a fresh Linux VM (**`kubectl: command not found`**, etc.):

```bash
bash k8s/setup.sh
```

Or **`npm run setup:k8s-server`**. The script can **`docker login ghcr.io`**, save **`GHCR_USERNAME`** / **`GHCR_TOKEN`** to **`~/.agent-play-config/ghcr.env`** (mode **600**), optionally **`k8s/create-ghcr-pull-secret.sh`** + enable **`patches/web-ui-ghcr-pull.yaml`** in **`kustomization.yaml`** when **`kubectl`** is available (avoids GHCR **403** for private images on the cluster), optionally run **`k8s/build-push-web-ui.sh`**, then detect anything listening on **`APP_HTTP_PORT`** (default **8888** from **`k8s/rollout-config.sh`**) and print **`http://<server-ip>:8888`** if so, and finally offer **`npm run deploy -- apply`**. Configure **`kubeconfig`** before accepting the first deployment.

## Registry

Default registry is **`ghcr.io/wilforlan`**. **`k8s/build-push-web-ui.sh`** sources **`~/.agent-play-config/ghcr.env`** if present (or set **`AGENT_PLAY_CONFIG_DIR`**) and runs **`docker login ghcr.io`** before push. Create that file with **`k8s/setup.sh`** or manually.

## Build and push

From the **repository root**:

```bash
./k8s/build-push-web-ui.sh
```

Optional: `REGISTRY`, `IMAGE_NAME`, `TAG` (defaults to short git SHA).

After a successful push, the script runs **`scripts/update-kustomization-image.py`** to set **`k8s/kustomization.yaml`** **`images[0].newName`** and **`newTag`** to **`${REGISTRY}/${IMAGE_NAME}`** and the built tag (falls back to **`sed`** if **`python3`** or the script is missing).

## Deploy on the server (rollout, rollback, updates)

From the repo root, with **`kubectl`** configured for the cluster:

```bash
npm run deploy -- apply
```

Other commands:

| Command | Action |
|---------|--------|
| `npm run deploy -- apply` | `kubectl apply -k k8s/` and wait for Redis + web UI rollouts |
| `npm run deploy -- status` | Rollout status for both deployments |
| `npm run deploy -- rollback` | Undo last web UI rollout |
| `npm run deploy -- rollback-to N` | Roll web UI back to revision `N` (see `history`) |
| `npm run deploy -- history` | `kubectl rollout history` for web UI |
| `npm run deploy -- restart` | Rolling restart of web UI pods |
| `npm run deploy -- clean` | Delete Agent Play stack (`kubectl delete -k k8s/`; confirms namespace unless `--yes`) |
| `npm run deploy:clean` | Same as `clean` (runs `k8s/clean-cluster.sh` directly) |

**Environment:** defaults live in **`k8s/rollout-config.sh`** (`NAMESPACE`, `DEPLOY_*`, `ROLLOUT_TIMEOUT_*`, `APP_HTTP_PORT`). Override via environment when invoking **`deploy.sh`**.

Full command and environment reference: **[docs/k8s/deployment.md](../docs/k8s/deployment.md)**.

### Private registry (GHCR `403 Forbidden` on pull)

If **`kubectl describe pod`** shows **`failed to authorize`** / **`403 Forbidden`** when pulling **`ghcr.io/.../agent-play-web-ui`**, the package is **private** (or blocks anonymous reads). The cluster does not use your workstation’s `docker login`.

1. Create a pull secret in the namespace (reuses **`~/.agent-play-config/ghcr.env`** from **`k8s/setup.sh`** if present):

   ```bash
   ./k8s/create-ghcr-pull-secret.sh
   ```

   Or manually:

   ```bash
   kubectl create secret docker-registry ghcr-pull \
     --docker-server=ghcr.io \
     --docker-username=YOUR_GITHUB_USER \
     --docker-password=YOUR_PAT \
     --namespace=wilforlan-agent-play
   ```

   Use a PAT with **`read:packages`** (and **`write:packages`** only if you also push from CI with the same token).

2. Enable the patch so the web UI Deployment references **`ghcr-pull`**: in [`kustomization.yaml`](kustomization.yaml), uncomment **`patches:`** → **`patches/web-ui-ghcr-pull.yaml`**.

3. Re-apply: **`kubectl apply -k k8s/`** (or **`npm run deploy -- apply`**).

**Alternative:** In GitHub → **Packages** → **agent-play-web-ui** → **Package settings**, set visibility to **Public** so nodes can pull without a secret (leave the patch commented).

**Tag:** `kustomization.yaml` **`newTag`** must match an image that exists on GHCR (run **`./k8s/build-push-web-ui.sh`** so the tag is updated and pushed).

## Docker Compose

See **[Docker Compose (main server + agents)](../docs/k8s/docker-compose.md)** for **`docker compose up`**, env vars, and standalone agents.

## Documentation

See [Kubernetes deployment](../docs/kubernetes-deployment.md) and [docs/k8s/](../docs/k8s/README.md).
