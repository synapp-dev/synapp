# Dashboard (operator home)

> **Product:** `apps/supersolt`
> **Slug:** `dashboard`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-14

## 1. Summary

The **Dashboard** is the signed-in **operator home** for **Owner**, **Area Manager**, and **Venue Manager**: a **permission-gated tile grid** with **time-window** and (where applicable) **venue** selectors, **agent morning digest**, **drill-down** into other modules with **filters preserved**, **staleness** indicators for external data, **empty states**, and **silent redirect** for **Staff**. It is a **read-mostly presentation layer** with **no authoritative business tables of its own** beyond **small app-owned persistence** for **UI scope** and **digest cache**. Product requirements trace to the Module Overview spec: [Dashboard (Notion)](https://www.notion.so/34f64094bde6803c8ac5ca001f005d39).

**Implementation posture:** ship **straight to production** for allowed roles—**no feature flags** and **no env kill-switches**. Until upstream modules or integrations return reliable reads, **tiles may render from typed mock/fixture payloads** in code or from API handlers that **synthesize demo-shaped data**; `plan.md` §2 phases call out **mock vs wired** per capability so wiring can replace fixtures without rescoping UX.

**Child slice:** [`../dashboard-superbot-suggestions/`](../dashboard-superbot-suggestions/) — keep that triad as the source of truth for the **Superbot suggestions** card; this parent links it and avoids duplicating card-level TDD.

## 2. Scope

### In scope (MVP — requirements, phased delivery)

Requirements align with Notion **In scope**; each row adds a **Phase** note for implementation (`stub` | `dummy` | `wired`).

| Capability | Phase (first shippable → target) |
|------------|-----------------------------------|
| Route **`/dashboard`** (current app shape); future **`/{org}/{venue}/dashboard`** called out in §5 | `stub` → `wired` when org-scoped shell is canonical |
| **Server guard**: Staff (and other disallowed roles) → **silent `redirect()`** | `wired` |
| **Tile grid** zones (digest, KPI strip, financial KPIs for Owner/Area, operations, system/notifications) | `stub` → `dummy` → `wired` |
| **Time-window** selector + persistence | `dummy` (local) → `wired` (DB prefs table) |
| **Venue** selector (Owner / Area Manager) + persistence | `dummy` → `wired` |
| **Agent morning digest** + optional insight cards + CTA into side panel | `dummy` → `wired` (digest cache + agent pipeline) |
| **Drill-down** tiles → module routes with **time + venue context** preserved | `stub` (links) → `wired` |
| **Refresh** / staleness (Square/Xero **> 5m**), manual refresh | `dummy` → `wired` |
| **Empty states** (new org, single-tile empty, filter-empty) | `dummy` → `wired` |
| **Industry sub-type** tile variants (Notion: Cafe, QSR, Bar in MVP; others generic) | `dummy` → `wired` |
| **Notifications** surface on dashboard | `mock`/`dummy` until Notifications module API exists |
| **Integration health** tile | `mock` → `wired` from Settings/Integrations reads |
| **API**: Route Handlers + server services (see §5) | `stub` → `wired` |

### Out of scope (deferred — Notion)

- Custom drag/drop layouts, hide/show tiles, multiple saved layouts, export, embedded reports.
- Mobile-specific UX beyond **responsive stacking** (Notion: responsive in MVP).
- Voice/agent reordering of tiles.

### Non-goals

- **Feature flags** or **env-based dashboard kill switches** for production.
- Duplicating the **Superbot suggestions** spec—link the child folder instead.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | `entities/dashboard/` + thin `app/(main)/dashboard/` | §7.1 |
| Shell vs domain | Shell in `components/` unchanged; dashboard domain in `entities/dashboard/` | §7.1 |
| Auth / session | **Server only:** `@/utils/supabase/server` in RSC, layouts, and Route Handlers; **no** `@supabase/*` in client `entities/dashboard` | §3.2 (session secrets server-side; app uses local SSR helper today) |
| New package edges | None | §3.2, §10 |

> Supersolt does not depend on `@workspace/supabase`; server access uses **`@/utils/supabase/server`** (`@supabase/ssr`). New code must still keep **clients** free of secret-bearing imports.

## 4. Data model

### Dashboard-owned tables (app migrations)

Introduce **small, normalised** tables under **`apps/supersolt/supabase/migrations/`** (app-owned, [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)):

1. **`dashboard_user_preferences`** (name illustrative): `user_id`, `organisation_id`, optional `venue_scope` JSON, `time_window` enum + optional custom range, `updated_at`. RLS: user can **read/write own** rows only for orgs where **`loadAccessContextForUser`** would grant dashboard access.
2. **`agent_digest_cache`** (name illustrative): `user_id`, `organisation_id`, `digest_date` (date), `body` (text/json), `generated_at`, `source_version`. RLS: same membership predicate as prefs.

Exact column names and FKs follow existing **`user_organisations` / `user_venues`** patterns from current migrations.

### No dashboard-owned transactional data

Tile **numbers** come from existing module queries, RPCs, or future aggregations—not stored as dashboard facts except **cache** above.

### RLS

| Policy | Role | Rule |
|--------|------|------|
| `prefs_select_own` | authenticated | Row `user_id = auth.uid()` AND active membership in org |
| `prefs_upsert_own` | authenticated | Same |
| `digest_select_own` | authenticated | Same |
| `digest_service_write` | service_role (optional job) | Insert/update digests only from trusted workers |

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/<timestamp>_dashboard_prefs_and_digest.sql` (illustrative).
- **Pattern:** App-owned §8.1.
- **Backfill:** none required; tables start empty.

### Generated types

Regenerate **`apps/supersolt/utils/supabase/types.ts`** (or project convention) after migrations apply.

### Remote apply (Supabase MVP)

When implementing DDL against the **Supersolt MVP** Supabase project, use the **`user-supabase-supersolt-mvp`** MCP: **`list_migrations`** before ordering, **`apply_migration`** for DDL that matches the committed file, **`get_advisors`** after substantive changes. Same order as committed SQL under **`apps/supersolt/supabase/migrations/`**.

## 5. API surface

| Operation | Surface | Path (illustrative) | Auth | Notes |
|-----------|---------|---------------------|------|-------|
| Load access + redirect | RSC / `layout.tsx` | `app/(main)/dashboard/layout.tsx` | session | **`loadAccessContextForUser`** |
| Read tile bundle | GET Route Handler | `app/api/organisations/[organisation]/dashboard/summary/route.ts` | session | May return **fixtures** until integrations wired |
| Read/write prefs | GET/PATCH | `.../dashboard/preferences/route.ts` | session | Zod-validated body |
| Read digest | GET | `.../dashboard/digest/route.ts` | session | 404 → generate path TBC |
| Manual refresh | POST | `.../dashboard/refresh/route.ts` | session | Idempotent fan-out to readers |

**Validation:** Zod schemas colocated under `apps/supersolt/server/dashboard/` (or `lib/validators/`). Map errors to [`flows.md`](flows.md) §2.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/dashboard/
│   ├── layout.tsx              # async Server guard: Staff → redirect()
│   ├── page.tsx                # RSC shell preferred; passes props to client islands
│   └── loading.tsx             # skeleton matching tile grid
├── entities/dashboard/
│   ├── components/             # tiles, grid, selectors, empty/error states
│   ├── hooks/                  # client data hooks calling /api/...
│   └── model/                  # fixtures + types (mock vs live discriminated in types)
├── server/dashboard/           # services used by Route Handlers + RSC
└── components/                 # shell only — do not add dashboard atoms here
```

### Component map

| Piece | Source | Notes |
|-------|--------|-------|
| Primitives | `@workspace/ui` | Card, Button, Select, Skeleton, etc. |
| Tiles / grid | `entities/dashboard/components/` | Permission-gated composition |
| Superbot suggestions card | `entities/dashboard/components/superbot-suggestions-card.tsx` | Spec: [`../dashboard-superbot-suggestions/plan.md`](../dashboard-superbot-suggestions/plan.md) |

### Theming

Tokens from `@workspace/ui` ([ARCHITECTURE.md §6](../../../../../ARCHITECTURE.md)); product overrides only via existing **`globals.css`** ordering.

## 7. Dependencies

### Existing packages

- `@workspace/ui` — layout primitives.
- `@supabase/ssr`, `@supabase/supabase-js` — via **`@/utils/supabase/server`** only on server.

### New external deps

None required for the triad; add only with justification in implementation PRs.

## 8. Implementation order (commits)

Granular conventional commits; each leaves the tree green.

1. `feat(supersolt): add dashboard prefs + digest migration` — DDL + RLS + types regen.
2. `feat(supersolt): dashboard api routes` — preferences + summary + digest handlers (fixtures OK).
3. `feat(supersolt): dashboard layout guard` — Staff redirect via `loadAccessContextForUser`.
4. `feat(supersolt): dashboard page shell` — RSC + `entities/dashboard` grid wiring.
5. `feat(supersolt): dashboard tiles phase N` — iterate per tile group (financial, ops, …).
6. `test(supersolt): dashboard vitest coverage` — per [`tdd.md`](tdd.md).
7. `docs(supersolt): dashboard feature status` — flip **Status** here when shipped.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `dashboard.viewed` | dashboard shell mount | `{ organisation_id?, venue_ids? }` | **Deferred** — contract only |
| `dashboard.pref_changed` | prefs saved | `{ time_window, venue_scope_kind }` | Deferred |
| `dashboard.tile_drilled` | tile link navigation | `{ tile_id, target_route }` | Deferred |
| `dashboard.manual_refresh` | user refresh | `{}` | Deferred |
| `dashboard.digest_cta_opened` | digest CTA | `{}` | Deferred |

**No** new analytics dependencies until org standard exists.

## 10. Rollout

- **Feature flag:** none (explicit product decision).
- **Env toggles:** none for production gating; optional **non-production** `.env.local` conventions for developer convenience are **out of scope** unless the team later standardises them—**not** documented as prod controls.
- **Migration sequencing:** deploy migrations **before** or **with** code paths that **require** new tables; rollback = revert app + reverse migration (prefs/digest discard acceptable).
- **Mock data:** **in-app fixtures** or handler-level synthesis when external modules are unavailable—**not** hidden behind flags; replace with live reads incrementally.

## 11. Open questions

Track in Notion or here with owner/due:

- [ ] **Staff landing URL** exact path (`/{org}/{venue}/workforce/...`) — Workforce module TBC.
- [ ] **Digest generation** job vs on-demand; **real-time anomaly** insertion cadence (Notion open questions).
- [ ] **Canonical URL** transition from flat `/dashboard` to **`/{org}/{venue}/dashboard`** when shell is ready.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Child: [`../dashboard-superbot-suggestions/`](../dashboard-superbot-suggestions/)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Spec: [Dashboard — Module Overview (Notion)](https://www.notion.so/34f64094bde6803c8ac5ca001f005d39)
