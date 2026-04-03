#!/usr/bin/env bash
set -euo pipefail

OS_NAME="$(uname -s)"
if [[ "$OS_NAME" != "Linux" && "$OS_NAME" != "Darwin" ]]; then
  echo "This script supports Linux and macOS only." >&2
  exit 1
fi

K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${K8S_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${K8S_DIR}/rollout-config.sh"

echo ""
echo "Agent Play — setup tools (interactive)"
echo ""

ask() {
  local prompt="$1"
  read -r -p "${prompt} [y/N] " reply || true
  case "${reply:-}" in
    [yY][eE][sS]|[yY]) return 0 ;;
    *) return 1 ;;
  esac
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

run_sudo() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  x86_64) KUBECTL_ARCH="amd64" ;;
  aarch64 | arm64) KUBECTL_ARCH="arm64" ;;
  *)
    echo "Unsupported machine: $ARCH_RAW" >&2
    exit 1
    ;;
esac

CONFIG_DIR="${AGENT_PLAY_CONFIG_DIR:-$HOME/.agent-play-config}"
GHCR_ENV="${CONFIG_DIR}/ghcr.env"

install_docker_linux() {
  echo "Installing Docker Engine via https://get.docker.com ..."
  if ! have_cmd curl; then
    echo "Installing curl first..."
    if have_cmd apt-get; then
      run_sudo apt-get update -qq
      run_sudo apt-get install -y curl ca-certificates
    elif have_cmd dnf; then
      run_sudo dnf install -y curl ca-certificates
    elif have_cmd yum; then
      run_sudo yum install -y curl ca-certificates
    else
      echo "Install curl, then re-run this script." >&2
      exit 1
    fi
  fi
  curl -fsSL https://get.docker.com | run_sudo sh
  if have_cmd systemctl; then
    run_sudo systemctl enable --now docker || true
  fi
  echo "Docker installed."
  if [[ "${EUID:-$(id -u)}" -ne 0 ]] && id -nG | grep -qv '\bdocker\b'; then
    echo "Add your user to the docker group to run docker without sudo:"
    echo "  sudo usermod -aG docker \"\$USER\""
    echo "Then log out and back in (or newgrp docker)."
  fi
}

install_docker_macos() {
  if have_cmd docker; then
    echo "Docker already present: $(docker --version)"
    return 0
  fi

  if have_cmd brew; then
    echo "Installing Docker Desktop via Homebrew Cask..."
    brew install --cask docker
    echo "Docker Desktop installed."
    echo "Open Docker.app once to finish setup and start the daemon."
    return 0
  fi

  echo "Homebrew not found."
  echo "Install Docker Desktop from:"
  echo "  https://www.docker.com/products/docker-desktop/"
  echo "Then open Docker.app and re-run this script."
}

install_kubectl_linux() {
  local ver
  ver="$(curl -Ls https://dl.k8s.io/release/stable.txt)"
  echo "Installing kubectl ${ver} (${KUBECTL_ARCH})..."
  curl -fL "https://dl.k8s.io/release/${ver}/bin/linux/${KUBECTL_ARCH}/kubectl" -o "/tmp/kubectl.$$"
  chmod +x "/tmp/kubectl.$$"
  run_sudo install -o root -g root -m 0755 "/tmp/kubectl.$$" /usr/local/bin/kubectl
  rm -f "/tmp/kubectl.$$"
  kubectl version --client
}

install_kubectl_macos() {
  if have_cmd brew; then
    echo "Installing/upgrading kubectl via Homebrew..."
    brew install kubectl || brew upgrade kubectl
    kubectl version --client
    return 0
  fi

  local ver
  ver="$(curl -Ls https://dl.k8s.io/release/stable.txt)"
  echo "Installing kubectl ${ver} (${KUBECTL_ARCH}) for macOS..."
  curl -fL "https://dl.k8s.io/release/${ver}/bin/darwin/${KUBECTL_ARCH}/kubectl" -o "/tmp/kubectl.$$"
  chmod +x "/tmp/kubectl.$$"
  run_sudo install -o root -g wheel -m 0755 "/tmp/kubectl.$$" /usr/local/bin/kubectl
  rm -f "/tmp/kubectl.$$"
  kubectl version --client
}

install_git_if_missing() {
  if have_cmd git; then
    echo "git: $(git --version)"
    return 0
  fi
  echo "git not found."
  if ! ask "Install git?"; then
    return 0
  fi
  if [[ "$OS_NAME" == "Darwin" ]]; then
    if have_cmd brew; then
      brew install git
    else
      echo "Install Xcode Command Line Tools to get git:"
      echo "  xcode-select --install"
    fi
  elif have_cmd apt-get; then
    run_sudo apt-get update -qq && run_sudo apt-get install -y git
  elif have_cmd dnf; then
    run_sudo dnf install -y git
  elif have_cmd yum; then
    run_sudo yum install -y git
  else
    echo "Install git with your distribution package manager." >&2
    exit 1
  fi
}

install_curl_if_missing() {
  if have_cmd curl; then
    return 0
  fi
  if ! ask "Install curl (needed for kubectl download)?"; then
    return 0
  fi
  if [[ "$OS_NAME" == "Darwin" ]]; then
    if have_cmd brew; then
      brew install curl
    else
      echo "curl is usually preinstalled on macOS. If missing, install Homebrew or Xcode tools." >&2
      return 0
    fi
  elif have_cmd apt-get; then
    run_sudo apt-get update -qq && run_sudo apt-get install -y curl
  elif have_cmd dnf; then
    run_sudo dnf install -y curl
  elif have_cmd yum; then
    run_sudo yum install -y curl
  fi
}

write_ghcr_env() {
  local user="$1"
  local token="$2"
  mkdir -p "$CONFIG_DIR"
  chmod 700 "$CONFIG_DIR"
  umask 077
  {
    echo "# Agent Play — GHCR (written by k8s/setup.sh)"
    printf 'GHCR_USERNAME=%q\n' "$user"
    printf 'GHCR_TOKEN=%q\n' "$token"
  } >"$GHCR_ENV"
  chmod 600 "$GHCR_ENV"
  echo "Saved credentials to ${GHCR_ENV} (mode 600)."
}

ghcr_login_interactive() {
  if ! have_cmd docker; then
    echo "Install Docker first; skipping GHCR login." >&2
    return 0
  fi

  if [[ -f "$GHCR_ENV" ]] && ask "Use existing credentials from ${GHCR_ENV}?"; then
    set -a
    # shellcheck disable=SC1090
    source "$GHCR_ENV"
    set +a
    if [[ -n "${GHCR_TOKEN:-}" ]] && [[ -n "${GHCR_USERNAME:-}" ]]; then
      echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
      echo "Logged in to ghcr.io using saved credentials."
    fi
    return 0
  fi

  if ! ask "Log in to GitHub Container Registry (ghcr.io) and save credentials to ${CONFIG_DIR}/?"; then
    return 0
  fi

  local user token
  read -r -p "GitHub username [wilforlan]: " user
  user=${user:-wilforlan}
  read -r -s -p "GitHub personal access token (PAT, repo + read:packages + write:packages): " token
  echo ""

  if [[ -z "$token" ]]; then
    echo "No token entered; skipping GHCR login." >&2
    return 0
  fi

  echo "$token" | docker login ghcr.io -u "$user" --password-stdin
  write_ghcr_env "$user" "$token"
}

is_tcp_port_listening() {
  local port="$1"
  if [[ "$OS_NAME" == "Darwin" ]] && have_cmd lsof; then
    if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    return 1
  fi
  if have_cmd ss; then
    if ss -tln 2>/dev/null | grep -qE ":${port}([[:space:]]|$)"; then
      return 0
    fi
    return 1
  fi
  if have_cmd netstat; then
    if netstat -tln 2>/dev/null | grep -qE ":${port}([[:space:]]|$)"; then
      return 0
    fi
    return 1
  fi
  return 1
}

get_primary_ipv4() {
  local ip
  if [[ "$OS_NAME" == "Darwin" ]]; then
    ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
    if [[ -z "$ip" ]]; then
      ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
    fi
  else
    ip="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -vE '^(127\.|169\.254\.)' | head -1)"
  fi
  if [[ -z "$ip" ]]; then
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}')"
  fi
  if [[ -z "$ip" ]]; then
    ip="127.0.0.1"
  fi
  printf '%s' "$ip"
}

first_deployment_prompt() {
  echo ""
  echo "--- First deployment (Kubernetes rollout) ---"
  local port="${APP_HTTP_PORT}"
  if is_tcp_port_listening "$port"; then
    local ip
    ip="$(get_primary_ipv4)"
    echo "Something is already listening on port ${port} on this host."
    echo "If that is the web UI (or a port-forward), open: http://${ip}:${port}"
    echo ""
  else
    echo "No listener on port ${port} on this host yet."
    echo ""
  fi

  if ! have_cmd kubectl; then
    echo "kubectl not found. Install it above, point kubeconfig at your cluster, then run:"
    echo "  cd ${ROOT} && npm run deploy -- apply"
    echo "  or: bash ${ROOT}/k8s/deploy.sh apply"
    return 0
  fi

  if ! ask "Run your first deployment now (kubectl apply -k k8s/ and wait for rollouts)?"; then
    echo "Skipped. When ready: cd ${ROOT} && npm run deploy -- apply"
    return 0
  fi

  cd "$ROOT"
  if have_cmd npm && [[ -f "${ROOT}/package.json" ]]; then
    npm run deploy -- apply
  else
    bash "${ROOT}/k8s/deploy.sh" apply
  fi
}

echo "--- Current tools ---"
have_cmd docker && echo "  docker:  $(command -v docker) ($(docker --version 2>/dev/null || echo ok))" || echo "  docker:  (missing)"
have_cmd kubectl && echo "  kubectl: $(command -v kubectl)" || echo "  kubectl: (missing)"
have_cmd git && echo "  git:     $(git --version)" || echo "  git:     (missing)"
have_cmd curl && echo "  curl:    $(curl --version | head -1)" || echo "  curl:    (missing)"
[[ -f "$GHCR_ENV" ]] && echo "  ghcr:    ${GHCR_ENV} (present)" || echo "  ghcr:    (no saved credentials)"
echo ""

if ask "Install git (if missing)?"; then
  install_git_if_missing
fi

if ask "Install curl (if missing)?"; then
  install_curl_if_missing
fi

if ask "Install or upgrade Docker (build/push images)?"; then
  if have_cmd docker; then
    echo "docker already present: $(docker --version)"
    if [[ "$OS_NAME" == "Linux" ]] && ask "Re-run official Docker install script anyway?"; then
      install_docker_linux
    fi
  else
    if [[ "$OS_NAME" == "Darwin" ]]; then
      install_docker_macos
    else
      install_docker_linux
    fi
  fi
fi

if ask "Install or upgrade kubectl (deploy to cluster)?"; then
  if have_cmd kubectl; then
    echo "kubectl already present."
    kubectl version --client 2>/dev/null || true
    if ask "Replace with latest stable from dl.k8s.io?"; then
      if [[ "$OS_NAME" == "Darwin" ]]; then
        install_kubectl_macos
      else
        install_kubectl_linux
      fi
    fi
  else
    if [[ "$OS_NAME" == "Darwin" ]]; then
      install_kubectl_macos
    else
      install_kubectl_linux
    fi
  fi
fi

echo ""
ghcr_login_interactive

echo ""
if have_cmd docker && have_cmd git; then
  if ask "Run k8s/build-push-web-ui.sh now (build and push web UI image)?"; then
    cd "$ROOT"
    bash "${ROOT}/k8s/build-push-web-ui.sh"
  fi
else
  echo "Skipping build-push: need docker and git. Install them above, then run:"
  echo "  bash k8s/build-push-web-ui.sh"
fi

echo ""
echo "--- After setup ---"
have_cmd docker && echo "  docker:  ok" || echo "  docker:  still missing"
have_cmd kubectl && echo "  kubectl: ok" || echo "  kubectl: still missing"
[[ -f "$GHCR_ENV" ]] && echo "  ghcr:    ${GHCR_ENV}"
echo ""

first_deployment_prompt

echo ""
echo "Rollout defaults live in k8s/rollout-config.sh (same source as k8s/deploy.sh)."
echo "Cluster: ensure kubeconfig targets your cluster before deploying."
echo ""
