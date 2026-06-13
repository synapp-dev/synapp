# Forecast Engine — TDD

> [`plan.md`](plan.md) | [`flows.md`](flows.md)

## 1. Test list

| # | Layer | Behavior | File | Status |
|---|-------|----------|------|--------|
| 1 | unit | Baseline = avg of last 8 same weekdays | `compute-baseline.test.ts` | red |
| 2 | unit | Public holiday swaps baseline source | `compute-baseline.test.ts` | red |
| 3 | unit | Multipliers compose to expected revenue | `compute-forecast-day.test.ts` | red |
| 4 | unit | Cold-start: 13 days → no forecast rows | `confidence.test.ts` | red |
| 5 | unit | 42 days history → High confidence | `confidence.test.ts` | red |
| 6 | unit | `data_starts_from` excludes earlier days from baseline | `benchmark-scope.test.ts` | red |
| 7 | integration | `daily_sales` upsert idempotent on re-sync | `daily-sales.int.test.ts` | red |
| 8 | integration | RLS: user A cannot read venue B forecasts | `forecasts-rls.int.test.ts` | red |
| 9 | integration | Backfill resumes from last cursor | `backfill.int.test.ts` | red |
| 10 | integration | Anomaly ±15% creates `insights_alerts` row | `anomaly.int.test.ts` | red |
| 11 | integration | `one_off` resolution excludes day from baseline | `anomaly-resolution.int.test.ts` | red |
| 12 | unit | Edge function handler calls compute for due venues | `forecast-daily.handler.test.ts` | red |

## 2. Fixtures

`test/fixtures/forecast-engine.ts`:

- Venue Hawthorn with 90 days `daily_sales` (deterministic cents).
- Venue ColdStart with 10 days only.
- Holiday row ANZAC Day VIC.
- Weather cache rainy Tuesday.

## 3. Integration cases

| Case | Expected |
|------|----------|
| Service role writes forecasts | success |
| Authenticated member reads own venue | rows returned |
| Staff without venue grant | empty |
| Manual recompute within 1hr | 429 |

## 4. E2E

Manual smoke (no UI): script or API test triggers backfill on sandbox Square merchant → `forecast_ready` flips true.

## 5. Coverage

- ≥80% branch coverage on `server/forecast/*.ts` (excluding edge deploy boilerplate).
