# Dashboard — Launch summary

> Operator daily home: 30-second business read — sales pulse, COGS, labour, stock anomalies, Agent digest — every tile drill-down-first. [Dashboard (Notion)](https://www.notion.so/34f64094bde6803c8ac5ca001f005d39)

**Legend:** `[Blocker]` = launch gate · `[Post-launch]` = can follow · `(UI)` = demo/seeded OK · `(Live)` = real data required

## Route & guard

- [ ] **[Blocker] (UI)** Landing at `/dashboard` (future: `/{org}/{venue}/dashboard`)
- [ ] **[Blocker] (UI)** Staff silent redirect to roster landing (not 403 page)
- [ ] **[Blocker] (UI)** Owner / Area Manager / Venue Manager see permission-appropriate grid
- [ ] **[Blocker] (UI)** Skeleton loading grid matching final layout

## Selectors

- [ ] **[Blocker] (UI)** Time window: today, yesterday, this week, last week, this month, last month, custom
- [ ] **[Blocker] (UI)** Venue selector for Owner / Area Manager (all · single · selected)
- [ ] **[Blocker] (Live)** Selectors persist per user (`dashboard_user_preferences`)
- [ ] **[Blocker] (UI)** Changing window re-renders all tiles; comparison deltas update

## Tile zones

- [ ] **[Blocker] (UI)** Agent morning digest tile (2–4 lines + insight cards)
- [ ] **[Blocker] (UI)** KPI strip: revenue and key operational metrics
- [ ] **[Blocker] (UI)** Financial KPIs for Owner / Area Manager (COGS %, labour %)
- [ ] **[Blocker] (UI)** Operations tiles: stock warnings, pending invoices, roster gaps, top items
- [ ] **[Blocker] (UI)** System tiles: notifications, integration health, license expiry
- [ ] **[Blocker] (UI)** Venue Manager: operational tiles only — no financial roll-ups
- [ ] **[Post-launch] (UI)** Industry variants: Cafe, QSR, Bar tile sets (generic fallback for others)

## Drill-down

- [ ] **[Blocker] (UI)** Every KPI tile navigates to source module with time window + venue preserved
- [ ] **[Blocker] (UI)** Revenue → Sales; COGS → Inventory; Labour → Labour Insights; stock → Stock Management; invoices → Purchasing; roster → Workforce; integrations → Settings

## Agent digest

- [ ] **[Blocker] (UI)** Daily refresh digest; dig deeper opens Agent side panel
- [ ] **[Blocker] (Live)** Digest cached per user per day (`agent_digest_cache`)
- [ ] **[Blocker] (UI)** Cold-start fallback copy + refresh CTA when digest missing

## Refresh & freshness

- [ ] **[Blocker] (UI)** Manual refresh control with spinner
- [ ] **[Blocker] (UI)** "Last updated Nm ago" when Square/Xero stale >5m
- [ ] **[Post-launch] (Live)** Auto-refresh every 5m on long-open browser

## Empty states

- [ ] **[Blocker] (UI)** Brand-new org: welcome tile + complete-setup cards + integration health
- [ ] **[Blocker] (UI)** Single-tile empty (e.g. no recipes) with contextual copy
- [ ] **[Blocker] (UI)** Filter-empty: "No data in this window" + reset

## Error handling

- [ ] **[Blocker] (UI)** Per-tile error + Retry; rest of grid unchanged
- [ ] **[Blocker] (UI)** Catastrophic failure: full-page retry
- [ ] **[Blocker] (UI)** Prefs PATCH failure: toast + revert selector

## Integrations

- [ ] **[Blocker] (Live)** Tile bundle API reads from Insights + upstream modules (fixtures OK until wired)
- [ ] **[Blocker] (Live)** Square sales data for revenue tile
- [ ] **[Post-launch] (Live)** COGS, labour, stock, invoices tiles wired to live module APIs
- [ ] **[Post-launch] (Live)** Superbot suggestions card per child spec

## Exports

- [ ] **[Post-launch] (UI)** Dashboard export / sharing (Phase 2 — out of MVP)
