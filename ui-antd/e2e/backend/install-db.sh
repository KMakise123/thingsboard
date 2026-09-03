#!/usr/bin/env bash
# Initialize the database schema + demo data via TB's native install mode
# (java -jar --install). Idempotent NOT guaranteed — run once against an empty
# database (CI provisions a fresh PG service per job).
#
# Usage: install-db.sh [path-to-boot-jar]
set -euo pipefail

JAR="${1:-application/target/thingsboard.jar}"

if [ -d "/d/Program Files/Microsoft/jdk-25.0.4.101-hotspot" ]; then
  export JAVA_HOME="/d/Program Files/Microsoft/jdk-25.0.4.101-hotspot"
fi

export SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:postgresql://localhost:5432/thingsboard}"
export SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-postgres}"
export SPRING_DATASOURCE_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-123456}"
export SQL_POSTGRES_URL="${SPRING_DATASOURCE_URL}"
export SQL_POSTGRES_USERNAME="${SPRING_DATASOURCE_USERNAME}"
export SQL_POSTGRES_PASSWORD="${SPRING_DATASOURCE_PASSWORD}"

echo "[e2e-install] installing schema + demo data into ${SPRING_DATASOURCE_URL}"
"$JAVA_HOME/bin/java" -jar "$JAR" --install=true --install.load_demo=true
echo "[e2e-install] done"
