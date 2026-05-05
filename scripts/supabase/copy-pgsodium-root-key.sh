#!/usr/bin/env bash
# If you use column encryption (pgsodium), copy the root key from old → new project.
# https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${MIGRATION_ENV_FILE:-$ROOT/scripts/supabase/migration.env}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ENV_FILE" && set +a
fi

if [[ -z "${OLD_PROJECT_REF:-}" || -z "${NEW_PROJECT_REF:-}" || -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set OLD_PROJECT_REF, NEW_PROJECT_REF, and SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)."
  exit 1
fi

curl "https://api.supabase.com/v1/projects/$OLD_PROJECT_REF/pgsodium" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" |
  curl "https://api.supabase.com/v1/projects/$NEW_PROJECT_REF/pgsodium" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -X PUT --json @-

echo ""
echo "pgsodium root key copy request sent."
