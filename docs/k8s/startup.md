# Kubernetes startup

Deploy **Redis** and the **web UI** (Next.js + WebSocket on `/ws/agent-play`) using **`k8s/redis.yaml`**, **`k8s/web-ui.yaml`**, **`k8s/namespace.yaml`**, and **`k8s/kustomization.yaml`** (`kubectl apply -k k8s/`).

## Prerequisites

- **Docker** to build and push the web UI image to **GHCR** (`ghcr.io/wilforlan`).
- **kubectl** with Kustomize (`kubectl apply -k`).
- A default **StorageClass** so the Redis PVC can bind.
- Pull credentials on the cluster if the GHCR package is private.

**Missing tools?** Run **`bash k8s/setup.sh`** or **`npm run setup:k8s-server`** (Linux and macOS). It can install Docker, kubectl, git, and curl; prompt for **GHCR** and **`~/.agent-play-config/ghcr.env`**; optionally **`k8s/create-ghcr-pull-secret.sh`** and enable the **GHCR `imagePullSecrets` patch** in **`kustomization.yaml`** when **`kubectl`** is configured (private images); optionally run **`build-push-web-ui.sh`**; check whether something is listening on port **8888** (see **`k8s/rollout-config.sh`**) and print **`http://<server-ip>:8888`** when it is; and offer a first **`kubectl apply`** via **`npm run deploy -- apply`** (same rollout defaults as **`k8s/deploy.sh`**).

Commands assume the **repository root**.

## 1. Configure public preview URL

Edit [`k8s/web-ui.yaml`](../../k8s/web-ui.yaml): ConfigMap **`wilforlan-agent-play-config`**, key **`PLAY_PREVIEW_BASE_URL`**, to the origin users use in the browser (for example `https://play.example.com`). Replace the placeholder before production use.

## 2. Build and push the web UI image

```bash
./k8s/build-push-web-ui.sh
```

Optional: `REGISTRY` (defaults to **`ghcr.io/wilforlan`**), `IMAGE_NAME`, `TAG`.

## 3. Point Kustomize at that image tag

[`k8s/build-push-web-ui.sh`](../../k8s/build-push-web-ui.sh) updates [`k8s/kustomization.yaml`](../../k8s/kustomization.yaml) **`images[0].newName`** and **`newTag`** after each push. Override **`REGISTRY`** / **`IMAGE_NAME`** / **`TAG`** if needed.

## 4. Apply and roll out

```bash
npm run deploy -- apply
```

Equivalent to `kubectl apply -k k8s/` plus waiting for Redis and web UI rollouts.

- Redis Service DNS in namespace **`wilforlan-agent-play`**: **`wilforlan-agent-play-redis:6379`** ([Redis](redis.md)).
- Web UI Service: **`wilforlan-agent-play-web-ui:8888`** ([Web server](server.md)).

**Ingress and TLS** are not in the sample; add them for external HTTPS.

## 5. Rollback and updates

Use the same **`npm run deploy`** entry point: **`rollback`**, **`rollback-to N`**, **`history`**, **`status`**, **`restart`**. Full reference: [Deployment commands](deployment.md); overview: [`k8s/README.md`](../../k8s/README.md).

## Local development without Kubernetes

Use `npm run dev` and Redis per the [development guide](../development.md).
