# Inventory Setup Wizard — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.
> **Tooling:** `vitest` + `jsdom` + `@vitejs/plugin-react` (`apps/supersolt/vitest.config.mts`). No Playwright and no `*.int.test.ts` convention in supersolt — DB/RLS behaviour is covered by **service unit tests using a fake `RlsTx`**, and the happy path is a **documented manual smoke script** ([`flows.md`](flows.md) §1).

## 1. Test list (red → green → refactor)

Author each test before its production code. Order matters: earlier items unblock later ones.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `evaluateInventorySetupProgress` returns new `storageLocationCount` in counts | `server/inventory-setup/inventory-setup-progress.test.ts` | red |
| 2 | unit | `buildWizardModel` maps 4 steps + counts + acks → 4 stages with correct derived completion | `server/inventory-setup/build-wizard-model.test.ts` | red |
| 3 | unit | `buildWizardModel` marks ack-only sub-steps complete iff ack present (`nonInventoryFiltered`, `batchesDone`, `masterListReviewed`, `modifiersConfirmed`, `products.confirmed`) | same | red |
| 4 | unit | soft-linear gating: later-stage sub-steps `locked` with `lockReason` until prior stage complete; dev-unlock bypasses | same | red |
| 5 | unit | staleness: Suppliers/Products sub-step `stale=true` + `staleCount` when derived drifts after an ack; stage stays `complete` | same | red |
| 6 | unit | `inUseMenuItemCount === 0` and "no suppliers" edge cases resolve sensibly (no NaN, no false-complete) | same | red |
| 7 | unit | wizard-state Zod schema rejects unknown stage/ack keys (400) and accepts valid PATCH bodies | `server/inventory-setup/wizard-state.schemas.test.ts` | red |
| 8 | unit (service) | `wizard-state.service` upserts intro/ack into jsonb idempotently via fake `RlsTx`; preserves existing keys | `server/inventory-setup/wizard-state.service.test.ts` | red |
| 9 | unit (service) | `wizard-state.service` throws `AuthError(403)` when `assertInventorySetupWriteAccess` fails (non-manager) | same | red |
| 10 | unit (hook) | `useWizardStateMutation` optimistically flips ack then reconciles with server; rolls back on error | `entities/inventory-setup/model/useWizardStateMutation.test.tsx` | red |
| 11 | component | `InventorySetupWizard` renders 4 stages; current stage auto-expanded; completed stages show check | `entities/inventory-setup/components/wizard/inventory-setup-wizard.test.tsx` | red |
| 12 | component | locked sub-step CTA is disabled and shows `lockReason`; unlocked CTA links to the correct scoped deep-link | `entities/inventory-setup/components/wizard/wizard-substep-list.test.tsx` | red |
| 13 | component | staleness nudge renders on a complete stage and is dismissible without resetting the ack | same | red |
| 14 | component | `SuperbotStageMessage` renders the stage's scripted welcome/why/benefit copy from config | `entities/inventory-setup/components/wizard/superbot-stage-message.test.tsx` | red |

After each item turns green, refactor only the code touched by that item before moving on.

## 2. Unit tests

### Pure functions

- **`evaluateInventorySetupProgress`** (`server/inventory-setup/inventory-setup-progress.ts`) — extend existing tests:
  - Happy: counts pass through incl. `storageLocationCount`.
  - Boundary: `storageLocationCount === 0`, `inUseMenuItemCount === 0` (Products mapping satisfied), `rawItemCount === 0`.
- **`buildWizardModel(progress, wizardState)`** (new pure mapper):
  - Maps `suppliers`+`raw_items` steps → **Suppliers** stage; `normalise` → **Inventory**; `pos_items` → **Products**; storage count → **Storage**.
  - Stage `status`: `complete` when all sub-steps satisfied; `current` for the first incomplete unlocked stage; `locked` otherwise.
  - `lockReason` copy comes from config; null when unlocked.
  - `stale`/`staleCount`: Suppliers uses `pendingRawItemCount` vs `hasNewPendingSinceComplete`; Products uses new-modifiers-since-ack signal.
- **No mocks** for pure functions.

### Schemas & hooks

- **`wizard-state.schemas`** — valid/invalid PATCH bodies; unknown keys rejected against the config's known key set.
- **`useWizardStateMutation`** — wrap with the app's existing query-client test provider; assert optimistic update, success reconcile, error rollback + toast mapping.

## 3. "Integration" (DB + RLS) via service unit tests

Supersolt has no local integration harness for this slice. Cover the data/RLS contract with **service unit tests** that inject a fake `RlsTx`/`ctx`:

| Case | Acting role | Expected |
|------|-------------|----------|
| Manager patches stage ack | manager+ | jsonb upserted, other keys preserved, `at`/`by` stamped |
| Owner / org admin patches | owner/org admin | success (`canManageInventorySetup` true) |
| Venue member (non-manager) patches | member | `AuthError(403)`, no write |
| Read wizard model | any venue member | derived + acks composed; no write path hit |
| Unknown ack key | manager+ | 400 from schema before service write |

> Per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md), the migration/RLS live with supersolt. Real RLS enforcement is exercised end-to-end in the manual smoke script (§4) against the supersolt Supabase project; the service tests assert the **service-layer** manager+ guard.

## 4. End-to-end (manual smoke — no Playwright)

Documented in [`flows.md`](flows.md) §1. Manual script:

1. Sign in as a venue **manager**, open `/{org}/{venue}/settings/inventory-setup` on a fresh venue.
2. Assert the wizard card renders with **Suppliers** current/expanded, later stages locked with reasons.
3. Add a supplier + raw items via the deep-link; return → Suppliers sub-steps tick; ack "filtered non-inventory".
4. Progress to Inventory → normalise to zero pending → ack batches + master list review.
5. Products: import POS, confirm modifiers, map all in-use items → stage completes.
6. Add a storage location → Storage completes → card shows all-done state.
7. Re-import POS modifiers → confirm **Products** stays green with a non-blocking staleness nudge.
8. Sign in as a non-manager → wizard read-only; confirm CTAs disabled with permission copy.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/server/inventory-setup/__fixtures__/wizard.ts` (counts permutations + wizard-state jsonb permutations).
- **Determinism:** fixed UUIDs/timestamps for ack `at`/`by`.
- **Fake tx:** reuse the app's existing `RlsTx` test double pattern from sibling `server/**/*.test.ts`; do not roll a new one.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new files | ≥80% | `buildWizardModel`, schemas, service, mapper. |
| Service guard cases (§3) | 100% present | manager+ / member / unknown-key reviewed before merge. |
| Manual smoke (§4) | executed + noted on PR | No Playwright in supersolt. |
| Architecture lint | clean | `pnpm lint:architecture` from repo root. |

## 7. What NOT to test here

- `@workspace/ui` primitive internals.
- Supabase RLS engine internals (trust the platform; cover the service guard + manual smoke).
- The underlying section pages' own flows (covered by parent `inventory-setup` and sub-feature triads).
- Large component-tree snapshots — prefer behavioural assertions.

## 8. Refactor checklist (after green)

- [ ] Completion logic lives **only** in `evaluateInventorySetupProgress` + `buildWizardModel` (no duplication in components).
- [ ] Narration copy + sub-step/ack keys live **only** in `wizard-stages.ts`; schema validates against that key set.
- [ ] No `any`; generated DB types flow through after `drizzle:pull`.
- [ ] No new app-to-app imports; no `@workspace/ui` → Supabase edge.
- [ ] `SuperbotStageMessage` has no dependency on `entities/ai-agent-chat/`.
- [ ] Each wizard component under ~250 lines; split if larger.
