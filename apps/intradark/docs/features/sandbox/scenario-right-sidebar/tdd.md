# Sandbox scenario right sidebar — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). **M1:** Vitest + Testing Library only; **no** Playwright requirement for this slice ([`apps/intradark/package.json`](../../../../package.json) has `vitest`, no `playwright` script).

## 1. Test list (red → green → refactor)

Author each test before its production code where practical. Order matters.

| # | Layer | Behavior under test | File (suggested) | Status |
|---|-------|---------------------|------------------|--------|
| 1 | unit | **Preset id** missing or unknown → normalize to default preset for current `step` / `scenario` | `apps/intradark/lib/sandbox/**/*.test.ts` | red |
| 2 | unit | **Preset id** valid → parsed config matches registry entry | same | red |
| 3 | unit | **Automate runner** schedules steps; **manual** `setStepIndex` / `setScenarioId` / preset change **cancels** pending timers and clears running flag | `apps/intradark/lib/sandbox/**/*.test.ts` or `entities/sandbox/pug-system/**/*.test.ts` | red |
| 4 | unit | **Unmount** (cleanup fn) clears timers and running state | same | red |
| 5 | unit | **URL search param** unknown keys for automate/preset → stripped or clamped; `router.replace` payload stable | same (mock `URLSearchParams` / pure parser) | red |
| 6 | hook (optional) | Slot **register** on mount, **unregister** on unmount; nested navigations do not leak content | `apps/intradark/components/organisms/**/*.test.tsx` | red |
| 7 | component (RTL, optional) | `AppRightSidebar` renders **default** when slot empty | same | red |
| 8 | e2e | **Deferred** — document manual smoke in [`flows.md`](flows.md) §6 | — | n/a |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions / validators

- **Subject:** `normalizeSandboxScenarioQuery` (name TBD) — maps raw `URLSearchParams` + registry metadata → `{ scenarioId, stepIndex, presetId, flags, didNormalize }`.
- **Cases:**
  - Happy path: known `scenario` + `step` + `preset` unchanged.
  - Unknown `preset` → default preset for step + `didNormalize`.
  - Out-of-range `step` → clamp (consistent with [`useSandboxUrlState`](../../../../lib/sandbox/use-sandbox-url-state.ts)).
  - Conflicting automate flag + invalid preset → safe defaults + strip automate.
- **Runner:** `pnpm test` from `apps/intradark` (Vitest).
- **No mocks** for pure string/number parsing.

### Automate scheduler

- **Subject:** small module (e.g. `createAutomateController`) using `setTimeout` / `queueMicrotask` — inject clock via **Vitest fake timers** (`vi.useFakeTimers()`).
- **Assertions:** start → advances mock timeline → cancel on manual interrupt → no further callbacks.

### Hooks / providers

- **Subject:** slot context hook (e.g. `useSandboxRightSidebarSlot`).
- **Setup:** `@testing-library/react` + minimal wrapper matching layout order.
- **Assertions:** default `null`; after `register(<div/>)` content is returned; unmount clears.

## 3. Integration tests (DB + RLS)

**N/A** for this feature — no new tables or policies. Sandbox RBAC remains covered by admin layout / admin-panel tests elsewhere.

## 4. End-to-end (happy path)

- **Tool:** Playwright **not** required for M1 per grill-me agreement.
- **Manual smoke:** see [`flows.md`](flows.md) §6.

## 5. Fixtures and seed data

- **None** for DB. **Preset fixtures** live as **constants** beside pug registry modules (deterministic ids).

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-------------|-------|
| Unit tests in §1 #1–#5 | 100% present before merge | Core safety for timers + URL |
| Integration (§3) | n/a | — |
| E2E | Manual smoke only | Playwright deferred |
| Architecture lint | clean | `pnpm lint:architecture` from monorepo root |

## 7. What NOT to test here

- `@workspace/ui` primitive internals.
- Real Supabase session or RLS (server gate unchanged).
- Full visual snapshot of the entire right sidebar tree.

## 8. Refactor checklist (after green)

- [ ] Single source for **step/scenario** drives both main column and sidebar (avoid duplicate `useSandboxUrlState` instances fighting).
- [ ] Automate logic does not import `@workspace/supabase`.
- [ ] No `any` on public registry types.
- [ ] No app-to-app imports.
- [ ] Split files **>250** lines into `panel` + `registry` + `automate` modules if needed.
