# Aviate

All-in-one aviation workforce management, built for ground-handling operations
(first client: Menzies Aviation). Modules: **Rostering** (built), Leave,
Payslips, Team Comms, People (stubs).

## Domain model

Ground-handling shaped: `organisations → stations (airports, IATA code,
timezone) → departments (ramp / passenger services / cargo / fueling / …)`.
Employees belong to a station + department and may or may not have a login
(`profiles` row). Rostering is `roster_periods → shifts → shift_assignments`,
with `shift_templates` for recurring patterns. Shift times are local to the
station's timezone; an end time earlier than the start time means the shift
crosses midnight.

Access control is org-scoped RLS: members read, `admin`/`manager` profiles
write (see `is_org_member` / `is_org_manager` in the migration).

## Setup

1. Create a Supabase project, then fill `.env.local` (copied from
   `env.example`) with its URL, publishable key, service-role key, and
   project ref.
2. Apply the migration in `supabase/migrations/` (Supabase MCP
   `apply_migration`, or `supabase db push`).
3. Optionally run `supabase/seed.sql` for Menzies demo data (MEL/SYD stations,
   departments, employees, shift templates).
4. Sign up through `/auth`, then attach yourself to the org as admin:

   ```sql
   update profiles
   set org_id = (select id from organisations where slug = 'menzies'),
       role = 'admin'
   where email = 'you@example.com';
   ```

5. Regenerate DB types (`pnpm gen-types`) - `types/supabase.ts` is currently
   hand-authored to match the migration.
6. `pnpm dev` → http://localhost:3008

## Structure

Follows the workspace template conventions:

- `app/api/*` - thin route handlers; auth + org context via
  `lib/api/auth.ts#requireOrgContext`, RLS does the scoping
- `entities/<domain>/{api,model}` - client endpoints + types
- `hooks/<domain>` - React Query hooks
- `app/(main)/rostering` - roster grid (departments × days), shift
  create/assign dialogs, period publish flow
