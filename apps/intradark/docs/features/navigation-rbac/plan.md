# Navigation RBAC + role templates

> **Product:** `apps/intradark`
> **Slug:** `navigation-rbac`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-07

## 1. Summary

Introduce **explicit, DB-backed capabilities** for **main navigation and route access** in Intradark, with **Bullyproof-style permission templates** that **group** atomic rows in `public.roles` (see [`packages/rbac-contract/README.md`](../../../../../packages/rbac-contract/README.md)). **Effective role slugs** for a session = **direct `user_roles`** ∪ **slugs from all assigned templates** (join-at-read). The **sidebar** and **server layouts** consume the **same resolver** and pathname→slug map; existing feature gates (admin, utility dev tools, theory callouts, etc.) are **retrofitted** to use this layer so behavior stays consistent.

**Also:** Remove the **hard redirect to `/auth`** for anonymous visitors (`middleware.ts`, `app/page.tsx`) so users can browse **public** areas without signing in; **`/`** becomes a **public** root (same shell as the rest of the app), while signed-in users may keep **`/` → `/dashboard`** if desired.

## 2. Scope

### In scope (MVP)

- **DDL:** `role_templates` (catalog), `role_template_roles` (many-to-many `template_id` ↔ `roles.id`), `user_role_templates` (`user_profile_id` ↔ `template_id`, audit columns aligned with `user_roles` patterns). **Seed** atomic **nav** capability rows in `roles` (stable slugs), seed **templates** (e.g. `member`) and **template membership rows**. **RLS:** assignments readable/writable under the same stance as [`docs/features/admin-panel/plan.md`](../admin-panel/plan.md) — no casual browser writes to grants; catalog/template definitions migration-owned in MVP.
- **Resolver:** `getEffectiveRoleSlugsForUser(userId)` (Drizzle) + **`getEffectiveCapabilitiesForSession()`** handling **`user === null`** via **`NAV_ANONYMOUS_SLUGS`** constants that **mirror** the same slug strings as seeded `roles` rows (anonymous users have **no** `user_profiles` row to attach — capability set is **implicit but string-aligned** with the catalog for one source of truth in checks).
- **Route map:** single module (e.g. `entities/rbac/lib/nav-route-requirements.ts`) mapping **first URL segment** (and critical nested prefixes where needed) → **required slug(s)** OR **`developer`** for `/play` **use** vs **visibility**.
- **UI:** `AppSidebar` / `NavMain` filter items from `main-nav-routes.ts` using effective slugs; **Play** always **visible** where Platform nav is shown, **enabled** only if `developer` slug present (reuse [`ROLE_DEVELOPER`](../../../entities/admin/lib/rbac-constants.ts)).
- **Server gates:** nested layouts under `app/(main)/` call shared `assertRouteAccess(pathname)` / per-segment helpers; **staff-heavy** areas → `notFound()`; **general user** routes → **redirect** to `/` or `/news` (pick one default and apply consistently).
- **Profile hydration:** `/api/me` (and any existing profile loader) returns **`role_slugs` = effective slugs** so **client never recomputes** templates separately from server.
- **Anonymous site access:** Change [`middleware.ts`](../../../middleware.ts) and [`app/page.tsx`](../../../app/page.tsx) so anonymous users are **not** sent to `/auth`; render **public** `/`.
- **Retrofit:** Replace ad-hoc `getRoleSlugsForUser` + scattered checks with resolver/wrappers across admin, utility, theory, forums, etc. (exact file list in implementation PR).
- **Vitest:** Pure helpers (resolver merge logic, pathname matching, anonymous constant alignment). No new Playwright slice unless harness already exists.

### Out of scope (deferred)

- Admin UI to edit templates or assign `user_role_templates` (SQL/MCP grants until then).
- Telemetry for **denied** navigation (enumeration risk; see admin-panel plan stance).
- Middleware-heavy RBAC (keep middleware thin; session refresh only).
- Extracting runtime RBAC to `packages/*` (second-consumer rule — [ARCHITECTURE.md §5.1](../../../../../ARCHITECTURE.md)).

### Non-goals

- Replacing Supabase Auth — session remains source of **identity**; RBAC is **authorization**.
- Changing `@workspace/ui` to depend on Supabase ([ARCHITECTURE.md §3.2](../../../../../ARCHITECTURE.md)).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only for runtime RBAC | §5.1, §5.4 |
| Domain code location | `entities/rbac/` — resolver, maps, types; shell stays `components/` | §7.1 |
| Shell vs domain | `components/organisms/app-sidebar.tsx` stays shell; imports `entities/rbac` selectors only | §7.1 |
| Auth dependency | `@/utils/supabase/server` (`createServerClient`) for session + server gates; **`@workspace/supabase` alignment** is a **follow-up refactor** | §3.2 |
| New package edges | **None** | §3.2, §10 |

> Compliance gate: [`checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md) — all **yes** / **n/a** for this plan. **`ARCHITECTURE.md`** unchanged (no new package edges).

## 4. Data model

### Live Supabase baseline (MCP `user-supabase-intradark`, plan time)

**Tables present:** `roles`, `user_roles`, `user_profiles`, `steam_profiles`, forums, news, utility tables, etc. **`roles` / `user_roles` already exist** (RBAC phase from admin-panel).

**Remote migrations** applied through **`utility_lineup_upload_jobs`**; local Drizzle journal may include **`0015_utility_lineup_enemy_pov_videos`** ahead of remote — **reconcile** before applying new DDL so ordering matches production.

### New tables / columns (conceptual)

```sql
-- public.role_templates
-- id uuid PK, slug text UNIQUE NOT NULL, label text NOT NULL, description text,
-- created_at timestamptz NOT NULL DEFAULT now()

-- public.role_template_roles
-- template_id uuid NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
-- role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
-- PRIMARY KEY (template_id, role_id)

-- public.user_role_templates
-- user_profile_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
-- template_id uuid NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
-- granted_at timestamptz NOT NULL DEFAULT now(),
-- granted_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
-- UNIQUE (user_profile_id, template_id)
```

### Atomic capability slugs (seed in same migration)

Use stable **`nav.*`** slugs (exact list in implementation; examples):

| Area | Example slugs |
|------|----------------|
| Community | `nav.news`, `nav.forums`, `nav.media` |
| Competitive | `nav.teams`, `nav.players`, `nav.scrims`, `nav.tournaments` |
| Knowledge | `nav.theory`, `nav.utility` |
| Insight | `nav.stats`, `nav.watchlist` |
| Platform | `nav.dashboard`, `nav.server` — **grant via roles/templates**, not anonymous |

Existing **`developer`**, **`sandbox.access`**, **`news.editor`** remain as today ([`rbac-constants.ts`](../../../entities/admin/lib/rbac-constants.ts)).

### Templates (seed)

| Template slug | Purpose |
|---------------|---------|
| `member` | Bundles **member-only** nav capabilities: at minimum **`nav.scrims`, `nav.tournaments`, `nav.dashboard`** (links only — routes still enforce auth if business rules require sign-in). |

**Anonymous tier:** no rows — resolver uses **`NAV_ANONYMOUS_SLUGS`** matching seeded slug strings for **news, forums, media, teams, players, theory, utility** only.

**Bootstrap:** migration inserts **`user_role_templates`** for **existing** `user_profiles` → `member` template (safe for current row counts). **New profiles:** server callback or profile-creation path assigns **`member`** idempotently (document exact hook in implementation).

### RLS

| Table | Rule |
|-------|------|
| `role_templates`, `role_template_roles` | Authenticated read optional for future UI; writes **service / migration only** in MVP |
| `user_role_templates` | Same stance as `user_roles`: **no** casual browser writes |

### Migration ownership

- **Path:** `apps/intradark/drizzle/0016_role_templates_navigation_rbac.sql` (next index after journal) **and** mirrored `apps/intradark/supabase/migrations/<timestamp>_role_templates_navigation_rbac.sql`.
- **Pattern:** App-owned [§8.1](../../../../../ARCHITECTURE.md).
- **Remote:** **`apply_migration`** on project **`user-supabase-intradark`** with the **same SQL body** as committed migration; then **`list_migrations`** verify. **`generate_typescript_types`** / **`pnpm --filter intradark gen-types`** when part of team workflow after DDL.

### Generated types

Regenerate Supabase/Drizzle types after schema change per project convention.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Effective slugs | Server helper | `entities/rbac/lib/get-effective-role-slugs.ts` | Session optional | Returns merged slugs; anon uses constants |
| Route gate | Server helper | `entities/rbac/lib/assert-route-access.ts` | Session optional | `notFound()` vs `redirect()` per policy |
| Profile payload | Existing API | `app/api/me/route.ts` | Cookie session | Include **`role_slugs`** from resolver |

### Validation

- Nav slug strings: **single module** exporting constants + Zod optional for admin tooling later.
- Errors: map every denial to [`flows.md`](flows.md).

## 6. UI composition

```
apps/intradark/
├── middleware.ts                    # Remove anon → /auth redirect on /
├── app/page.tsx                     # Public root; signed-in optional redirect to /dashboard
├── entities/rbac/
│   ├── lib/
│   │   ├── effective-slugs.ts
│   │   ├── nav-anonymous-slugs.ts
│   │   ├── nav-route-map.ts
│   │   └── assert-route-access.ts
│   └── types.ts
├── components/organisms/app-sidebar.tsx   # Filter nav groups using effective slugs
├── lib/main-nav-routes.ts           # Optional metadata: requiredSlug per item
└── app/(main)/**/layout.tsx         # Gates per route tree
```

### Component map

| Piece | Source | Notes |
|-------|--------|-------|
| Sidebar primitives | `@workspace/ui` | Unchanged |
| Disabled Play | Existing `NavMain` / `DisabledMenuItem` | Wire to `developer` |

### Theming

Tokens from `@workspace/ui` ([§6](../../../../../ARCHITECTURE.md)).

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — sidebar, menus.
- `@supabase/ssr` / `@/utils/supabase/server` — session.

### New external deps

- None expected.

## 8. Implementation order (commits)

1. `docs(intradark): plan navigation-rbac feature` — this triad + rbac-contract note.
2. `feat(intradark): add role template tables + seeds` — Drizzle + Supabase migration, RLS, backfill `user_role_templates`.
3. `feat(intradark): rbac effective slug resolver + route map` — `entities/rbac`, `/api/me` payload.
4. `feat(intradark): wire sidebar + nav items to effective slugs` — Play disabled unless `developer`.
5. `feat(intradark): layout gates for route segments` — `notFound` / redirect policy.
6. `feat(intradark): anonymous browsing — middleware + root page` — remove forced `/auth`.
7. `refactor(intradark): retrofit existing role checks to entities/rbac` — admin, utility, theory, etc.
8. `test(intradark): vitest for rbac merge + route map`.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| — | — | — | **None for MVP denials** |

Optional later: success-only `nav.section_visible` (out of MVP).

## 10. Rollout

- **Feature flag:** none for MVP.
- **Env vars:** none new required.
- **Migration sequencing:** deploy migration **before** code that queries new tables; **apply_migration** on intradark Supabase in same order as `apps/intradark/drizzle/*.sql` ([§8.1](../../../../../ARCHITECTURE.md)).
- **Backout:** revert app deploy first; roll forward migration fix if schema already applied — avoid destructive DDL without backup.

## 11. Open questions

- [ ] Exact **redirect target** for denied user-facing routes (`/` vs `/news`) — pick one in implementation and reference here.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Contract: [`packages/rbac-contract/README.md`](../../../../../packages/rbac-contract/README.md)
