# Admin panel + RBAC (sandbox)

> **Product:** `apps/intradark`
> **Slug:** `admin-panel`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

Introduce a **staff-only admin area** at **`/admin`** with **role-based access** to **sandbox simulators** at **`/admin/sandbox/*`**, replacing **`NEXT_PUBLIC_INTRADARK_SANDBOX_ENABLED`**. The app owns a **minimal modular RBAC** schema (**`roles`** + **`user_roles`**) seeded for **`sandbox.access`** and **`news.editor`** so [News](../news/plan.md) can add **`news_articles`** without reintroducing parallel staff tables. **Unauthorized users always see `notFound()`** (404) on admin routes to avoid leaking surface area. **Phase 2** (prefix-scoped grants within sandbox) is specified in [`packages/rbac-contract`](../../../../../packages/rbac-contract/README.md), not MVP.

**Live Supabase baseline** (via `user-supabase-intradark` MCP at plan time): `public` has **`steam_profiles`**, **`user_profiles`**; **`roles`** and **`user_roles`** are not present yet. Migrations applied: `20260429112936`, `20260429113245` (`add_discord_user_id_to_user_profiles`). The next app-owned migration must add **`roles`** / **`user_roles`** and stay in sync with Drizzle under `apps/intradark/drizzle/`.

## 2. Scope

### In scope (MVP)

- **DDL:** `public.roles` (catalog), `public.user_roles` (assignments **`user_profile_id` → `user_profiles.id`**, with `user_profiles.user_id` → `auth.users`), **RLS**, **seed rows** `sandbox.access` and `news.editor` (slug + label; exact column set in Drizzle).
- **Remote apply:** use MCP **`user-supabase-intradark`** `apply_migration` with the same SQL body committed as the next `apps/intradark/drizzle/*.sql` file; then regenerate types per project convention (`gen-types`, Drizzle sync).
- **Routes:** `app/(main)/admin/layout.tsx` (server gate), `app/(main)/admin/page.tsx` (index: module cards filtered by role), **move** sandbox tree from `app/(main)/sandbox/` to **`app/(main)/admin/sandbox/`**; **optional** `next.config` redirect or route handler: `/sandbox` → `/admin/sandbox` for one release window.
- **Gate helper:** server-only function (e.g. `assertHasRoleSlugs` / `getRoleSlugsForUser`) using **`createServerClient`** from `@/utils/supabase/server` + Drizzle read on `user_roles` ⨝ `roles` — **no** new route handlers for RBAC in MVP.
- **Sidebar:** show **Admin** / **Sandbox** entries only when the session has the required role(s); remove env-flag checks.
- **Remove** `NEXT_PUBLIC_INTRADARK_SANDBOX_ENABLED` from [`env.example`](../../../env.example), [`lib/sandbox/is-sandbox-enabled.ts`](../../../lib/sandbox/is-sandbox-enabled.ts), and sidebar/layout gates that used it.
- **Vitest** unit tests for pure gate helpers and redirect/canonical path helpers ([`tdd.md`](tdd.md)).
- **Docs:** [`packages/rbac-contract`](../../../../../packages/rbac-contract/README.md) contract package + [ARCHITECTURE.md](../../../../../ARCHITECTURE.md) §5.4 / §10 note.

### Out of scope (deferred)

- **Self-service role grant UI**, audit log of grants, impersonation.
- **Prefix / subtree RBAC** inside sandbox (Phase 2 — longest-prefix or explicit resource table).
- **Drizzle + RLS integration tests** and **Playwright** unless harness already exists ([`tdd.md`](tdd.md)).
- **Custom analytics events** for denied access (enumeration risk); optional success-only events later.

### Non-goals

- **Not** importing Supabase into `@workspace/ui` (**§3.2**).
- **Not** extracting runtime RBAC to `packages/*` until a **second app** is a real consumer (**§5.1**); `rbac-contract` is **contract-only** in MVP.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | RBAC **runtime** in `apps/intradark` only; **`@workspace/rbac-contract`** docs only | §5.1, §5.4, §10 |
| Domain code location | `entities/admin/` for admin chrome + gate helpers; keep **`entities/sandbox/`** for simulators; thin routes under `app/(main)/admin/` | §7.1 |
| Shell vs domain | `components/` remains shell; admin layout composes `@workspace/ui` + `entities/admin` | §7.1 |
| Auth dependency | `@/utils/supabase/server` + Drizzle (align with `@workspace/supabase` later per news plan) | §3.2 |
| New package edges | **`@workspace/rbac-contract`** added as **documentation package** (no required app import) | §5.4, §10 |

> Compliance gate ([`checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md)): all **yes** / **n/a** for this plan. **`ARCHITECTURE.md` is updated** for `rbac-contract` (§5.4, §10).

## 4. Data model

### Tables / columns (conceptual)

Final names in `apps/intradark/drizzle/schema.ts` + new migration after `0000_needy_alex_power.sql`.

```sql
-- public.roles
-- id (uuid or bigserial), slug (unique, text), label, description nullable, created_at

-- public.user_roles
-- user_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
-- role_id NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
-- granted_at timestamptz, granted_by uuid NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
-- UNIQUE (user_profile_id, role_id)
```

**Seed (data migration or second statement in same migration):**

- `slug = 'sandbox.access'`, human-readable label.
- `slug = 'news.editor'` — consumed by [News](../news/plan.md); **do not** duplicate this seed in a separate news-only migration.

### RLS (sketch)

| Area | Audience | Rule |
|------|------------|------|
| `roles` SELECT | `authenticated` | Read allowed rows for admin UI helpers if needed; or service-role only for catalog — **tighten at implementation**. |
| `roles` INSERT/UPDATE/DELETE | — | **Service role / migration only** in MVP. |
| `user_roles` SELECT | `authenticated` | Users may read **own** rows only, or **no** direct select and reads go through server with elevated pattern — **pick one** and mirror in Drizzle `pgPolicy` like `user_profiles`. |
| `user_roles` write | — | **No** browser writes; grants via SQL / service role until grant UI exists. |

### Migration ownership

- **Path:** `apps/intradark/drizzle/*.sql` + journal (**§8.1** app-owned).
- **Remote:** MCP **`user-supabase-intradark`** `apply_migration` `{ name, query }` immediately after (or with) merging the SQL file; **`list_migrations`** before/after to verify order.
- **Sequencing:** Deploy **migration before** code that queries `roles` / `user_roles`. **Grant** your user `sandbox.access` **before** removing the env flag.
- **Backfill:** Documented SQL or script for first role assignments.

### Generated types

Run **`pnpm --filter intradark gen-types`** (or repo script) after Supabase reflects DDL; keep Drizzle schema aligned (`pull-and-fix-schema` if used).

## 5. API surface

| Operation | Surface | Auth | Notes |
|-----------|---------|------|-------|
| Prove `sandbox.access` | Server layout / `assert*` helper | Session + DB | Fail-closed → `notFound()` |
| List role slugs (optional internal) | Server-only helper | Session | No public HTTP in MVP |
| Read sandbox index | Server Component | `sandbox.access` | Composes `entities/sandbox` registry |

**Validation:** N/A for MVP (no mutating actions).

## 6. UI composition

```
apps/intradark/
├── app/(main)/admin/
│   ├── layout.tsx              # Server: session + role resolution; optional Suspense
│   ├── page.tsx                # Module cards (Sandbox, …) filtered by roles
│   └── sandbox/
│       ├── layout.tsx          # Assert sandbox.access; 404 otherwise
│       ├── page.tsx            # Reuse sandbox index UX from entities/registry
│       ├── pug-system/page.tsx
│       └── onboarding/page.tsx
├── entities/admin/
│   ├── lib/                    # assertHasRoleSlugs, getRoleSlugsForUser, logging codes
│   └── components/             # AdminHomeCards, …
├── entities/sandbox/           # Unchanged domain; update internal hrefs to /admin/sandbox/*
└── components/organisms/
    └── app-sidebar.tsx         # Admin/Sandbox nav from roles, not env
```

Update **`entities/sandbox/registry.ts`**, docs, and any `Link href="/sandbox/...` under `entities/sandbox/` to **`/admin/sandbox/...`**.

### Component map

| Need | Source |
|------|--------|
| Cards, layout, typography | `@workspace/ui` |
| Admin home, gate logging | `entities/admin/` |
| Sandbox simulators | `entities/sandbox/*` |

### Theming

- **§6:** `@workspace/ui` tokens; overrides only via existing `globals.css` pattern.

## 7. Dependencies

### Existing packages

- `@workspace/ui`
- `@supabase/ssr` / `@supabase/supabase-js` via `@/utils/supabase/server`
- `drizzle-orm` + `postgres` driver as today

### New external deps

- **None** for RBAC itself. **`@vercel/analytics`** remains optional (same as news).

### New package edges

- **`@workspace/rbac-contract`** — documentation only; see [ARCHITECTURE.md](../../../../../ARCHITECTURE.md) §5.4.

## 8. Implementation order (commits)

1. `docs(repo): add rbac-contract package + architecture §5.4` — `packages/rbac-contract`, `ARCHITECTURE.md`.
2. `docs(intradark): add admin-panel feature triad` — this folder.
3. `feat(intradark): add roles user_roles migration` — Drizzle + SQL; **`apply_migration`** on intradark Supabase; seed `sandbox.access`, `news.editor`.
4. `feat(intradark): admin layout + gate helper + vitest` — `entities/admin/lib`, tests.
5. `feat(intradark): move sandbox to /admin/sandbox` — routes, registry hrefs, redirects from `/sandbox`.
6. `feat(intradark): sidebar admin nav by role; remove sandbox env flag` — `app-sidebar`, delete `is-sandbox-enabled` usage, `env.example`.
7. `docs(intradark): align news + sandbox feature docs with RBAC` — cross-links + path updates.
8. `docs(intradark): mark admin-panel implemented` — status flip when shipped.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| (default) | Route views | provider default | Vercel Web Analytics when enabled |
| Optional follow-up | Successful sandbox layout | slug path only, no PII | `track()` — document when added |

**No** `track()` for denied admin access in MVP.

## 10. Rollout

- **Feature flag:** none; RBAC replaces env toggle.
- **Env vars:** **remove** `NEXT_PUBLIC_INTRADARK_SANDBOX_ENABLED` from docs and code.
- **Migration sequencing:** MCP **`apply_migration`** + committed Drizzle SQL **before** deploy of gating code; grant operators **before** removing env fallback.
- **Backout:** redeploy prior build; **forward-only** DDL (do not drop tables in rollback).

## 11. Open questions

- [ ] **News staff URL:** `/admin/news` vs `/news/admin` — pick when implementing news; both can share `roles` / `user_roles`.
- [ ] **`roles` SELECT policy:** authenticated catalog read vs server-only — owner: intradark maintainers, due: implementation PR.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- News (shares RBAC): [`../news/plan.md`](../news/plan.md)
- Sandbox (paths + gate superseded): [`../sandbox/plan.md`](../sandbox/plan.md)
- Contract package: [`packages/rbac-contract/README.md`](../../../../../packages/rbac-contract/README.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
