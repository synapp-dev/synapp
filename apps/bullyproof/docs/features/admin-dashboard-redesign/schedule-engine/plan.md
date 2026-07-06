# Schedule Engine (Admin Dashboard)

> **Product:** `apps/bullyproof`
> **Slug:** `schedule-engine` (sub-feature of [`admin-dashboard-redesign`](../plan.md))
> **Status:** Planned
> **Owner:** Engineering
> **Created:** 2026-06-03

## 1. Summary

Pure server-side module that answers: *for each class at an Active School, how many lessons should be completed by the end of the current week of Term 2, how many were completed, and what schedule band (Ahead / Slightly Behind / Behind) applies?* Aggregates class results to a school-level schedule status for the program-health dashboard.

## 2. Scope

### In scope

- Load term calendar for school's state (`school_term_calendars` + `schools.state_id` → `states.code`)
- Compute **week of Term 2** and **% elapsed** through Term 2 (widget + rule input)
- Per-class rules:
  - **Levels 1–4:** by week N of Term 2, expect N completed lessons (1/week, counted through prior Friday AEST)
  - **Level 5 (Senior Secondary):** expect `floor(weekN / 2)` lessons (1 per 2 weeks)
  - **Year 2+ schools:** only count designated classes — Primary: Prep, G3, G5; Secondary: G7, G11
- **Lessons Completed (Avg %):** `sum(completed) / sum(required)` across in-scope classes
- **School schedule status:** average class delta → band (see thresholds below)
- **Active School only** for schedule bands; others return `na`

### Out of scope

- Year 1 school detection heuristic beyond "has any lesson completed before current calendar year" — use `school.joinedAt` or first lesson year; document in code
- Holiday/week exclusion within terms — use calendar week boundaries only for MVP
- Timezone edge cases beyond `Australia/Brisbane` for "by Friday" cutoff

### Non-goals

- Teacher-facing schedule warnings (admin dashboard only)
- Persisting computed schedule (compute on read; cache optional later)

## 3. Architecture placement

| Decision | Choice | Section |
|----------|--------|---------|
| Location | `apps/bullyproof/server/dashboard/schedule-engine/` | §7.1 |
| Pure functions | `schedule-engine.ts`, `term-calendar.ts`, `class-scope.ts` | testable without DB |
| DB access | `schedule-engine.repo.ts` — lesson counts, class years, school metadata | integration tests |

No package extraction (§5.1).

## 4. Data model

Uses parent migration `school_term_calendars` (see [../plan.md](../plan.md) §4).

Read-only on existing tables: `schools`, `states`, `classes`, `school_years`, `lessons`, `lesson_classes`, `school_year_assignments`.

### Active School predicate

Reuse logic from `school.service.ts` `resolveSchoolStatus`:

```ts
function isActiveSchool(row: SchoolListRow, fullUnlock: boolean): boolean {
  const ready =
    row.teacherCount >= 1 &&
    row.classCount >= 1 &&
    row.schoolAdminCount >= 1 &&
    row.schoolLicenceCount >= 1;
  return ready && fullUnlock; // status === "active"
}
```

Export from `server/dashboard/active-school.ts` to avoid drift.

## 5. Schedule thresholds (recommended default)

Pending Glenn confirmation — implement as constants in `schedule-thresholds.ts`:

| Band | Rule (class-level) |
|------|---------------------|
| **Ahead** | `completed >= required` |
| **Slightly behind** | `required - completed === 1` (L1–4) OR `required - completed === 1` with L5 half-week mapping |
| **Behind** | `required - completed >= 2` |
| **NA** | School not Active, or Term 2 not started, or no in-scope classes |

**School-level band:** median or average of class deltas — **recommended: use worst class (max deficit)** so one straggler class surfaces the school as Behind.

## 6. API surface

No dedicated route — consumed by `program-health.service.ts`:

```ts
scheduleEngine.computeSchoolSchedule(input: SchoolScheduleInput): SchoolScheduleResult
```

## 7. Implementation order

1. `term-calendar.ts` — resolve Term 2 dates, week index, percent elapsed
2. `class-scope.ts` — Y2+ class filtering by year codes
3. `schedule-engine.ts` — required vs completed per class
4. `schedule-engine.repo.ts` — batch fetch lesson completion counts
5. Wire into `program-health.service.ts`

## 8. Cross-references

- Parent: [../plan.md](../plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
