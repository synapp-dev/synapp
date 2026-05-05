#!/usr/bin/env bash
# Applies supabase_migrations dump folder to TARGET_SUPABASE_DB_URL.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${MIGRATION_ENV_FILE:-$ROOT/scripts/supabase/migration.env}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ENV_FILE" && set +a
fi

ARTIFACTS_DIR="${1:-}"
if [[ -z "$ARTIFACTS_DIR" ]]; then
  echo "Usage: $0 <folder-with-history_schema.sql-and-history_data.sql>"
  exit 1
fi

if [[ -z "${TARGET_SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: TARGET_SUPABASE_DB_URL not set."
  exit 1
fi

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$ARTIFACTS_DIR/history_schema.sql" \
  --file "$ARTIFACTS_DIR/history_data.sql" \
  --dbname "$TARGET_SUPABASE_DB_URL"

echo "Migration history restored."
