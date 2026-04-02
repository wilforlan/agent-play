#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NAMESPACE="${NAMESPACE:-wilforlan-agent-play}"
DEPLOY_WEB="${DEPLOY_WEB:-wilforlan-agent-play-web-ui}"
DEPLOY_REDIS="${DEPLOY_REDIS:-wilforlan-agent-play-redis}"
ROLLOUT_TIMEOUT_WEB="${ROLLOUT_TIMEOUT_WEB:-10m}"
ROLLOUT_TIMEOUT_REDIS="${ROLLOUT_TIMEOUT_REDIS:-5m}"

usage() {
  echo "usage: npm run deploy -- <command> [args]"
  echo ""
  echo "  apply | update   kubectl apply -k k8s/ and wait for Redis + web UI rollouts"
  echo "  status           Rollout status for web UI (and Redis)"
  echo "  rollback         Undo the last web UI rollout"
  echo "  rollback-to N    Roll web UI back to a specific revision (use history)"
  echo "  history          kubectl rollout history for web UI"
  echo "  restart          Rolling restart of the web UI pods only"
  echo ""
  echo "Environment: NAMESPACE (default wilforlan-agent-play), DEPLOY_WEB, DEPLOY_REDIS, ROLLOUT_TIMEOUT_*; kubectl context must target the cluster."
}

case "${1:-}" in
  "" | help | -h | --help)
    usage
    exit 0
    ;;
  apply | update)
    kubectl apply -k k8s/
    kubectl rollout status "deployment/${DEPLOY_REDIS}" -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT_REDIS}"
    kubectl rollout status "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT_WEB}"
    ;;
  status)
    kubectl rollout status "deployment/${DEPLOY_REDIS}" -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT_REDIS}"
    kubectl rollout status "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT_WEB}"
    ;;
  rollback)
    kubectl rollout undo "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}"
    kubectl rollout status "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT_WEB}"
    ;;
  rollback-to)
    revision="${2:?usage: npm run deploy -- rollback-to <revision>}"
    kubectl rollout undo "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}" --to-revision="${revision}"
    kubectl rollout status "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT_WEB}"
    ;;
  history)
    kubectl rollout history "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}"
    ;;
  restart)
    kubectl rollout restart "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}"
    kubectl rollout status "deployment/${DEPLOY_WEB}" -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT_WEB}"
    ;;
  *)
    echo "unknown command: $1" >&2
    usage
    exit 1
    ;;
esac
