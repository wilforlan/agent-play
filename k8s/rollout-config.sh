#!/usr/bin/env bash
export NAMESPACE="${NAMESPACE:-wilforlan-agent-play}"
export DEPLOY_WEB="${DEPLOY_WEB:-wilforlan-agent-play-web-ui}"
export DEPLOY_REDIS="${DEPLOY_REDIS:-wilforlan-agent-play-redis}"
export ROLLOUT_TIMEOUT_WEB="${ROLLOUT_TIMEOUT_WEB:-10m}"
export ROLLOUT_TIMEOUT_REDIS="${ROLLOUT_TIMEOUT_REDIS:-5m}"
export APP_HTTP_PORT="${APP_HTTP_PORT:-8888}"
