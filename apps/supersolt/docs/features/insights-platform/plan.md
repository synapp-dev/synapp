# Insights platform (parent)

> **Product:** `apps/supersolt`
> **Slug:** `insights-platform`
> **Status:** In progress
> **Owner:** TBD
> **Created:** 2026-05-21
> **Updated:** 2026-05-22

## 1. Summary

The **Insights** area (`/{organisation}/{venue}/insights/*`) is the deep-dive analytics subtree: **Sales**, **Labour**, **Inventory**, and **P&L (TBC)**, powered by a dedicated **Forecast Engine** and a shared **Insights shell** (tabs, period persistence). The parent [Insights (Notion)](https://www.notion.so/34f64094bde68000a3f2e21b4bf9480b) Module Overview page is **blank** — product truth for each child lives on its own Notion row. This folder orchestrates implementation order, shared contracts, and child triads.

**Personas:** Owner / Area Manager (org or region rollups); Venue Manager (single venue); Staff — no Insights access (per child specs).

| Child | Notion |
|-------|--------|
| Parent shell | [Insights](https://www.notion.so/34f64094bde68000a3f2e21b4bf9480b) *(blank — shell defined here + child plans)* |
| Sales | [Sales](https://www.notion.so/34f64094bde680ba91abdd753390422e) |
| Labour | [Labour](https://www.notion.so/34f64094bde68049a7b8e8c87db97f1f) |
| Inventory | [Inventory](https://www.notion.so/34f64094bde6802697c3e75140af7797) |
| P&L | [P&L (TBC)](https://www.notion.so/34f64094bde680ef9fd5ebc4c05295c8) *(blank)* |
| Forecast Engine | [Forecast Engine](https://www.notion.so/35664094bde68165a84dfc43022e8bee) |

## 2. Child feature triads

Each child owns `plan.md`, `tdd.md`, `flows.md`. Implement in the order in §8.

| Child folder | Route | Primary dependency |
|--------------|-------|-------------------|
| [`forecast-engine/`](forecast-engine/plan.md) | (no UI) | Square history, venue metadata |
| [`square-sales-mirror/`](square-sales-mirror/plan.md) | (no UI) | Square OAuth; feeds Sales + Dashboard reads |
| [`sales/`](sales/plan.md) | `/insights/sales` | Forecast Engine + Square mirror |
| [`labour/`](labour/plan.md) | `/insights/labour` | Workforce/payroll + Sales revenue + Forecast |
| [`inventory/`](inventory/plan.md) | `/insights/inventory` | Purchasing/stock + Sales + Recipes |
| [`p-and-l/`](p-and-l/plan.md) | `/insights/p-and-l` | Notion spec TBC; scaffold only |

## Notion specification

Parent **Insights** row in Module Overview has **no page body**. Sub-modules (Sales, Labour, Inventory, P&L) are linked as sub-items; **Forecast Engine** is a sibling infrastructure row. Shell behaviour (tab nav, shared period, permissions) is defined in this plan §3–§6 and child `plan.md` files synced from Notion.

### Other modules this touches

- **Dashboard** — KPI drill-downs into Insights children
- **Forecast Engine** — shared `forecasts` / `daily_sales` contracts
- **Agent** — `insights_alerts`, dig deeper from Sales / Inventory / Labour
- **Workforce, Purchasing, Stock Management** — upstream data for Labour / Inventory tabs

## Open questions

- Parent Insights Module Overview content — fill in Notion when shell UX is ready for PM review.

## Decision log

- *22 May 2026* — Parent Notion page blank; child Module Overview pages are product source of truth.

## 3. Scope (platform-wide)

### In scope

- Shared **`insights/layout.tsx`**: tab nav (Sales | Labour | Inventory | P&L), persisted **time window** (URL search params), no duplicate org/venue selector (shell is source of truth per grill-me).
- **`insights_alerts`** table + nightly writers + Agent/Dashboard consumers (MVP.5).
- Full Notion functionality per child (see child plans).
- **Sales** follows Notion strictly ([`sales/plan.md`](sales/plan.md)); no Tax tile, hourly chart, or invoices on Sales page.
- **`FORECAST_ENGINE_ENABLED`** (or venue-level `forecast_ready`) gating forecast deltas after backfill.
- Demo/Seeded labelling on tabs until upstream modules supply real data (Labour, Inventory, parts of Labour/Inventory per Notion).

### Out of scope (platform)

- Hourly forecast granularity (Phase 2 — Forecast Engine).
- Per-channel / per-item forecasts (Phase 2).
- Industry cohort benchmarks (Phase 3).
- Insights index/landing page beyond sidebar default (`insights/sales`).

### Non-goals

- Promoting Insights UI to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md)).
- App-to-app imports ([ARCHITECTURE.md §3.1](../../../../ARCHITECTURE.md)).

## 4. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain | `entities/sales-insights/`, `entities/labour-insights/` (new), `entities/inventory-insights/` (new), `entities/forecast/` (new), `server/forecast/`, `server/sales/` | §7.1 |
| Shell | `app/(main)/[organisation]/[venue]/insights/layout.tsx` + thin route `page.tsx` clients | §7.1 |
| Auth | `@/utils/supabase/server` in RSC/handlers; client hooks call Route Handlers only | §3.2, §8.1 |
| UI primitives | `@workspace/ui` | §6, §7.1 |
| New package edges | None | §3.2 |

## 5. Shared data contracts

### `insights_alerts`

Cross-module proactive cards (Sales, Labour, Inventory, Agent, Dashboard).

```sql
CREATE TABLE public.insights_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues (id) ON DELETE CASCADE,
  module text NOT NULL, -- sales | labour | inventory | forecast
  severity text NOT NULL DEFAULT 'notable', -- urgent | notable | informational
  headline text NOT NULL,
  supporting_metric text,
  destination_key text, -- app navigation catalog key
  destination_payload jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  dismissed_at timestamptz,
  dismissed_by uuid,
  source_run_id text
);
```

RLS: authenticated users with org/venue membership matching existing `user_organisations` / `user_venues` patterns.

### Forecast + daily sales

Owned by [`forecast-engine/plan.md`](forecast-engine/plan.md) (`daily_sales`, `forecasts`, calendars, accuracy log, anomaly resolutions).

### Child aggregate tables

- Labour: `labour_insights_aggregates` (nightly) — see [`labour/plan.md`](labour/plan.md).
- Inventory: `inventory_insights_daily`, per-ingredient/recipe/supplier metrics — see [`inventory/plan.md`](inventory/plan.md).

## 6. Shared UI shell

```
apps/supersolt/app/(main)/[organisation]/[venue]/insights/
├── layout.tsx                    # tabs + period persistence + children
├── _components/
│   └── insights-shell.tsx        # client: tab links, period selector sync
├── sales/ ...
├── labour/ ...
├── inventory/ ...
└── p-and-l/ ...
```

**Period persistence:** `?preset=this-week&from=&to=` synced across tab navigation within Insights.

**Permissions:** Staff → route 403 / sidebar hidden (match Sales Notion). Owner / Area Manager / Venue Manager per child specs.

## 7. API patterns (shared)

| Pattern | Use |
|---------|-----|
| GET Route Handler | Read aggregates, forecasts, alerts |
| POST refresh | Rate-limited Square sync (Sales); on-demand recompute hooks |
| Zod | `server/insights/` or per-entity validators |
| React Query | `entities/*/model/use*.ts` |

## 8. Implementation order (commits)

Platform train — each step should leave CI green.

1. **Forecast Engine** — migrations, backfill job, daily compute, read APIs ([`forecast-engine/plan.md`](forecast-engine/plan.md) §8).
2. **Square sales mirror** — `venue_square_payments`, sync cron, Postgres-only reads for dashboard + sales-orders ([`square-sales-mirror/plan.md`](square-sales-mirror/plan.md)).
3. **Insights shell** — `layout.tsx`, shared period state, tab nav.
4. **`insights_alerts`** migration + writer skeleton + dismiss API.
5. **Sales refactor** — Notion layout, forecast consumption, filter scoping fix, recipe Map modal ([`sales/plan.md`](sales/plan.md)).
6. **Labour** — six-tab UI; wire real data where payroll exists; else Demo badges ([`labour/plan.md`](labour/plan.md)).
7. **Inventory** — six-tab UI; Demo until stock counts/invoices credible ([`inventory/plan.md`](inventory/plan.md)).
8. **P&L scaffold** — keep stub; spec pending ([`p-and-l/plan.md`](p-and-l/plan.md)).
9. **Agent + Dashboard** — consume `insights_alerts` + forecast reads (coordinate with [`../dashboard/plan.md`](../dashboard/plan.md)).

## 9. Telemetry (parent)

| Event | Trigger | Payload |
|-------|---------|---------|
| `insights.viewed` | Any insights route mount | `{ route, organisation, venue, preset }` |
| `insights.tab_changed` | Tab click | `{ from, to, preset }` |
| `insights.period_changed` | Preset/custom apply | `{ preset, from, to }` |
| `insights.export` | CSV export any child | `{ module, view }` |
| `insights.refresh` | Manual refresh | `{ module, cooldown_hit }` |
| `insights.alert_dismissed` | Dismiss proactive card | `{ alert_id, module }` |
| `insights.dig_deeper` | Agent CTA from chart/tile | `{ module, context_key }` |

Child-specific events listed in child `plan.md` §9.

## 10. Rollout

- **Feature flag:** `FORECAST_ENGINE_ENABLED` (env) + per-venue `forecast_ready` after backfill completes.
- **Env vars:** `BOM_API_*`, `FORECAST_CRON_SECRET`, document in `apps/supersolt/.env.example` via forecast-engine plan.
- **Migrations:** Apply via **`user-supabase-supersolt-mvp`** MCP in same order as `apps/supersolt/supabase/migrations/` ([`AGENTS.md`](../../../AGENTS.md)).
- **Backout:** Disable cron; forecasts table read-only stale; Sales falls back to actuals-only UI (cold-start path).

## 11. Grill-me decisions (locked)

| # | Decision |
|---|----------|
| 1 | Parent slug `insights-platform` + child folders |
| 2 | Shared `insights/layout.tsx`; shell owns org/venue |
| 3 | Build order: forecast-engine → sales → labour → inventory → p-and-l |
| 4 | Supabase Edge Function cron + documented `pg_cron` fallback |
| 5 | Recipe mapping: keep `menu_item_square_catalog_links`; resolve to recipe in API; Notion Map UX |
| 6 | Labour: full 6-tab UI; Demo until payroll |
| 7 | Inventory: full 6-tab UI; Demo until upstream modules |
| 8 | P&L: scaffold until Notion spec |
| 9 | `insights_alerts` table now |
| 10 | Square full-history backfill in forecast-engine |
| 11 | Sales strict Notion — removed Tax tile, hourly chart, invoices, Last 30 |
| 12 | No duplicate venue selector on pages |
| 13–14 | Telemetry + `FORECAST_ENGINE_ENABLED` gating |

## 12. Cross-references

- Flows: [`flows.md`](flows.md)
- TDD: [`tdd.md`](tdd.md)
- Roadmap: [`../../roadmap.md`](../../roadmap.md)
- Architecture: [ARCHITECTURE.md](../../../../ARCHITECTURE.md)
- Program: [`module-overview-program.md`](../../module-overview-program.md)
- Phase 2: [`phase-2-stubs.md`](../phase-2-stubs.md) (Flash P&L)

## Compliance audit (program 2026-06-01)

| Child | Audit |
|-------|-------|
| sales | Done — Notion-strict plan |
| labour | Done — Demo tabs documented |
| inventory | Done — DEMO until stock/invoices |
| p-and-l | Done — blocked on blank Notion |
| forecast-engine | Done |

**Updated:** 2026-06-01
