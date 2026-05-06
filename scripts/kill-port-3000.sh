#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-3000}"
GRACE_SECONDS="${GRACE_SECONDS:-2}"

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof is required but not installed." >&2
  exit 1
fi

trim() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf "%s" "$value"
}

pid_state() {
  local pid="$1"
  ps -o state= -p "$pid" 2>/dev/null | awk '{print $1}' || true
}

kill_process_group() {
  local pid="$1"
  local state
  state="$(pid_state "$pid")"
  if [[ "$state" == U* ]]; then
    echo "PID $pid is in uninterruptible sleep (state=$state); signal delivery may be delayed."
  fi
  local pgid
  pgid="$(trim "$(ps -o pgid= -p "$pid" 2>/dev/null || true)")"
  if [[ -z "$pgid" ]]; then
    kill -TERM "$pid" 2>/dev/null || true
    return
  fi
  if kill -0 "$pid" 2>/dev/null; then
    kill -TERM -- "-$pgid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
  fi
}

reap_zombie() {
  local pid="$1"
  local ppid
  ppid="$(trim "$(ps -o ppid= -p "$pid" 2>/dev/null || true)")"
  if [[ -z "$ppid" || "$ppid" == "0" ]]; then
    return
  fi
  if kill -0 "$ppid" 2>/dev/null; then
    echo "Zombie PID $pid found; signaling parent PID $ppid"
    kill -TERM "$ppid" 2>/dev/null || true
    sleep 1
    if kill -0 "$ppid" 2>/dev/null; then
      kill -KILL "$ppid" 2>/dev/null || true
    fi
  fi
}

collect_pids() {
  local out
  out="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  out+=$'\n'"$(lsof -nP -iTCP:"$PORT" -t 2>/dev/null || true)"
  printf "%s\n" "$out" | awk 'NF' | sort -u
}

pids=()
while IFS= read -r line; do
  [[ -n "$line" ]] && pids+=("$line")
done < <(collect_pids)

if [[ "${#pids[@]}" -eq 0 ]]; then
  echo "No processes found on port $PORT."
  exit 0
fi

echo "Found processes on port $PORT: ${pids[*]}"

for pid in "${pids[@]}"; do
  state="$(pid_state "$pid")"
  if [[ "$state" == Z* ]]; then
    reap_zombie "$pid"
    continue
  fi
  kill_process_group "$pid"
done

sleep "$GRACE_SECONDS"

remaining=()
while IFS= read -r line; do
  [[ -n "$line" ]] && remaining+=("$line")
done < <(collect_pids)
if [[ "${#remaining[@]}" -eq 0 ]]; then
  echo "Port $PORT is now free."
  exit 0
fi

echo "Force killing remaining process groups on port $PORT: ${remaining[*]}"
for pid in "${remaining[@]}"; do
  state="$(pid_state "$pid")"
  if [[ "$state" == U* ]]; then
    echo "PID $pid remains in uninterruptible sleep (state=$state)."
  fi
  pgid="$(trim "$(ps -o pgid= -p "$pid" 2>/dev/null || true)")"
  if [[ -n "$pgid" ]]; then
    kill -KILL -- "-$pgid" 2>/dev/null || true
  fi
  kill -KILL "$pid" 2>/dev/null || true
done

sleep 2
final_check=()
while IFS= read -r line; do
  [[ -n "$line" ]] && final_check+=("$line")
done < <(collect_pids)
if [[ "${#final_check[@]}" -eq 0 ]]; then
  echo "Port $PORT is now free."
  exit 0
fi

echo "Unable to fully clear port $PORT. Remaining PIDs: ${final_check[*]}" >&2
echo "If any remaining process is in state 'U', the kernel is blocking kill until I/O completes." >&2
exit 1
