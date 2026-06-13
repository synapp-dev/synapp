# Square sales mirror — TDD

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives test-first implementation.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `mapPaymentRowToSalesOrderRow(dbRow, lines)` — matches existing Square mapper shape | `server/sales/square-mirror-map.test.ts` | red |
| 2 | unit | `recomputeDailySalesForDates(venueId, dates)` aggregates from full payment mirror, not batch-only | `server/square/daily-sales-recompute.test.ts` | red |
| 3 | unit | `syncWindowForVenue(timezone)` — rolling 3 venue-local days bounds | `server/square/square-sync-window.test.ts` | red |
| 4 | unit | Idempotent upsert: same payment twice → one row, updated amounts | `server/square/square-sync.service.test.ts` | red |
| 5 | unit | Refund update: payment net_amount changes on re-sync → daily_sales recomputed | `server/square/square-sync.service.test.ts` | red |
| 6 | integration | Upsert payment + lines → GET sales-orders returns rows without Square HTTP | `server/sales/sales-insights.int.test.ts` | red |
| 7 | integration | Overlapping sync batches → daily_sales not double-counted | `server/square/square-sync.int.test.ts` | red |
| 8 | integration | RLS: venue member reads payments; non-member empty | `server/square/square-sync.int.test.ts` | red |
| 9 | integration | POST square/sync enforces 1-min cooldown (429) | `app/api/.../square/sync.int.test.ts` | red |
| 10 | integration | Cron route rejects missing CRON_SECRET in production | `app/api/cron/square-sales-sync.int.test.ts` | red |
| 11 | integration | Backfill 90 days sets `backfill_status: complete` + `last_payments_sync_at` | `server/square/square-sync.int.test.ts` | red |
| 12 | integration | Dashboard snapshot reads mirror in <500ms with seeded 2-week data | `server/dashboard/dashboard-sales-snapshot.int.test.ts` | red |
| 13 | unit | `getSalesInsightsOrders` does not import `listSquarePaymentsForVenue` on read path | `server/sales/sales-insights.service.test.ts` | red |
| 14 | component | Sales page shows syncing banner when `backfillStatus: running` | `entities/sales-insights/components/sales-insights-page.test.tsx` | red |
| 15 | component | Stale sync amber when `lastSyncedAt` >5 min | `sales-insights-page.test.tsx` | red |
| 16 | e2e | Dashboard loads live sales tile without Square latency (mock mirror seeded) | `e2e/dashboard-sales.spec.ts` | red |
| 17 | e2e | Sales yesterday preset loads transactions from mirror | `e2e/insights-sales.spec.ts` | red |

After each item turns green, refactor only the code touched by that item.

## 2. Unit tests

### Mirror mapping

- **Subject:** `mapPaymentRowToSalesOrderRow` in `server/sales/square-mirror-map.ts`
- **Cases:**
  - Payment with lines → `SalesOrderRow` with `saleLineItems`
  - Void payment → `is_void: true`, `net_amount: 0`
  - Refund payment → negative net, `is_refund: true`
  - Demo path unchanged when no Square connection

### Daily sales recompute

- **Subject:** `recomputeDailySalesForDates` in `server/square/daily-sales-recompute.ts`
- **Cases:**
  - Two payments same venue day → correct `ordersCount`, channel columns
  - Sync batch A then batch B overlapping same day → final aggregate equals union of payments (not sum of batches)
  - Empty day after void → zeros or row deleted per existing forecast convention

### Sync window

- **Subject:** `rollingSyncIsoRange(timezone, lookbackDays=3)`
- **Cases:**
  - DST boundary venue (Australia/Melbourne)
  - Midnight UTC vs venue-local day alignment

## 3. Integration tests (DB + RLS)

Run against local Supabase (`apps/supersolt`).

### Setup

```ts
// apps/supersolt/test/fixtures/square-sales-mirror.ts
export const FIXTURE_VENUE_ID = "11111111-1111-4111-8111-111111111111";
export const FIXTURE_PAYMENT_ID = "sqpay_test_001";
// Seed venue_square_connections, venue_square_payments, venue_square_order_lines
// Mock Square HTTP at sync boundary only — reads must not call Square
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Member reads own venue payments | `authenticated` (member) | rows in date range |
| Non-member reads | `authenticated` (other org) | empty (RLS) |
| Anon reads | `anon` | denied |
| Admin upsert via sync service | `service_role` / admin | success |
| Duplicate payment upsert | admin | one row, updated `net_amount_cents` |
| Recompute after refund status change | admin | `daily_sales.revenue_cents` matches mirror |

### Square HTTP mocking

- Use `vi.mock` / MSW only in **sync service tests** (#4–5, #7, #11)
- Assert **read-path tests (#6, #12, #13) make zero Square HTTP calls**

## 4. End-to-end

- **Tool:** Playwright if available (`apps/supersolt/playwright.config.ts`)
- **Prerequisite:** Seed mirror via test API or direct DB seed before navigation

| Scenario | Test # |
|----------|--------|
| Dashboard week tile renders from mirror | 16 |
| Sales transactions list populates | 17 |
| Manual refresh updates `lastSyncedAt` | 17 + #9 |

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/square-sales-mirror.ts`
- Extend `test/fixtures/insights-platform.ts` with mirrored payments for 7+ days
- **Determinism:** fixed UUIDs, `order_datetime` in venue timezone
- **Auth:** existing `@workspace/supabase` test user helpers

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit on new sync/mirror files | ≥80% branch | Changed paths only |
| Integration cases §3 | 100% present | Required before merge |
| Read path has no Square import | test #13 green | Regression guard |
| Architecture lint | clean | `pnpm lint:architecture` |

## 7. What NOT to test here

- Square API pagination internals (trust `list-payments.ts` existing tests)
- Forecast model math ([`forecast-engine/tdd.md`](../forecast-engine/tdd.md))
- Full Sales Insights Notion UI refactor ([`sales/tdd.md`](../sales/tdd.md))

## 8. Refactor checklist (after green)

- [ ] Single sync pipeline used by cron, manual refresh, backfill, and connect hook
- [ ] Read and sync code paths separated (`sales-insights.service` vs `square-sync.service`)
- [ ] No duplicated mapping between `square-to-sales-row.ts` and mirror map — shared pure helpers
- [ ] No live Square calls from dashboard SSR
- [ ] No new app-to-app imports
