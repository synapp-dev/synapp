# Stock Counts — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Aligned to [Notion Stock Counts](https://www.notion.so/34f64094bde6801197f2e8f96cc790a1).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `convertMixedUnitsToBase` — cartons + bottles + partial mL → base qty | `server/stock-counts/mixed-unit-convert.test.ts` | red |
| 2 | unit | `convertMixedUnitsToBase` rejects negative partials | same | red |
| 3 | unit | `convertMixedUnitsToBase` single-unit mode passthrough | same | red |
| 4 | unit | `computeExpectedQty` — prev + receipts − consumption | `server/stock-counts/variance-compute.test.ts` | red |
| 5 | unit | `computeExpectedQty` baseline count → null expected | same | red |
| 6 | unit | `computeVariance` signed qty + cents from ingredient cost | same | red |
| 7 | unit | `computeVariance` non-tracked ingredient → skip variance | same | red |
| 8 | unit | `sumConsumptionInWindow` aggregates daily rows | `server/stock-counts/consumption-daily.test.ts` | red |
| 9 | unit | `sumReceiptsSince` PO receiving + invoice lines | `server/stock-counts/variance-compute.test.ts` | red |
| 10 | unit | `canCreateStockCount` — manager+ true; crew false | `server/stock-counts/stock-counts-policy.test.ts` | red |
| 11 | unit | `canRunStockCount` — assignee true; other crew false | same | red |
| 12 | unit | `canApproveStockCount` — owner/admin/manager true | same | red |
| 13 | unit | `canApproveLargeVariance` — owner only when threshold exceeded | same | red |
| 14 | unit | `assertValidStatusTransition` — in_progress → pending_approval ok | same | red |
| 15 | unit | `assertValidStatusTransition` — approved → edit without reopen throws | same | red |
| 16 | unit | `buildAllowedActions` matches role + status | same | red |
| 17 | unit | `StockCountsServiceError` codes stable | `server/stock-counts/stock-counts-errors.test.ts` | red |
| 18 | integration | Create count → in_progress with entries scoped to venue ingredients | `server/stock-counts/stock-counts.int.test.ts` | red |
| 19 | integration | PATCH entry updates row; multi-counter same count different locations | same | red |
| 20 | integration | Submit computes variance; baseline skips expected | same | red |
| 21 | integration | Submit incomplete without bulk-zero → `stock_counts.incomplete_submit` | same | red |
| 22 | integration | set-remaining-zero sets uncounted to zero with confirmation audit | same | red |
| 23 | integration | Approve updates `ingredients.current_stock_level` | same | red |
| 24 | integration | Approve triggers order guide cache invalidation meta | same | red |
| 25 | integration | Large variance → manager approve 403; owner approve 200 | same | red |
| 26 | integration | Request recount → partial entries → re-submit → approve | same | red |
| 27 | integration | Reopen approved count with audit event | same | red |
| 28 | integration | Cycle count scope — only scoped ingredients update stock | same | red |
| 29 | integration | RLS: venue A member cannot read venue B count | `server/stock-counts/stock-counts-rls.int.test.ts` | red |
| 30 | integration | RLS: crew cannot approve | same | red |
| 31 | integration | Consumption cron upserts `ingredient_consumption_daily` from Square mirror | `server/stock-counts/consumption-daily.int.test.ts` | red |
| 32 | integration | Submit refreshes consumption window for count period | same | red |
| 33 | integration | Schedule creates scheduled count on cron tick | `server/stock-counts/stock-count-reminders.int.test.ts` | red |
| 34 | integration | 14-day no-count reminder fires once | same | red |
| 35 | integration | Photo upload stores path; entry photo_urls updated | `server/stock-counts/stock-counts.int.test.ts` | red |
| 36 | integration | Negative quantity PATCH → 400 `stock_counts.negative_quantity` | same | red |
| 37 | integration | Locked approved count PATCH entry → 409 `stock_counts.locked` | same | red |
| 38 | unit (hook) | `useCountEntryMutation` optimistic → saved → retry on fail | `entities/stock-counts/hooks/use-count-entry-mutation.test.tsx` | red |
| 39 | component | Count flow renders progress X of Y | `entities/stock-counts/components/stock-count-flow-page.test.tsx` | red |
| 40 | component | Mixed-unit entry shows computed total | `entities/stock-counts/components/mixed-unit-entry.test.tsx` | red |
| 41 | component | Incomplete submit shows validation; blocks when offline pending | `entities/stock-counts/components/stock-count-flow-page.test.tsx` | red |
| 42 | component | Variance summary flags top $ and % variances | `entities/stock-counts/components/variance-summary-panel.test.tsx` | red |
| 43 | component | List empty state CTA → create count | `entities/stock-counts/components/stock-counts-list-page.test.tsx` | red |
| 44 | manual | E2E happy path — see [`flows.md`](flows.md) §5 | launch checklist | red |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### `mixed-unit-convert.ts`

- **Cases:** milk example (2 cartons × 12 × 1L + 3 bottles + 0.5L partial); missing pack info fallback; zero cartons.
- **Runner:** vitest (app root config)
- **Fixtures:** `test/fixtures/stock-counts.ts` supplier product with `units_per_pack`, `pack_unit`

### `variance-compute.ts`

- **Golden fixtures:** JSON files under `server/stock-counts/__fixtures__/variance/` with prev count, receipts[], consumption[], expected output
- **Edge:** first count (`is_baseline`); ingredient with no sales mapping (consumption 0)

### `stock-counts-policy.ts`

- **Role matrix:** owner, admin, manager, crew × actions create/run/approve/large-variance
- **Assignee:** run allowed when `assignee_user_id === ctx.userId` even for crew

## 3. Integration tests (DB + RLS)

Run against local Supabase (`supabase start` in `apps/supersolt`) or CI service.

### Setup

```ts
// apps/supersolt/test/fixtures/stock-counts.ts
export async function seedStockCountFixtures(tx: RlsTx) {
  // Fixed UUIDs: org, venue, ingredients (milk, flour), manager user, crew assignee
  // PO with receiving event between counts
  // Square order lines mapped to menu item → recipe → milk consumption
}
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Manager creates count | manager JWT | 201 + status in_progress or scheduled |
| Crew creates count | crew JWT | 403 `stock_counts.forbidden` |
| Assignee saves entry | crew assignee JWT | 200 |
| Non-assignee crew saves | crew JWT | 403 |
| Approve updates stock | manager JWT | ingredient.current_stock_level = counted |
| Cross-venue read | manager venue B JWT | empty / 404 |

## 4. End-to-end (manual smoke)

No Playwright in `apps/supersolt`. Manual script in [`flows.md`](flows.md) §5.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/stock-counts.ts`
- **Reset:** truncate stock count tables + consumption daily in test transaction
- **Determinism:** fixed UUIDs `11111111-…` for count, ingredient, venue
- **Auth:** existing test JWT helpers in `server/db/jwt-claims.test.ts` pattern

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on `server/stock-counts/*` | ≥80% | CI changed paths |
| Integration cases §3 | 100% present | Review before merge |
| Manual E2E §5 | verified once | Required for route merge |
| `pnpm lint:architecture` | clean | repo root |

## 7. What NOT to test here

- `@workspace/ui` primitive rendering
- Supabase Storage internals (mock upload in integration)
- Full Square sync pipeline (seed mirror rows directly)

## 8. Refactor checklist (after green)

- [ ] Validation in one Zod schema shared by routes + service
- [ ] No duplicate variance math in UI
- [ ] Order Guide reads shared `resolveCurrentStockLevel(venueId, ingredientId)` helper
- [ ] Legacy demo component deleted
- [ ] No `@workspace/ui` → Supabase imports
