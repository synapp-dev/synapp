# Onboarding — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `inferResumeStep` — no org → 1, no venues → 2, else → 3 | `entities/onboarding/infer-resume-step.test.ts` | red |
| 2 | unit | `module-gates` — Square only → sales unlocked, purchasing locked | `entities/onboarding/lib/module-gates.test.ts` | red |
| 3 | unit | `normalizeAbn` / org validation | `server/onboarding/onboarding.service.test.ts` | red |
| 4 | integration | GET state — incomplete user with org+venues | `app/api/onboarding/state/route.test.ts` | red |
| 5 | integration | POST venue persists `data_starts_from` | `app/api/onboarding/venue/route.test.ts` | red |
| 6 | integration | POST finalize without Square → 400 when flag on | `app/api/onboarding/finalize/route.test.ts` | red |
| 7 | integration | POST finalize with Square → `setup_completed_at` set | same | red |
| 8 | integration | PATCH progress records `xeroSkipped` | `app/api/onboarding/progress/route.test.ts` | red |
| 9 | integration | RLS — user B cannot patch user A org progress | same | red |
| 10 | component | wizard blocks step > maxReachableStep | `setup-wizard-client.test.tsx` | red |
| 11 | component | skip Xero shows consequence dialog | same | red |
| 12 | component | sidebar shows Sales link when gate open | `app-sidebar.test.tsx` | red |
| 13 | e2e | org → venue → square (mock) → sales page → finalize | `e2e/onboarding.spec.ts` | red |

## 2. Unit tests

### `module-gates.ts`

- Input: `setupProgress` + `squareConnected` + `setupCompleted`.
- Cases: only sales; sales+purchasing after suppliers flag; all unlocked after finalize.

### `inferResumeStep`

- Extend when step 4+ tracking added (optional steps).

## 3. Integration tests (DB + RLS)

### Fixtures (`test/fixtures/onboarding.ts`)

- Whitelisted user A, org owner membership, one venue, no Square.

### Cases

| Case | Expected |
|------|----------|
| Owner reads onboarding state | 200 + venues |
| Non-member finalize | 403 |
| Finalize without venues | 400 |
| Finalize without Square (flag on) | 400 |
| Venue `data_starts_from` in past | 400 if future-dated policy added |

## 4. E2E

- Use Square sandbox OAuth or test-only `POST /api/test/square-connect` if exists; else mock connection row via admin DB helper in test setup.

## 5. Fixtures

- Deterministic org slug `test-onboarding-org`.
- Clean `setup_completed_at` between tests.

## 6. Coverage targets

- Every row in [`flows.md`](flows.md) §2 maps to test #6–8 or #11.

## 7. Out of scope (Phase 1b)

- Agent widget rendering — manual QA until 1b.

## 8. Refactor checklist (after green)

- [ ] Collapse duplicate Square connection checks (wizard + finalize)
- [ ] Export gate types from single `module-gates.ts`
- [ ] Align `inferResumeStep` with server-side resume index
