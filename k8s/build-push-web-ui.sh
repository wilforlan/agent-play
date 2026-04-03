#!/usr/bin/env bash
set -euo pipefail

# macOS: ensure Docker Desktop is running before push.
# Apple Silicon → amd64 cluster: DOCKER_BUILD_PLATFORM=linux/amd64 ./k8s/build-push-web-ui.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OS_NAME="$(uname -s)"

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_docker_ready() {
  if ! have_cmd docker; then
    echo "docker: command not found." >&2
    if [[ "$OS_NAME" == "Darwin" ]]; then
      echo "Install Docker Desktop (or run: brew install --cask docker), then start Docker.app." >&2
    else
      echo "Install Docker Engine, then re-run this script (or: bash k8s/setup.sh)." >&2
    fi
    exit 127
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Docker is installed but the daemon is not reachable." >&2
    if [[ "$OS_NAME" == "Darwin" ]]; then
      echo "Start Docker Desktop and wait until it is running, then retry." >&2
    else
      echo "Start the Docker service (e.g. sudo systemctl start docker) or log in as a user in the docker group." >&2
    fi
    exit 1
  fi
}

ensure_docker_ready

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
if [[ -n "${DOCKER_BUILD_PLATFORM:-}" ]]; then
  echo "Using Docker platform: ${DOCKER_BUILD_PLATFORM} (set DOCKER_BUILD_PLATFORM=linux/amd64 on Apple Silicon if your cluster is amd64)"
fi

build_args=(
  -f k8s/Dockerfile.web-ui
  -t "${FULL_IMAGE}"
  -t "${LATEST_IMAGE}"
)
if [[ -n "${DOCKER_BUILD_PLATFORM:-}" ]]; then
  build_args+=(--platform "${DOCKER_BUILD_PLATFORM}")
fi

docker build "${build_args[@]}" .

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
