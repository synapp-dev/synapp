#!/usr/bin/env bash
# Dumps supabase_migrations schema + data from SOURCE (apply separately with restore-migration-history.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${DUMP_OUT_DIR:-$ROOT/scripts/supabase/artifacts/migration-history-$(date +%Y%m%d-%H%M%S)}"
ENV_FILE="${MIGRATION_ENV_FILE:-$ROOT/scripts/supabase/migration.env}"

mkdir -p "$OUT_DIR"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ENV_FILE" && set +a
fi

if [[ -z "${SOURCE_SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SOURCE_SUPABASE_DB_URL not set."
  exit 1
fi

supabase db dump --db-url "$SOURCE_SUPABASE_DB_URL" -f "$OUT_DIR/history_schema.sql" --schema supabase_migrations
supabase db dump --db-url "$SOURCE_SUPABASE_DB_URL" -f "$OUT_DIR/history_data.sql" --use-copy --data-only --schema supabase_migrations

echo "Wrote $OUT_DIR/history_schema.sql and history_data.sql"
echo "After main restore, run: restore-migration-history.sh $OUT_DIR"
