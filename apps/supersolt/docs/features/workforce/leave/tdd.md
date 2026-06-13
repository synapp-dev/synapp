# Leave — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Aligned to [Notion Leave](https://www.notion.so/34f64094bde680f8a37cd54ff7106475).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `computeLeaveHours` full day Mon–Fri FT → 38h week equivalent per day 7.6h | `server/workforce/leave-policy.test.ts` | red |
| 2 | unit | `computeLeaveHours` half-day AM → 3.8h (MVP-light) | `server/workforce/leave-policy.test.ts` | red |
| 3 | unit | `computeAccrualHours` FT annual 7.3% on 8h shift | `server/workforce/leave-accrual.test.ts` | red |
| 4 | unit | `computeAccrualHours` casual → 0 for annual/personal | `server/workforce/leave-accrual.test.ts` | red |
| 5 | unit | `validateBalance` insufficient → options split paid+unpaid | `server/workforce/leave-policy.test.ts` | red |
| 6 | unit | `validateBalance` negative balance rejected | `server/workforce/leave-policy.test.ts` | red |
| 7 | unit | `requiresOwnerApproval` >5 days → true (org default) | `server/workforce/leave-policy.test.ts` | red |
| 8 | unit | `lslBalanceForState` VIC 7yr → 10 weeks equivalent hours | `server/workforce/leave-policy.test.ts` | red |
| 9 | unit | `compassionateLeave` per-occasion does not deduct annual | `server/workforce/leave-policy.test.ts` | red |
| 10 | unit | `maskCalendarLabel` DFV → "Leave (private)" | `server/workforce/leave-policy.test.ts` | red |
| 11 | unit | `canViewLeaveReason` DFV — staff yes, peer no, manager yes | `server/workforce/leave-policy.test.ts` | red |
| 12 | integration | Create pending request persists + audit | `server/workforce/leave.int.test.ts` | red |
| 13 | integration | Approve deducts balance + status approved | `server/workforce/leave.int.test.ts` | red |
| 14 | integration | Approve writes availability overrides leave_sync | `server/workforce/leave-sync.int.test.ts` | red |
| 15 | integration | Cancel approved restores balance + deletes overrides | `server/workforce/leave-sync.int.test.ts` | red |
| 16 | integration | Reject pending — no balance change | `server/workforce/leave.int.test.ts` | red |
| 17 | integration | Withdraw pending → withdrawn | `server/workforce/leave.int.test.ts` | red |
| 18 | integration | Timesheet approve → accrual event idempotent | `server/workforce/leave-accrual.int.test.ts` | red |
| 19 | integration | Timesheet approve twice → single accrual row | `server/workforce/leave-accrual.int.test.ts` | red |
| 20 | integration | RLS: crew cannot read other employee request | `server/workforce/leave-rls.int.test.ts` | red |
| 21 | integration | RLS: venue B manager cannot read venue A request | `server/workforce/leave-rls.int.test.ts` | red |
| 22 | integration | Owner approves >5 day request; manager gets 403 | `server/workforce/leave.int.test.ts` | red |
| 23 | integration | Bulk approve 3 pending → all approved | `server/workforce/leave.int.test.ts` | red |
| 24 | integration | Approve with roster shifts + unassign_all clears assignee | `server/workforce/leave-roster.int.test.ts` | red |
| 25 | integration | `listApprovedLeaveRanges` returns range for roster week | `server/workforce/leave-roster.int.test.ts` | red |
| 26 | integration | Roster POST shift on approved leave → 422 leave_clash | `server/workforce/roster.int.test.ts` | red |
| 27 | integration | Termination payout creates payroll_leave_lines | `server/workforce/leave-termination.int.test.ts` | red |
| 28 | integration | Org admin adjusts opening balance + audit | `server/workforce/leave.int.test.ts` | red |
| 29 | unit (hook) | `useLeaveRequests` loading → pending list | `entities/workforce/leave/hooks/use-leave-requests.test.tsx` | red |
| 30 | component | Staff page renders balance summary | `entities/workforce/leave/components/leave-page.test.tsx` | red |
| 31 | component | Request sheet validates insufficient balance dialog | `entities/workforce/leave/components/leave-request-sheet.test.tsx` | red |
| 32 | component | Manager inbox shows team overlap warning | `entities/workforce/leave/components/leave-pending-inbox.test.tsx` | red |
| 33 | component | Calendar masks DFV label for non-privileged viewer | `entities/workforce/leave/components/leave-calendar-grid.test.tsx` | red |
| 34 | component | Roster conflict dialog options render | `entities/workforce/leave/components/leave-roster-conflict-dialog.test.tsx` | red |
| 35 | e2e | Staff submits → manager approves → calendar shows block | `e2e/workforce-leave.spec.ts` | red |

## 2. Unit tests

### `leave-policy.ts`

- **Subject:** hours, balance validation, owner threshold, LSL reference math, DFV ACL helpers
- **Cases:**
  - Happy: 5-day annual request within balance
  - Boundary: single-day; cross-month; venue TZ midnight
  - Invalid: end before start; zero hours; casual annual accrual
- **No mocks** for pure functions

### `leave-accrual.service.ts`

- **Subject:** accrual % by employment type × paid hours from timesheet
- **Mock:** none for pure calc; integration tests use real DB

### Hooks

- **Subject:** `useLeaveRequests`, `useLeaveBalances`, `useLeaveCalendar`
- **Setup:** MSW or fetch mock matching API envelope
- **Assertions:** loading, empty, error code mapping

## 3. Integration tests (DB + RLS)

### Setup

```ts
// apps/supersolt/test/fixtures/leave.ts
// Seed: org, 2 venues, FT employee + casual, default leave types, balances,
// optional roster shift overlapping leave dates, availability overrides table present
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Staff creates own request | crew | 201 pending |
| Staff creates for colleague | crew | 403 |
| Manager approves team request | venue manager | 200 + overrides |
| Manager approves other venue | venue manager | 403 |
| Owner approves 10-day LSL | owner | 200 |
| Manager approves 10-day | manager | 403 `owner_approval_required` |
| Approve insufficient without split | manager | 422 |
| Approve with paid+unpaid split | manager | 200 split hours stored |
| Crew reads own balance | crew | rows returned |
| Crew reads colleague balance | crew | empty / 403 |
| Timesheet approve accrual | manager | balance increases |
| Termination payout | owner | payroll lines + balance zeroed |

> Run against local Supabase per [ARCHITECTURE.md §8.1](../../../../ARCHITECTURE.md).

## 4. End-to-end (happy path)

**File:** `apps/supersolt/e2e/workforce-leave.spec.ts`

```ts
test("staff request → manager approve → availability synced", async ({ page }) => {
  // 1. Sign in as staff; open /{org}/{venue}/workforce/leave
  // 2. Request annual leave next week; assert pending tab
  // 3. Sign in as manager; approve from inbox
  // 4. Assert approved tab + calendar block
  // 5. Open availability team view — grey "On leave" for dates
  // 6. Open roster — assigning shift on leave date shows hard block
});
```

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/leave.ts`
- **Fixed UUIDs** for org, venues, users, leave types
- **LSL seed:** `lsl_state_rules` VIC row in migration
- **Reset:** truncate leave_* + payroll_leave_lines between tests

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new `server/workforce/leave*.ts` | ≥80% | CI changed-paths |
| Integration cases §3 | 100% present | Review before merge |
| E2E happy path | green | Required |
| Architecture lint | clean | `pnpm lint:architecture` |

## 7. What NOT to test here

- `@workspace/ui` primitives
- Full Payroll Export Xero journal (consumer triad)
- Public holiday auto-creation (Phase 2)
- Agent drafting leave (Phase 2 UI)

## 8. Refactor checklist (after green)

- [ ] Accrual + balance mutation only in services, not routes
- [ ] Zod schemas shared client/server
- [ ] No demo `SEED_LEAVE` remains
- [ ] Roster uses leave ranges, not availability proxy for hard-block
- [ ] No app-to-app imports
