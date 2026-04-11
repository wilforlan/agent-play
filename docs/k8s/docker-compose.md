# Docker Compose (main server + agents)

The main Agent Play server (**`@agent-play/web-ui`**: Next.js + WebSocket + Redis) and the built-in LangChain agents (**`@agent-play/agents`**: Express health endpoint + SDK registration) run as **separate containers**. Redis stays with the web UI; the agents process talks to the main server **only over HTTP** (`RemotePlayWorld`), so you can scale or relocate the agents tier without colocating it with Redis.

## Images

| Image | Dockerfile | Role |
|--------|------------|------|
| Web UI | [`k8s/Dockerfile.web-ui`](../../k8s/Dockerfile.web-ui) | Main server on port **8888** (override with `WEB_UI_PORT`). |
| Agents | [`k8s/Dockerfile.agents`](../../k8s/Dockerfile.agents) | Sidecar HTTP on **3100** (`/health`); registers built-ins using **`RemotePlayWorld`** and a mounted **`credentials.json`**. |

Building the agents image requires a **`.root`** file in the repository root (same as local SDK builds); see [World model / player chain](../notes/agent-play-world-model-and-player-chain.md).

## Credentials for the agents container (required)

The CLI writes **`~/.agent-play/credentials.json`** on the host. The SDK’s default path (when **`AGENT_PLAY_CREDENTIALS_PATH`** is unset) is **`join(homedir(), ".agent-play", "credentials.json")`**.

The agents image sets **`HOME=/home/agentplay`** and creates **`/home/agentplay/.agent-play/`**. Compose bind-mounts your copy of the file to the **same logical path** inside the container so **`resolveAgentPlayCredentialsPath()`** is unchanged—no env override:

| Host path (override with `AGENT_PLAY_CREDENTIALS_HOST_FILE`) | Path inside container (same as `~/.agent-play/credentials.json` for user `agentplay`) |
|---------------------------------------------------------------|----------------------------------------------------------------------------------------|
| `./agent-play-credentials.json` | `/home/agentplay/.agent-play/credentials.json` |

Before `docker compose up`:

1. Copy your CLI file next to `docker-compose.yml`: `cp ~/.agent-play/credentials.json ./agent-play-credentials.json`.
2. Edit **`serverUrl`** so it matches how **this container** reaches the web UI:
   - **Full stack:** use the Compose service name, e.g. **`http://web-ui:8888`** (not `http://127.0.0.1:3000` unless that resolves inside the container).
   - **Standalone agents:** use your real deployed origin, e.g. **`https://play.example.com`**.

`RemotePlayWorld` does **not** use `AGENT_PLAY_WEB_UI_URL` for HTTP; the health endpoint and startup log show the same **`serverUrl`** read from the file when it loads (with a localhost default only if the file is missing).

## Full stack (one host)

From the repository root:

```bash
cp ~/.agent-play/credentials.json ./agent-play-credentials.json
# Set serverUrl to http://web-ui:8888 (or your stack’s web UI URL)
docker compose up --build
```

- **Web UI:** `http://localhost:8888` (or `WEB_UI_PORT`).
- **Agents health:** `http://localhost:3100/health` (`target` mirrors **`serverUrl`** from the mounted credentials file).

Other optional variables in a **`.env`** file next to `docker-compose.yml`:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Built-in LangChain agents |
| `AGENT_PLAY_API_KEY` | If the repository requires an API key for registration |
| `AGENT_PLAY_MAIN_NODE_ID` | Optional override for `connect({ mainNodeId })` |
| `PLAY_PREVIEW_BASE_URL` | Public origin for preview URLs on the web UI (defaults to `http://127.0.0.1:8888`) |

## Agents only (standalone server)

```bash
cp ~/.agent-play/credentials.json ./agent-play-credentials.json
# Set serverUrl to your deployed main server origin
docker compose -f docker-compose.agents.yml up --build
```

## Listen address (containers)

The agents Express server binds **`AGENT_PLAY_BUILTINS_HOST`** (default **`127.0.0.1`** locally; the image sets **`0.0.0.0`** so `/health` is reachable from outside the container).

## Build commands (without Compose)

```bash
docker build -f k8s/Dockerfile.web-ui -t agent-play-web-ui .
docker build -f k8s/Dockerfile.agents -t agent-play-agents .
```
