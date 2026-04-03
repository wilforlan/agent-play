#!/usr/bin/env bash
set -euo pipefail

K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${K8S_DIR}/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "${K8S_DIR}/rollout-config.sh"

usage() {
  echo "usage: bash k8s/clean-cluster.sh [--yes]"
  echo "       npm run deploy -- clean [--yes]"
  echo ""
  echo "Removes Agent Play resources: kubectl delete -k k8s/"
  echo "(namespace ${NAMESPACE}, volumes, workloads, and services created by this kustomization)."
  echo "Redis PVC data on the cluster is removed unless your provider retains orphaned PVs."
  echo ""
  echo "  --yes, -y   Skip the confirmation prompt (destructive)."
  echo "  -h, --help  Show this help."
}

SKIP_CONFIRM=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes | -y) SKIP_CONFIRM=true; shift ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl: command not found." >&2
  exit 127
fi

CTX="$(kubectl config current-context 2>/dev/null || printf '%s' '(unknown)')"
echo "kubectl context: ${CTX}"
echo "Target namespace (from k8s/kustomization.yaml / rollout-config): ${NAMESPACE}"
echo ""

if [[ "${SKIP_CONFIRM}" != true ]]; then
  read -r -p "Type the namespace name to confirm deletion: " typed || true
  if [[ "${typed:-}" != "${NAMESPACE}" ]]; then
    echo "Aborted (expected exactly: ${NAMESPACE})." >&2
    exit 1
  fi
fi

kubectl delete -k "${K8S_DIR}" --wait=true
echo "Agent Play resources removed from the cluster."
