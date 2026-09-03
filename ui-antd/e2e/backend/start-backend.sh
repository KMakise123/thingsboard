#!/usr/bin/env bash
# Start the ThingsBoard backend from THIS repo's build output (test-baseline
# invariant: the sparring backend IS the repo code — never a released image).
#
# Database: PostgreSQL (H2 was removed upstream; see v1-test-baseline revision
# note). In CI, provision PG via services and run install-db.sh first.
#
# Usage: start-backend.sh [path-to-boot-jar]
#   JAR defaults to application/target/thingsboard.jar (built with:
#   mvn -pl application -am package -DskipTests -Dpkg.skip=true -P '!yarn-build,ui-antd')
set -euo pipefail

JAR="${1:-application/target/thingsboard.jar}"
PORT="${TB_HTTP_PORT:-8080}"

if curl -sf -o /dev/null "http://localhost:${PORT}/swagger-ui.html"; then
  echo "[e2e-backend] already up on :${PORT}, reusing."
  exit 0
fi

if [ ! -f "$JAR" ]; then
  echo "[e2e-backend] boot jar not found at $JAR. Build it first, e.g.:" >&2
  echo "  mvn -pl application -am package -DskipTests -Dpkg.skip=true -P '!yarn-build,ui-antd'" >&2
  exit 1
fi

# JDK 25 toolchain (see docs/adr/0006-jdk25-toolchain.md)
if [ -d "/d/Program Files/Microsoft/jdk-25.0.4.101-hotspot" ]; then
  export JAVA_HOME="/d/Program Files/Microsoft/jdk-25.0.4.101-hotspot"
fi

export SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:postgresql://localhost:5432/thingsboard}"
export SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-postgres}"
export SPRING_DATASOURCE_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-123456}"
export SPRING_DRIVER_CLASS_NAME=org.postgresql.Driver
export DATABASE_TS_TYPE=sql
export SQL_POSTGRES_URL="${SPRING_DATASOURCE_URL}"
export SQL_POSTGRES_USERNAME="${SPRING_DATASOURCE_USERNAME}"
export SQL_POSTGRES_PASSWORD="${SPRING_DATASOURCE_PASSWORD}"
export TB_SERVICE_TYPE=monolith

nohup "$JAVA_HOME/bin/java" -jar "$JAR" > /tmp/tb-e2e-backend.log 2>&1 &
echo $! > /tmp/tb-e2e-backend.pid
echo "[e2e-backend] starting pid $(cat /tmp/tb-e2e-backend.pid), log /tmp/tb-e2e-backend.log"

for i in $(seq 1 120); do
  if curl -sf -o /dev/null "http://localhost:${PORT}/swagger-ui.html"; then
    echo "[e2e-backend] ready on :${PORT} after ~${i}x2s"
    exit 0
  fi
  sleep 2
done
echo "[e2e-backend] timed out waiting for :${PORT}; tail of log:" >&2
tail -30 /tmp/tb-e2e-backend.log >&2
exit 1
