#!/usr/bin/env bash
set -euo pipefail

K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck disable=SC1091
source "${K8S_DIR}/rollout-config.sh"

CONFIG_DIR="${AGENT_PLAY_CONFIG_DIR:-$HOME/.agent-play-config}"
GHCR_ENV="${CONFIG_DIR}/ghcr.env"
if [[ -f "$GHCR_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$GHCR_ENV"
  set +a
fi

if [[ -z "${GHCR_USERNAME:-}" ]] || [[ -z "${GHCR_TOKEN:-}" ]]; then
  echo "GHCR_USERNAME and GHCR_TOKEN are required." >&2
  echo "Set them in the environment or in ${GHCR_ENV} (see k8s/setup.sh)." >&2
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl: command not found." >&2
  exit 127
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username="${GHCR_USERNAME}" \
  --docker-password="${GHCR_TOKEN}" \
  --namespace="${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret ghcr-pull applied in namespace ${NAMESPACE}."
