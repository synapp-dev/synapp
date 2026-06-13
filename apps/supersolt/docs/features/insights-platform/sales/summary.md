# Sales Insights — Launch summary

> Daily revenue home: KPIs vs forecast, channel split, sales mix with recipe mapping, and transaction list — the instant-value moment after Square connect. [Sales (Notion)](https://www.notion.so/34f64094bde680ba91abdd753390422e)

**Legend:** `[Blocker]` = launch gate · `[Post-launch]` = can follow · `(UI)` = demo/seeded OK · `(Live)` = real data required

## Page header & period

- [ ] **[Blocker] (UI)** Header: title, Square/Demo badge, period selector, range label
- [ ] **[Blocker] (UI)** Presets: Today, Yesterday, This Week, Last Week, This Month, Last Month, Custom
- [ ] **[Blocker] (UI)** Export CSV from header (transactions)
- [ ] **[Blocker] (UI)** Removed surfaces absent: hourly chart, Tax tile, invoices block, Last 30 preset

## KPI strip

- [ ] **[Blocker] (UI)** Five tiles: Orders, Revenue, Average Check, Refunds, Voids
- [ ] **[Blocker] (UI)** Cold-start: actuals only, no forecast delta when not ready
- [ ] **[Blocker] (Live)** Forecast deltas + confidence badges when `forecast_ready`
- [ ] **[Blocker] (UI)** Anomaly dot on tile when Agent alert flagged

## Sales vs Forecast chart

- [ ] **[Blocker] (UI)** Dual bars (Actual + Forecast); week aggregation for 30+ day ranges
- [ ] **[Blocker] (UI)** Tooltip: actual, forecast, delta %, confidence, model `inputs`
- [ ] **[Blocker] (UI)** Footer period totals; cold-start single series + banner
- [ ] **[Blocker] (UI)** Dig deeper from chart opens Agent with scoped context

## Channel split

- [ ] **[Blocker] (UI)** Dine-in / Pick-up / Delivery: revenue, % sales, avg check
- [ ] **[Blocker] (Live)** Forecast deltas on channels (MVP: prorate period forecast by trailing mix)

## Sales Mix

- [ ] **[Blocker] (UI)** Sortable table: qty, revenue, % sales, recipe map, GP%, COGS
- [ ] **[Blocker] (UI)** Map modal: search recipes, create new, skip unmapped rows
- [ ] **[Blocker] (Live)** GP% uses current recipe cost; mapping via `menu_item_square_catalog_links`
- [ ] **[Blocker] (UI)** Sales Mix CSV export

## Transaction list

- [ ] **[Blocker] (UI)** Search + channel/payment filters scoped to list only (KPIs/chart unchanged)
- [ ] **[Blocker] (UI)** Virtualised rows; line-item expand; "N of M" filtered counter
- [ ] **[Blocker] (UI)** Refresh + last-sync; 1-min cooldown toast; amber stale >5m
- [ ] **[Blocker] (Live)** Square orders synced via webhook + poll + manual refresh

## Agent & alerts

- [ ] **[Blocker] (UI)** Proactive insight cards above KPIs when alerts exist
- [ ] **[Blocker] (UI)** Dismiss alert; dig deeper opens Agent side panel

## Empty & error states

- [ ] **[Blocker] (UI)** Connecting, no sales, cold-start, filter-empty, Square disconnected banners
- [ ] **[Blocker] (UI)** Skeleton loading for KPI strip, chart, channel, mix, table

## Permissions

- [ ] **[Blocker] (UI)** Venue Manager: single venue only; Staff: 403 / hidden nav

## Integrations

- [ ] **[Blocker] (Live)** Reads `daily_sales`, `forecasts`, `venue_forecast_state` from Forecast Engine
- [ ] **[Blocker] (Live)** Square OAuth + sync; Connect POS CTA when disconnected
- [ ] **[Post-launch] (Live)** `insights_alerts` writer on ±15% forecast anomaly
