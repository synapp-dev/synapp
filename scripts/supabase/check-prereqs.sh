#!/usr/bin/env bash
# Verifies CLI tools and required env vars before a cross-region DB migration.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "== Supabase migration prerequisites =="
echo ""

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI not found. Install: https://supabase.com/docs/guides/local-development/cli/getting-started"
  exit 1
fi
echo "OK: supabase $(supabase --version 2>&1 | head -1)"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. Install PostgreSQL client (e.g. postgresql@17)."
  exit 1
fi
echo "OK: $(psql --version)"

ENV_FILE="${MIGRATION_ENV_FILE:-$ROOT/scripts/supabase/migration.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ENV_FILE" && set +a
  echo "OK: loaded $ENV_FILE"
else
  echo "NOTE: No $ENV_FILE — copy migration.env.example to migration.env and fill URLs."
fi

missing=0
for var in SOURCE_SUPABASE_DB_URL TARGET_SUPABASE_DB_URL; do
  if [[ -z "${!var:-}" ]]; then
    echo "WARN: $var is not set (required for dump/restore)."
    missing=1
  else
    echo "OK: $var is set"
  fi
done

if [[ $missing -eq 1 ]]; then
  echo ""
  echo "Set SOURCE_SUPABASE_DB_URL and TARGET_SUPABASE_DB_URL then re-run."
  exit 1
fi

echo ""
echo "All prerequisites satisfied for dump/restore."
