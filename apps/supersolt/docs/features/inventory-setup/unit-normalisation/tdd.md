# Inventory Setup Phase 2 (Unit Normalisation) — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order for the normalisation wizard.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `classifyRawItemBucket()` flags fuel surcharge / delivery fee keywords | `server/inventory-normalisation/classify-raw-item-bucket.test.ts` | red |
| 2 | unit | `classifyRawItemBucket()` returns `main` for produce-like descriptions | same | red |
| 3 | unit | `computeCostPerBaseUnitCents()` — $32 / 10 kg → 320 cents/kg | `server/inventory-normalisation/compute-cost-per-base-unit.test.ts` | red |
| 4 | unit | `computeCostPerBaseUnitCents()` rejects zero/negative unitsPerPack | same | red |
| 5 | unit | `evaluateInventorySetupProgress()` — normalise unlocked when phase1 complete | `server/inventory-setup/inventory-setup-progress.test.ts` | red |
| 6 | unit | `evaluateInventorySetupProgress()` — phase2Complete when pendingCount = 0 | same | red |
| 7 | unit | `evaluateInventorySetupProgress()` — phase2 incomplete when any pending | same | red |
| 8 | unit | `evaluateInventorySetupProgress()` — re-open warning when new pending after phase2 was complete | same | red |
| 9 | unit | `parseNormalisationSuggestionSchema` rejects invalid packUnit | `server/inventory-normalisation/inventory-normalisation.schemas.test.ts` | red |
| 10 | unit | `normalisationSuggestService` maps LLM output to suggestion DTO (mocked `generateObject`) | `server/inventory-normalisation/normalisation-suggest.service.test.ts` | red |
| 11 | unit | `normalisationSuggestService` retries once then throws degradable error | same | red |
| 12 | integration | Commit creates ingredient + supplier_product + links raw item | `server/inventory-normalisation/inventory-normalisation.service.test.ts` | red |
| 13 | integration | Commit link mode attaches to existing ingredient (no duplicate) | same | red |
| 14 | integration | Skip sets status skipped; unskip returns pending | same | red |
| 15 | integration | Edit updates supplier_product without duplicating | same | red |
| 16 | integration | RLS: org member reads queue; other org empty | `server/inventory-normalisation/inventory-normalisation.rls.test.ts` | red |
| 17 | API | POST commit returns 403 for staff role | `server/inventory-normalisation/inventory-normalisation.service.test.ts` | red |
| 18 | API | POST suggest returns 503 with degrade hint when OpenAI fails | same | red |
| 19 | API | GET progress returns `phase2Complete` and unlocked normalise step | `server/inventory-setup/inventory-setup.service.test.ts` | red |
| 20 | component | `NormalisationWizardSheet` renders 4 steps and confirm preview | `entities/inventory-normalisation/components/normalisation-wizard-sheet.test.tsx` | red |
| 21 | component | Wizard shows manual banner when suggest fails | same | red |

**Deferred:** Playwright E2E — manual smoke in [`flows.md`](flows.md) §5.

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### `classifyRawItemBucket`

- **Subject:** `server/inventory-normalisation/classify-raw-item-bucket.ts`
- **Cases:**
  - `"Fuel surcharge"` → `likely_non_inventory`
  - `"Delivery fee - Metro"` → `likely_non_inventory`
  - `"Gourmet tomato 10kg - Box"` → `main`
  - Case-insensitive keyword match
  - Empty description → `main` (no false skip)

### `computeCostPerBaseUnitCents`

- **Subject:** `server/inventory-normalisation/compute-cost-per-base-unit.ts`
- **Cases:**
  - `{ unitPriceCents: 3200, unitsPerPack: 10, packUnit: "kg" }` → `320` cents/kg
  - `{ unitPriceCents: 500, unitsPerPack: 1, packUnit: "each" }` → `500`
  - `unitsPerPack: 0` → validation error

### `evaluateInventorySetupProgress` (extend)

- **Subject:** `server/inventory-setup/inventory-setup-progress.ts`
- **New args:** `{ supplierCount, rawItemCount, pendingRawItemCount }`
- **Cases:**
  - Phase 1 incomplete → `normalise` locked
  - Phase 1 complete, `pendingRawItemCount: 5` → `normalise` pending, `currentStep: normalise`
  - `pendingRawItemCount: 0` with `rawItemCount >= 1` → `phase2Complete: true`, `normalise` complete
  - All skipped (no pending) → phase2 complete
  - `phase2Complete` was true, new pending appears → `phase2Complete: false`, `hasNewPendingSinceComplete: true`

### `normalisationSuggestService`

- **Subject:** `server/inventory-normalisation/normalisation-suggest.service.ts`
- **Mocks:** `generateObject` from `ai`; fixture raw item with `Gourmet tomato 10kg - Box - $32`
- **Cases:**
  - Returns structured fields matching Zod schema
  - Uses `last_unit_price_cents` when LLM returns null price
  - OpenAI missing → throws `SuggestUnavailableError` (client shows manual path)
  - First call fails, second succeeds → success without user retry

## 3. Integration tests (DB + RLS)

Run against local Supabase for `apps/supersolt` (`supabase start` + apply migrations including `supplier_raw_items`).

### Setup

```ts
// test/fixtures/inventory-normalisation.ts
// org A, venue V1, supplier S1, raw items:
//   R1 pending "Box of Tomatoes 10kg"
//   R2 pending "Fuel surcharge"
//   R3 normalised (pre-linked product)
// user U1 manager org A, U2 staff org A, U3 member org B
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| U1 GET queue | manager, org A | pending rows for org suppliers |
| U3 GET queue | member, org B | empty / no cross-org rows |
| U1 POST commit (create) | manager | ingredient + supplier_product + R1 normalised |
| U1 POST commit (link) | manager | existing ingredient_id set, one new supplier_product |
| U1 POST skip R2 | manager | R2 status skipped |
| U1 POST unskip R2 | manager | R2 status pending |
| U1 PATCH edit R3 | manager | supplier_product name updated, still normalised |
| Staff POST commit | staff | 403 |

## 4. API / service tests (mocked boundaries)

### `inventory-normalisation.service.test.ts`

- **Commit create:** verifies transaction order (ingredient insert → product insert → raw update).
- **Commit link:** no ingredient insert; `ingredientId` on product.
- **makeActiveSource:** sets `isActiveForIngredient` and propagates cost (mock `propagateIngredientCost`).
- **Duplicate commit:** idempotent update, not second product row.

### `inventory-setup.service.test.ts` (extend)

- Progress payload includes `phase2Complete`, `pendingRawItemCount`, `normalise` step not locked when phase1 complete.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/inventory-normalisation.ts`
- **Contents:** raw items in three statuses; one supplier; one existing ingredient for link tests.
- **Reset:** transaction rollback per test.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on `server/inventory-normalisation/*` | ≥80% | Changed paths only |
| Progress evaluator extended cases | 100% | §2 |
| Integration cases §3 | 100% present | Review before merge |
| E2E | Manual smoke | [`flows.md`](flows.md) §5 |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` sheet animation internals.
- OpenAI model quality / prompt tuning — assert schema mapping only.
- Full Master Inventory List CRUD (owned by ingredients entity).
- Phase 1 import orchestration (parent [`../tdd.md`](../tdd.md)).

## 8. Refactor checklist (after green)

- [ ] Suggest Zod schema shared between service and client preview types.
- [ ] Commit service reuses `supplierProductsService` upsert paths where possible (no duplicated pack validation).
- [ ] Single `evaluateInventorySetupProgress` drives index redirect, section nav locks, and stepper banner.
- [ ] Keyword list for non-inventory centralised in `classify-raw-item-bucket.ts` (easy to extend).
- [ ] No app-to-app imports.
