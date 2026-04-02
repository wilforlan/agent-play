# Redis on Kubernetes

Resources are defined in [`k8s/agent-play.yaml`](../../k8s/agent-play.yaml) (PVC, Deployment, Service).

## What gets created

1. **PersistentVolumeClaim** `wilforlan-agent-play-redis-data` — **1Gi**, `ReadWriteOnce`. AOF data under `/data`.
2. **Deployment** `wilforlan-agent-play-redis` — one replica, image **`redis:7.2-alpine`**, `redis-server --appendonly yes`, resource requests/limits, **exec** probes (`redis-cli ping`), **`fsGroup: 999`** for volume permissions with the official image user.
3. **Service** `wilforlan-agent-play-redis` — ClusterIP port **6379**.

## Web UI connection

The web UI uses **`REDIS_URL=redis://wilforlan-agent-play-redis:6379`** in namespace **`wilforlan-agent-play`**. An **initContainer** on the web UI pod waits until Redis accepts TCP connections before starting the app.

## Operations

- **Replicas:** Sample is single-instance Redis; use a managed offering or Redis Sentinel/Cluster for HA if required.
- **Auth:** Not configured; add Redis `--requirepass` and a Secret, then extend `REDIS_URL`.

**Application behavior:** [Redis / repository](../redis-world.md).
