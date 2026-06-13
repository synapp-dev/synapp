# Inventory Insights

> **Product:** `apps/supersolt`
> **Slug:** `insights-platform/inventory`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/insights/inventory`
> **Status:** Planned
> **Created:** 2026-05-21
> **Updated:** 2026-05-22

## 1. Summary

Insights → Inventory is the analytical home for procurement and stock: food cost %, unexplained variance, waste, supplier price drift, recipe profitability, inventory health. Synthesises Suppliers, Orders, Invoices, Stock Counts, Waste, and Sales Insights (revenue-relative metrics). **Read-mostly** — transactional modules create data; this module drives decisions. Headline metric: **food cost % trend**.

Currently **DEMO/SEEDED** in production until Stock Counts and invoice pipeline are live (variance and food cost % need approved counts).

**Personas:** Owner / Area Manager (weekly/monthly, menu engineering); Venue Manager (daily); Staff — no access.

**Notion:** [Inventory (Module Overview)](https://www.notion.so/34f64094bde6802697c3e75140af7797)

**Current code:** `inventory-insights-page-client.tsx` seeded mock — replace with six-tab Notion UX.

## 2. Scope

### In scope

- Six tabs: Overview, Variance, Waste, Suppliers, Recipes, Inventory
- Period + venue selectors; comparison toggle vs prior period
- Overview: six headline tiles, food cost % trend, alerts, Agent cards
- Variance (explained vs unexplained), Waste analytics, Supplier spend/price tracking, Recipes table + menu engineering quadrant, Inventory health (days of stock, slow/dead stock)
- CSV + PNG export; drill-downs to transactional modules; multi-venue rollup (weighted avg for ratios)

| Capability | Mode until upstream live |
|------------|-------------------------|
| All tabs | Demo/Seeded until stock counts + invoices credible |
| Partial | Real empty states + module links |

### Out of scope (Phase 2)

- Food cost / recipe / supplier / wastage forecast consumers (P2.7–P2.10); per-staff variance attribution; industry cohort benchmarks (Phase 3)

### Non-goals

- Authoritative stock transactions (upstream modules own writes)

## Notion specification

### User flows

Daily Overview check; variance investigation; waste deep dive; supplier price scan; menu engineering quadrant; recipe margin drill-in; inventory health; period comparison; multi-venue rollup; drill to source module; CSV export; Agent insight card.

### Intended functionality

**Tabs:** Overview (six tiles + trend + alerts), Variance (explained/unexplained, top ingredients), Waste (reason/location/shift/recipe views), Suppliers (spend, price changes, delivery/disputes), Recipes (table + Stars/Plowhorses/Puzzles/Dogs quadrant), Inventory (value, days of stock, slow/fast/dead movers, turn rate).

**Comparison:** prior period equal length by default; custom picker available.

**Agent:** proactive cards, dig deeper, analytical tone.

**Empty states:** no counts, no waste, no invoices, unmapped recipes, short history banner.

### Data + integrations

Nightly `inventory_insights_daily` (+ per-ingredient/recipe/supplier metrics). Reads Sales, Stock Counts, Waste, Invoices, Orders, Suppliers, Recipes, Forecast Engine (Phase 2). Recompute on approved stock count.

### Other modules this touches

All Purchasing + Stock modules, Sales Insights, Settings Recipes, Dashboard, Forecast Engine, P&L, Agent, Notifications.

## Open questions

- Food cost targets per-category vs org single (lean: per-category in Settings)
- Default time window (lean: this week)
- Nightly vs hourly partial for "today"
- Inventory value formula (count + receipts − theoretical consumption)
- Days-of-stock bands auto vs operator override
- Slow/dead thresholds category-specific
- Recipe waste % formula when tagging adopted
- Multi-venue ratio rollup methodology
- Industry benchmarks hand-curated year 1
- Agent cards only on anomaly (lean: yes)
- Per-staff variance Phase 2
- PNG + CSV exports

## Decision log

- *3 May 2026* — Six tabs; food cost % headline; variance explained/unexplained; menu engineering quadrant; nightly aggregation + hourly partial; comparison toggle; Agent integration; slow 30d / dead 90d defaults; per-category targets; multi-venue weighted ratios; CSV + PNG export.

## 3. Architecture placement

| Decision | Choice | Section |
|----------|--------|---------|
| Domain | `entities/inventory-insights/` (new) | §7.1 |
| Server | `server/inventory-insights/` nightly compute | §7.1 |

## 4. Data model

### `inventory_insights_daily`

```sql
CREATE TABLE public.inventory_insights_daily (
  venue_id uuid NOT NULL,
  date date NOT NULL,
  food_cost_pct numeric,
  food_cost_cents bigint,
  revenue_cents bigint,
  total_variance_cents bigint,
  explained_variance_cents bigint,
  total_waste_cents bigint,
  supplier_spend_cents bigint,
  inventory_value_cents bigint,
  PRIMARY KEY (venue_id, date)
);
```

Additional tables per Notion (per-ingredient daily, per-recipe daily, per-supplier monthly) — phase in same migration or follow-up `inventory_insights_detail_*`.

### Targets

Org-level category targets (food 30%, beverage 22%, alcohol 35%) from Settings → Organisation — store in org settings JSON or dedicated table when Settings specced.

## 5. API surface

| Operation | Path |
|-----------|------|
| Tab data | `GET .../insights/inventory/summary?tab&from&to&compare` |
| Menu engineering | `GET .../insights/inventory/menu-engineering` |
| Export | `GET .../insights/inventory/export` |

## 6. UI

Menu engineering quadrant: Recharts scatter or dedicated component in `entities/inventory-insights/components/menu-engineering-quadrant.tsx`.

## 7. Implementation order

1. Six-tab shell + Demo detector + comparison toggle.
2. Migrations for daily aggregates + nightly job stub.
3. Overview tiles wired when stock counts + invoices exist.
4. Variance tab after approved counts.
5. Recipes tab after Sales mix mapping density.
6. Agent alerts for waste spike / margin compression.

## 8. Telemetry

`insights.inventory.viewed`, `.tab_changed`, `.export`, `.compare_enabled`, `.drill_down`

## 9. Cross-references

- [Inventory Notion](https://www.notion.so/34f64094bde6802697c3e75140af7797)
- [`../sales/plan.md`](../sales/plan.md)

## Compliance audit (program 2026-06-01)

DEMO/seeded until stock counts + invoice pipeline credible per plan §1. **Done.**

**Updated:** 2026-06-01
