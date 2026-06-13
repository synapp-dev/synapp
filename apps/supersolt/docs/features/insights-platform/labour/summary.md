# Labour Insights — Launch summary

> Workforce intelligence: wage spend, scheduled vs actual hours, compliance risks, and productivity ratios — read-only, alert-driven. [Labour (Notion)](https://www.notion.so/34f64094bde68049a7b8e8c87db97f1f)

**Legend:** `[Blocker]` = launch gate · `[Post-launch]` = can follow · `(UI)` = demo/seeded OK · `(Live)` = real data required

## Six tabs (Notion order)

- [ ] **[Blocker] (UI)** Overview · Wage Cost · Hours & Schedule · Team Composition · Productivity · Compliance
- [ ] **[Blocker] (UI)** Global period + venue filter; comparison toggle vs prior period
- [ ] **[Blocker] (UI)** Demo / Seeded badge on tabs until upstream data exists
- [ ] **[Blocker] (UI)** Full-page Demo banner when no payroll connected

## Overview tab

- [ ] **[Blocker] (UI)** KPI tiles with target/delta; plain-English headline summary
- [ ] **[Blocker] (UI)** Top alert cards (wage %, schedule variance, no-shows, certs)
- [ ] **[Blocker] (Live)** Tiles wired to `labour_insights_aggregates` when payroll live
- [ ] **[Blocker] (UI)** Tap tile drills to relevant tab with context preserved

## Wage Cost tab

- [ ] **[Blocker] (UI)** Daily wage vs revenue charts; per-day / position / employee tables
- [ ] **[Blocker] (Live)** Data from pay runs + timesheets + Sales revenue
- [ ] **[Post-launch] (Live)** Forecast overlay on wage cost when engine + roster ready

## Hours & Schedule tab

- [ ] **[Blocker] (UI)** Scheduled vs actual hours; attendance patterns; unfilled shifts
- [ ] **[Blocker] (Live)** Reads Roster + Timesheets
- [ ] **[Post-launch] (UI)** Capacity gap overlay (Demo until Forecast + Roster live)

## Team Composition tab

- [ ] **[Blocker] (UI)** Headcount mix, tenure, turnover views
- [ ] **[Blocker] (Live)** Starters/leavers from People module

## Productivity tab

- [ ] **[Blocker] (UI)** Revenue per labour hour; wage % trends
- [ ] **[Post-launch] (Live)** Covers metric (Demo until Sales covers data)

## Compliance tab

- [ ] **[Blocker] (UI)** Cert expiry, missing payroll fields, award/visa/casual flags
- [ ] **[Blocker] (Live)** Cert data from People; drill link to People records
- [ ] **[Post-launch] (UI)** Phase 2 compliance preview section (Demo at launch)

## Alerts & Agent

- [ ] **[Blocker] (UI)** Alert-then-action cards; nightly + payroll-close batch
- [ ] **[Blocker] (UI)** Agent dig deeper from alert; morning brief deep-link with query params

## Exports

- [ ] **[Blocker] (UI)** CSV export per tab for accountant handoff

## Permissions

- [ ] **[Blocker] (UI)** Owner / Area Manager full scope; Venue Manager venue-only; Staff denied

## Integrations

- [ ] **[Blocker] (Live)** Nightly `labour_insights_aggregates` job
- [ ] **[Blocker] (Live)** Reads: Timesheets, Roster, Payroll, People, Sales revenue, Forecast Engine
- [ ] **[Post-launch] (Live)** Shared `insights_alerts` module=`labour`
