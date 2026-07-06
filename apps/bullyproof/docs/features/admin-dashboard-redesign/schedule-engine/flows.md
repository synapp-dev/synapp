# Schedule Engine — Flows

> Companion to [`plan.md`](plan.md) and [`tdd.md`](tdd.md). Engine is server-only; flows describe data paths.

## 1. Computation happy path

| # | Input | Engine step | Output |
|---|-------|-------------|--------|
| 1 | Active school in QLD, date in Term 2 week 3 | Load T2 calendar for QLD 2026 | `weekOfTerm=3`, `percentElapsed≈0.23` |
| 2 | 4 classes L1–4, completed [3,2,3,3] | Required = 3 each | Classes: ahead, slightly_behind, ahead, ahead |
| 3 | Aggregate | Worst class deficit = 1 | School: **slightly_behind** |
| 4 | Lessons avg % | (3+2+3+3)/(3+3+3+3) | **91.7%** |

## 2. Edge cases

| Case | Result |
|------|--------|
| School status onboarding | `scheduleStatus: na`, excluded from Ahead/Behind summary counts |
| Term 2 not started | `weekOfTerm: 0`, schedule `na`, widget shows countdown |
| Term 2 ended | `weekOfTerm` = last week; required = max for term |
| Y2+ Primary, class G4 exists | G4 excluded from scope |
| L5 Senior, week 5 | required = 2 (floor(5/2)) |
| No comparative culture period | indicator `na` (handled in parent service) |
| Missing state on school | Term widget defaults Qld display; school row state blank |

## 3. Error handling

| Condition | Behavior |
|-----------|----------|
| No calendar rows for state/year | Log warning; return `termProgress: null`; schedule `na` |
| Class with no year codes | Exclude from schedule average; log debug |
| Division by zero (required=0) | Lessons avg % = null |

## 4. Acceptance

- [ ] All rows in §2 have matching unit tests in [`tdd.md`](tdd.md)
- [ ] Threshold constants documented and easy to change after Glenn review
