# Dashboard Superbot suggestions card — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code where practical. Order matters.

| # | Layer | Behavior under test | File (proposed) | Status |
|---|-------|---------------------|-----------------|--------|
| 1 | unit | Exported **`dummySuperbotSuggestions` (or equivalent)** array is **non-empty** and every item has **stable `id`**, **title**, **description**, **ctaLabel**, and **path suffix** (or agreed href fields) | `apps/supersolt/entities/dashboard/model/dummy-superbot-suggestions.test.ts` | red |
| 2 | unit | **Carousel index helper** (if extracted): advancing from last index wraps to **0** | same or `.../lib/superbot-suggestions-carousel.test.ts` | red |
| 3 | component (RTL) | With **reduced motion off** and **fake timers**, after **10s** the visible headline **advances** to the next suggestion | `apps/supersolt/entities/dashboard/components/superbot-suggestions-card.test.tsx` | red |
| 4 | component (RTL) | **Pointer enter** the card root **pauses** advance; after **pointer leave**, timer **resumes** (elapsed behavior may reset segment—document chosen rule in test name) | `superbot-suggestions-card.test.tsx` | red |
| 5 | component (RTL) | Clicking a **header icon** for suggestion **N** shows suggestion **N**’s title/body and **resets** the auto-advance timer | `superbot-suggestions-card.test.tsx` | red |
| 6 | component (RTL) | With **`prefersReducedMotion` mocked true**, **no** `advance` after **10s** fake timer; user can still **click icon** to change slide | `superbot-suggestions-card.test.tsx` | red |
| 7 | component (RTL) | When **`resolvedScope` is null** (mock `useScopedNavigation`), primary CTA is **disabled** (per [`plan.md`](plan.md) §6) | `superbot-suggestions-card.test.tsx` | red |
| 8 | e2e | **Deferred** — no Playwright in app scripts; see [`flows.md`](flows.md) §6 manual smoke | n/a | n/a |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Dummy model invariant

- **Subject:** exported suggestions list in `apps/supersolt/entities/dashboard/model/dummy-superbot-suggestions.ts` (name may vary).
- **Cases:**
  - `length >= 1`
  - every entry has non-empty `id`, `title`, `description`, `ctaLabel`, and path fields required by [`plan.md`](plan.md) §6
- **Runner:** Vitest (`pnpm --filter supersolt test`), configured at app root.
- **No mocks** for static data.

### Optional pure helper

- **Subject:** `getNextIndex(length, current)` or similar if logic is non-trivial.
- **Cases:** wrap at end, noop for length `0` (defensive—card should not render).

## 3. Integration tests (DB + RLS)

**n/a** for MVP — no database surface ([`plan.md`](plan.md) §4–§5).

## 4. End-to-end (happy path)

- **Tool:** Playwright **not** in `apps/supersolt/package.json` scripts for this slice.
- **Manual smoke:** listed in [`flows.md`](flows.md) §6.

## 5. Fixtures and seed data

- **Location:** static module only—no DB fixtures.
- **Determinism:** fixed copy in `dummy-superbot-suggestions.ts`; tests assert on **ids** or stable substrings, not timestamps.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| New/changed files under `entities/dashboard/` | tests listed in §1 present | Before merge |
| Integration / E2E | n/a this slice | — |
| Architecture lint | clean | `pnpm lint:architecture` from repo root ([ARCHITECTURE.md §4.2](../../../../../ARCHITECTURE.md)) |

## 7. What NOT to test here

- Internals of `@workspace/ui` `Card` / `Button`.
- **Next.js** navigation side effects beyond what RTL can observe (e.g. full route change)—assert **`href`** on `Link` when scope is set instead.
- **Animation keyframes** pixel-perfect—assert **class presence** or **aria** / content state, not GPU timing.

## 8. Refactor checklist (after green)

- [ ] Timer logic lives in one place (`useEffect` + `useRef` or small custom hook) to avoid duplicate intervals.
- [ ] **Cleanup** intervals on unmount; no timers firing after unmount (RTL unmount assertion optional).
- [ ] No `any`; suggestion type exported from model.
- [ ] No app-to-app imports ([ARCHITECTURE.md §3.1](../../../../../ARCHITECTURE.md)).
- [ ] No `@workspace/ui` → Supabase coupling introduced.
- [ ] Component file stays readable; split subcomponents if it grows past **~200–250** lines.
