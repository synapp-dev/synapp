# Team pages

> **Product:** `apps/intradark`
> **Slug:** `team-pages`
> **Status:** Implemented (MVP)
> **Owner:** intradark maintainers
> **Created:** 2026-06-10

## 1. Summary

Replace dummy team UI with live data from **`public.teams`** and **`public.player_teams`**: a **My teams** index at `/teams`, a **create team** flow at `/teams/new`, a **team workspace** under `/teams/[slug]/…` (home roster + upcoming stub), and a **leader-only Admin** tab to edit core metadata (`name`, `nickname`, `description`, `avatar` URL). Team pages are **publicly readable**; mutations require **sign-in + linked Steam**. Writes use **server actions + Drizzle** (service-role DB) with app-level leader gates — RLS stays **public read only**, matching [`0022_teams_player_teams.sql`](../../../drizzle/0022_teams_player_teams.sql).

**Live Supabase baseline:** `teams` and `player_teams` exist (migration `20260609074200_teams_player_teams` mirrors Drizzle `0022`). **Missing for MVP:** unique URL **`slug`** on `teams` (next migration `0025`). MCP `user-supabase-intradark` was unavailable at plan time; implementation must call **`list_tables`** / **`list_migrations`** before applying DDL and use **`apply_migration`** with the same SQL body as committed Drizzle files.

## 2. Scope

### In scope (MVP)

- **DDL:** add **`teams.slug`** (`varchar`, **NOT NULL**, **UNIQUE**); backfill existing rows from `name` + collision suffix; reserved slug set for route segments (`new`, `home`, `upcoming`, `admin`).
- **Routes:**
  - `/teams` — **My teams** (signed-in memberships) + empty/sign-in CTA; **Create team** button when eligible.
  - `/teams/new` — create form (name required; optional nickname, description, avatar URL; slug auto-allocated or optional override).
  - `/teams/[slug]/layout.tsx` — team header + tab nav (**Home**, **Upcoming** stub, **Admin** visible only to leader).
  - `/teams/[slug]/home` — team header, description snippet, **roster** from `player_teams` ⨝ `players` (+ linked profile display names where available).
  - `/teams/[slug]/upcoming` — placeholder (unchanged stub copy, wired to real team context).
  - `/teams/[slug]/admin` — leader-only settings form; **`notFound()`** for non-leaders and unknown slug.
- **Server actions:** `createTeamAction`, `updateTeamAction` in `entities/teams/actions.ts` with **`TeamActionResult<T>`** error contract.
- **Queries:** Drizzle helpers in `entities/teams/lib/queries.ts` + `resolve-team-slug.ts` for layout/pages.
- **Team switcher:** replace hardcoded `TEAMS` in [`components/organisms/team-switcher.tsx`](../../../components/organisms/team-switcher.tsx) and [`app/(main)/teams/page.tsx`](../../../app/(main)/teams/page.tsx) with **`getMyTeamsForUser()`** (passed from layout or fetched client-side from server-provided props — prefer **RSC props** into a thin client wrapper for switcher).
- **Vitest** unit tests per [`tdd.md`](tdd.md).
- **Telemetry:** success-only `team_created`, `team_updated` from server actions.

### Out of scope (deferred)

- **Member management** — invite, kick, role changes, transfer leader.
- **Faceit import / sync** — `faceit_team_id` population and roster sync from Faceit API.
- **Public team directory** — browse all teams (index is **memberships only** for signed-in users).
- **Cover image upload** — URL field only in MVP; storage signing deferred.
- **Social links** — `facebook`, `twitter`, `website`, `youtube` columns exist but Admin MVP edits core four fields only.
- **REST API routes** for teams — RSC + server actions only.
- **Playwright / DB integration tests** until harness exists ([`tdd.md`](tdd.md)).

### Non-goals

- Cross-product team module in `packages/*` (single consumer — **§5.1**).
- Changing anonymous **`nav.teams`** access or making all of `/teams/*` auth-gated.
- Importing Supabase into `@workspace/ui` (**§3.2**).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `entities/teams/` (queries, actions, components, lib) | §7.1 |
| Shell vs domain | `components/organisms/team-switcher.tsx` stays shell; imports `entities/teams` | §7.1 |
| Auth dependency | Session via `@/utils/supabase/server` + `getCurrentUserProfiles()`; mutations via Drizzle `db` (service role); **no** Supabase in client components | §3.2 |
| New package edges | **None** | §3.2, §10 |

> Compliance gate ([`checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md)): all **yes** / **n/a**. **`ARCHITECTURE.md` is NOT modified** (no new package edges).

## 4. Data model

### Existing tables (baseline)

From [`0022_teams_player_teams.sql`](../../../drizzle/0022_teams_player_teams.sql):

- **`teams`** — Faceit-shaped team row; **`leader_steamid64`** → `players(steamid64)`.
- **`player_teams`** — `(team_id, steamid64)` PK; **`role`** (`leader` / `member` default).

### MVP migration — add URL slug

```sql
-- apps/intradark/drizzle/0025_teams_slug.sql

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS slug varchar(160);

-- Backfill: slugify(name), append -2, -3 on collision (implementation script or DO block).
-- Then enforce NOT NULL + uniqueness:

ALTER TABLE public.teams
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_slug ON public.teams (LOWER(slug));
```

**Reserved slugs** (reject on create/update via `validateUrlSlug` + `TEAM_RESERVED_SLUGS`): `new`, `home`, `upcoming`, `admin`.

**Drizzle:** add `teams` / `player_teams` table defs to [`server/db/schema`](../../../server/db/schema.ts) if not present after `0025` (codegen/sync per project convention).

### RLS (unchanged for MVP)

| Policy | Role | Rule |
|--------|------|------|
| `teams_public_read` | `anon`, `authenticated` | `SELECT USING (true)` |
| `player_teams_public_read` | `anon`, `authenticated` | `SELECT USING (true)` |
| Writes | `service_role` only | App actions use Drizzle service client; **no** new authenticated write policies in MVP |

### Migration ownership

- **Path:** `apps/intradark/drizzle/0025_teams_slug.sql` + mirror `apps/intradark/supabase/migrations/<timestamp>_teams_slug.sql`.
- **Pattern:** App-owned (**§8.1**).
- **Backfill:** one-shot SQL in migration for any pre-existing `teams` rows (Faceit imports); if none, backfill step is no-op.
- **Remote apply:** **`apply_migration`** on `user-supabase-intradark` with the same query body, in order after `0022`. Then **`generate_typescript_types`** / `pnpm gen-types` for `apps/intradark/types/supabase.ts`.

### Create transaction (application)

In one DB transaction:

1. Ensure `players` row exists for creator `steamid64` (upsert minimal row if missing — align with player registry patterns).
2. Insert `teams` with allocated `slug`, `leader_steamid64`, `name`, optional fields.
3. Insert `player_teams` with `role = 'leader'`.

### Generated types

Regenerate `apps/intradark/types/supabase.ts` after migration; use generated row types in `entities/teams/types.ts` where practical.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| List my teams | RSC query | `getMyTeamsForUser(steamid64)` | optional session | Index + team switcher |
| Resolve team by slug | RSC | `getTeamBySlug(slug)` | public | Layout + pages; `notFound()` if missing |
| Team roster | RSC | `getTeamRoster(teamId)` | public | Join `player_teams`, `players`, optional `user_profiles` |
| Create team | Server Action | `createTeamAction` | signed-in + linked Steam | Zod body; `allocateUniqueUrlSlug` from [`entities/content/lib/slug`](../../../entities/content/lib/slug.ts) |
| Update team (admin) | Server Action | `updateTeamAction` | team leader | Allowed columns only; slug change → redirect canonical |
| Leader check | Pure helper | `isTeamLeader(team, steamid64)` | — | Used by layout (hide Admin tab) + admin page gate |

**No new route handlers** for MVP.

### Validation

- **Schemas:** `entities/teams/lib/schemas.ts` (Zod) — `createTeamSchema`, `updateTeamSchema`.
- **Slug:** reuse `slugifyForUrl`, `validateUrlSlug`, `allocateUniqueUrlSlug` with `isTeamSlugTaken` query.
- **Error mapping:** every `TeamActionResult` code maps to a row in [`flows.md`](flows.md) §2.

## 6. UI composition

```
apps/intradark/
├── app/(main)/teams/
│   ├── layout.tsx                    # NavRouteGate (existing)
│   ├── page.tsx                      # My teams index
│   ├── new/page.tsx                  # Create team
│   └── [slug]/
│       ├── layout.tsx                # Team workspace shell + tabs
│       ├── home/page.tsx
│       ├── upcoming/page.tsx         # stub
│       └── admin/page.tsx            # leader settings
├── entities/teams/
│   ├── actions.ts
│   ├── components/
│   │   ├── team-header.tsx
│   │   ├── team-roster.tsx
│   │   ├── team-tabs.tsx
│   │   ├── team-create-form.tsx
│   │   └── team-admin-form.tsx
│   └── lib/
│       ├── queries.ts
│       ├── resolve-team-slug.ts
│       ├── schemas.ts
│       ├── action-types.ts
│       ├── leader.ts
│       └── reserved-slugs.ts
└── components/organisms/
    └── team-switcher.tsx             # shell — real team list via props
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Button, Card, Input, Tabs, Form | `@workspace/ui` | Reuse |
| `MainSectionShell` | `components/organisms/main-section-shell` | Index + create page chrome |
| Team-specific UI | `entities/teams/components/` | Domain composition |

### Theming

- Tokens from `@workspace/ui` (**§6**); no new product override required for MVP.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — form, card, tabs, skeleton, toast patterns
- `@/utils/supabase/server` — session + `getCurrentUserProfiles`
- `@/server/db/drizzle` — mutations and reads
- `@vercel/analytics/server` — `track()` on success

### New external deps

- **None**

### New package edges

- **None**

## 8. Implementation order (commits)

1. `docs(intradark): plan team-pages feature` — this triad.
2. `feat(intradark): add teams slug migration + types` — `0025`, supabase mirror, gen-types, Drizzle schema rows.
3. `test(intradark): add team-pages unit tests` — red tests from [`tdd.md`](tdd.md).
4. `feat(intradark): add entities/teams queries and actions` — green for slug/leader/action tests.
5. `feat(intradark): wire teams index and create routes` — `/teams`, `/teams/new`.
6. `feat(intradark): add team workspace layout and home roster` — `[slug]/layout`, home, upcoming stub.
7. `feat(intradark): add team admin tab for leaders` — admin page + form.
8. `feat(intradark): connect team-switcher to live data` — remove dummy TEAMS arrays.
9. `chore(intradark): telemetry for team create/update` — success events only.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `team_created` | `createTeamAction` success | `{ ok: true }` | Vercel Analytics (server) |
| `team_updated` | `updateTeamAction` success | `{ ok: true }` | Vercel Analytics (server) |

**Not tracked:** forbidden admin access, not-found slugs, validation failures (enumeration / noise).

## 10. Rollout

- **Feature flag:** none — ship when migration + UI complete.
- **Env vars:** none new.
- **Migration sequencing:** apply **`0025_teams_slug`** to intradark Supabase **before or with** deploy that reads/writes `slug`. Existing `0022` tables already live.
- **Backout:** revert app deploy; added `slug` column is backward-compatible if UI reverted. No flag to toggle.

## 11. Open questions

- [ ] **Avatar URL validation** — strict URL schema vs any string? Default: `z.string().url().optional().or(z.literal(""))` at implementation. — owner: implementer
- [ ] **Auto-create `players` row on team create** if creator missing from registry — confirm upsert matches [`entities/players/lib/server/registry`](../../../entities/players/lib/server/registry.ts). — owner: implementer

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Schema baseline: [`drizzle/0022_teams_player_teams.sql`](../../../drizzle/0022_teams_player_teams.sql)
- Navigation RBAC: [`docs/features/navigation-rbac/plan.md`](../navigation-rbac/plan.md)
- Slug helpers: [`entities/content/lib/slug.ts`](../../../entities/content/lib/slug.ts)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
