# Award Rate Library — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives test-first implementation for Notion Award Rate Library MVP.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `getMinimumRate` MA000119 L2 adult casual @ 2025-07-01 | `server/workforce/award/award-calculation.test.ts` | red |
| 2 | unit | `computeShiftCost` MA000119 casual L2 Sunday → penalty > 0, rules include Sunday | `server/workforce/award/award-calculation.test.ts` | red |
| 3 | unit | `computeShiftCost` MA000119 weekday evening flat-dollar (+281/hr) applied | `server/workforce/award/award-calculation.test.ts` | red |
| 4 | unit | `computeShiftCost` MA000009 Saturday FT penalty path | `server/workforce/award/award-calculation.test.ts` | red |
| 5 | unit | Effective-date split: shift 2026-06-30 vs 2026-07-01 uses different rate versions after AWR seed | `server/workforce/award/award-calculation.test.ts` | red |
| 6 | unit | Unknown `award_code` → `AwardServiceError` `award_not_loaded` | `server/workforce/award/award-calculation.test.ts` | red |
| 7 | unit | Missing classification → `classification_not_found` | `server/workforce/award/award-calculation.test.ts` | red |
| 8 | unit | No rate for `as_of_date` → `rate_not_effective` | `server/workforce/award/award-calculation.test.ts` | red |
| 9 | unit | Penalty schedule gap → `penalty_schedule_gap` | `server/workforce/award/award-calculation.test.ts` | red |
| 10 | unit | `selectHighestPenalty` picks max applicable rule per hour | `server/workforce/award/award-calculation.test.ts` | red |
| 11 | unit | `awrUpliftService.preview` classifies auto_uplift / skip / manual_review | `server/workforce/award/awr-uplift.test.ts` | red |
| 12 | unit | `awrUpliftService.apply` transaction: only checked rows updated | `server/workforce/award/awr-uplift.test.ts` | red |
| 13 | integration | Global `award_rates` readable by org member via RLS | `server/workforce/award/award-rls.int.test.ts` | red |
| 14 | integration | Authenticated user cannot INSERT into `awards` | `server/workforce/award/award-rls.int.test.ts` | red |
| 15 | integration | Org admin updates `organisation_award_config` | `server/workforce/award/award-rls.int.test.ts` | red |
| 16 | integration | AWR apply writes `employee_pay_rate_history` + profile rate | `server/workforce/award/award-rls.int.test.ts` | red |
| 17 | contract | `roster-cost.service` delegates to award engine (no stub constants) | `server/workforce/roster-cost.test.ts` | red |
| 18 | contract | Payroll preflight uses `getMinimumRate` (no `AWARD_MINIMUM_RATE_CENTS`) | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 19 | unit (hook) | `useAwardRates` loading → data | `entities/workforce/award-rate-library/hooks/use-award-rates.test.tsx` | red |
| 20 | component | Rate card renders classifications + PR reference | `entities/workforce/award-rate-library/components/award-rate-card.test.tsx` | red |
| 21 | component | Empty state: award not loaded | `entities/workforce/award-rate-library/components/award-rates-page-client.test.tsx` | red |
| 22 | component | AWR sheet: checkbox selection + apply disabled when none checked | `entities/workforce/award-rate-library/components/awr-uplift-sheet.test.tsx` | red |
| 23 | e2e | Org admin views MA000119 card + runs AWR preview | `e2e/settings-award-rates.spec.ts` | red |

After each green, refactor only touched code before the next item.

## 2. Unit tests

### Calculation engine (`award-calculation.service.ts`)

- **Subject:** Order-of-operations pipeline (base → casual → highest penalty → evening flat-dollar)
- **Fixtures:**
  - `apps/supersolt/test/fixtures/award-rates-ma000119.json`
  - `apps/supersolt/test/fixtures/award-rates-ma000009.json`
- **Cases (from Notion):**
  - MA000119 casual L2 Sunday 9:00–14:00 Melbourne — penalty applied (Roster flow #3)
  - MA000119 Mon–Fri evening 6pm–midnight — +$2.81/hr loading
  - MA000009 Saturday FT — +25% uplift path
  - Pay period spanning 30 Jun / 1 Jul 2026 — correct rate per shift date
  - Break minutes reduce paid hours
  - Zero-length shift rejected
- **No mocks** inside pure math; load rule-pack from fixture in memory for unit tests

### AWR uplift (`awr-uplift.service.ts`)

- **Cases:**
  - Employee below new minimum → `auto_uplift`, checked by default
  - Employee above new minimum → `skip`
  - Missing classification → `manual_review`, unchecked
  - Apply with 3 checked of 5 → 3 history rows, 2 unchanged, `awr_uplift_events` counts correct
  - EBA org flag → preview skips award minimum enforcement (uses employee rate only)

### Policy / capabilities

- `canViewAwardRates` true for `grantsOrgAdmin`; false for venue manager without org admin

## 3. Integration tests (DB + RLS)

### Setup

```ts
// apps/supersolt/test/fixtures/award-library.ts
export const AWARD_LIBRARY_FIXTURE = {
  orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  ownerUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  staffUserId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  defaultAwardCode: "MA000119",
};
```

Run migration seed (MA000119 + MA000009) in test DB; truncate org-scoped rows between tests.

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| SELECT `award_rates` as org member | authenticated member | rows returned |
| INSERT into `awards` as member | authenticated | RLS deny |
| PUT org config as org admin | grantsOrgAdmin | success |
| PUT org config as venue manager | manager only | 403 |
| GET rate card API | org admin | 200 + PR reference |
| POST AWR apply | org admin | history rows + event log |
| GET rate card for MA000003 | org admin | empty / `award_not_loaded` |

Run against local Supabase (`supabase start` in `apps/supersolt`) with Drizzle RLS per `AGENTS.md`.

## 4. End-to-end (happy path)

**Tool:** Playwright if `apps/supersolt/playwright.config.ts` exists; else manual smoke in [`flows.md`](flows.md) §1.

**Scenario:** Notion flows #2 (view rate card) + #10 (operator views MA000119)

```ts
test("award rates view and awr preview", async ({ page }) => {
  await signInAsOrgAdmin(page);
  await page.goto("/acme/hawthorn/settings/award-rates");
  await expect(page.getByRole("heading", { name: /award rates/i })).toBeVisible();
  await page.getByRole("link", { name: /MA000119/i }).click();
  await expect(page.getByText(/PR/i)).toBeVisible();
  await page.getByRole("button", { name: /awr uplift/i }).click();
  await expect(page.getByRole("table")).toBeVisible();
});
```

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/award-rates-ma000119.json`, `award-rates-ma000009.json`, `award-library.ts`
- **Production seed:** committed SQL migration with verified AWR 2025 rates (cross-check fairwork.gov.au pay guide)
- **Determinism:** fixed UUIDs in integration fixtures; golden expected cents values checked into test files
- **Reset:** truncate `organisation_award_config`, `awr_uplift_events`, `employee_pay_rate_history` between integration tests; global tables read-only after migration

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on `server/workforce/award/**` | ≥80% | CI changed-paths |
| Integration cases §3 | 100% present | Review before merge |
| Contract tests #17–18 | green | Blocks stub regression |
| E2E #23 | green or manual smoke signed | Required for Settings route merge |
| Architecture lint | clean | `pnpm lint:architecture` |

## 7. What NOT to test here

- Full MA000003 Fast Food matrix (deferred until seed lands)
- Junior liquor override (Phase 2 data + logic)
- `@workspace/ui` primitive snapshots
- Agent chat integration (separate agent test plan)
- Minimum engagement Roster wiring (Roster triad owns when integrated)

## 8. Refactor checklist (after green)

- [ ] Single validation source: Zod schemas in `entities/workforce/award-rate-library/schemas.ts`
- [ ] No duplicated penalty math in roster or payroll modules
- [ ] `DEFAULT_HOURLY_RATE_CENTS` and `AWARD_MINIMUM_RATE_CENTS` removed
- [ ] Generated DB types flow through repos
- [ ] No app-to-app imports; no `@workspace/ui` → Supabase edge
- [ ] Award calculation service ≤ ~400 lines; split rule-pack loader if larger
