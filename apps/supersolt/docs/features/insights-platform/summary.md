# Insights platform — Launch summary

> Shared analytics shell for Sales, Labour, Inventory, and P&L — tabs, period persistence, alerts, and permissions. [Insights (Notion)](https://www.notion.so/34f64094bde68000a3f2e21b4bf9480b)

**Legend:** `[Blocker]` = launch gate · `[Post-launch]` = can follow · `(UI)` = demo/seeded OK · `(Live)` = real data required

## Shell & navigation

- [ ] **[Blocker] (UI)** Shared `insights/layout.tsx` renders four tabs: Sales · Labour · Inventory · P&L
- [ ] **[Blocker] (UI)** Period selector persists across tab switches via URL (`preset`, `from`, `to`)
- [ ] **[Blocker] (UI)** No duplicate org/venue selector on child pages — shell is scope source of truth
- [ ] **[Blocker] (UI)** Default landing route is `/insights/sales` (no separate Insights index page)
- [ ] **[Blocker] (UI)** Demo / Seeded badge on tabs when upstream data is unavailable
- [ ] **[Post-launch] (UI)** Mobile: scrollable tab nav; KPI strips stack per Notion

## Permissions

- [ ] **[Blocker] (UI)** Staff cannot access any `/insights/*` route (403 or hidden nav)
- [ ] **[Blocker] (UI)** Owner / Area Manager / Venue Manager access per child module specs

## Alerts (cross-module)

- [ ] **[Blocker] (UI)** `insights_alerts` table + RLS migrated
- [ ] **[Blocker] (UI)** GET list + PATCH dismiss APIs for alerts
- [ ] **[Blocker] (Live)** Nightly alert writers for Sales, Labour, Inventory modules
- [ ] **[Blocker] (UI)** Proactive alert cards render on child pages; dig deeper opens Agent
- [ ] **[Post-launch] (Live)** Dashboard consumes same `insights_alerts` feed

## Forecast gating

- [ ] **[Blocker] (UI)** Cold-start banner when `forecast_ready` is false (actuals only)
- [ ] **[Blocker] (Live)** `FORECAST_ENGINE_ENABLED` + per-venue `forecast_ready` gate forecast deltas
- [ ] **[Post-launch] (Live)** Forecast confidence badges (Low / Medium / High) on consumer tiles

## Integrations

- [ ] **[Blocker] (Live)** Forecast Engine read APIs available to all Insights children
- [ ] **[Post-launch] (Live)** Agent + Dashboard drill-down from Insights alerts

## Exports & telemetry

- [ ] **[Post-launch] (UI)** CSV export events documented per child module
- [ ] **[Post-launch] (UI)** Platform telemetry: `insights.viewed`, `tab_changed`, `period_changed`
