# Stock Counts

> **Product:** `apps/supersolt`
> **Slug:** `stock-management/stock-counts`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/stock-management/stock-counts`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-06-01
> **Updated:** 2026-06-01

## 1. Summary

Stock Counts is where operators capture what's actually on the shelf so the platform's inventory view matches reality. It closes the loop on procurement: without periodic counts, Order Guide's current-stock assumption drifts, suggested orders get less accurate, and waste leaks go undetected.

The module solves four operational problems: **(1) Order Guide accuracy** — reorder suggestions need current stock; **(2) variance detection** — counted vs expected (purchases minus theoretical consumption) surfaces waste, theft, breakage, mis-portioning; **(3) COGS truth** — closing stock for P&L comes from approved counts; **(4) operational discipline** — regular counts force ingredient-level attention.

**Personas:** Owner / Area Manager (weekly variance review, approves COGS source); Venue Manager (schedules counts, runs/reviews variance, follows up outliers); Staff / kitchen leads (execute assigned counts on mobile — run access via assignee in MVP).

**Notion:** [Stock Counts (Module Overview)](https://www.notion.so/34f64094bde6801197f2e8f96cc790a1) · parent [Stock Management](https://www.notion.so/34f64094bde680049607f3783f7df279) (blank body)

**URL drift:** Notion `…/inventory/stock-counts` vs code `…/stock-management/stock-counts`. **Code canonical.** Legacy route redirects.

**Current code (to remove / replace):**

| Area | Location | Fate |
|------|----------|------|
| Placeholder route | `app/…/stock-management/stock-counts/page.tsx` | Replace with real page shell |
| Seeded demo UI | `app/…/inventory/stock-counts/_components/stock-counts-page-client.tsx` | Delete after salvaging UX patterns |
| Order Guide stock input | `ingredients.current_stock_level` + `order-guide.service.ts` `stockCountMissing` | **Wire** to latest approved count + receipts − consumption |
| Schema | None for counts | New migration (§4) |
| API | None | Full route surface (§5) |

**Grill-me decisions (locked):**

| Branch | Decision |
|--------|----------|
| Scope | Full Notion **In scope (MVP)** + **In scope (MVP-light)** |
| Theoretical consumption | **C** — `ingredient_consumption_daily` nightly cron + submit-time refresh for active window |
| API | PO-style `[action]` routes; storage locations under **settings/venues** |
| UI | `entities/stock-counts/`; dedicated `/count` mobile route |
| Package | App-owned only (`apps/supersolt`) |
| Auth | `capabilities.ts` helpers + DTO `allowedActions` |
| Errors | Stable `stock_counts.*` codes |
| Mobile connectivity | Online-only; per-entry optimistic retry |
| Telemetry | `stock-counts-telemetry.ts` server stub |
| TDD | Timesheets-depth unit + integration + component; manual E2E |
| Rollout | Atomic, no feature flag; migrate → deploy → crons |

## 2. Scope

### In scope (MVP — Notion parity)

- Stock count list page (history, filters, cadence card, search)
- Create new stock count (weekly / monthly / ad-hoc)
- Mobile/tablet count flow (`…/stock-counts/[countId]/count`)
- Count by storage location (venue-defined locations)
- Count every ingredient in scope; location filter
- Quick-entry UI: search ingredient; quantity in base / pack / mixed units
- Count progress indicator (X of Y counted)
- Save and resume (in-progress; pause anytime)
- Photo capture per ingredient (optional evidence)
- Variance: counted vs expected at submit
- Variance report at completion: top by $ and by % deviation
- Approve / reject workflow; approval locks count; feeds Order Guide
- Count history per ingredient (chart + delivery overlay)
- Cadence reminders (no count for X days alerts)
- CSV export for accounting
- Permission gating: create Venue Manager+; run via assignee; approve Owner / Area Manager / Venue Manager
- Bulk-zero: explicit operator action with confirmation (uncounted keep last value by default)
- Empty states (no ingredients, first count, no recent counts)
- Multi-counter: two users on different locations in same count (location assignment)
- Stable API error codes — see [`flows.md`](flows.md) §2

### In scope (MVP-light — Notion deferable, same release)

- Cycle counting (subset scope; only included ingredients update stock)
- Mid-count discrepancy flag (`needs_verification` on entry)
- Stock count templates (custom location order, ingredient grouping)
- Large-variance approval threshold → Owner-only (mirrors PO/invoice pattern)

### Out of scope (Phase 2)

- Barcode / QR scanning; voice counting; AI photo counting
- Smart cycle counting (AI ingredient selection)
- Multi-venue stock transfers; stock-out probability during count
- Predictive variance alerts (Insights consumer)
- Theft/anomaly attribution (P2.13)
- Auto stock update on PO receive without count
- IoT sensors; specific gravity / weighted units
- Per-location stock tracking for Order Guide (MVP rolls up to ingredient total)
- Offline queue (IndexedDB) — online-only with retry in MVP

### Non-goals

- Promoting to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md))
- Replacing manual `current_stock_level` edits in Ingredients UI long-term (counts become authoritative; manual override Phase 2 policy)
- Insights Inventory full live mode (stays demo/seeded until approved counts exist; real empty states + module links)

## Notion specification

### User flows (locked — 16 scenarios)

1. **Schedule recurring count** — cadence, day, scope, assignee; reminders on scheduled day.
2. **Run count (mobile)** — progress bar, location filter, previous qty faint, walk-and-count.
3. **Mixed-unit entry** — cartons + bottles + partial mL → base unit auto-convert.
4. **Photo capture** — attach evidence per ingredient row.
5. **Save and resume** — pause preserves entries; any authorized user resumes.
6. **Complete + review variance** — submit computes variance; pending approval.
7. **Manager approves** — locks count; Order Guide reads new baseline.
8. **Manager rejects / request recount** — partial recount flow merges back.
9. **Variance report post-approval** — drill ingredient; tag reason (waste / theft / mis-count / known breakage / unknown).
10. **Cycle count** — subset scope; only included items update stock figures.
11. **Bulk-zero remaining** — explicit confirmation; default is preserve last value.
12. **Ingredient stock history** — chart last 12 counts + deliveries.
13. **No-count cadence alert** — 14+ days → notification + Agent brief.
14. **First count (baseline)** — no variance (`is_baseline=true`).
15. **Storage location management** — Settings → Venues.
16. **Multi-location ingredient** — count per location; sum to ingredient total.

### Intended functionality

**List page:** New count + schedule CTAs; status pills; cadence card; rows with variance summary.

**Detail page:** Header (status, scope, assignee, dates); entries table; variance summary; audit trail; approval actions.

**Count flow (mobile):** Progress, location pills, scrollable ingredient list, quick-entry modal (single + mixed unit, photo, notes), pause/submit bar.

**Variance formula:** `expected = previous_count + receipts_since − theoretical_consumption_since`; `variance = counted − expected`; signed; dollars = variance × current ingredient cost.

**Approval:** Pending → approve / reject / request recount; reopen with audit trail allowed.

**Cadence:** Per-venue default (recommend weekly); escalation if not completed within 24h of scheduled time.

See full Notion page for UI field-level detail (tables, filters, export columns).

### Data + integrations

Reads: **Suppliers** (pack info for mixed units), **Recipes** (BOM → consumption), **Orders** (PO receiving events), **Invoices** (standalone receipt quantities), **Sales** (Square mirror → consumption), **Settings → Venues** (storage locations), **Permissions** (role gates).

Writes: stock count tables (§4), variance events, audit log; on approve updates `ingredients.current_stock_level` and triggers Order Guide cache invalidation / Insights recompute hook (when live).

### Other modules this touches

[`purchasing/`](../purchasing/plan.md) (Order Guide stock input), [`insights-platform/inventory/`](../../insights-platform/inventory/plan.md) (variance trends), [`settings/`](../settings/plan.md) (venues / storage locations), Waste (expected qty reduction when built), P&L Phase 2, Agent, Notifications.

## Open questions

### Product (Notion lean — locked in decision log)

- [x] Bulk-zero vs preserve-last — **preserve last** default; bulk-zero explicit with confirmation.
- [x] Count at ingredient level, not supplier product level.
- [x] First count baseline-only (no variance).
- [x] Approved count as-of `submitted_at`; Order Guide layers receipts + consumption since.
- [x] Photo retention 1 year default.
- [x] Voided in-progress counts auto-archive after 7 days with notification.

### Engineering (resolved)

- [x] Theoretical consumption — nightly table + submit refresh (**grill-me C**).
- [x] Receipts — read `purchase_order_receiving_events` + confirmed invoice lines; no duplicate receipts log.
- [x] Non-tracked ingredients — tag category `non-tracked`; counted but variance skipped.
- [x] Storage locations API — settings/venues namespace (**grill-me A+C**).

## Decision log

- *3 May 2026 (Notion)* — Full variance formula, mobile flow, mixed units, approval workflow, cycle counting, cadence reminders (see Notion page).
- *1 Jun 2026 (grill-me)* — **Full Notion MVP + MVP-light**; consumption table + submit refresh; PO-style API; entities UI; capabilities auth; stable error codes; atomic rollout.

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain services | `server/stock-counts/stock-counts.service.ts`, `stock-counts-policy.ts`, `variance-compute.ts`, `mixed-unit-convert.ts`, `consumption-daily.service.ts`, `stock-counts-telemetry.ts`, `stock-counts-errors.ts` | §7.1 |
| Repo | `server/stock-counts/stock-counts.repo.ts` | §7.1 |
| Client | `entities/stock-counts/`; thin routes under `app/…/stock-management/stock-counts/` | §7.1 |
| Storage locations UI | Settings → Venues section; API under `app/api/…/venues/[venue]/storage-locations/` | §7.1 |
| Cron | `app/api/cron/ingredient-consumption-daily/route.ts`, `app/api/cron/stock-count-reminders/route.ts` | §8.1 |
| Photo storage | Supabase Storage bucket `stock-count-photos`; upload via authenticated route | §8.1 |
| API | Route handlers; `[countId]/[action]` lifecycle | §8.1 |
| Auth | `requireRequestAuth` + `assertVenueMember` + `capabilities.ts` | §3.2 |
| UI primitives | `@workspace/ui` | §6 |
| New package edges | None | §3.2 |

## 4. Data model

### Enums

```sql
CREATE TYPE stock_count_status AS ENUM (
  'scheduled',
  'in_progress',
  'pending_approval',
  'approved',
  'rejected',
  'archived'
);

CREATE TYPE stock_count_scope_type AS ENUM (
  'full',
  'location',
  'cycle',
  'category'
);

CREATE TYPE stock_count_schedule_cadence AS ENUM (
  'weekly',
  'fortnightly',
  'monthly',
  'custom'
);

CREATE TYPE stock_count_variance_reason AS ENUM (
  'waste',
  'theft',
  'mis_count',
  'known_breakage',
  'unknown'
);
```

### Tables

```sql
-- Venue storage locations (also manageable via Settings → Venues)
CREATE TABLE public.venue_storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, name)
);

CREATE TABLE public.ingredient_storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.venue_storage_locations(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  UNIQUE (ingredient_id, location_id)
);

CREATE TABLE public.stock_count_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  cadence stock_count_schedule_cadence NOT NULL DEFAULT 'weekly',
  cron_expression text,
  default_assignee_user_id uuid REFERENCES auth.users(id),
  default_scope_type stock_count_scope_type NOT NULL DEFAULT 'full',
  default_scope_filter jsonb NOT NULL DEFAULT '{}',
  is_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.stock_count_schedules(id) ON DELETE SET NULL,
  name text NOT NULL,
  status stock_count_status NOT NULL DEFAULT 'scheduled',
  scope_type stock_count_scope_type NOT NULL DEFAULT 'full',
  scope_filter jsonb NOT NULL DEFAULT '{}',
  assignee_user_id uuid REFERENCES auth.users(id),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  scheduled_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by_user_id uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejected_by_user_id uuid REFERENCES auth.users(id),
  rejection_reason text,
  is_baseline boolean NOT NULL DEFAULT false,
  total_variance_cents bigint,
  total_variance_pct numeric,
  large_variance_owner_required boolean NOT NULL DEFAULT false,
  notes text,
  template_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_count_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.venue_storage_locations(id) ON DELETE SET NULL,
  previous_count_qty numeric,
  expected_qty numeric,
  counted_qty numeric,
  unit_used text,
  mixed_unit_breakdown jsonb,
  variance_qty numeric,
  variance_cents bigint,
  notes text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  needs_verification boolean NOT NULL DEFAULT false,
  is_recount_required boolean NOT NULL DEFAULT false,
  is_skipped boolean NOT NULL DEFAULT false,
  is_row_complete boolean NOT NULL DEFAULT false,
  counted_by_user_id uuid REFERENCES auth.users(id),
  counted_at timestamptz,
  UNIQUE (count_id, ingredient_id, location_id)
);

CREATE TABLE public.stock_count_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_order jsonb NOT NULL DEFAULT '[]',
  ingredient_groupings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ingredient_consumption_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  date date NOT NULL,
  qty_consumed_base_units numeric NOT NULL DEFAULT 0,
  source_recipe_count integer NOT NULL DEFAULT 0,
  source_sales_count integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, ingredient_id, date)
);

CREATE TABLE public.stock_count_variance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  variance_qty numeric NOT NULL,
  variance_cents bigint NOT NULL,
  tagged_reason stock_count_variance_reason,
  tagged_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_count_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### RLS

| Policy | Role | Rule |
|--------|------|------|
| `*_select` | `authenticated` | Venue member via `user_venues` + active org membership |
| `*_insert/update/delete` | `authenticated` | Same venue scope; status transitions enforced in service layer |
| Cron jobs | `service_role` / admin connection | Consumption recompute, reminder dispatch |

Venue-scoped policies mirror `purchase_orders_all` pattern (org membership check on `organisation_id`).

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260601140000_stock_counts_module.sql`
- **Pattern:** App-owned (§8.1 default)
- **Remote apply:** Implementation session uses **`user-supabase-supersolt-mvp`** `apply_migration` in same order, then `pnpm drizzle:pull` (do not hand-edit `drizzle/schema.ts`)
- **Storage bucket:** `stock-count-photos` via Supabase dashboard or migration policy script
- **Backfill:** First `ingredient-consumption-daily` cron backfills from Square mirror for connected venues

### Generated types

Regenerate via `pnpm drizzle:pull` after migration applies.

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| List counts | GET | `…/stock-counts` | venue member | filters: status, date, assignee, scope |
| Create count | POST | `…/stock-counts` | `canCreateStockCount` | optional template_id, scope |
| Get count | GET | `…/stock-counts/[countId]` | venue member | includes entries, variance, `allowedActions` |
| Patch entries | PATCH | `…/stock-counts/[countId]` | `canRunStockCount` | bulk entry upsert; optimistic concurrency via `updated_at` |
| Lifecycle action | POST | `…/stock-counts/[countId]/[action]` | capability per action | `submit`, `approve`, `reject`, `pause`, `request-recount`, `set-remaining-zero`, `reopen` |
| Upload photo | POST | `…/stock-counts/[countId]/entries/[entryId]/photo` | `canRunStockCount` | multipart → Storage |
| Export CSV | GET | `…/stock-counts/[countId]/export` | venue member | accounting columns per Notion |
| Ingredient history | GET | `…/ingredients/[ingredientId]/stock-history` | venue member | last N counts + deliveries |
| List schedules | GET | `…/stock-count-schedules` | venue member | |
| CRUD schedule | POST/PATCH | `…/stock-count-schedules/[scheduleId]` | `canCreateStockCount` | |
| List storage locations | GET | `…/storage-locations` | venue member | settings-owned |
| CRUD storage location | POST/PATCH/DELETE | `…/storage-locations/[locationId]` | org admin / venue manager | |
| Map ingredient → location | PUT | `…/ingredients/[ingredientId]/storage-locations` | venue manager+ | |
| Consumption cron | POST | `/api/cron/ingredient-consumption-daily` | `CRON_SECRET` | nightly + backfill |
| Reminders cron | POST | `/api/cron/stock-count-reminders` | `CRON_SECRET` | cadence + 14-day alert |

### Validation

- Input schemas: `server/stock-counts/stock-counts.schemas.ts` (Zod)
- Error mapping: every thrown error → row in [`flows.md`](flows.md) §2

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/stock-management/stock-counts/
│   ├── page.tsx
│   ├── [countId]/page.tsx
│   └── [countId]/count/page.tsx          # full-screen mobile flow
├── app/(main)/[organisation]/[venue]/settings/venues/
│   └── _components/storage-locations-section.tsx   # or colocated in venue settings client
├── entities/stock-counts/
│   ├── api/endpoints.ts
│   ├── components/
│   │   ├── stock-counts-list-page.tsx
│   │   ├── stock-count-detail-page.tsx
│   │   ├── stock-count-flow-page.tsx
│   │   ├── count-quick-entry-modal.tsx
│   │   ├── mixed-unit-entry.tsx
│   │   └── variance-summary-panel.tsx
│   ├── hooks/
│   │   ├── use-stock-counts-query.ts
│   │   └── use-count-entry-mutation.ts     # per-row optimistic retry
│   └── model/types.ts
└── server/stock-counts/
    ├── stock-counts.service.ts
    ├── stock-counts.repo.ts
    ├── stock-counts-policy.ts
    ├── variance-compute.ts
    ├── mixed-unit-convert.ts
    ├── consumption-daily.service.ts
    ├── stock-counts-errors.ts
    └── stock-counts-telemetry.ts
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Button, Input, Card, Sheet, Progress | `@workspace/ui` | Reuse |
| Mixed-unit converter display | `entities/stock-counts/components/mixed-unit-entry.tsx` | Uses `supplier_products` pack info |
| Cadence card, variance tables | `entities/stock-counts/` | Salvage patterns from legacy demo |

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — layout, forms, tables, sheets
- Drizzle + Supabase Auth via `@/server/db` and `@/lib/api/route-auth` (no `@workspace/supabase` in UI)

### New external deps

- None (Supabase Storage via existing client/server upload pattern)

### New package edges

- None

## 8. Implementation order (commits)

1. `feat(supersolt): scaffold stock-counts routes + entities shell`
2. `feat(supersolt): add stock counts migration + storage bucket`
3. `test(supersolt): red tests for variance + mixed-unit + policy`
4. `feat(supersolt): stock-counts repo + service + API routes`
5. `feat(supersolt): consumption daily cron + submit refresh`
6. `feat(supersolt): stock-counts list + detail UI`
7. `feat(supersolt): mobile count flow + per-entry retry`
8. `feat(supersolt): approval workflow + order guide stock sync`
9. `feat(supersolt): schedules, templates, cycle count scope`
10. `feat(supersolt): storage locations in settings venues`
11. `feat(supersolt): stock-counts error codes + telemetry`
12. `chore(supersolt): remove legacy stock-counts demo UI`
13. `docs(supersolt): mark stock-counts feature complete`

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `stock_counts.viewed` | List/detail mount (server on fetch) | `{ venueId, countId? }` | `stock-counts-telemetry.ts` |
| `stock_counts.created` | POST count | `{ venueId, countId, scopeType }` | stub |
| `stock_counts.entry_saved` | PATCH entry | `{ venueId, countId, entryId }` | stub |
| `stock_counts.submitted` | submit action | `{ venueId, countId, totalVarianceCents }` | stub |
| `stock_counts.approved` | approve action | `{ venueId, countId }` | stub |
| `stock_counts.rejected` | reject action | `{ venueId, countId }` | stub |
| `stock_counts.recount_requested` | request-recount | `{ venueId, countId, entryIds[] }` | stub |
| `stock_counts.reopened` | reopen action | `{ venueId, countId }` | stub |
| `stock_counts.schedule_created` | POST schedule | `{ venueId, scheduleId }` | stub |
| `stock_counts.export_csv` | GET export | `{ venueId, countId }` | stub |
| `stock_counts.failed` | any error | `{ venueId, countId?, code }` | stub |

No ingredient costs or PII in payloads.

## 10. Rollout

- **Feature flag:** none — atomic ship when tests green
- **Env vars:** `CRON_SECRET` (existing); no new required vars
- **Migration sequencing:** apply `20260601140000_stock_counts_module.sql` via **`user-supabase-supersolt-mvp`** `apply_migration` → `pnpm drizzle:pull` → deploy app → register crons in Vercel
- **Storage:** create `stock-count-photos` bucket; RLS policies venue-scoped paths `{venueId}/{countId}/{entryId}/*`
- **Backfill:** consumption cron first run backfills Square-connected venues
- **Insights:** remain demo until first approved count; show real empty state + link to Stock Counts
- **Backout:** revert deploy; disable crons; migrations forward-only (data retained)

## 11. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows: [`flows.md`](flows.md)
- Parent: [`../plan.md`](../plan.md)
- Order Guide: [`../../purchasing/plan.md`](../../purchasing/plan.md)
- Inventory Insights: [`../../insights-platform/inventory/plan.md`](../../insights-platform/inventory/plan.md)
- Architecture: [ARCHITECTURE.md](../../../../ARCHITECTURE.md)
