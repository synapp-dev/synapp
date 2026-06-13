# Labour Insights — TDD

## 1. Test list

| # | Layer | Behavior | File |
|---|-------|----------|------|
| 1 | unit | `wagePercent(wage, revenue)` edge cases | `labour-metrics.test.ts` |
| 2 | unit | Headline template picks top driver | `headline.test.ts` |
| 3 | unit | Demo mode when no pay_runs | `demo-mode.test.ts` |
| 4 | integration | Aggregates RLS | `labour-aggregates.int.test.ts` |
| 5 | integration | Summary API returns tab-shaped payload | `labour-api.int.test.ts` |
| 6 | component | Six tabs render; Demo badge on Productivity | `labour-page.test.tsx` |
| 7 | component | Alert card links to Timesheets route | `labour-alerts.test.tsx` |
| 8 | e2e | Demo banner for new org | `e2e/insights-labour.spec.ts` |

## 2. Fixtures

Org with pay_run + timesheets vs org empty (Demo).

## 3. Acceptance

All Notion flows in [`flows.md`](flows.md) §1–12 have test or manual note when Workforce blocked.
