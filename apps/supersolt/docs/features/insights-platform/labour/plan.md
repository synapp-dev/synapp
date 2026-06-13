# Labour Insights

> **Product:** `apps/supersolt`
> **Slug:** `insights-platform/labour`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/insights/labour`
> **Status:** Planned
> **Created:** 2026-05-21
> **Updated:** 2026-05-22

## 1. Summary

Insights → Labour turns workforce data into operational intelligence: wage spend, scheduled vs actual hours, attendance, headcount mix, productivity ratios, compliance risks — tiles, charts, and alert-then-action cards without drilling into raw Timesheet/Payroll/People records.

Pairs with Insights → Inventory (COGS vs wage cost). Reads Workforce sub-modules, Sales Insights revenue, and Forecast Engine; **writes nothing** (pure read).

**MVP launch:** Overview + Wage Cost + Hours tabs with real data after payroll; Team Composition, Productivity, parts of Compliance behind **Demo / Seeded** until Roster and Phase 2 compliance bundle land. High leverage after Roster exists.

**Personas:** Owner / Area Manager (weekly review); Venue Manager (daily variance); Staff — no access.

**Notion:** [Labour (Module Overview)](https://www.notion.so/34f64094bde68049a7b8e8c87db97f1f)

**Current code:** `labour-insights-page-client.tsx` mock — replace with six-tab Notion model.

## 2. Scope

### In scope

- Six tabs: Overview, Wage Cost, Hours & Schedule, Team Composition, Productivity, Compliance
- Multi-venue + period selector; KPI tiles with target/delta; drill-down to Workforce records
- Alert-then-action cards; deterministic headline summaries; CSV export; Demo badges until sources live
- Forecast overlays (wage cost, capacity gap) when engine + roster ready
- Permissions: Owner/Area Manager full scope; Venue Manager venue-only; Staff denied

| Tab / section | Data at launch |
|---------------|----------------|
| Overview, Wage Cost, Hours, Compliance (most) | Live after payroll + timesheets |
| Team Composition starters/leavers | Live from People |
| Productivity (covers) | Demo until Sales covers |
| Capacity gap | Demo until Forecast + Roster |
| Compliance §7 Phase 2 preview | Demo preview |

No payroll yet → full page Demo banner (Notion flow #10).

### Out of scope (Phase 2)

- Per-employee scorecards, cohort benchmarks, real-time wage ticker, auto-rebalance, AI narrative reports, theft signals, multi-org rollups

### Non-goals

- Operational writes from Insights Labour

## Notion specification

### User flows

Weekly Owner review; wage % spike investigation (venue → position → employee); scheduled vs actual; compliance cert follow-up; productivity check; custom range comparison; CSV for accountant; Demo → live transition; Agent insight deep-link; forecast capacity gap → Roster.

### Intended functionality

**Six tabs** with global period + venue filter. **Overview:** KPI tiles, plain-English headline, top alert cards. **Wage Cost:** daily wage vs revenue charts, per-day/position/employee tables, forecast overlay. **Hours & Schedule:** scheduled vs actual, attendance patterns, unfilled shifts, coverage forecast. **Team Composition:** headcount mix, tenure, turnover. **Productivity:** revenue per labour hour, wage % trends. **Compliance:** cert expiry, missing payroll fields, LSL, award flags, visa, casual conversion, Phase 2 preview section.

**Headlines:** deterministic templates; optional Agent "tell me more". **Alerts:** wage % over target, schedule variance, no-shows, overtime, certs, missing payroll data — nightly + payroll-close batch, shared with Agent/Dashboard.

### Data + integrations

Reads: Timesheets, Roster, Payroll Export, People, Leave, Availability, Sales revenue, Forecast Engine, `insights_alerts`. Writes: none. Nightly `labour_insights_aggregates` + on-demand short windows.

### Other modules this touches

Workforce (all sub-modules), Sales Insights, Forecast Engine, Inventory Insights (sister UX), Agent, Dashboard, Notifications, Settings → Organisation, P&L Phase 2.

## Open questions

- Per-employee productivity (lean: position-level MVP)
- Cohort benchmarks (Phase 2)
- Real-time wage ticker (Phase 2)
- Theft/fraud signals (Phase 2 P2.13)
- Day-part productivity (Phase 2 hourly)
- Multi-org rollups out of MVP
- Penalty rate breakdown in Wage Cost if straightforward
- Compliance preview at MVP (lean: yes)
- Wage target: org-wide + per-venue override
- Default period: last week Owner, this week Venue Manager
- Refresh: nightly aggregates + on-demand real-time

## Decision log

- *16 May 2026* — Six tabs; pure read; KPI + alerts + drill-down; deterministic headlines; Demo badges until live.
- *16 May 2026* — MVP: Overview/Wage/Hours/Compliance live after payroll; Productivity/capacity gap Demo until prerequisites.
- *16 May 2026* — Position-level productivity MVP; cohort Phase 2; Forecast Engine daily overlays.
- *16 May 2026* — Compliance §7 previews P2.6; CSV export; alert batch shared with Agent.

## 3. Architecture placement

| Decision | Choice | Section |
|----------|--------|---------|
| Domain | `entities/labour-insights/` (new) | §7.1 |
| Server | `server/labour-insights/` aggregations | §7.1 |
| Reads | `pay_runs`, `pay_run_line_items`, `timesheet_entries`, `employees`, `certifications`, `daily_sales`, `forecasts`, `insights_alerts` | §8.1 |

## 4. Data model

### `labour_insights_aggregates` (nightly)

```sql
CREATE TABLE public.labour_insights_aggregates (
  venue_id uuid NOT NULL,
  date date NOT NULL,
  wage_cost_cents bigint NOT NULL DEFAULT 0,
  revenue_cents bigint NOT NULL DEFAULT 0,
  wage_percent numeric,
  scheduled_hours numeric,
  actual_hours numeric,
  headcount integer,
  PRIMARY KEY (venue_id, date)
);
```

### RLS

Venue-scoped select for authenticated members (mirror sales patterns).

### Headline summary

Deterministic templates in `server/labour-insights/headline.ts` — no LLM in MVP.

## 5. API surface

| Operation | Path |
|-----------|------|
| Tab bundle | `GET .../insights/labour/summary?tab&from&to` |
| Export | `GET .../insights/labour/export?tab&format=csv` |
| Alerts | `GET .../insights-alerts?module=labour` |

## 6. UI

Replace mock report switcher with shadcn `Tabs` matching Notion order. Default period: **last week** (Owner), **this week** (Venue Manager) — detect role from access context.

## 7. Implementation order

1. Scaffold six tabs + Demo mode detector.
2. Migration `labour_insights_aggregates` + nightly job stub.
3. Wire Wage Cost + Overview when payroll schema lands.
4. Compliance cert expiry from People.
5. Forecast overlay hooks.
6. Alert card integration.

## 8. Telemetry

`insights.labour.viewed`, `.tab_changed`, `.export`, `.alert_action`

## 9. Cross-references

- [Labour Notion](https://www.notion.so/34f64094bde68049a7b8e8c87db97f1f)
- [`tdd.md`](tdd.md), [`flows.md`](flows.md)
- Revenue: [`../sales/plan.md`](../sales/plan.md)

## Compliance audit (program 2026-06-01)

Triad aligned to Notion; Demo tabs until roster/payroll prerequisites. **Done.**

**Updated:** 2026-06-01
