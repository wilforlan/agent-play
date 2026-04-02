# Server deployment commands

From the **repository root**, with **`kubectl`** pointing at the right cluster and namespace. The script is [`k8s/deploy.sh`](../../k8s/deploy.sh); **`npm run deploy`** invokes it.

## Usage

```text
npm run deploy -- <command> [args]
```

Run **`npm run deploy`** with no arguments (or **`npm run deploy -- help`**) to print the same summary.

## Commands

| Command | What it does |
|---------|----------------|
| **`apply`** or **`update`** | Runs **`kubectl apply -k k8s/`**, then waits for rollouts: **`wilforlan-agent-play-redis`**, then **`wilforlan-agent-play-web-ui`**. |
| **`status`** | **`kubectl rollout status`** for **`wilforlan-agent-play-redis`** and **`wilforlan-agent-play-web-ui`**. |
| **`rollback`** | **`kubectl rollout undo`** for **`wilforlan-agent-play-web-ui`** only, then waits for that rollout. |
| **`rollback-to N`** | **`kubectl rollout undo`** for **`wilforlan-agent-play-web-ui`** with **`--to-revision=N`**, then waits. Use **`history`** to list revisions. |
| **`history`** | **`kubectl rollout history deployment/wilforlan-agent-play-web-ui`** in the namespace. |
| **`restart`** | **`kubectl rollout restart deployment/wilforlan-agent-play-web-ui`**, then waits for the rollout. |

Rollback, history, and restart apply to the **web UI** deployment. Redis is only included in **`apply`** and **`status`**.

## Environment

| Variable | Default | Role |
|----------|---------|------|
| **`NAMESPACE`** | `wilforlan-agent-play` | Namespace for all **`kubectl`** calls. |
| **`DEPLOY_WEB`** | `wilforlan-agent-play-web-ui` | Web UI Deployment name. |
| **`DEPLOY_REDIS`** | `wilforlan-agent-play-redis` | Redis Deployment name. |
| **`ROLLOUT_TIMEOUT_WEB`** | `10m` | Timeout waiting on the web UI rollout. |
| **`ROLLOUT_TIMEOUT_REDIS`** | `5m` | Timeout waiting on the Redis rollout. |

Example:

```bash
NAMESPACE=wilforlan-agent-play npm run deploy -- status
```

## Examples

```bash
npm run deploy -- apply
npm run deploy -- status
npm run deploy -- rollback
npm run deploy -- history
npm run deploy -- rollback-to 3
npm run deploy -- restart
```

## Related

- [Startup](startup.md) — build/push image, **`kustomization.yaml`**, first apply.
- [`k8s/README.md`](../../k8s/README.md) — registry and private pull secrets.
