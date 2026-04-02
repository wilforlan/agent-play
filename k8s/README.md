# Kubernetes

| File | Role |
|------|------|
| **`agent-play.yaml`** | Namespace, ConfigMap, Redis (PVC + Deployment + Service), web UI (Deployment + Service). |
| **`kustomization.yaml`** | Namespace **`wilforlan-agent-play`**, image **`ghcr.io/wilforlan/agent-play-web-ui:<tag>`**, shared labels. |
| **`Dockerfile.web-ui`** | Multi-stage image: monorepo install, `next build` for `@agent-play/web-ui`, `tsx server.ts` on port **8888**. |
| **`build-push-web-ui.sh`** | Builds and pushes **`ghcr.io/wilforlan/agent-play-web-ui`** (override with `REGISTRY`). |
| **`deploy.sh`** | Invoked via **`npm run deploy`** — apply/update, rollout status, rollback, history, restart. Reads defaults from **`rollout-config.sh`**. |
| **`setup.sh`** | **Linux only.** Interactive install for **Docker**, **kubectl**, **git**, **curl**; optional **GHCR** + **`~/.agent-play-config/ghcr.env`**; optional **`build-push-web-ui.sh`**; checks port **8888** and offers **first `kubectl` deployment** (same rollout defaults as **`deploy.sh`**). |
| **`rollout-config.sh`** | Single source of truth for **`NAMESPACE`**, deployment names, rollout timeouts, and **`APP_HTTP_PORT`** (used by **`deploy.sh`** and **`setup.sh`**). |

## Server toolchain

On a fresh Linux VM (**`kubectl: command not found`**, etc.):

```bash
bash k8s/setup.sh
```

Or **`npm run setup:k8s-server`**. The script can **`docker login ghcr.io`**, save **`GHCR_USERNAME`** / **`GHCR_TOKEN`** to **`~/.agent-play-config/ghcr.env`** (mode **600**), optionally run **`k8s/build-push-web-ui.sh`**, then detect anything listening on **`APP_HTTP_PORT`** (default **8888** from **`k8s/rollout-config.sh`**) and print **`http://<server-ip>:8888`** if so, and finally offer **`npm run deploy -- apply`**. Configure **`kubeconfig`** before accepting the first deployment.

## Registry

Default registry is **`ghcr.io/wilforlan`**. **`k8s/build-push-web-ui.sh`** sources **`~/.agent-play-config/ghcr.env`** if present (or set **`AGENT_PLAY_CONFIG_DIR`**) and runs **`docker login ghcr.io`** before push. Create that file with **`k8s/setup.sh`** or manually.

## Build and push

From the **repository root**:

```bash
./k8s/build-push-web-ui.sh
```

Optional: `REGISTRY`, `IMAGE_NAME`, `TAG` (defaults to short git SHA).

Bump **`newTag`** in **`kustomization.yaml`** to the tag you pushed ( **`newName`** is already **`ghcr.io/wilforlan/agent-play-web-ui`**).

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

**Environment:** defaults live in **`k8s/rollout-config.sh`** (`NAMESPACE`, `DEPLOY_*`, `ROLLOUT_TIMEOUT_*`, `APP_HTTP_PORT`). Override via environment when invoking **`deploy.sh`**.

Full command and environment reference: **[docs/k8s/deployment.md](../docs/k8s/deployment.md)**.

### Private registry

Create a pull secret and add **`imagePullSecrets`** on the web UI Deployment ([`agent-play.yaml`](agent-play.yaml)) if GHCR is private for the cluster.

## Documentation

See [Kubernetes deployment](../docs/kubernetes-deployment.md) and [docs/k8s/](../docs/k8s/README.md).
