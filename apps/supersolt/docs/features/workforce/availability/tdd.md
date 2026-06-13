# Availability — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives test-first implementation of the Notion availability model.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `timeBlockForLocalTime` maps venue-local HH:mm to correct block(s) incl. overnight span | `server/workforce/availability-resolve.test.ts` | red |
| 2 | unit | `resolveAvailabilityAsOf` applies override over pattern over default-available | `server/workforce/availability-resolve.test.ts` | red |
| 3 | unit | `resolveAvailabilityAsOf` respects `effective_from` / `effective_until` boundaries | same | red |
| 4 | unit | `leave_sync` override not overwritable by employee merge | same | red |
| 5 | unit | `requiresSubstantiveApproval` true for FT block reduction below 38h-equivalent | `server/workforce/availability-policy.test.ts` | red |
| 6 | unit | `requiresSubstantiveApproval` false for casual | same | red |
| 7 | unit | Zod rejects invalid `time_block` / `day_of_week` | `entities/workforce/availability/schemas.test.ts` | red |
| 8 | integration | Crew inserts own pattern; second crew cannot insert for peer | `server/workforce/availability.int.test.ts` | red |
| 9 | integration | Operator reads team grid for venue | same | red |
| 10 | integration | Pending pattern approve promotes `approval_status` + audit row | same | red |
| 11 | integration | One-off override on rostered shift returns `roster_shift_conflict` | same | red |
| 12 | integration | `leave_sync` override DELETE denied for authenticated crew | same | red |
| 13 | integration | Drop legacy tables — repo no longer references old names | same | red |
| 14 | unit | Roster `loadAvailabilityHints` marks `unavailable` block on shift day | `server/workforce/roster-availability-hints.test.ts` | red |
| 15 | unit | Roster warn uses `preferred` only for ranking metadata, not hard block | same | red |
| 16 | component | `AvailabilityBlockGrid` cycles status tap order | `entities/workforce/availability/components/availability-block-grid.test.tsx` | red |
| 17 | component | Staff page shows conflict banner when API returns conflicts | `entities/workforce/availability/components/staff-availability-page.test.tsx` | red |
| 18 | component | Team page renders pending queue from `changes` API | `entities/workforce/availability/components/team-availability-page.test.tsx` | red |
| 19 | e2e | Crew sets Thu evening unavailable on `/me`, persists after reload | `e2e/workforce-availability.spec.ts` | red |
| 20 | e2e | Manager approves pending FT change on team view | same | red |

## 2. Unit tests

### `availability-resolve.service.ts`

- **Cases:**
  - Monday 11:30 → `morning`; 16:00 → `afternoon`; 21:00 → `evening`; 23:00 → `overnight`
  - Shift 21:00–01:00 touches `evening` + `overnight`
  - No rows → all blocks `available`
  - Override `unavailable` on date beats pattern `available`
  - Pattern A ends `effective_until`; Pattern B starts next day

### `availability-policy.ts`

- **Cases:**
  - FT with 28×1h blocks/week equivalent → pending when new pattern has 20
  - Casual edit → `auto_applied`
  - Rejected pattern leaves prior effective pattern active

### Hooks (after services green)

- `useAvailabilityMe` — loading → grid data → error code mapping
- `useAvailabilityTeam` — date range change refetches

## 3. Integration tests (DB + RLS)

**Setup:** `apps/supersolt/test/fixtures/availability.ts`

- Org `avail-test-org`, venue `avail-test-venue` (TZ `Australia/Melbourne`)
- Users: `crew-a`, `crew-b`, `manager-m` with fixed UUIDs
- `user_organisations.employment_type` = `full_time` for crew-a, `casual` for crew-b
- Seed one `roster_shifts` row for crew-a on upcoming Tuesday evening

**RLS matrix**

| Case | Acting user | Action | Expected |
|------|-------------|--------|----------|
| Crew A pattern insert self | crew-a | INSERT pattern | success |
| Crew B pattern insert for A | crew-b | INSERT pattern `user_profile_id = crew-a` | RLS deny |
| Manager team read | manager-m | SELECT patterns for venue | success |
| Crew delete leave_sync override | crew-a | DELETE override `source=leave_sync` | deny |
| Service role leave_sync insert | service_role | INSERT `leave_sync` | success (future Leave job) |

Run against local Supabase (`supabase start` in `apps/supersolt`).

## 4. End-to-end

**File:** `apps/supersolt/e2e/workforce-availability.spec.ts`

**Scenario A — staff `/me`**

1. Sign in as crew test user.
2. Navigate to `/{org}/{venue}/workforce/availability/me`.
3. Tap Thu × evening until **Unavailable**; save with effective date default.
4. Reload; cell still unavailable.
5. Assert `availability.pattern_submitted` (mock tracker spy if wired).

**Scenario B — manager approval**

1. Sign in as manager.
2. Seed pending pattern via API fixture or prior step.
3. Open `/{org}/{venue}/workforce/availability`; pending panel shows crew-a.
4. Approve; status cleared; audit visible in history drill-down.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/availability.ts`
- **Reset:** truncate availability tables + dependent shifts in `beforeEach` for integration
- **Update:** remove `venue_staff_weekly_availability` from `seed-demo-people.ts`; seed 7×4 `available` patterns optional

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit on `availability-*.ts` | ≥80% branches | Changed paths only in CI |
| Integration §3 matrix | 100% rows | Required before merge |
| E2e #19–20 | green | Required |
| `pnpm lint:architecture` | clean | Repo root |

## 7. What NOT to test here

- `@workspace/ui` primitive behaviour
- Leave module approval workflow (stub `leave_sync` writer only)
- Agent chat tools
- Full roster publish flow (covered in roster e2e; only hint mapping here)

## 8. Refactor checklist (after green)

- [ ] Delete `availability-page-client.tsx` and legacy route
- [ ] Single Zod schema source for API + client
- [ ] No `any`; use generated Drizzle types
- [ ] `workforce.repo.ts` availability helpers removed or delegated to `availability.repo.ts`
- [ ] Components ≤250 lines; split grid vs sheets if needed
