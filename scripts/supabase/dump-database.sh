#!/usr/bin/env bash
# Dumps roles, schema, and data from SOURCE_SUPABASE_DB_URL (Supabase backup-restore guide).
# https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${DUMP_OUT_DIR:-$ROOT/scripts/supabase/artifacts/$(date +%Y%m%d-%H%M%S)}"
ENV_FILE="${MIGRATION_ENV_FILE:-$ROOT/scripts/supabase/migration.env}"

mkdir -p "$OUT_DIR"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ENV_FILE" && set +a
fi

if [[ -z "${SOURCE_SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SOURCE_SUPABASE_DB_URL not set. Use migration.env or export it."
  exit 1
fi

echo "Writing dumps to $OUT_DIR"

supabase db dump --db-url "$SOURCE_SUPABASE_DB_URL" -f "$OUT_DIR/roles.sql" --role-only
supabase db dump --db-url "$SOURCE_SUPABASE_DB_URL" -f "$OUT_DIR/schema.sql"
supabase db dump --db-url "$SOURCE_SUPABASE_DB_URL" -f "$OUT_DIR/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

echo ""
echo "Done. Next: review extensions/webhooks on the NEW project, then run restore-database.sh"
echo "Artifacts: $OUT_DIR"
