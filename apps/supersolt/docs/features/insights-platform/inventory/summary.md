# Inventory Insights — Launch summary

> Procurement and stock analytics: food cost %, variance, waste, supplier drift, menu engineering, and inventory health — read-mostly decision hub. [Inventory (Notion)](https://www.notion.so/34f64094bde6802697c3e75140af7797)

**Legend:** `[Blocker]` = launch gate · `[Post-launch]` = can follow · `(UI)` = demo/seeded OK · `(Live)` = real data required

## Six tabs (Notion order)

- [ ] **[Blocker] (UI)** Overview · Variance · Waste · Suppliers · Recipes · Inventory
- [ ] **[Blocker] (UI)** Period + venue selectors; comparison toggle vs prior equal-length period
- [ ] **[Blocker] (UI)** Demo / Seeded mode until stock counts + invoices credible
- [ ] **[Blocker] (UI)** Real empty states + links to upstream modules when data missing

## Overview tab

- [ ] **[Blocker] (UI)** Six headline tiles + food cost % trend chart
- [ ] **[Blocker] (UI)** Proactive alerts + Agent insight cards
- [ ] **[Blocker] (Live)** Food cost % from approved stock counts + invoice pipeline

## Variance tab

- [ ] **[Blocker] (UI)** Explained vs unexplained variance; top ingredients list
- [ ] **[Blocker] (UI)** Ingredient detail history drill-in
- [ ] **[Blocker] (Live)** Recompute on approved stock count
- [ ] **[Blocker] (UI)** Empty state: no approved stock count → CTA to Stock Counts

## Waste tab

- [ ] **[Blocker] (UI)** Analytics by reason, location, shift, recipe
- [ ] **[Blocker] (Live)** Reads Waste module entries
- [ ] **[Blocker] (UI)** Empty state links to Waste module

## Suppliers tab

- [ ] **[Blocker] (UI)** Spend tracking; price change YTD; delivery/dispute flags
- [ ] **[Blocker] (Live)** Reads Suppliers, Orders, Invoices

## Recipes tab

- [ ] **[Blocker] (UI)** Sortable recipes table + menu engineering quadrant (Stars/Plowhorses/Puzzles/Dogs)
- [ ] **[Blocker] (UI)** Recipe margin drill-in
- [ ] **[Blocker] (UI)** Empty state: unmapped recipes → Map CTA in Settings

## Inventory tab

- [ ] **[Blocker] (UI)** Stock value, days of stock, slow/fast/dead movers, turn rate
- [ ] **[Blocker] (Live)** Inventory value from counts + receipts − theoretical consumption

## Cross-cutting

- [ ] **[Blocker] (UI)** Multi-venue rollup with weighted avg for ratios
- [ ] **[Blocker] (UI)** Drill-down to transactional modules preserves period in query string
- [ ] **[Blocker] (UI)** Agent: proactive cards, dig deeper, analytical tone

## Exports

- [ ] **[Blocker] (UI)** CSV export per view
- [ ] **[Post-launch] (UI)** PNG chart export

## Permissions

- [ ] **[Blocker] (UI)** Owner / Area Manager / Venue Manager per spec; Staff denied

## Integrations

- [ ] **[Blocker] (Live)** Nightly `inventory_insights_daily` (+ per-ingredient/recipe/supplier metrics)
- [ ] **[Blocker] (Live)** Reads: Stock Counts, Waste, Invoices, Orders, Suppliers, Recipes, Sales
- [ ] **[Post-launch] (Live)** Forecast Engine consumers (food cost / wastage forecast Phase 2)
