#!/usr/bin/env bash
# Manual steps after DB restore: Storage, Edge Functions, Auth dashboard, cutover.
set -euo pipefail

cat <<'EOF'
=== After database restore (manual) ===

1) Storage
   - Recreate buckets and RLS/policies to match the old project.
   - Copy objects: use Supabase dashboard, storage API, or a sync script.
   - CLI reference: https://supabase.com/docs/reference/cli/supabase-storage

2) Edge Functions
   - From app repo: supabase link --project-ref <NEW_REF>
   - Deploy: supabase functions deploy

3) Auth (Dashboard)
   - Authentication → URL configuration: Site URL + Redirect URLs for the new project.
   - Reconfigure OAuth providers (Google, etc.) with callbacks pointing to the new ref.
   - Email templates / SMTP if customized.

4) Database dashboard
   - Enable same extensions as old project.
   - Database Webhooks if used.
   - Publications for Realtime if used.
   - Review pg_cron / pg_net / wrappers so jobs do not double-fire against production.

5) App secrets
   - Vercel/hosting: NEXT_PUBLIC_SUPABASE_URL, anon/publishable key, service role key.
   - Regenerate types: pnpm gen-types (with SUPABASE_PROJECT_ID set) per app.

6) Verify
   - From app dir with env loaded: pnpm verify:supabase-cutover (needs SUPABASE_PROJECT_ID + NEXT_PUBLIC_SUPABASE_URL).
   - Staging smoke: auth, uploads, critical APIs; then production env cutover; retire old project after a safe window.

Docs: https://supabase.com/docs/guides/platform/migrating-within-supabase
EOF
