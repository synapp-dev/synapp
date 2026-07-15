# intradark migrations (AUTHORITATIVE)

This folder is the live migration ledger for the intradark Supabase project:
numbered `NNNN_name.sql` files, currently 0000 through 0046, matching the
hosted database one-to-one (verified 2026-07-14 against
`supabase_migrations.schema_migrations`).

Workflow:
- New schema changes land here as the next free `NNNN_name.sql`.
- Apply via the Supabase MCP `apply_migration` (or
  `scripts/supabase/apply-migration.mjs` against `DATABASE_URL`); the hosted
  ledger records the name.
- `meta/_journal.json` is stale (frozen at 0016). `drizzle-kit migrate` is NOT
  the apply path; do not rely on the journal.
- `../supabase/migrations/` is a legacy partial mirror abandoned at
  ~0035 (2026-06-25). Do not add files there. See its README.
