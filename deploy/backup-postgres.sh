#!/usr/bin/env sh
set -eu

POSTGRES_USER="${POSTGRES_USER:-lead}"
POSTGRES_DB="${POSTGRES_DB:-lead_intelligence}"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/lead_intelligence_${STAMP}.dump"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$FILE"
printf 'Backup written to %s\n' "$FILE"
