# Payroll Export — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Aligned to [Notion Payroll Export](https://www.notion.so/34f64094bde6809fbb84e54ef1bd8269).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `computeBaseWages` sums hours × rate snapshot per timesheet line | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 2 | unit | Sunday casual MA000119 penalty 175% applied to penalty hours | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 3 | unit | Junior rate 90% at age 19 per scale | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 4 | unit | Mid-period rate change splits by timesheet `base_rate_cents` | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 5 | unit | Paid leave hours added at base rate; FDV flagged `has_fdv_leave` | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 6 | unit | VIC LSL pro-rata 1/60 at 7+ years on termination | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 7 | unit | Super 12% on OTE excludes excluded termination components | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 8 | unit | PAYG lookup for tax treatment code + fortnightly frequency | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 9 | unit | No-TFN → 47% resident withholding | `server/workforce/payroll-export/payroll-calculation.test.ts` | red |
| 10 | unit | `runPreflight` hard-blocks missing TFN | `server/workforce/payroll-export/payroll-preflight.test.ts` | red |
| 11 | unit | `runPreflight` hard-blocks rate below award minimum | `server/workforce/payroll-export/payroll-preflight.test.ts` | red |
| 12 | unit | Wage Theft exemption requires Owner override category | `server/workforce/payroll-export/payroll-preflight.test.ts` | red |
| 13 | unit | `canTransitionPayRunStatus` draft → pending_owner_approval | `server/workforce/payroll-export/payroll-policy.test.ts` | red |
| 14 | unit | `canTransitionPayRunStatus` pending → returned_for_revision | `server/workforce/payroll-export/payroll-policy.test.ts` | red |
| 15 | unit | `canTransitionPayRunStatus` approved → sent_to_xero only via execute | `server/workforce/payroll-export/payroll-policy.test.ts` | red |
| 16 | unit | `canEditLineItem` false when status ≥ approved | `server/workforce/payroll-export/payroll-policy.test.ts` | red |
| 17 | unit | `canExecutePayrollPayment` requires capability | `server/auth/capabilities.test.ts` | red |
| 18 | unit | `stripFdvFromLineItemDto` removes FDV fields for venue manager | `server/workforce/payroll-export/payroll-policy.test.ts` | red |
| 19 | unit | Xero mapper golden payload matches fixture | `server/xero/payroll/xero-payroll-mapper.test.ts` | red |
| 20 | unit | Xero mapper relabels FDV leave on payslip line | `server/xero/payroll/xero-payroll-mapper.test.ts` | red |
| 21 | integration | Prepare creates draft pay run for closed period | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 22 | integration | Calculate persists line items + calculation_snapshot | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 23 | integration | Pre-flight hard block prevents calculate | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 24 | integration | Line override requires reason + audit row | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 25 | integration | Submit → pending_owner_approval | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 26 | integration | Owner return → returned_for_revision + notes | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 27 | integration | Owner approve → approved | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 28 | integration | Execute (mock Xero) → sent_to_xero + push log | `server/workforce/payroll-export/payroll-xero.int.test.ts` | red |
| 29 | integration | Xero 4xx → xero_push_pending + no status advance | `server/workforce/payroll-export/payroll-xero.int.test.ts` | red |
| 30 | integration | Retry uses same snapshot digest (idempotent) | `server/workforce/payroll-export/payroll-xero.int.test.ts` | red |
| 31 | integration | Webhook finalised → finalised_in_xero | `server/workforce/payroll-export/payroll-webhook.int.test.ts` | red |
| 32 | integration | Webhook chain → reconciled locks timesheets | `server/workforce/payroll-export/payroll-webhook.int.test.ts` | red |
| 33 | integration | Reconcile sets timesheet status locked + FK | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 34 | integration | Correction run links `corrects_pay_run_id` | `server/workforce/payroll-export/payroll.int.test.ts` | red |
| 35 | integration | RLS: venue manager cannot execute pay | `server/workforce/payroll-export/payroll-rls.int.test.ts` | red |
| 36 | integration | RLS: crew cannot read pay_runs | `server/workforce/payroll-export/payroll-rls.int.test.ts` | red |
| 37 | integration | RLS: manager cannot read FDV breakdown in line JSON | `server/workforce/payroll-export/payroll-rls.int.test.ts` | red |
| 38 | unit (hook) | `usePayRun` loading → data | `entities/workforce/payroll-export/hooks/use-pay-run.test.tsx` | red |
| 39 | component | Empty state: no approved timesheets | `entities/workforce/payroll-export/components/payroll-empty-states.test.tsx` | red |
| 40 | component | Pre-flight panel lists hard blocks | `entities/workforce/payroll-export/components/payroll-preflight-panel.test.tsx` | red |
| 41 | component | Approve and pay dialog requires confirm | `entities/workforce/payroll-export/components/payroll-approve-and-pay-dialog.test.tsx` | red |
| 42 | component | Owner return dialog requires notes | `entities/workforce/payroll-export/components/payroll-owner-return-dialog.test.tsx` | red |
| 43 | component | Status stepper reflects webhook milestones | `entities/workforce/payroll-export/components/payroll-status-stepper.test.tsx` | red |
| 44 | e2e | Prepare → approve → execute (mock Xero) → timesheets locked | `e2e/workforce-payroll-export.spec.ts` | red |

After each green, refactor only touched code before the next item.

## 2. Unit tests

### `payroll-calculation.service.ts`

- **Subject:** wage aggregation, penalties, super, PAYG, termination
- **Fixtures:** `test/fixtures/payroll-calculation.ts` — 14-employee fortnight with Sunday shift, FDV leave, termination
- **Cases:**
  - Happy: gross = base + penalty + leave
  - Boundary: zero-hour employee excluded; rounding half-cent
  - Invalid: negative hours rejected at schema layer

### `payroll-preflight.service.ts`

- **Subject:** hard vs soft checks; Wage Theft; missing People fields
- **Mocks:** `peopleService.getPayrollProfile` returns incomplete profiles

### `payroll-policy.ts`

- **Subject:** status transitions, edit permissions, FDV DTO stripping
- **No mocks** for pure functions

### `xero-payroll-mapper.ts`

- **Subject:** PayRun payload shape
- **Golden files:** `server/xero/payroll/__fixtures__/payrun-payload.fortnight.json`
- **Mock:** none — compare parsed JSON to golden

### `capabilities.ts`

- **Subject:** payroll capability matrix vs role fixtures from `rbac.test.ts` patterns

## 3. Integration tests (DB + RLS)

### Setup

```ts
// apps/supersolt/test/fixtures/payroll-export.ts
// Seeds: org, pay_period (closed), approved timesheets, payroll_timesheet_lines,
// people profiles (via admin insert into People tables once triad lands),
// organisation_payroll_settings with primary_xero_venue_id
```

### Xero boundary

- **Mock at:** `server/xero/payroll/xero-payroll-client.ts` — `vi.mock` returning success, 400 validation, network throw
- **No live Xero in CI**
- **Optional:** `XERO_PAYROLL_E2E=1` sandbox script documented in plan §10; not merge gate

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Manager prepares + calculates | venue manager | 200 + draft lines |
| Manager execute pay | venue manager | 403 `forbidden` |
| Owner execute pay (mock Xero ok) | org admin | 200 + `sent_to_xero` |
| Owner retry after failure | org admin | same payload digest |
| Crew list pay periods | crew | 403 |
| Webhook unsigned | anon | 401 |
| Reconciled timesheet edit | manager | 409 `timesheet_locked` |

## 4. End-to-end (happy path)

- **Tool:** Playwright if configured; else manual smoke in [`flows.md`](flows.md) §1.17
- **Scenario:** Notion Flow 1–9 abbreviated — mock Xero at network layer or test env stub
- **Assert:** pay run `reconciled`; sample timesheet `status=locked`; telemetry `payroll.reconciled` (dev console)

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/payroll-export.ts`
- **Golden Xero:** `server/xero/payroll/__fixtures__/`
- **PAYG tables:** `server/workforce/payroll-export/data/ato-withholding-fortnightly.json` (versioned)
- **Reset:** truncate pay_run_* + logs; preserve org + pay_period seed

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on `payroll-export/` + `xero/payroll/` | ≥80% | Changed paths only |
| Integration cases §3 | 100% present | Review before merge |
| Golden PayRun fixture | must pass | CI required |
| E2E happy path | green | Required for merge |
| `pnpm lint:architecture` | clean | Repo root |

## 7. What NOT to test here

- Full ATO tax table completeness (spot-check scales; annual ATO update is manual fixture refresh)
- Xero UI / real bank batch execution
- `@workspace/ui` primitives
- People CRUD (People triad owns tests)

## 8. Refactor checklist (after green)

- [ ] Validation in one Zod module shared by API + client
- [ ] No TFN/bank in logs outside dev debug
- [ ] No app-to-app imports
- [ ] Calculation snapshot immutable after `approved`
- [ ] Component files ≤ ~250 lines; split detail sheet if needed
