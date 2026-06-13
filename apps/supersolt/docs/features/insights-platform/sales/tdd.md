# Sales Insights — TDD

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives test-first implementation. **Notion:** [Sales](https://www.notion.so/34f64094bde680ba91abdd753390422e).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior | File | Status |
|---|-------|----------|------|--------|
| 1 | unit | `computePeriodKpis(orders)` — five Notion metrics, ignores list filters | `entities/sales-insights/lib/sales-kpi.test.ts` | red |
| 2 | unit | KPI forecast deltas null when `forecastReady` false | `sales-kpi.test.ts` | red |
| 3 | unit | `buildChannelSplit(dailySales, forecasts)` — dine/pickup/delivery totals + prorated deltas | `entities/sales-insights/lib/sales-channel-split.test.ts` | red |
| 4 | unit | `enrichSalesMixRows(rows, recipes)` — % sales, GP%, COGS when mapped | `entities/sales-insights/lib/sales-mix.test.ts` | red |
| 5 | unit | `getPresetDateRange('last-month')` — calendar previous month bounds | `entities/sales-insights/lib/sales-date-presets.test.ts` | red |
| 6 | unit | Chart week aggregation when range ≥ 30 days | `entities/sales-insights/lib/sales-forecast-ui.test.ts` | red |
| 7 | integration | GET sales-orders returns `channelSplit` + enriched `salesMix` | `server/sales/sales-insights.int.test.ts` | red |
| 8 | integration | GET insights/alerts scoped by venue; Staff denied | `app/api/.../insights/alerts.int.test.ts` | red |
| 9 | integration | PATCH dismiss sets `dismissed_at` | `insights/alerts.int.test.ts` | red |
| 10 | integration | POST menu-catalog-links creates link for Map flow | existing / extend | red |
| 11 | integration | Refresh enforces 1 min cooldown | `square/sync.int.test.ts` | red |
| 12 | component | KPI strip renders exactly 5 Notion tiles (no Tax) | `sales-kpi-strip.test.tsx` | red |
| 13 | component | Transaction filters do not change KPI values | `sales-insights-page.test.tsx` | red |
| 14 | component | Map modal save → row shows GP% and recipe name | `sales-map-recipe-dialog.test.tsx` | red |
| 15 | component | Agent card dismiss + dig deeper calls provider | `sales-agent-insight-cards.test.tsx` | red |
| 16 | component | Virtualised list renders >50 rows without mounting all DOM nodes | `sales-transactions-table.test.tsx` | red |
| 17 | e2e | Owner yesterday: KPIs + chart + mix + channel (Notion #1) | `e2e/insights-sales.spec.ts` | red |
| 18 | e2e | Filter list only — KPIs unchanged (Notion #4) | `e2e/insights-sales.spec.ts` | red |
| 19 | regression | No hourly chart, invoices block, or Tax tile in DOM | `e2e/insights-sales.spec.ts` | red |

## 2. Fixtures

Extend `apps/supersolt/test/fixtures/insights-platform.ts` (or create):

- 7 days `daily_sales` with channel columns populated
- Matching `forecasts` rows with `inputs` JSON for tooltip assertions
- Orders with dine-in / pick-up / delivery `channel`
- Sales mix rows: mapped (with recipe cost) and unmapped
- `insights_alerts` row: `module='sales'`, not dismissed

## 3. Integration setup

```ts
// Seed venue with forecast_ready true, 42+ days history for High confidence case
// Seed second venue with forecast_ready false for cold-start case
```

Run against local Supabase (`apps/supersolt`); apply `insights_alerts` migration before tests #8–9.

## 4. E2E scenarios

| Notion flow | Test # |
|-------------|--------|
| #1 Morning check-in | 17 |
| #2 Forecast miss tooltip + dig deeper | 17 + manual Agent panel |
| #3 Map recipe | 14, 17 |
| #4 Transaction filters scoped | 18 |
| #5 Custom range | 17 (variant) |
| #6 Cold-start | 2, 17 (cold venue fixture) |
| #9 Refresh cooldown | 11 |
| #10 CSV export | 17 (download assertions) |
| #11 Proactive card | 15, 17 |

## 5. Manual smoke (post-refactor)

- [ ] Page matches Notion section order
- [ ] Last Month preset selects prior calendar month
- [ ] Sales Mix Export CSV separate from header export
- [ ] Stale sync timestamp amber when >5 min
- [ ] Staff receives 403 on direct URL

## 6. Regression guards

- Existing Square connect banner for `dataSource: 'demo'`
- `periodStats` derived from full `orders`, not `filteredOrders` (test #13)
- Remove `useSquareInvoicesQuery` from Sales page imports (test #19)
