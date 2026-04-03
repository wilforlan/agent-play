# Web UI server (container and Kubernetes)

The app is **`@agent-play/web-ui`**: **`server.ts`** serves Next.js and a **WebSocket** on **`/ws/agent-play`**. The image is built by [`k8s/Dockerfile.web-ui`](../../k8s/Dockerfile.web-ui); build-time **`NEXT_PUBLIC_*`** values can be overridden with **`--build-arg`** (defaults match `/agent-play`).

## Docker image

Build and push with [`k8s/build-push-web-ui.sh`](../../k8s/build-push-web-ui.sh) or:

```bash
docker build -f k8s/Dockerfile.web-ui -t ghcr.io/wilforlan/agent-play-web-ui:TAG .
docker push ghcr.io/wilforlan/agent-play-web-ui:TAG
```

Prefer [`k8s/build-push-web-ui.sh`](../../k8s/build-push-web-ui.sh), then **`npm run deploy -- apply`** on the server.

## Kubernetes

Definition: [`k8s/web-ui.yaml`](../../k8s/web-ui.yaml) (Deployment + Service `wilforlan-agent-play-web-ui`), tuned via [`k8s/kustomization.yaml`](../../k8s/kustomization.yaml) for the **registry image**.

| Piece | Role |
|--------|------|
| **Deployment** `wilforlan-agent-play-web-ui` | Rolling update, resource requests/limits, **`imagePullPolicy: Always`**, init wait for Redis, TCP probes on named port **`http`** (8888). |
| **Service** `wilforlan-agent-play-web-ui` | ClusterIP **8888** → pod port **`http`**. |

### Environment (Deployment)

| Variable | Source / notes |
|----------|------------------|
| `PORT` | **8888** |
| `HOSTNAME` | **`0.0.0.0`** |
| `NODE_ENV` | **`production`** |
| `REDIS_URL` | **`redis://wilforlan-agent-play-redis:6379`** |
| `PLAY_PREVIEW_BASE_URL` | ConfigMap **`wilforlan-agent-play-config`** — must be your real public origin. |
| `NEXT_PUBLIC_AGENT_PLAY_BASE` | **`/agent-play`** (must match image build if you change paths). |
| `NEXT_PUBLIC_PLAY_API_BASE` | **`/agent-play`** (same). |

### Ingress

Sample has no Ingress. Terminate TLS at your controller and forward to Service **`wilforlan-agent-play-web-ui`** port **8888**; keep **`PLAY_PREVIEW_BASE_URL`** aligned with the public URL.
