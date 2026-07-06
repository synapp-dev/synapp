# Schedule Engine — TDD plan

> Companion to [`plan.md`](plan.md). Implement and green **before** parent program-health service tests.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `getTerm2Progress` returns week 1 on first day of Term 2 | `term-calendar.test.ts` | red |
| 2 | unit | `getTerm2Progress` returns 100% on last day of Term 2 | `term-calendar.test.ts` | red |
| 3 | unit | `getTerm2Progress` returns null before Term 2 starts | `term-calendar.test.ts` | red |
| 4 | unit | L1–4 class: week 3 → required 3 lessons | `schedule-engine.test.ts` | red |
| 5 | unit | L5 class: week 4 → required 2 lessons | `schedule-engine.test.ts` | red |
| 6 | unit | Y2+ Primary: only Prep/G3/G5 classes in scope | `class-scope.test.ts` | red |
| 7 | unit | Y2+ Secondary: only G7/G11 in scope | `class-scope.test.ts` | red |
| 8 | unit | Ahead when completed >= required | `schedule-engine.test.ts` | red |
| 9 | unit | Slightly behind when deficit === 1 | `schedule-engine.test.ts` | red |
| 10 | unit | Behind when deficit >= 2 | `schedule-engine.test.ts` | red |
| 11 | unit | School status = worst class deficit | `schedule-engine.test.ts` | red |
| 12 | unit | Non-active school → all `na` | `schedule-engine.test.ts` | red |
| 13 | unit | Lessons avg % = sum(completed)/sum(required) | `schedule-engine.test.ts` | red |
| 14 | unit | Friday cutoff: lesson completed Saturday counts next week | `schedule-engine.test.ts` | red |

## 2. Unit test details

### `term-calendar.test.ts`

- **Subject:** `getTerm2Progress(stateCode, calendarYear, asOfDate, calendars[])`
- **Fixtures:** minimal QLD 2026 term rows inline (no DB)
- **Timezone:** fix `asOfDate` to UTC instants representing Brisbane dates

### `class-scope.test.ts`

- **Subject:** `filterClassesForSchoolYear(classes, schoolYearNumber, levelBadge)`
- Cases: Y1 all classes; Y2 Primary subset; Y2 Secondary subset; mixed P–12

### `schedule-engine.test.ts`

- **Subject:** `computeClassSchedule`, `computeSchoolSchedule`
- Mock completed counts as numbers — no DB
- Stage level from curriculum stage sortIndex or name match ("Senior Secondary" → L5)

## 3. Integration tests

Optional for MVP — repo batch query verified via manual smoke with one seeded school.

If added:

| Case | Expected |
|------|----------|
| School with 2 classes, 1 ahead 1 behind | school = behind (worst class) |
| No Term 2 calendar row | `termProgress: null`, schedule `na` |

## 4. Fixtures

```ts
// test/fixtures/term-calendars-qld-2026.ts
export const QLD_2026_TERMS = [
  { termNumber: 1, startDate: "2026-01-27", endDate: "2026-04-03" },
  { termNumber: 2, startDate: "2026-04-20", endDate: "2026-06-26" },
  // ...
];
```

## 5. Coverage gates

- 100% of §1 behaviors green before merging schedule-engine
- No UI tests until #1–14 pass

## 6. Refactor checklist

- [ ] Threshold constants in one file (`schedule-thresholds.ts`)
- [ ] No date math duplicated between widget and engine — shared `getTerm2Progress`
- [ ] Pattern matches `server/lessons/recommendation-engine.test.ts` (vitest, inline fixtures)
