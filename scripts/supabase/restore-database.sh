#!/usr/bin/env bash
# Restores roles.sql, schema.sql, data.sql into TARGET_SUPABASE_DB_URL (Supabase backup-restore guide).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${MIGRATION_ENV_FILE:-$ROOT/scripts/supabase/migration.env}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ENV_FILE" && set +a
fi

ARTIFACTS_DIR="${1:-}"
if [[ -z "$ARTIFACTS_DIR" ]]; then
  echo "Usage: $0 <path-to-dump-folder-containing-roles-schema-data-sql>"
  echo "Example: $0 scripts/supabase/artifacts/20260407-120000"
  exit 1
fi

if [[ ! -f "$ARTIFACTS_DIR/roles.sql" || ! -f "$ARTIFACTS_DIR/schema.sql" || ! -f "$ARTIFACTS_DIR/data.sql" ]]; then
  echo "ERROR: Expected roles.sql, schema.sql, data.sql in $ARTIFACTS_DIR"
  exit 1
fi

if [[ -z "${TARGET_SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: TARGET_SUPABASE_DB_URL not set."
  exit 1
fi

echo "Restoring into target database from $ARTIFACTS_DIR"

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$ARTIFACTS_DIR/roles.sql" \
  --file "$ARTIFACTS_DIR/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$ARTIFACTS_DIR/data.sql" \
  --dbname "$TARGET_SUPABASE_DB_URL"

echo ""
echo "Restore finished. Run print-post-database-steps.sh for Storage, Functions, Auth, and verification."
