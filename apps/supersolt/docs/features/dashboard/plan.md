# Dashboard (operator home)

> **Product:** `apps/supersolt`
> **Slug:** `dashboard`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-14
> **Updated:** 2026-05-22
> **Route:** `/dashboard` (future `/{organisation}/{venue}/dashboard`)

## 1. Summary

Dashboard is the operator's daily home: where every login lands (post-onboarding) and where the operator gets a 30-second read on the business before deciding what to act on. Unlike Insights modules (deep dives), the Dashboard is **breadth** — sales pulse, COGS direction, labour position, stock anomalies, integration health, items needing action, and the Agent's morning digest.

The Dashboard aggregates from every module; is **permission-gated and personalised**; and is **drill-down-first** (every tile is a doorway with filters preserved).

**Personas:** **Owner** (primary — rolled-up KPIs, agent digest); **Area Manager** (region rollup); **Venue Manager** (single venue, operational tiles, no financial KPIs); **Staff** does not land here (roster surface).

**Notion:** [Dashboard (Module Overview)](https://www.notion.so/34f64094bde6803c8ac5ca001f005d39)

**Implementation posture:** ship for allowed roles without feature flags; tiles may use fixtures until upstream modules wire ([§2 phases](#2-scope) below). **Child slice:** [`../dashboard-superbot-suggestions/`](../dashboard-superbot-suggestions/) for Superbot suggestions card spec.

## 2. Scope

### In scope

- Dashboard landing (`/{org}/{venue}/dashboard`)
- Default tile set per permission level + industry sub-type
- Per-tile drill-down with time window + venue preserved
- Time-window selector (today / yesterday / this week / last week / this month / last month / custom)
- Venue selector (Owner / Area Manager): all venues, single, or selected
- Agent morning digest tile + notifications surface
- Refresh behaviour and live-data freshness indicators
- Empty states (new org, single-tile empty, filter-empty)
- Permission gating (Staff → silent redirect)

**Phased delivery** (engineering):

| Capability | Phase |
|------------|-------|
| Route + Staff guard | `stub` → `wired` |
| Tile grid zones | `stub` → `dummy` → `wired` |
| Time-window + venue persistence | `dummy` → `wired` (DB prefs) |
| Agent digest + drill-down | `dummy` → `wired` |
| Staleness / refresh | `dummy` → `wired` |
| Industry variants (Cafe, QSR, Bar MVP) | `dummy` → `wired` |
| Notifications / integration health | `mock` until module APIs exist |

### Out of scope

- Custom dashboard editing (drag/drop, hide/show, custom KPIs) — Phase 2
- Multiple saved layouts, dashboard sharing/export, embedded reports — Phase 2
- Mobile-specific layout beyond responsive stacking — Phase 2
- Voice / Agent-driven tile reordering — Phase 2

### Non-goals

- Feature flags or env kill-switches for production
- Duplicating Superbot suggestions spec (child folder)

## Notion specification

### User flows

1. **Owner morning login** — yesterday revenue, agent digest, labour %, COGS %, top items, integration health, notifications.
2. **Drill-down from anomaly tile** — Sales Insights with filter + agent analysis in side panel.
3. **Venue Manager** — covers, stock warnings, roster gaps, pending invoices, sales-so-far; no financial roll-ups.
4. **Area Manager** — region rollup + per-venue mini cards.
5. **Time-window switch** — all tiles re-render; comparison deltas update.
6. **Empty state post-onboarding** — welcome tile, complete-setup cards, integration health until data flows.
7. **Agent action from dashboard** — "dig in" opens side-panel chat; dashboard stays visible.
8. **Live-data freshness** — "last updated Nm ago" when Square lag > 5m.
9. **Staff manual navigation** — silent redirect to roster landing (no access denied page).

### Intended functionality

**Tile zones:** Agent digest + KPI strip; financial KPIs (Owner/Area); operations (stock, invoices, roster gaps, top items); system (notifications, integration health, license expiry). **Industry sub-types:** Cafe, QSR, Bar tile variants in MVP; Full Service, Catering, Multi-site, Other → generic default in MVP.

**Selectors:** Time-window top-right (default Today or Yesterday before service); venue selector for Owner/Area; both persist per user.

**Agent morning digest:** Daily refresh; 2–4 lines operator-specific copy + insight cards with dig deeper.

**Drill-down routes:** Revenue → Sales; COGS → Inventory/Sales; Labour → Labour Insights; stock → Stock Management; invoices → Purchasing; roster → Workforce; licenses → Settings/Venues; integrations → Settings.

**Refresh:** Manual refresh; Square/Xero staleness indicators; internal data real-time.

**Empty states:** Brand-new org; single-tile empty (e.g. no recipes); filter-empty.

### Data + integrations

- Reads from every operational module — **no dashboard-owned transactional facts** (presentation layer only)
- Aggregation via same queries as Insights (top-line numbers)
- Agent digest cached per user per day
- Notifications module data layer
- Integration health from Settings → Integrations

### Other modules this touches

Onboarding, Authentication, Insights (Sales/Inventory/Labour), Stock Management, Purchasing/Invoices, Workforce/Roster, Settings (Integrations, Venues), People (certifications), Notifications, Agent.

## Open questions

- Agent digest cadence vs real-time anomaly insertion mid-day
- Auto-refresh on long-open browser (lean: every 5m for live tiles)
- Per-venue vs per-org default for Owner (confirmed: single-venue default to venue; multi-venue to all-venues rollup)
- Drill-down preserves dashboard time window (lean: yes)
- Custom dashboards in MVP (lean: no)
- Mobile responsive in MVP; mobile-specific UX Phase 2
- Tile-level permissions edge cases (e.g. license expiry for Venue Manager — lean: yes)
- New venue mid-life sparse dashboard (same empty pattern, venue-scoped)
- Performance of multi-venue aggregation (materialised views / snapshots — engineering)
- Industry sub-type tile sets: Cafe, QSR, Bar in MVP; Full Service + Catering Phase 2

### Engineering

- [ ] **Staff landing URL** exact path — Workforce TBC
- [ ] **Digest generation** job vs on-demand; real-time anomaly cadence
- [ ] **Canonical URL** transition to `/{org}/{venue}/dashboard`

## Decision log

- *3 May 2026* — Post-login home for Owner / Area Manager / Venue Manager; Staff elsewhere; aggregates only, no own data.
- *3 May 2026* — Tiles by permission + industry sub-type; Venue Manager operational only.
- *3 May 2026* — Agent morning digest most prominent; daily + real-time anomaly cards.
- *3 May 2026* — Every KPI tile drill-down preserves time + venue filters.
- *3 May 2026* — Selectors persist per user; custom layouts Phase 2.
- *3 May 2026* — Cafe, QSR, Bar industry tiles MVP; others generic.
- *3 May 2026* — Responsive grid MVP; mobile-specific Phase 2.
- *3 May 2026* — Three empty-state levels; stale external data never silent.

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

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Child: [`../dashboard-superbot-suggestions/`](../dashboard-superbot-suggestions/)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Spec: [Dashboard — Module Overview (Notion)](https://www.notion.so/34f64094bde6803c8ac5ca001f005d39)
- Program: [`module-overview-program.md`](../../module-overview-program.md)

## Compliance audit (program 2026-06-01)

| Notion capability | Status | Notes |
|-------------------|--------|-------|
| Executive snapshot + drill-down | **Partial** | `dashboard/page.tsx`, prefs API |
| Cross-module tiles | **Partial** | Some fixtures/DEMO |
| Superbot suggestions | **Partial** | [`dashboard-superbot-suggestions/`](../dashboard-superbot-suggestions/) |

Product sections unchanged; gaps tracked for v1 QA in [`production-readiness-checklist.md`](../../production-readiness-checklist.md).

**Updated:** 2026-06-01
