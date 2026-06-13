# Sales Insights

> **Product:** `apps/supersolt`
> **Slug:** `insights-platform/sales`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/insights/sales`
> **Status:** Planned (Notion-aligned refactor)
> **Created:** 2026-05-21
> **Updated:** 2026-05-22

## 1. Summary

Sales Insights is the first module unlocked when a customer connects Square and delivers Supersolt's instant-value moment. Operators answer: how did yesterday go, which items drive revenue, did we hit forecast, which day is hurting this week.

**Forecasting is first-class** — every revenue figure sits next to forecast (KPI deltas, Sales vs Forecast chart). **Recipe-to-Square mapping unlocks margin** in the Sales Mix table (GP%, COGS when mapped). **Daily operational home for revenue** — channel splits, top items, transaction list.

Partially live at `/{org}/{venue}/insights/sales` via Square OAuth. Forecast model owned by [Forecast Engine](../forecast-engine/plan.md); this page **consumes** `forecasts`, does not compute them.

**Personas:** Owner (daily/weekly, org rollup); Area Manager (region); Venue Manager (venue only, lighter financial framing); Staff — no access.

**Notion:** [Sales (Module Overview)](https://www.notion.so/34f64094bde680ba91abdd753390422e)

**Engineering:** Refactor monolithic `sales-insights-page-client.tsx`; remove hourly chart, Tax tile, invoices block, `last-30` preset per Notion.

## 2. Scope

### In scope

- Landing page with header (Square status badge), period selector, Export CSV
- **Five KPI tiles:** Orders, Revenue, Average Check, Refunds, Voids — actual + forecast delta; confidence badges; cold-start actuals only
- **Sales vs Forecast** chart (Actual + Forecasted bars) + period totals footer; week aggregation for 30+ day ranges
- **Channel split:** Dine-in / Pick-up / Delivery — revenue, % sales, avg check; forecast deltas (MVP: prorate period revenue forecast by channel mix until Phase 2 per-channel model)
- **Sales Mix:** qty, revenue, % sales, recipe map, GP%, COGS; Map modal; mix CSV export
- **Transaction list:** search, channel/payment filters (**scoped to list only**), refresh + last-sync, virtualised rows, line-item expand
- Time presets: Today, Yesterday, This Week, Last Week, This Month, Last Month, Custom
- Agent proactive cards + dig deeper; permissions per Notion

**Forecast (consumer scope):** Three metrics per venue per day from `forecasts` table; cold-start by **available history** (POS backfill → High from day one for typical customers); confidence Low 14–27d, Medium 28–41d, High 42+

### Out of scope

- Hourly forecast on Sales page; per-item forecasts; operator forecast overrides; multi-channel forecast model; cohort analytics; receipt editing; forecast accuracy UI; Tax Collected tile; Square invoices on this page

### Non-goals

- Owning forecast computation ([`forecast-engine`](../forecast-engine/plan.md))
- Duplicate org/venue selector (shell owns scope)
- `packages/*` promotion before second consumer

### Removed from current build

| Current UI | Action |
|------------|--------|
| `SalesHourlyDayChart` | Delete |
| Tax Collected KPI | Delete |
| Square invoices on Sales page | Delete |
| `last-30` preset | Replace with `last-month` |

## Notion specification

### User flows

Morning check-in with yesterday KPIs + chart; drill forecast miss (tooltip inputs + dig deeper); map Square variation to recipe; filter transactions only; custom date range; cold-start rare new POS vs **existing Square user with backfill** (common); confidence indicator; refresh with 1-min cooldown; CSV export; Agent proactive card; Venue Manager scoped view.

### Intended functionality

**Page header** — Sales Insights, Square/Demo badge, org/venue from shell, period + range label, Export CSV.

**KPI strip** — five tiles with forecast delta pattern; anomaly dot when Agent flagged; cold-start without delta.

**Sales vs Forecast chart** — dual bars, tooltip (actual, forecast, delta, confidence, multiplier inputs), footer totals; cold-start single series + banner.

**Channel split** — stacked bar + per-channel mini-tiles with avg check and forecast deltas.

**Sales Mix** — sortable table; Map modal (search recipes, create new, skip); org-level mapping via `square_variation_id`; GP% uses current recipe cost; cost-change propagation from supplier updates.

**Transactions** — filters list-only; virtualised pagination; refresh cooldown; stale amber >5m.

**Agent** — proactive cards, tooltip dig deeper, side panel with page context.

**Empty states** — connecting, no sales, cold-start, filter-empty.

### Data + integrations

- Square Orders API (webhook + hourly poll + manual refresh)
- `daily_sales`, `forecasts`, recipe/variation mapping, AU holidays, BOM weather, accuracy log (engine-owned)
- See Notion for full table field lists

### Other modules this touches

Connect POS, Settings (Integrations, Organisation, Venues, Recipes), Onboarding (import items, build recipes), Dashboard, Insights Labour/Inventory, P&L/Roster/Order Guide (Phase 2), Agent, Notifications.

### The forecast model (reference)

Owned by [Forecast Engine](../forecast-engine/plan.md): multiplicative daily model; 14-day horizon; anomaly ±15%; Sales reads `forecasts` only.

## Open questions

- Forecast implementation language (SQL+cron vs Python service)
- BOM vs third-party weather; generic weather first 8 weeks
- Public/school holiday manual year 1
- Anomaly threshold and permanent one-off exclusion
- 14 vs 30 day horizon; multi-venue forecast = sum of venues
- Mid-day to-go projection Phase 2
- Bulk recipe mapping Phase 2
- Refunds/voids not in forecast model
- Modifier revenue under parent line
- Currency AUD; venue timezone for daily rollups

### Engineering

- [ ] Channel proration vs hide channel forecast deltas until Phase 2 — QA with product
- [ ] Shared `insights/layout.tsx` period URL sync — follow-up per parent plan

## Decision log

- *3 May 2026* — First post-Square module; forecasting MVP; engine owns model; cold-start by available history; five KPI tiles; Sales vs Forecast chart; channel split; Sales Mix + mapping; anomalies for Agent; 14-day horizon; refresh 1-min cooldown; transaction filters list-only.
- *22 May 2026* — Repo grill-me: strict Notion layout; `insights_alerts`; channel forecast proration MVP; keep `menu_item_square_catalog_links`.

## 3. Architecture placement

| Decision | Choice | Section |
|----------|--------|---------|
| Domain | `entities/sales-insights/` (components, hooks, lib) | §7.1 |
| Route | `insights/sales/page.tsx` imports `SalesInsightsPage` from entities only | §7.1 |
| Shell | `app/components/` header/sidebar unchanged | §7.1 |
| Auth | Route handlers + `assertUserHasVenueAccess`; client calls APIs only | §3.2, §8.1 |
| New package edges | None | §3.2 |

## 4. Data model

### Reads

| Source | Use on Sales page |
|--------|-------------------|
| **`venue_square_payments` + `venue_square_order_lines`** (Postgres mirror) | Transactions, mix aggregation — see [`square-sales-mirror/plan.md`](../square-sales-mirror/plan.md) |
| `daily_sales` | Chart series, channel split actuals |
| `forecasts` | KPI/chart deltas, tooltip `inputs` JSON |
| `venue_forecast_state` | `forecast_ready`, `available_history_days`, cold-start copy |
| `menu_item_square_catalog_links` + `menu_items` + `recipes` | Map modal, GP%, COGS |
| `insights_alerts` | Proactive cards (`module = 'sales'`) |

### Writes (this epic)

**Migration:** `insights_alerts` per [parent plan](../plan.md#insights_alerts) if not already applied.

- **Path:** `apps/supersolt/supabase/migrations/YYYYMMDDHHMMSS_insights_alerts.sql`
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration` in migration file order ([`AGENTS.md`](../../../AGENTS.md))
- **Types:** regenerate `apps/supersolt/utils/supabase/types.ts`

**Recipe mapping:** keep `menu_item_square_catalog_links` (venue-scoped Square catalog object → menu item). GP% = `(sale_price − recipe_cost) / sale_price` using **current** recipe cost at view time (Notion). Mapping UX is org-consistent via menu items/recipes shared across venues.

### RLS

Match existing org/venue membership policies (same pattern as `daily_sales` / `menu_item_square_catalog_links`).

## 5. API surface

| Operation | Path | Notes |
|-----------|------|-------|
| Sales orders (extend) | `GET .../insights/sales-orders?from&to` | Add `channelSplit`, enrich `salesMix` (% sales, recipeName, gpPercent, cogsCents, sort keys) |
| Daily sales | `GET .../insights/daily-sales?from&to` | Chart (existing) |
| Forecasts | `GET .../insights/forecasts?from&to` | KPI/chart deltas (existing) |
| Forecast state | `GET .../insights/forecast/state` | Cold-start / confidence (existing) |
| Alerts list | `GET .../insights/alerts?module=sales` | Non-dismissed, non-expired |
| Alert dismiss | `PATCH .../insights/alerts/:id` | Set `dismissed_at`, `dismissed_by` |
| Map variation | `POST .../square/menu-catalog-links` | Existing |
| Refresh | `POST .../square/sync` (or existing refresh path) | 1 min cooldown |
| Alert writer | Forecast engine nightly / sync job | Inserts rows ±15% anomaly (parent) |

**Filter scoping (regression):** KPIs, chart, channel split, Sales Mix use **period-only** data; transaction list uses channel/payment/search filters only.

### Validation

- Zod for query params (`from`, `to`, ISO dates) in route handlers under `app/api/organisations/.../insights/`.
- Errors map to [`flows.md`](flows.md) §2.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/insights/sales/
│   └── page.tsx                          # imports SalesInsightsPage
├── entities/sales-insights/
│   ├── components/
│   │   ├── sales-insights-page.tsx       # orchestrator
│   │   ├── sales-page-header.tsx
│   │   ├── sales-agent-insight-cards.tsx
│   │   ├── sales-kpi-strip.tsx           # 5 tiles, responsive 3+2 → stack
│   │   ├── sales-vs-forecast-chart.tsx   # extend: tooltip inputs + dig deeper
│   │   ├── sales-channel-split.tsx
│   │   ├── sales-mix-table.tsx
│   │   ├── sales-map-recipe-dialog.tsx
│   │   └── sales-transactions-table.tsx  # virtualised
│   ├── lib/
│   │   ├── sales-kpi.ts
│   │   ├── sales-channel-split.ts
│   │   ├── sales-mix.ts
│   │   └── sales-forecast-ui.ts          # existing
│   └── model/
│       ├── useSalesInsightsQuery.ts
│       ├── use-sales-alerts-query.ts
│       └── types.ts
└── server/sales/sales-insights.service.ts  # channelSplit + enriched mix
```

Delete: `app/.../sales/_components/sales-insights-page-client.tsx`, `sales-hourly-day-chart.tsx`, hourly lib/tests tied only to Sales hourly UI.

### Page section order (Notion)

1. Agent proactive cards (when alerts exist)
2. Page header + period + transaction Export CSV
3. Square connect / cold-start banners
4. KPI strip (5)
5. Sales vs Forecast chart
6. Channel split
7. Sales Mix (+ mix Export CSV)
8. Transaction list (filters, refresh, virtualised table)

## 7. Dependencies

### Existing

- `@workspace/ui` — Card, Table, Chart, Dialog, Badge, Select, etc.
- `@/utils/supabase/server` in handlers
- `entities/ai-agent-chat` — `useAgentChat`, page context for dig deeper
- `recharts` — chart (existing)

### New

- `@tanstack/react-virtual` — transaction list virtualisation (`pnpm add` in `apps/supersolt`)

## 8. Implementation order (commits)

Depends on forecast-engine read APIs (already present). Suggested train:

1. `feat(supersolt): add insights_alerts migration` — DDL + RLS + types (if missing).
2. `feat(supersolt): insights alerts read/dismiss API` — GET/PATCH routes.
3. `feat(supersolt): extend sales-orders with channelSplit and enriched salesMix` — server + types.
4. `test(supersolt): sales kpi, channel, mix unit tests` — red → green.
5. `feat(supersolt): scaffold sales insights entity components` — strip monolith.
6. `feat(supersolt): sales channel split and sales mix table` — Notion columns + CSV.
7. `feat(supersolt): sales map recipe dialog` — wire menu-catalog-links.
8. `feat(supersolt): sales transactions virtualised list` — filters scoped.
9. `feat(supersolt): sales agent cards and dig deeper` — alerts + AgentChatProvider.
10. `refactor(supersolt): remove sales notion drift` — hourly, tax tile, invoices, last-30.
11. `test(supersolt): e2e insights sales notion flows` — see [`tdd.md`](tdd.md).

## 9. Telemetry

**MVP:** document only (no product analytics SDK — match parent §9).

| Event | Trigger | Payload |
|-------|---------|---------|
| `insights.sales.viewed` | Page mount | `{ organisation, venue, preset }` |
| `insights.export` | CSV (transactions or mix) | `{ module: 'sales', view: 'transactions' \| 'mix' }` |
| `insights.refresh` | Refresh tap | `{ module: 'sales', cooldown_hit }` |
| `insights.sales.map_recipe` | Map saved | `{ variation_id, menu_item_id }` |
| `insights.dig_deeper` | Chart/KPI/card CTA | `{ module: 'sales', context_key }` |
| `insights.alert_dismissed` | Dismiss card | `{ alert_id, module: 'sales' }` |

## 10. Rollout

- **Page gating:** none — UI always available for entitled roles.
- **Forecast UI:** show deltas/forecast bars only when `venue_forecast_state.forecast_ready` and confidence gates pass (Notion cold-start & Low/Medium rules).
- **Compute gating:** `FORECAST_ENGINE_ENABLED` env controls cron/recompute only ([`forecast-engine/plan.md`](../forecast-engine/plan.md)), not Sales page mount.
- **Migrations:** `insights_alerts` before proactive cards; forecast tables before deltas.
- **Backout:** Dismiss API noop; Sales falls back to actuals-only (existing cold-start path).

## 11. Grill-me decisions (locked 2026-05-22)

| # | Decision |
|---|----------|
| 1 | Notion is source of truth; remove hourly, Tax tile, invoices, Last 30 |
| 2 | Extend `sales-orders` payload (channelSplit + enriched salesMix) |
| 3 | Orchestrator in `entities/sales-insights`; delete route `_components` monolith |
| 4 | Full Agent epic: `insights_alerts` + APIs + cards + dig deeper |
| 5 | Presets: add Last Month; drop Last 30 |
| 6 | CSV: header (transactions) + Sales Mix section export |
| 7 | `@tanstack/react-virtual` for transactions |
| 8 | Rollout: `forecast_ready` only for forecast UI; no env flag on page |
| 9 | Channel forecast delta MVP: prorate period revenue forecast by trailing channel mix |
| 10 | Keep `menu_item_square_catalog_links`; no `square_variation_id` on recipes migration |

## 13. Cross-references

- Notion: [Sales](https://www.notion.so/34f64094bde680ba91abdd753390422e)
- [`tdd.md`](tdd.md), [`flows.md`](flows.md)
- Engine: [`../forecast-engine/plan.md`](../forecast-engine/plan.md)
- Parent: [`../plan.md`](../plan.md)

## Compliance audit (program 2026-06-01)

| Notion Sales | Status |
|--------------|--------|
| Square-backed KPIs + forecast deltas | **Partial** |
| Notion layout (no tax tile, hourly, invoices on page) | **Partial** — refactor in plan §1 |
| Instant value post-onboarding | **Partial** — depends Square + gating |

**Updated:** 2026-06-01
