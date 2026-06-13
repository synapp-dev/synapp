# Roster — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives test-first implementation for Notion Phase 1 Roster.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `shiftBoundsUtc` handles overnight end (`00:00`) | `lib/roster/venue-time.test.ts` | green (extend) |
| 2 | unit | `computeShiftCost` Sunday casual L2 → 150% penalty path | `server/workforce/roster-cost.test.ts` | red |
| 3 | unit | `computeShiftCost` splits base vs penalty cents | `server/workforce/roster-cost.test.ts` | red |
| 4 | unit | Compliance: approved leave → hard_block `leave_clash` | `server/workforce/roster-compliance.test.ts` | red |
| 5 | unit | Compliance: 8h rest gap → warn `rest_gap` | `server/workforce/roster-compliance.test.ts` | red |
| 6 | unit | Compliance: hard block cannot be overridden | `server/workforce/roster-compliance.test.ts` | red |
| 7 | unit | Auto-build respects availability minus leave | `server/workforce/roster-autobuild.test.ts` | red |
| 8 | unit | Auto-build never sets lifecycle published | `server/workforce/roster-autobuild.test.ts` | red |
| 9 | integration | Create shift persists cost columns + flags | `server/workforce/roster.int.test.ts` | red |
| 10 | integration | Hard-block leave clash returns 422, no row | `server/workforce/roster.int.test.ts` | red |
| 11 | integration | Warn override saves flag + audit fields | `server/workforce/roster.int.test.ts` | red |
| 12 | integration | Publish creates timesheet baseline rows | `server/workforce/roster-publish.int.test.ts` | red |
| 13 | integration | RLS: venue B member cannot read venue A shifts | `server/workforce/roster-rls.int.test.ts` | red |
| 14 | integration | Open shift (`user_profile_id` null) allowed for manager | `server/workforce/roster.int.test.ts` | red |
| 15 | unit (hook) | `useRosterWeek` loading → data with costs | `entities/workforce/roster/hooks/use-roster-week.test.tsx` | red |
| 16 | component | Grid renders employee + station toggle | `entities/workforce/roster/components/roster-grid.test.tsx` | red |
| 17 | component | Hard-block shows blocking alert, save disabled | `entities/workforce/roster/components/roster-shift-sheet.test.tsx` | red |
| 18 | component | Cost summary shows budget variance amber | `entities/workforce/roster/components/roster-cost-summary.test.tsx` | red |
| 19 | e2e | Manager builds week, publishes, timesheets seeded | `e2e/workforce-roster.spec.ts` | red |

After each green, refactor only touched code before the next item.

## 2. Unit tests

### Cost engine (`roster-cost.service.ts`)

- **Subject:** Award Library order-of-operations wrapper
- **Cases:**
  - MA000119 casual L3 Sunday 9:00–14:00 → penalty applied per Notion flow #3
  - Zero-length shift rejected
  - Break minutes reduce paid hours
  - Missing award classification → 400 with field hint
- **Fixtures:** `test/fixtures/award-rates-ma000119.json` (minimal rule pack)
- **No mocks** inside pure cost math; mock People repo at service boundary

### Compliance engine (`roster-compliance.service.ts`)

- **Cases (hard block):** leave overlap, RSA required + missing, cert expired before shift date, under-18 late night, visa expired
- **Cases (warn):** rest gap 8h, max hours 38→40, availability false, day over budget, shift < min engagement
- **Override:** saves `override_reason`, `override_by`, `override_at`; clears active warn for shift when resolved

### Auto-build (`roster-autobuild.service.ts`)

- **Input:** hourly demand stub, 4 staff with availability, 1 on leave Thu
- **Assert:** no shift on Thu for leave staff; all shifts `lifecycle=draft`; `source=autofill`; summary mentions under-covered peaks when demand > coverage

### Venue time (existing)

- Extend tests for week boundary in `Australia/Melbourne` vs `UTC` venues

## 3. Integration tests (DB + RLS)

### Setup

```ts
// apps/supersolt/test/fixtures/roster.ts
export const ROSTER_FIXTURE = {
  orgId: "11111111-1111-4111-8111-111111111111",
  venueId: "22222222-2222-4222-8222-222222222222",
  managerUserId: "33333333-3333-4333-8333-333333333333",
  staffUserId: "44444444-4444-4444-8444-444444444444",
  weekStart: "2026-06-01",
};
```

Seed: org, venue (TZ `Australia/Melbourne`), positions, staff assignment, recurring availability, approved leave row, optional forecast hourly stub.

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| GET week as venue manager | manager | 200 + shifts + costs |
| POST shift on approved leave | manager | 422 hard block |
| POST shift with warn + no override | manager | 422 requires override |
| POST shift with warn + override | manager | 201 + flag overridden |
| Publish week | manager | shifts published + timesheets rows |
| GET week as other venue user | member venue B | empty shifts (RLS) |
| POST shift as staff role | staff | 403 |
| Open shift create | manager | 201, `user_profile_id` null |

Run against local Supabase (`supabase start` in `apps/supersolt`) with Drizzle RLS transactions per `AGENTS.md`.

## 4. End-to-end (happy path)

**Tool:** Playwright if `apps/supersolt/playwright.config.ts` exists; else manual smoke in [`flows.md`](flows.md) §1.

**Scenario:** Notion flow #1 + #6 (build against demand → publish)

```ts
test("roster build and publish happy path", async ({ page }) => {
  await signInAsVenueManager(page);
  await page.goto("/acme/hawthorn/workforce/roster");
  await page.getByRole("button", { name: "Copy last week" }).click();
  await expect(page.getByTestId("roster-cost-total")).not.toContainText("$0");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Roster published")).toBeVisible();
});
```

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/roster.ts`, extend `scripts/seed-demo-people.ts` for dev
- **Reset:** truncate `shift_compliance_flags`, `timesheets`, `roster_shifts`, `roster_weeks` in FK order before integration tests
- **Determinism:** fixed UUIDs; frozen `weekStart` Monday ISO dates
- **Auth:** use existing test user helpers from app test utils

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new `server/workforce/roster-*.ts` | ≥80% | CI changed-paths only |
| Integration cases §3 | 100% present | Review before merge |
| E2E happy path | green or signed-off manual | Required for publish feature |
| Architecture lint | clean | `pnpm lint:architecture` |

## 7. What NOT to test here

- `@workspace/ui` primitive rendering
- Full Award Rate Library rule-pack completeness (contract tests only for paths Roster uses)
- Postmark delivery internals — mock outbound email adapter
- PDF pixel-perfect layout — smoke assert PDF bytes generated

## 8. Refactor checklist (after green)

- [ ] Remove `hourlyRateCentsForStaff` mock from `roster-page-client.tsx`
- [ ] Cost + compliance computed server-side only; client displays DTO
- [ ] Zod schemas shared between route handlers and client forms
- [ ] No `@workspace/ui` → Supabase imports
- [ ] Split `roster-page-client.tsx` under 250 lines per component
- [ ] No app-to-app imports

## 9. Baseline already green (do not regress)

- `roster.service.getWeek` returns staff, positions, shifts, availability hints
- Shift overlap 409 on same-day double booking
- Draft lifecycle on create

Extend coverage around these when touching related code.
