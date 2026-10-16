#!/usr/bin/env sh
set -eu

POSTGRES_USER="${POSTGRES_USER:-lead}"
POSTGRES_DB="${POSTGRES_DB:-lead_intelligence}"
: "${1:?Usage: ./deploy/restore-postgres.sh ./backups/file.dump}"

cat "$1" | docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner
printf 'Restore completed from %s\n' "$1"
