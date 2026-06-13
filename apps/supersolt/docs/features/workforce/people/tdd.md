# People — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Full pyramid (grill-me #11). Drives red → green → refactor implementation.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `computeComplianceStatus` → green/amber/red from field set | `server/workforce/people-compliance.test.ts` | red |
| 2 | unit | `validatePayRateAgainstAward` → warn below minimum; pass at/above | `server/workforce/people-policy.test.ts` | red |
| 3 | unit | `requiresAwardOverrideReason` when below minimum and no reason | `server/workforce/people-policy.test.ts` | red |
| 4 | unit | `canViewEmployeeSensitive` — Owner yes, venue manager no, self yes | `server/workforce/people-policy.test.ts` | red |
| 5 | unit | `canManagePeople` — operator vs crew | `server/workforce/people-policy.test.ts` | red |
| 6 | unit | STP tax treatment code + income type Zod schemas reject invalid | `entities/workforce/people/schemas.test.ts` | red |
| 7 | unit | CSV row parser surfaces row-level errors | `server/workforce/people-csv.test.ts` | red |
| 8 | integration | Venue manager SELECT `employee_payroll_profiles` for colleague → empty/denied | `server/workforce/people.repo.int.test.ts` | red |
| 9 | integration | Owner SELECT colleague sensitive row → success (no TFN plaintext assert in logs) | same | red |
| 10 | integration | Employee SELECT own sensitive row → success | same | red |
| 11 | integration | Create employee → `user_organisations` + `user_profiles` + invite stub | `server/workforce/people.service.int.test.ts` | red |
| 12 | integration | Pay rate change writes `employee_pay_rate_history` effective-dated | same | red |
| 13 | integration | Terminate sets status + deactivates auth user flag + preserves row | same | red |
| 14 | integration | PATCH with `vevo_incomplete` → 200 + warnings, not 422 | same | red |
| 15 | integration | PATCH duplicate email → 422 `duplicate_email` | same | red |
| 16 | integration | PATCH below award without override → 422 `award_minimum_override_required` | same | red |
| 17 | integration | ESO token valid → PATCH sensitive; expired → 410 | `server/workforce/people-onboard.service.int.test.ts` | red |
| 18 | integration | Xero field marked `managed_in_supersolt` → sync skip logged | `server/workforce/xero-employee-sync.service.int.test.ts` | red |
| 19 | route | `GET …/workforce/people` returns list envelope | `app/api/.../workforce/people/route.test.ts` | red |
| 20 | route | `GET …/sensitive` 403 for venue manager on colleague | same | red |
| 21 | hook | `usePeopleList` loading → data | `entities/workforce/people/hooks/use-people-list.test.tsx` | red |
| 22 | component | List renders compliance strip when warnings exist | `entities/workforce/people/components/people-list-page.test.tsx` | red |
| 23 | component | Sensitive section hidden for venue manager | `entities/workforce/people/components/people-sensitive-section.test.tsx` | red |
| 24 | component | Add wizard restores sessionStorage draft | `entities/workforce/people/components/people-add-wizard.test.tsx` | red |
| 25 | e2e | Owner adds employee → appears in list → invite sent | `e2e/workforce-people.spec.ts` | red |

After each green item, refactor only touched code before advancing.

## 2. Unit tests

### Compliance and policy

- **Subject:** `people-compliance.ts`, `people-policy.ts`
- **Cases:** VEVO incomplete → amber; missing FWIS → amber; all mandatory → green; terminated → red flags; LSL 7y flag date math (VIC); junior rate DOB boundary on birthday.

### Schemas

- **Subject:** `entities/workforce/people/schemas.ts`
- **Cases:** 6-char tax treatment; ISO country code; cessation reason enum; multipart CSV constraints.

### Xero / CSV mappers

- **Subject:** `xero-employee-sync.service.ts`, CSV import
- **Mocks:** Xero API fixture JSON; no network.

## 3. Integration tests (DB + RLS)

### Setup

```ts
// apps/supersolt/test/fixtures/people.ts
// Fixed UUIDs: ownerProfile, managerProfile, crewProfile, org, venue
// Seed roles: owner (grants_org_admin), manager, crew
```

Run against local Supabase (`user-supabase-supersolt-mvp` project or `supabase start`).

### RLS matrix

| Case | Acting user | Table | Expected |
|------|-------------|-------|----------|
| Owner reads crew sensitive | owner | `employee_payroll_profiles` | row |
| Manager reads crew sensitive | manager | same | denied |
| Crew reads own sensitive | crew | same | row |
| Crew reads peer payroll | crew | same | denied |
| Owner inserts pay rate history | owner | `employee_pay_rate_history` | ok |
| Audit log insert | service | `employee_audit_log` | ok |
| Crew reads own audit (non-sensitive paths) | crew | `employee_audit_log` | filtered |

### Service scenarios

- Archive employee with active future roster shift → warning in response (roster integration mock).
- `listForVenue` returns only venue-assigned staff.

## 4. End-to-end (happy path)

- **Tool:** Playwright (`apps/supersolt` config if present; else add minimal spec)
- **File:** `apps/supersolt/e2e/workforce-people.spec.ts`
- **Scenario:**
  1. Sign in as Owner test user
  2. Navigate to `/{org}/{venue}/workforce/people`
  3. Click Add employee → complete wizard (minimal required fields)
  4. Assert row in table
  5. Assert invite API called (mock email) or success toast

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/people.ts`
- **Extend:** `scripts/seed-demo-people.ts` for manual QA (not used in CI truncate)
- **Auth:** existing test-user helpers; never commit real TFN values

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit on `people-policy`, `people-compliance` | ≥90% branches | Compliance-critical |
| Integration RLS matrix | 100% rows in §3 | Required before merge |
| E2E happy path | green | Required |
| `pnpm lint:architecture` | clean | Repo root |

## 7. What NOT to test

- `@workspace/ui` primitives
- Full Xero Payroll API contract (fixture only)
- Agent tool handlers (separate agent spec; assert zero sensitive tool results in smoke doc only)

## 8. Refactor checklist (after green)

- [ ] Validation only in `schemas.ts`
- [ ] No Supabase `.from()` in UI — `entities/.../api/endpoints.ts` only
- [ ] Sensitive values never logged or telemetered
- [ ] `people-page-client.tsx` removed; single list implementation
- [ ] Payroll Export pre-flight reads `peopleService.getPayrollProfile`
