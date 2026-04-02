#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REGISTRY="${REGISTRY:-ghcr.io/wilforlan}"
IMAGE_NAME="${IMAGE_NAME:-agent-play-web-ui}"

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

echo ""
echo "Update k8s/kustomization.yaml images[0].newTag to match this build (newName is ${REGISTRY}/${IMAGE_NAME}):"
echo "  newTag: \"${TAG}\""
echo ""
echo "Then on the server: npm run deploy -- apply"
