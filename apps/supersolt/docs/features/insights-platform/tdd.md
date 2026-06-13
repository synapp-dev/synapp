# Insights platform — TDD plan (parent)

> Orchestrates test order across children. Per-route tests live in child `tdd.md`.

## 1. Platform test list (red → green → refactor)

| # | Layer | Behavior | File | Child |
|---|-------|----------|------|-------|
| 1 | integration | `daily_sales` + `forecasts` migrations apply; RLS denies cross-org | `forecast-engine/*.int.test.ts` | forecast-engine |
| 2 | unit | `computeForecastForDay` multiplicative model matches fixture | `server/forecast/compute.test.ts` | forecast-engine |
| 3 | integration | Square backfill idempotent batch resume | `server/forecast/backfill.int.test.ts` | forecast-engine |
| 4 | integration | `insights_alerts` insert + select scoped to venue | `server/insights/alerts.int.test.ts` | parent |
| 5 | component | `InsightsShell` renders tabs + syncs period to URL | `insights-shell.test.tsx` | parent |
| 6 | e2e | Owner: Sales → change period → Labour tab keeps period | `e2e/insights-platform.spec.ts` | parent |
| 7+ | — | Continue in child order: sales → labour → inventory | child tdd | — |

## 2. Integration setup

- **DB:** local Supabase in `apps/supersolt`; reset via existing test helpers.
- **Fixtures:** `test/fixtures/insights-platform.ts` — org, venue, Square connection, 42+ days `daily_sales`, sample `forecasts`.
- **Auth:** test users Owner, Venue Manager, Staff per existing patterns.

## 3. E2E smoke (platform)

```ts
test('insights shell preserves period across tabs', async ({ page }) => {
  await page.goto('/{org}/{venue}/insights/sales');
  await page.getByRole('combobox', { name: /period/i }).selectOption('last-week');
  await page.getByRole('link', { name: 'Labour' }).click();
  await expect(page).toHaveURL(/preset=last-week/);
});
```

## 4. Coverage gates

| Gate | Threshold |
|------|-----------|
| `pnpm lint:architecture` | clean |
| forecast-engine compute unit tests | ≥80% branches on new files |
| Each child §1 in its `tdd.md` | 100% listed before merge |

## 5. Child TDD entry points

- [`forecast-engine/tdd.md`](forecast-engine/tdd.md)
- [`sales/tdd.md`](sales/tdd.md)
- [`labour/tdd.md`](labour/tdd.md)
- [`inventory/tdd.md`](inventory/tdd.md)
- [`p-and-l/tdd.md`](p-and-l/tdd.md)

## 6. Refactor checklist

- [ ] No duplicate period state between shell and child pages.
- [ ] Forecast reads only from `forecasts` table (Sales does not compute forecasts).
- [ ] No `@workspace/ui` → Supabase imports.
