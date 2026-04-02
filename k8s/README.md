# Kubernetes

| File | Role |
|------|------|
| **`agent-play.yaml`** | Namespace, ConfigMap, Redis (PVC + Deployment + Service), web UI (Deployment + Service). |
| **`kustomization.yaml`** | Namespace **`wilforlan-agent-play`**, image **`ghcr.io/wilforlan/agent-play-web-ui:<tag>`**, shared labels. |
| **`Dockerfile.web-ui`** | Multi-stage image: monorepo install, `next build` for `@agent-play/web-ui`, `tsx server.ts` on port **8888**. |
| **`build-push-web-ui.sh`** | Builds and pushes **`ghcr.io/wilforlan/agent-play-web-ui`** (override with `REGISTRY`). |
| **`deploy.sh`** | Invoked via **`npm run deploy`** — apply/update, rollout status, rollback, history, restart. |

## Registry

Default registry is **`ghcr.io/wilforlan`**. Log in to GHCR (`docker login ghcr.io`) before pushing.

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

**Environment:** `NAMESPACE` (default **`wilforlan-agent-play`**), `ROLLOUT_TIMEOUT_WEB`, `ROLLOUT_TIMEOUT_REDIS`.

Full command and environment reference: **[docs/k8s/deployment.md](../docs/k8s/deployment.md)**.

### Private registry

Create a pull secret and add **`imagePullSecrets`** on the web UI Deployment ([`agent-play.yaml`](agent-play.yaml)) if GHCR is private for the cluster.

## Documentation

See [Kubernetes deployment](../docs/kubernetes-deployment.md) and [docs/k8s/](../docs/k8s/README.md).
