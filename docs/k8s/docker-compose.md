# Docker Compose (main server + agents)

The main Agent Play server (**`@agent-play/web-ui`**: Next.js + WebSocket + Redis) and the built-in LangChain agents (**`@agent-play/agents`**: Express health endpoint + SDK registration) run as **separate containers**. Redis stays with the web UI; the agents process talks to the main server **only over HTTP** (`RemotePlayWorld`), so you can scale or relocate the agents tier without colocating it with Redis.

## Images

| Image | Dockerfile | Role |
|--------|------------|------|
| Web UI | [`k8s/Dockerfile.web-ui`](../../k8s/Dockerfile.web-ui) | Main server on port **8888** (override with `WEB_UI_PORT`). |
| Agents | [`k8s/Dockerfile.agents`](../../k8s/Dockerfile.agents) | Sidecar HTTP on **3100** (`/health`); registers built-ins against `AGENT_PLAY_WEB_UI_URL`. |

Building the agents image requires a **`.root`** file in the repository root (same as local SDK builds); see [World model / player chain](../notes/agent-play-world-model-and-player-chain.md).

## Full stack (one host)

From the repository root:

```bash
docker compose up --build
```

- **Web UI:** `http://localhost:8888` (or `WEB_UI_PORT`).
- **Agents health:** `http://localhost:3100/health` (or `AGENTS_PORT`).
- Inside the stack, the agents container uses **`AGENT_PLAY_WEB_UI_URL=http://web-ui:8888`** so it reaches the main server by Docker DNS.

Set optional secrets and tuning in a **`.env`** file next to `docker-compose.yml` (Compose loads it for variable substitution). Typical variables:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Built-in LangChain agents |
| `AGENT_PLAY_API_KEY` | If the repository requires an API key for registration |
| `AGENT_PLAY_ROOT_KEY` / `AGENT_PLAY_NODE_PASSW` | SDK auth when not using a mounted credentials file |
| `PLAY_PREVIEW_BASE_URL` | Public origin for preview URLs (defaults to `http://127.0.0.1:8888`) |

Override the URL the agents use (e.g. TLS terminator in front of `web-ui`):

```bash
AGENT_PLAY_WEB_UI_URL=https://play.example.com docker compose up --build
```

## Agents only (standalone server)

Run **only** the agents image against a main server that is already deployed elsewhere:

```bash
export AGENT_PLAY_WEB_UI_URL=https://your-main-server.example
docker compose -f docker-compose.agents.yml up --build
```

`AGENT_PLAY_WEB_UI_URL` must be reachable from the agents container (public URL or internal network URL).

## Listen address (containers)

The agents Express server binds **`AGENT_PLAY_BUILTINS_HOST`** (default **`127.0.0.1`** locally; the image sets **`0.0.0.0`** so `/health` is reachable from outside the container).

## Build commands (without Compose)

```bash
docker build -f k8s/Dockerfile.web-ui -t agent-play-web-ui .
docker build -f k8s/Dockerfile.agents -t agent-play-agents .
```
