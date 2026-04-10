# Kubernetes deployment

Reference for running **`@agent-play/web-ui`** with **Redis** on Kubernetes. Sources: [`k8s/`](../../k8s/).

| Topic | Description |
|--------|----------------|
| [Startup](startup.md) | ConfigMap, build/push, Kustomize, first apply |
| [Deployment](deployment.md) | **`npm run deploy`** — apply, status, rollback, history, restart |
| [Redis](redis.md) | PVC, Redis Deployment/Service, probes, `REDIS_URL` |
| [Web server](server.md) | Dockerfile, web UI Deployment, env, probes, registry image |
| [Docker Compose](docker-compose.md) | **`docker-compose.yml`**: Redis + web-ui + agents; **`docker-compose.agents.yml`**: agents only |

**Local development:** [development guide](../development.md).

**Related:** [Redis / repository](../redis-world.md), [monorepo](../monorepo.md).
