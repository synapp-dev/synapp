# Timesheets — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Aligned to [Notion Timesheets](https://www.notion.so/34f64094bde68098a187cddc4c51b467).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `computeRosteredHours` subtracts unpaid breaks | `server/workforce/timesheet-policy.test.ts` | red |
| 2 | unit | `computeActualHours` from clock events minus unpaid breaks | `server/workforce/timesheet-policy.test.ts` | red |
| 3 | unit | `computeVariance` ±5 min → green tier (default tolerance) | `server/workforce/timesheet-variance.test.ts` | red |
| 4 | unit | `computeVariance` 10 min late → amber; 20 min → red | `server/workforce/timesheet-variance.test.ts` | red |
| 5 | unit | `computeVariance` no clock data → black / no_show | `server/workforce/timesheet-variance.test.ts` | red |
| 6 | unit | `requiresOwnerApproval` variance >120 min → true | `server/workforce/timesheet-policy.test.ts` | red |
| 7 | unit | `roundDisplayTime` 8:02 → 8:00 when rounding=15 | `server/workforce/timesheet-policy.test.ts` | red |
| 8 | unit | `autoDeductBreak` mode deducts 30 min when shift >5 hr | `server/workforce/timesheet-policy.test.ts` | red |
| 9 | unit | `computeWeeklyOtHours` FT >38 hr → OT hours (MVP-light) | `server/workforce/timesheet-policy.test.ts` | red |
| 10 | unit | `validateGeolocation` within 100m → ok; outside → warn flag | `server/workforce/timesheet-policy.test.ts` | red |
| 11 | unit | `payPeriodForDate` fortnightly Mon-start boundaries | `server/workforce/timesheet-period.test.ts` | red |
| 12 | unit | `payPeriodForDate` respects org `period_start_dow` | `server/workforce/timesheet-period.test.ts` | red |
| 13 | unit | Overnight shift: end next calendar day, single entry | `server/workforce/timesheet-policy.test.ts` | red |
| 14 | unit | `canEditTimesheet` locked → false for all roles | `server/workforce/timesheet-policy.test.ts` | red |
| 15 | unit | `canEditTimesheet` submitted → manager only | `server/workforce/timesheet-policy.test.ts` | red |
| 16 | unit | Anomaly: 4 late clocks in 14 days → chronic_lateness | `server/workforce/timesheet-anomaly.test.ts` | red |
| 17 | integration | Publish roster creates baseline timesheet open | `server/workforce/timesheet-roster.int.test.ts` | red |
| 18 | integration | Clock in/out fills actuals + variance | `server/workforce/timesheet-clock.int.test.ts` | red |
| 19 | integration | Clock in without roster → is_no_roster true | `server/workforce/timesheet-clock.int.test.ts` | red |
| 20 | integration | Break start/end adjusts actual hours | `server/workforce/timesheet-clock.int.test.ts` | red |
| 21 | integration | Auto-clock-out cron sets end at rostered end | `server/workforce/timesheet-cron.int.test.ts` | red |
| 22 | integration | Pay period close Open → Submitted | `server/workforce/timesheet-cron.int.test.ts` | red |
| 23 | integration | Approve → status approved + payroll line staged | `server/workforce/timesheet.int.test.ts` | red |
| 24 | integration | Approve → leave accrual idempotent | `server/workforce/leave-accrual.int.test.ts` | red |
| 25 | integration | Approve twice → single accrual event | `server/workforce/leave-accrual.int.test.ts` | red |
| 26 | integration | Bulk approve 5 clean matches | `server/workforce/timesheet.int.test.ts` | red |
| 27 | integration | Manager edit requires reason + audit row | `server/workforce/timesheet.int.test.ts` | red |
| 28 | integration | Staff dispute → status disputed | `server/workforce/timesheet.int.test.ts` | red |
| 29 | integration | Resolve dispute accept → updates actuals | `server/workforce/timesheet.int.test.ts` | red |
| 30 | integration | Edit locked timesheet → 409 | `server/workforce/timesheet.int.test.ts` | red |
| 31 | integration | RLS: crew reads own only | `server/workforce/timesheet-rls.int.test.ts` | red |
| 32 | integration | RLS: crew cannot approve | `server/workforce/timesheet-rls.int.test.ts` | red |
| 33 | integration | Manager venue A cannot read venue B entry | `server/workforce/timesheet-rls.int.test.ts` | red |
| 34 | integration | Owner approves above-threshold variance; manager 403 | `server/workforce/timesheet.int.test.ts` | red |
| 35 | integration | Geolocation flagged when remote clock | `server/workforce/timesheet-clock.int.test.ts` | red |
| 36 | integration | Multi-venue same day: two entries same user | `server/workforce/timesheet-clock.int.test.ts` | red |
| 37 | unit (hook) | `useActiveClock` loading → clocked in banner | `entities/workforce/timesheets/hooks/use-active-clock.test.tsx` | red |
| 38 | unit (hook) | `useClockMutation` optimistic timestamp + retry | `entities/workforce/timesheets/hooks/use-clock-mutation.test.tsx` | red |
| 39 | component | Staff home renders Clock In when no active | `entities/workforce/timesheets/components/timesheet-staff-clock-home.test.tsx` | red |
| 40 | component | Early clock confirm dialog >15 min | `entities/workforce/timesheets/components/timesheet-staff-clock-home.test.tsx` | red |
| 41 | component | Manager list status pipeline counts | `entities/workforce/timesheets/components/timesheet-manager-list.test.tsx` | red |
| 42 | component | Variance badge colors green/amber/red | `entities/workforce/timesheets/components/timesheet-variance-badge.test.tsx` | red |
| 43 | component | Edit dialog blocks submit without reason | `entities/workforce/timesheets/components/timesheet-edit-dialog.test.tsx` | red |
| 44 | component | Bulk approve bar disabled when none selected | `entities/workforce/timesheets/components/timesheet-bulk-approve-bar.test.tsx` | red |
| 45 | e2e | Staff clocks → manager approves → leave balance increases | `e2e/workforce-timesheets.spec.ts` | red |

After each green, refactor only touched code before the next item.

## 2. Unit tests

### `timesheet-policy.ts`

- **Subject:** hours math, edit permissions, owner threshold, rounding display, break auto-deduct, OT weekly calc
- **Cases:**
  - Happy: 8:00–16:00 with 30 min unpaid → 7.5 hr
  - Boundary: midnight-crossing shift; DST spring forward
  - Invalid: clock out before clock in; negative break minutes
- **No mocks** for pure functions

### `timesheet-variance.service.ts`

- **Subject:** tier classification vs org tolerance
- **Fixtures:** org settings with tolerance 5 min

### `timesheet-period.service.ts`

- **Subject:** period boundaries weekly/fortnightly/monthly; grace window before submit lock
- **Cases:** period spanning month boundary; org with Sunday start

### `timesheet-anomaly.service.ts` (MVP-light)

- **Subject:** rolling 14-day window counts per employee
- **Cases:** chronic lateness threshold 3; frequent disputes threshold 2

### Hooks

- **Subject:** `useTimesheetEntries`, `useActiveClock`, `useClockMutation`, `usePayPeriods`
- **Setup:** MSW matching API envelope; simulate offline retry for clock mutation
- **Assertions:** optimistic UI, error code mapping, refetch on approve

## 3. Integration tests (DB + RLS)

### Setup

```ts
// apps/supersolt/test/fixtures/timesheets.ts
// Seed: org with timesheet settings, venue with lat/lng, pay period open,
// published roster shift + baseline timesheet, FT employee with leave types,
// manager + crew test users
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Crew clock in on own shift | crew | 200 + clock event + actual_starts_at |
| Crew clock in for colleague | crew | 403 |
| Crew clock in remote (geo on) | crew | 200 + geolocation_flagged |
| Manager approve team entry | venue manager | 200 + accrual + payroll line |
| Manager approve above threshold | venue manager | 403 `owner_approval_required` |
| Owner approve above threshold | owner | 200 |
| Manager edit without reason | manager | 422 |
| Staff dispute own entry | crew | 200 disputed |
| Approve locked entry | manager | 409 `timesheet_locked` |
| Crew read colleague timesheet | crew | empty / 403 |
| Cron auto-clock-out | service | actual_ends_at = rostered end |
| Period close cron | service | status submitted |

> Run against local Supabase per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md).

## 4. End-to-end (happy path)

**File:** `apps/supersolt/e2e/workforce-timesheets.spec.ts`

```ts
test("staff clock in/out → manager bulk approve → leave accrual", async ({ page }) => {
  // 1. Seed: published roster shift for crew user this week
  // 2. Sign in as staff; open /{org}/{venue}/workforce/timesheets
  // 3. Tap Clock In; assert banner "Clocked in"
  // 4. Tap Clock Out; assert completed hours
  // 5. Sign in as manager; filter "needs review" or all pending
  // 6. Bulk approve or single approve
  // 7. Open /workforce/leave as staff — balance increased (FT)
  // 8. Assert telemetry stubs if wired
});
```

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/timesheets.ts`
- **Fixed UUIDs** for org, venue (with coordinates), pay period, shift, timesheet
- **Roster link:** published shift with known rostered 8:00–16:00
- **Reset:** truncate timesheet_* + payroll_timesheet_lines between tests; preserve org settings seed

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new `server/workforce/timesheet*` + `timesheet-policy` | ≥80% | CI changed paths |
| Integration cases §3 | 100% present | Review before merge |
| E2E happy path | green on CI | Required for merge |
| Architecture lint | clean | `pnpm lint:architecture` |

## 7. What NOT to test here

- Browser geolocation API internals — mock coordinates in hook tests
- Full Award Library penalty pipeline — Payroll Export / P2.6 scope
- Xero export execution — Payroll Export triad
- `@workspace/ui` primitive rendering

## 8. Refactor checklist (after green)

- [ ] Validation in one Zod schema shared by routes + client
- [ ] Clock optimistic retry not duplicated across hooks
- [ ] Variance calc single source (`timesheet-variance.service.ts`)
- [ ] No `any`; drizzle inferred types throughout
- [ ] No app-to-app imports
- [ ] Components ≤250 lines; split staff vs manager surfaces
- [ ] Delete `timesheets-page-client.tsx` and seed constants
