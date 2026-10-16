#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_URL="${API_URL:-http://localhost:3000/api/v1}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

fail() { echo "FAIL  $*" >&2; exit 1; }
pass() { echo "PASS  $*"; }

command -v docker >/dev/null 2>&1 || fail "docker is required for staging validation"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is required"

pass "Docker Compose is available"
docker compose -f "$COMPOSE_FILE" config >/dev/null
pass "Compose configuration is valid"

for file in \
  scripts/staging-smoke.mjs \
  deploy/backup-postgres.sh \
  deploy/restore-postgres.sh \
  RELEASE_1.0.0.md \
  RELEASE_CHECKLIST_1.0.0.md; do
  test -f "$file" || fail "missing release artifact: $file"
done
pass "Release validation assets are present"

if [[ "${SKIP_START:-false}" != "true" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --build
  trap 'docker compose -f "$COMPOSE_FILE" down' EXIT
  pass "Staging stack started"

  docker compose -f "$COMPOSE_FILE" ps
  docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-lead}" -d "${POSTGRES_DB:-lead_intelligence}" >/dev/null
  pass "PostgreSQL is ready"
  docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q '^PONG$'
  pass "Redis is ready"

  API_URL="$API_URL" node scripts/staging-smoke.mjs
  pass "Application smoke tests passed"
fi

echo "STAGING VALIDATION PASSED"
