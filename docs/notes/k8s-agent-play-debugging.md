# Agent Play on Kubernetes — debugging notes

This note collects **strategies for when things look “wrong” in the cluster** (especially **Docker Desktop / kind**), plus **context from project changes** we discussed while wiring up Agent Play on k8s.

## Symptoms you might see

### Redis pod is `Running`, but the Deployment shows `0/1` or `Progressing`

The Deployment’s “ready” count only goes up when **at least one Pod is Ready**, not merely `Running`.

**Check in order:**

1. **Readiness probe**
   - `kubectl describe pod -n wilforlan-agent-play -l app=wilforlan-agent-play-redis`
   - Look for **Warning** events: `Readiness probe failed`, timeouts, or exec failures (`redis-cli ping`).

2. **Label / selector mismatch**
   - After **Kustomize `commonLabels`**, the Deployment’s `spec.selector.matchLabels` must match the pod template labels. Mismatches produce “orphan” pods the ReplicaSet does not count.
   - Compare:
     - `kubectl get deployment wilforlan-agent-play-redis -n wilforlan-agent-play -o yaml | grep -A20 matchLabels:`
     - `kubectl get pods -n wilforlan-agent-play -l app=wilforlan-agent-play-redis -o yaml | grep -A15 "labels:"`
   - If a pod lacks `app.kubernetes.io/part-of` (or whatever the Deployment selector requires), you are in this bucket.

3. **Multiple ReplicaSets / stuck rollout**
   - `kubectl get rs -n wilforlan-agent-play | grep redis`
   - Old ReplicaSets with **0 desired** but pods still terminating can confuse UIs briefly; `kubectl describe deployment wilforlan-agent-play-redis -n wilforlan-agent-play` shows **Conditions** and **Events**.

4. **Volume attach / startup still settling**
   - Redis with **AOF on a PVC** can be slow on first start; probes may fail until `/data` is usable. Check **Events** and `kubectl logs` on the redis container.

### Web UI Deployment / pod not becoming Ready

1. **Pod actually `Pending` (common on small clusters)**
   - **CPU/memory requests** too high for the node → scheduler never places the pod.
   - `kubectl describe pod -n wilforlan-agent-play -l app=wilforlan-agent-play-web-ui` → **Events** (e.g. `Insufficient cpu`, `Insufficient memory`).

2. **Init container `wait-for-redis`**
   - Web UI pod waits until **TCP 6379** on Service DNS `wilforlan-agent-play-redis` succeeds.
   - If Redis is not Ready or Service has no endpoints, init stays running.
   - `kubectl logs -n wilforlan-agent-play <web-ui-pod> -c wait-for-redis`

3. **Image pull**
   - `ImagePullBackOff` on **ghcr** (web UI) → registry auth or wrong tag. **Build/push** (`k8s/build-push-web-ui.sh`) and **`kustomization.yaml`** image must match.
   - `ImagePullBackOff` on **`wait-for-redis`** (`busybox`) — same Docker Hub flake as Redis; manifest uses **`public.ecr.aws/docker/library/busybox:1.36`** (not `docker.io/library/busybox`).

4. **Later: app readiness**
   - `readinessProbe` is TCP **8888**. If Next/server never listens: pod can be `Running` but not **Ready**.

## Command cheat sheet (same namespace)

```bash
NS=wilforlan-agent-play

kubectl get pods,deploy,svc,pvc -n "$NS" -o wide

kubectl describe deployment wilforlan-agent-play-redis -n "$NS"
kubectl describe deployment wilforlan-agent-play-web-ui -n "$NS"

kubectl describe pod -n "$NS" -l app=wilforlan-agent-play-redis
kubectl describe pod -n "$NS" -l app=wilforlan-agent-play-web-ui

kubectl logs -n "$NS" -l app=wilforlan-agent-play-redis --tail=100
kubectl logs -n "$NS" -l app=wilforlan-agent-play-web-ui -c wait-for-redis --tail=50
kubectl logs -n "$NS" -l app=wilforlan-agent-play-web-ui -c web-ui --tail=100

kubectl get endpoints wilforlan-agent-play-redis -n "$NS"
```

## Project-specific context (from earlier work)

### Manifest layout

- **`k8s/namespace.yaml`** — namespace.
- **`k8s/redis.yaml`** — Redis PVC, Deployment (**`Recreate`** strategy for **ReadWriteOnce**), Service.
- **`k8s/web-ui.yaml`** — ConfigMap (`PLAY_PREVIEW_BASE_URL`), web UI Deployment (init waits for Redis), Service.
- **`k8s/kustomization.yaml`** — composes the above, **commonLabels**, and **image** override for the web UI.

**RollingUpdate + `maxSurge: 1` + single-replica Redis + RWO PVC** caused “old replicas pending termination” / stuck rollouts; **Redis uses `Recreate`** so only one pod holds the volume at a time.

### Image pulls (Docker Hub flakes)

- **Redis:** **`public.ecr.aws/docker/library/redis:7.2-alpine`** in `redis.yaml` (instead of `docker.io/library/redis:7.2-alpine`).
- **Web UI init (`wait-for-redis`):** **`public.ecr.aws/docker/library/busybox:1.36`** in `web-ui.yaml` (instead of `busybox:1.36` on Docker Hub).

### GHCR `403 Forbidden` / `failed to fetch anonymous token`

The node pulls **`ghcr.io`** **without** your laptop’s Docker credentials. A **private** package (or org policy) returns **403** on the anonymous token. Fix: make the package **public**, or run **`k8s/create-ghcr-pull-secret.sh`** and uncomment **`patches`** in **`k8s/kustomization.yaml`** (see **`k8s/README.md`**). Ensure **`images[0].newTag`** matches a tag you actually pushed.

### Redis `chown: .: Operation not permitted`

The library image **`docker-entrypoint.sh`** tries to **`chown`** `/data`. The Deployment uses **`capabilities.drop: ["ALL"]`**, which removes **`CAP_CHOWN`**, so that step fails. **`redis.yaml`** sets **`command: ["redis-server"]`** so the process starts **without** the entrypoint (no chown). **`fsGroup: 999`** still gives the `redis` user group access to the PVC mount.

### PVC size

- Kubernetes forbids **shrinking** `spec.resources.requests.storage` below **`status.capacity`** on an existing PVC. Fix: set storage in YAML **≥** current capacity, or replace the PVC (data loss unless backed up).

### Docker / monorepo build

- **`k8s/Dockerfile.web-ui`** builds with **web-ui as `/app`** (`npm install` uses web-ui `package.json`, **`npx next build`** skips `prebuild`/`copy-sources` that assume full monorepo paths).
- If **`../sdk`** aliases are required for Next, the Dockerfile must still copy **SDK** sources to the path expected by `next.config.ts` / `tsconfig` (this repo has evolved; verify the live Dockerfile if builds fail).
- **`npm prune --omit=dev`** removes **devDependencies**; production **`server.ts`** still calls **`next()`**, which loads **`next.config.ts`**, so **`typescript`** must stay a **runtime** dependency (listed under **`dependencies`** in `packages/web-ui/package.json`). Without it you see **Failed to load next.config.ts** / attempts to run **`npm install typescript`**.

### Scripts

- **`k8s/setup.sh`** — **Linux and macOS** helpers (Docker, kubectl, GHCR, optional cluster **`ghcr-pull`** secret + kustomize patch, optional build-push).
- **`k8s/build-push-web-ui.sh`** — checks **Docker daemon**, optional **`DOCKER_BUILD_PLATFORM`** (e.g. `linux/amd64` from Apple Silicon).
- **`k8s/clean-cluster.sh`** / **`npm run deploy -- clean`** — **`kubectl delete -k k8s/`** with optional **`--yes`** after typing namespace to confirm.

### Local cluster (screenshot context)

- **Docker Desktop → Kubernetes** can report **kind**-style clusters (e.g. **v1.35.x**, single node). **Resource requests** on Redis + web UI still apply; **`Pending`** almost always means **schedule** or **pull**, not logic bugs.

## Suggested order when everything “looks green” in the UI but deploy says `0/1`

1. `kubectl describe pod` for the pod the UI claims is running → **Conditions** (Ready?), **Events**, probe failures.
2. `kubectl get endpoints` for **redis** and **web-ui** Services → non-empty subsets.
3. Confirm **one** Redis pod matches **current** ReplicaSet generation (`pod` ownerReferences / `replicaset` name vs deployment’s `kubectl rollout status`).

---

*Last updated from discussion: Redis vs Deployment ready mismatch, web UI dependency chain, kind/Docker Desktop, manifests and operational scripts above.*
