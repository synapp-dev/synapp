# P&L Insights (scaffold)

> **Product:** `apps/supersolt`
> **Slug:** `insights-platform/p-and-l`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/insights/p-and-l`
> **Status:** Planned — **blocked on Notion spec**
> **Created:** 2026-05-21
> **Updated:** 2026-05-22

## 1. Summary

[P&L (TBC) (Notion)](https://www.notion.so/34f64094bde680ef9fd5ebc4c05295c8) has **no Module Overview body yet** (blank page as of sync). This triad scaffolds the route and permission gate only; **do not invent P&L logic** until Notion is filled.

**Personas:** Owner / Area Manager (expected consumers once specced).

**Current code:** `p-and-l-insights-page-client.tsx` — static mock P&L rows; retain until spec exists.

## 2. Scope

### In scope (scaffold only)

- Route remains in Insights shell tab nav.
- Staff denied (consistent with other Insights).
- Page shows **"P&L insights — specification in progress"** + link to Notion.
- Optional mock UI behind `SHOW_PL_AND_L_PREVIEW=true` for demos.

### Out of scope

- Revenue/COGS/labour reconciliation, Xero actuals, forecast trajectory, period close — **blocked on Notion spec**.

## Notion specification

*Notion page is blank (TBC). When written, sync again for Purpose, tabs, user flows, and data sources. Expected reads (per roadmap): Sales revenue, Inventory food cost, Labour wage aggregates, Forecast Engine trajectory, Xero (future).*

## Open questions

- Entire P&L Module Overview — **TBC in Notion**.

## Decision log

- *22 May 2026* — Repo scaffold only until Notion P&L page has content.

## 3. Architecture placement

| Decision | Choice | Section |
|----------|--------|---------|
| Domain | `entities/p-and-l-insights/` when specced | §7.1 |
| Data | Will read Sales `daily_sales`, Inventory food cost, Labour wage aggregates, Xero (future) | — |

## 4. Placeholder dependencies (future)

When Notion P&L is written, expect reads from:

- [`../sales/plan.md`](../sales/plan.md) — revenue
- [`../inventory/plan.md`](../inventory/plan.md) — COGS
- [`../labour/plan.md`](../labour/plan.md) — labour
- [`../forecast-engine/plan.md`](../forecast-engine/plan.md) — trajectory

## 5. Implementation order (scaffold)

1. `feat(supersolt): insights shell includes P&L tab`
2. `feat(supersolt): p-and-l placeholder page with spec-pending copy`
3. Expand this triad when Notion page is filled → new implementation session

## 6. Cross-references

- [`tdd.md`](tdd.md), [`flows.md`](flows.md)
- Parent: [`../plan.md`](../plan.md)

## Compliance audit (program 2026-06-01)

Notion Module Overview body **blank** — scaffold only; no invented P&L logic. **Done.**

**Updated:** 2026-06-01
