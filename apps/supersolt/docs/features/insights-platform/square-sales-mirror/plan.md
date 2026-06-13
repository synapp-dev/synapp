# Square sales mirror (Postgres read model)

> **Product:** `apps/supersolt`
> **Slug:** `insights-platform/square-sales-mirror`
> **Parent:** [`../plan.md`](../plan.md)
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-06-01

## 1. Summary

Move Square sales reads off synchronous POS API calls and onto a **Postgres materialized read model**. Today, dashboard SSR and `GET .../insights/sales-orders` block on `listSquarePayments` + `batchRetrieveSquareOrders` on every load — causing multi-second cold starts. Square remains **system of record**; Supersolt stores mirrored payment headers and line items, syncs in the background (10-min cron + manual refresh), and serves all user-facing reads from indexed Postgres queries.

**Consumers:** Venue dashboard live sales snapshot, Sales Insights transaction list / KPIs / channel split / sales mix, Forecast Engine `daily_sales` rollups.

**Grill-me decisions (2026-06-01):** payment headers + existing `venue_square_order_lines`; polling sync (no webhooks v1); Postgres-only reads; 90-day backfill; idempotent upserts + full-day `daily_sales` recompute; 3-day rolling lookback; extend `venue_forecast_state`; staggered deploy backfill; 10-min cron.

## 2. Scope

### In scope (MVP)

- **`venue_square_payments`** table — one row per Square payment per venue (natural key upsert)
- **Reuse `venue_square_order_lines`** — line upserts remain idempotent (`venue_id`, `square_payment_id`, `square_line_uid`)
- **`square-sync.service.ts`** — shared import pipeline: list payments → batch retrieve orders → upsert headers/lines → recompute affected `daily_sales` days → trigger forecast recompute
- **Read-path cutover** — `getSalesInsightsOrders` and `loadDashboardLiveSalesSnapshot` query Postgres only; no live Square on page load
- **Incremental cron** — `GET /api/cron/square-sales-sync` every 10 min: rolling 3 venue-local day lookback + gap-fill cursor
- **Manual refresh** — `POST .../square/sync` with 1-min cooldown (per [`sales/plan.md`](../sales/plan.md))
- **Backfill** — 90 days on Square connect, on deploy (staggered per connected venue), and async on-demand for custom ranges >90 days
- **Sync metadata** — extend `venue_forecast_state` (`last_payments_sync_at`, backfill progress covers payment + line import)
- **API meta** — `lastSyncedAt`, `syncStatus`, `backfillStatus` on sales-orders responses (UI stale indicator >5 min unchanged)

### Out of scope (deferred)

- Square **webhooks** (payment.updated) — follow-up for sub-minute freshness
- **Multi-POS** beyond Square
- Storing full raw Square JSON blobs (only normalized columns v1)
- Historical mirror beyond 90 days unless user requests custom range (async job)
- New Sales Insights UI surfaces (behavior change is faster loads + sync banners only)

### Non-goals

- Making Postgres authoritative over Square for accounting/disputes
- Promoting sync code to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../../ARCHITECTURE.md))
- Replacing Forecast Engine compute ownership ([`forecast-engine/plan.md`](../forecast-engine/plan.md))

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | Section |
|----------|--------|---------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code | `server/square/` (sync), `server/sales/` (read), `entities/sales-insights/` (UI meta) | §7.1 |
| Shell vs domain | No new routes; dashboard + insights consume existing APIs | §7.1 |
| Auth | Route handlers + `requireRequestAuth`; cron uses `CRON_SECRET` + service DB pattern (see `cron/xero-invoice-sync`) | §3.2 |
| New package edges | None | §3.2, §10 |

## 4. Data model

### New table: `venue_square_payments`

```sql
CREATE TABLE public.venue_square_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  square_payment_id text NOT NULL,
  square_order_id text,
  order_datetime timestamptz NOT NULL,
  order_number text,
  channel text NOT NULL DEFAULT 'pos',
  gross_amount_cents bigint NOT NULL DEFAULT 0,
  tax_amount_cents bigint NOT NULL DEFAULT 0,
  net_amount_cents bigint NOT NULL DEFAULT 0,
  discount_amount_cents bigint NOT NULL DEFAULT 0,
  is_void boolean NOT NULL DEFAULT false,
  is_refund boolean NOT NULL DEFAULT false,
  refund_reason text,
  payment_method text,
  square_status text,
  square_source_type text,
  square_location_id text,
  receipt_url text,
  receipt_number text,
  square_created_at timestamptz,
  square_updated_at timestamptz,
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_square_payments_uq UNIQUE (venue_id, square_payment_id)
);

CREATE INDEX venue_square_payments_venue_datetime_idx
  ON public.venue_square_payments (venue_id, order_datetime DESC);

CREATE INDEX venue_square_payments_venue_square_updated_idx
  ON public.venue_square_payments (venue_id, square_updated_at DESC NULLS LAST);
```

Column mapping follows existing `squarePaymentsToSalesOrderRows` (`server/sales/square-to-sales-row.ts`) so read path can map DB rows → `SalesOrderRow` without Square API shape leakage.

### Existing tables (unchanged keys, new write semantics)

| Table | Role |
|-------|------|
| `venue_square_order_lines` | Line mirror; upsert on sync only |
| `daily_sales` | Derived aggregate; **recomputed from all mirrored payments per affected calendar day** after each sync batch |
| `venue_forecast_state` | Sync lifecycle + forecast readiness |

### Extend `venue_forecast_state`

```sql
ALTER TABLE public.venue_forecast_state
  ADD COLUMN IF NOT EXISTS last_payments_sync_at timestamptz;
```

Reuse existing `backfill_status` / `backfill_progress` for payment+line backfill (same UX as forecast backfill in admin-tools). `last_daily_sales_sync_at` updated when daily rollups complete.

### RLS

| Policy | Role | Rule |
|--------|------|------|
| `venue_square_payments_select` | `authenticated` | Org member via `user_organisations` (same pattern as `venue_square_order_lines`) |
| Writes | service role / admin only | Sync jobs use `appDb.admin`; no client INSERT |

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/YYYYMMDDHHMMSS_venue_square_payments.sql`
- **Pattern:** App-owned (§8.1)
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration` in file order; then `pnpm drizzle:pull` in `apps/supersolt`
- **Backfill script:** `apps/supersolt/scripts/backfill-square-sales-mirror.ts` — one-shot deploy helper; enqueues 90-day import per connected venue (staggered)

### Generated types

Regenerate `apps/supersolt/drizzle/schema.ts` via drizzle pull after migration applies.

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| Sales orders (read mirror) | Route handler | `GET .../insights/sales-orders?from&to` | Venue member | Postgres query by `order_datetime` range; join lines; attach sync meta |
| Manual sync | Route handler | `POST .../square/sync` | Venue admin or manager | 1-min cooldown; triggers rolling 3-day + requested range if > lookback |
| Incremental cron | Route handler | `GET /api/cron/square-sales-sync` | `CRON_SECRET` bearer | All Square-connected venues; stagger in loop |
| Deploy backfill | Script / one-shot cron | `scripts/backfill-square-sales-mirror.ts` | Service role | 90-day per venue on first deploy |
| Forecast state (existing) | Route handler | `GET .../insights/forecast/state` | Venue member | Surfaces `backfill_status`, `last_payments_sync_at` |

### Validation

- Zod for `from` / `to` ISO query params (existing sales-orders route)
- Sync cooldown: compare `last_payments_sync_at` + 60s; return 429 with retry-after
- Custom range >90 days: enqueue async backfill job; return 202 + job id in meta (optional v1: fire-and-forget with progress in `backfill_progress`)

### Read-path contract change

`SalesInsightsMeta` gains:

```ts
lastSyncedAt?: string | null;
syncStatus?: 'idle' | 'syncing' | 'failed';
backfillStatus?: 'idle' | 'running' | 'complete' | 'failed';
```

Remove synchronous `squareError` on happy-path reads (errors surface via sync status + admin-tools). Demo venues unchanged (`dataSource: 'demo'`).

## 6. UI composition

No new pages. Touch existing consumers only:

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/
│   ├── dashboard/page.tsx              # SSR uses fast mirror read
│   └── insights/sales/page.tsx         # unchanged route
├── entities/sales-insights/
│   ├── components/sales-insights-page.tsx   # stale sync amber >5m (existing spec)
│   └── api/endpoints.ts                     # optional sync POST hook
└── server/
    ├── square/square-sync.service.ts        # NEW — import pipeline
    ├── sales/sales-insights.service.ts        # read mirror, not Square
    └── dashboard/dashboard-sales-snapshot.service.ts
```

### Component map

| Component | Source | Change |
|-----------|--------|--------|
| Sync / backfill banners | `entities/sales-insights/` | Show `backfillStatus: running`, empty mirror during backfill |
| Admin tools forecast panel | `admin-tools-page-client.tsx` | Display `last_payments_sync_at` |
| Primitives | `@workspace/ui` | No change |

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — existing sales/dashboard components
- `@workspace/supabase` — auth/session only (no new client `.from()` usage)
- Drizzle + `appDb.rls` / `appDb.admin` per [`AGENTS.md`](../../../../AGENTS.md)

### New external deps

None.

### New package edges

None — no `ARCHITECTURE.md` update required.

## 8. Implementation order (commits)

1. `feat(supersolt): add venue_square_payments migration + drizzle pull` — DDL, RLS, indexes.
2. `feat(supersolt): add square-sync import service` — upsert payments/lines, recompute daily_sales from mirror.
3. `test(supersolt): red tests for mirror sync idempotency` — see [`tdd.md`](tdd.md).
4. `feat(supersolt): wire sales-orders read path to postgres mirror` — remove live Square from `getSalesInsightsOrders`.
5. `feat(supersolt): wire dashboard snapshot to postgres mirror` — `loadDashboardLiveSalesSnapshot`.
6. `feat(supersolt): add square/sync route with cooldown` — manual refresh.
7. `feat(supersolt): add cron square-sales-sync` — 10-min incremental + 3-day lookback.
8. `feat(supersolt): deploy backfill script for connected venues` — 90-day staggered import.
9. `feat(supersolt): sales sync status meta + UI banners` — backfill/syncing states.
10. `docs(supersolt): mark square-sales-mirror complete` — flip status in this file.

**Prerequisite:** Implement before or in parallel with Sales Insights Notion refactor ([`sales/plan.md`](../sales/plan.md)) — faster loads unblock dashboard and sales either way.

## 9. Telemetry

Structured `console` logs (existing pattern); no new analytics SDK.

| Event | Trigger | Payload |
|-------|---------|---------|
| `square_sync.started` | Cron / manual / backfill | `{ venueId, mode: 'incremental' \| 'backfill' \| 'manual', dateRange }` |
| `square_sync.completed` | Batch commit | `{ venueId, paymentsUpserted, linesUpserted, daysRecomputed, durationMs }` |
| `square_sync.failed` | Square API error | `{ venueId, message, status }` |
| `square_sync.truncated` | Pagination cap hit | `{ venueId, paymentCount, pagesFetched }` |
| `square_read.mirror_miss` | Requested range partially outside mirror | `{ venueId, from, to, coveredDays }` |

## 10. Rollout

- **Feature flag:** None — venue-level `backfill_status` gates UX (syncing banner, partial data) instead of env flag.
- **Env vars:** `CRON_SECRET` (existing); optional `SQUARE_SYNC_CRON_ENABLED=true` to disable cron in dev.
- **Migration sequencing:** Migrate before deploy; run backfill script immediately after deploy (staggered).
- **Vercel cron:** Add `square-sales-sync` schedule `*/10 * * * *` in `vercel.json` (or equivalent).
- **Backout:** Revert read-path commit to restore live Square reads (slow but correct); mirror tables are forward-only and harmless if unused.

## 11. Open questions

- [ ] Exact venue role for manual sync (admin-only vs any venue manager) — default: match existing integrations capability — owner: product, due: before commit 6.
- [ ] Async job table for >90-day custom range vs inline background `waitUntil` — owner: eng, due: implementation.

## 12. Cross-references

- Parent: [`../plan.md`](../plan.md)
- Sales consumer: [`../sales/plan.md`](../sales/plan.md)
- Forecast consumer: [`../forecast-engine/plan.md`](../forecast-engine/plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Supabase MCP: `user-supabase-supersolt-mvp` per [`AGENTS.md`](../../../../AGENTS.md)
