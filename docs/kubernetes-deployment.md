# Kubernetes deployment

The detailed guide lives under **[`docs/k8s/`](k8s/README.md)**:

| Document | Contents |
|----------|----------|
| [k8s overview](k8s/README.md) | Topic index |
| [Startup](k8s/startup.md) | ConfigMap, **`build-push-web-ui.sh`**, Kustomize, apply |
| [Deployment](k8s/deployment.md) | **`npm run deploy`** — apply, status, rollback, history, restart |
| [Redis](k8s/redis.md) | PVC, Redis, Service, persistence |
| [Web server](k8s/server.md) | Dockerfile, web UI, registry image |

Manifests in **[`k8s/`](../k8s/)**: **`namespace.yaml`**, **`redis.yaml`**, **`web-ui.yaml`**, **`kustomization.yaml`** (image **`ghcr.io/wilforlan/agent-play-web-ui`**), **`Dockerfile.web-ui`**, **`build-push-web-ui.sh`**, **`deploy.sh`**. From the repo root, **`npm run deploy -- apply`** (or **`rollback`**, **`status`**, etc.) runs **`deploy.sh`**.

## Related

- [Development guide](development.md) — local env, `npm run dev`.
- [npm and CI](npm-and-ci.md) — packages and API docs.
