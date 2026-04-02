#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONFIG_DIR="${AGENT_PLAY_CONFIG_DIR:-$HOME/.agent-play-config}"
GHCR_ENV="${CONFIG_DIR}/ghcr.env"
if [[ -f "$GHCR_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$GHCR_ENV"
  set +a
fi

REGISTRY="${REGISTRY:-ghcr.io/wilforlan}"
IMAGE_NAME="${IMAGE_NAME:-agent-play-web-ui}"

if [[ -n "${GHCR_TOKEN:-}" ]] && [[ -n "${GHCR_USERNAME:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  DEFAULT_TAG="$(git rev-parse --short HEAD)"
else
  DEFAULT_TAG="local"
fi
TAG="${TAG:-$DEFAULT_TAG}"

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"
LATEST_IMAGE="${REGISTRY}/${IMAGE_NAME}:latest"

echo "Building ${FULL_IMAGE}"

docker build \
  -f k8s/Dockerfile.web-ui \
  -t "${FULL_IMAGE}" \
  -t "${LATEST_IMAGE}" \
  .

echo "Pushing ${FULL_IMAGE} and ${LATEST_IMAGE}"
docker push "${FULL_IMAGE}"
docker push "${LATEST_IMAGE}"

KUSTOMIZE_FILE="${ROOT}/k8s/kustomization.yaml"
NEW_NAME="${REGISTRY}/${IMAGE_NAME}"

update_kustomization() {
  local kfile="$1"
  local new_name="$2"
  local new_tag="$3"
  if [[ ! -f "$kfile" ]]; then
    echo "warning: ${kfile} not found; skip kustomization update." >&2
    return 1
  fi
  local py="${ROOT}/scripts/update-kustomization-image.py"
  if command -v python3 >/dev/null 2>&1 && [[ -f "$py" ]]; then
    if python3 "$py" --kustomization "$kfile" --new-name "$new_name" --new-tag "$new_tag"; then
      return 0
    fi
    echo "warning: kustomization update via python3 failed; trying sed" >&2
  fi
  local tmp
  tmp="$(mktemp)"
  sed \
    -e "s|^    newName: .*|    newName: ${new_name}|" \
    -e "s|^    newTag: .*|    newTag: \"${new_tag}\"|" \
    "$kfile" >"$tmp"
  mv "$tmp" "$kfile"
  return 0
}

echo ""
if update_kustomization "$KUSTOMIZE_FILE" "$NEW_NAME" "$TAG"; then
  echo "Updated ${KUSTOMIZE_FILE}: newName=${NEW_NAME}, newTag=\"${TAG}\""
else
  echo "Set manually in ${KUSTOMIZE_FILE}: newName: ${NEW_NAME}, newTag: \"${TAG}\""
fi
echo ""
echo "Then on the server: npm run deploy -- apply"
