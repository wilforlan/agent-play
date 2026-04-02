#!/usr/bin/env bash
set -euo pipefail

K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${K8S_DIR}/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "${K8S_DIR}/rollout-config.sh"

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
esac

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl: command not found." >&2
  echo "Install Docker, kubectl, and related tools: bash k8s/setup.sh" >&2
  exit 127
fi

case "${1:-}" in
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

