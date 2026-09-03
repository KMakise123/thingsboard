#!/usr/bin/env bash
# Stop the backend started by start-backend.sh (by pid file; falls back to the
# process listening on :8080). Does NOT touch a backend it did not start
# unless --force is given.
set -uo pipefail

PORT="${TB_HTTP_PORT:-8080}"

if [ -f /tmp/tb-e2e-backend.pid ]; then
  PID=$(cat /tmp/tb-e2e-backend.pid)
  if kill "$PID" 2>/dev/null; then
    echo "[e2e-backend] stopped pid $PID"
  fi
  rm -f /tmp/tb-e2e-backend.pid
fi

if [ "${1:-}" = "--force" ]; then
  # Last resort (CI teardown): kill whatever holds the port.
  if command -v netstat >/dev/null; then
    netstat -ano | grep "LISTENING" | grep ":${PORT}" | awk '{print $5}' | sort -u | while read -r pid; do
      [ "$pid" != "0" ] && taskkill //PID "$pid" //F 2>/dev/null && echo "[e2e-backend] force-killed pid $pid on :${PORT}"
    done
  fi
fi
