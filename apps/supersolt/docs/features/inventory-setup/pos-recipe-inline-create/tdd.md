# Inline Create Recipe from POS — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code. Order matters: earlier items unblock later ones.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `computeMenuItemCostFromRecipes` sums `recipe.costPerServeCents × qty` across links | `server/menu-items/compute-menu-item-cost.test.ts` | red |
| 2 | unit | `computeGpPercent(price, cost)` → correct %, and `0` when `price ≤ 0` | `server/menu-items/menu-items.service.test.ts` | red |
| 3 | unit | `mapSectionNameToRecipeCategory` maps drinks/desserts/sides/prep keywords; defaults `other` | `entities/pos-catalog-import/model/recipe-prefill.test.ts` | red |
| 4 | unit | `buildRecipePrefillFromPosLine` carries name + `priceCents` → `suggestedPriceCents` + mapped category | `entities/pos-catalog-import/model/recipe-prefill.test.ts` | red |
| 5 | integration | `mapRecipe(link)` writes `menu_item_recipes` AND updates `menu_items.cost_per_serve_cents` + `gp_percent` | `server/pos-catalog-import/pos-catalog-import.service.int.test.ts` | red |
| 6 | integration | `mapRecipe(clear, recipeId=null)` removes link AND resets `cost_per_serve_cents`/`gp_percent` to `0` | same | red |
| 7 | integration | `mapRecipe` with a zero-cost (draft) recipe → cost `0`, `gp_percent` `0`, link still written | same | red |
| 8 | integration | RLS: staff (non-manager) `mapRecipe` → forbidden; venue member GET pos-items → allowed | same | red |
| 9 | integration | POS list response includes `costPerServeCents`, `gpPercent`, `recipeCostIncomplete` | `server/pos-catalog-import/pos-catalog-import.repo.int.test.ts` | red |
| 10 | component | `PosItemRecipeSelect` shows `+ Create new recipe`; selecting it opens the editor drawer | `entities/pos-catalog-import/components/pos-item-recipe-select.test.tsx` | red |
| 11 | component | On editor `onCreated(recipeId)`, the row triggers `mapRecipe` with that id (auto-link) | same | red |
| 12 | component | Confirm disabled while create in-flight; success clears create-intent (no double-create on retry) | same | red |
| 13 | component | POS table renders cost/serve + GP% columns; "incomplete recipe" hint when `recipeCostIncomplete` | `entities/pos-catalog-import/components/pos-catalog-import-page.test.tsx` | red |
| 14 | component | Editor `prefill` populates name/category/suggested price fields | `entities/recipes/components/recipe-editor-drawer/recipe-editor-drawer.test.tsx` | red |
| 15 | regression | Recipes page import via shim still renders editor unchanged | `app/(main)/.../menu/recipes/recipes-page.test.tsx` (existing) | red |
| 16 | unit | `suggestRecipeIngredientsFromDescription` parses "A, B, C" → 3 candidate names | `server/pos-catalog-import/suggest-recipe-ingredients.service.test.ts` | red |
| 17 | unit | Suggestions fuzzy-match to master `ingredients` (id when matched, null otherwise) | same | red |
| 18 | integration | Suggest endpoint 503 when LLM unavailable → editor shows description as reference, manual entry | same | red |
| 19 | integration | No description on group → endpoint returns empty suggestions (no LLM call) | same | red |
| 20 | component | Suggestions prefill Ingredients tab as editable lines; nothing committed until Confirm | `entities/recipes/components/recipe-editor-drawer/recipe-editor-drawer.test.tsx` | red |
| 21 | e2e/manual | POS line → Create recipe → save → row shows mapped + GP% | manual smoke ([`flows.md`](flows.md) §1) | red |

After each item turns green, refactor only the code touched by that item before moving on.

### Implementation status (as shipped)

| Items | Status | Notes |
|-------|--------|-------|
| #1, #2 (cost/gp helpers) | ✅ automated | `server/menu-items/compute-menu-item-cost.test.ts`, `menu-items.service.test.ts`. |
| #3, #4 (prefill helpers) | ✅ automated | `entities/pos-catalog-import/model/recipe-prefill.test.ts`. |
| #16, #17, #19 (description→ingredient parse/match/empty) | ✅ automated | `server/pos-catalog-import/suggest-recipe-ingredients.service.test.ts`. Implemented as a deterministic parser (see plan §11), so #18 (LLM 503) is **N/A** — there is no LLM call to fail; an absent description returns empty (#19). |
| #5–#9 (DB + RLS integration) | ⏳ deferred | The app has **no Supabase integration-test harness** (no `*.int.test.ts`, no `test/fixtures/`, no DB setup in `vitest.config.mts`). Standing one up is separate infra work. The underlying logic is pure-tested (#1–#4, #16–#19) and the service is thin glue. Covered by the manual smoke ([`flows.md`](flows.md) §5) until the harness exists. |
| #10–#15, #20 (component/render) | ⏳ deferred | RTL renders fail under the current Vitest config due to a duplicated React version pulled through the `@workspace/ui` package (Radix dialog → null hook dispatcher). Needs a shared Vitest dedupe/setup fix before component tests are reliable. Covered by manual smoke. |
| #21 (e2e) | manual | Per [`flows.md`](flows.md) §5 (no Playwright in CI for this slice). |

## 2. Unit tests

### Pure functions

- **`computeMenuItemCostFromRecipes(links)`** (`server/menu-items/`)
  - Happy: two links `(120c × 1)`, `(80c × 2)` → `280`.
  - Boundary: no links → `0`; quantity `0` → contributes `0`.
  - Invalid: negative/NaN cost guarded to `0`.
- **`computeGpPercent(price, cost)`** (existing helper)
  - `price 1000, cost 300` → `70`; `price 0` → `0`; `cost > price` → negative %.
- **`mapSectionNameToRecipeCategory`** / **`buildRecipePrefillFromPosLine`** (`entities/pos-catalog-import/model/recipe-prefill.ts`)
  - `"Hot Drinks"` → `drinks`; `"Desserts"` → `desserts`; `"Sides"` → `sides`; `"Prep / Base"` → `prep`; `"Mains"`/unknown → `other`.
  - Prefill carries `name` verbatim and `priceCents` → `suggestedPriceCents`.
  - **No mocks** — pure functions.

## 3. Integration tests (DB + RLS)

Run against the app's local Supabase (`supabase start` in `apps/supersolt`), using the `user-supabase-supersolt-mvp` project for remote checks per [AGENTS.md](../../../../AGENTS.md).

### Setup

```ts
// apps/supersolt/test/fixtures/pos-recipe-inline-create.ts
// Seed: org + venue, one menu_item (price 1000c), one recipe (cost_per_serve 300c),
//       one zero-cost draft recipe, manager user + staff user (deterministic UUIDs).
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Map costed recipe to menu item | manager | link row written; `cost_per_serve_cents = 300`, `gp_percent = 70` |
| Clear recipe link | manager | link removed; `cost_per_serve_cents = 0`, `gp_percent = 0` |
| Map zero-cost draft recipe | manager | link written; cost/GP `0`; `recipeCostIncomplete = true` in list |
| `mapRecipe` as staff | staff (non-manager) | forbidden (RLS / `assertInventorySetupWriteAccess`) |
| GET pos-items as venue member | member | rows returned with cost/GP fields |
| Re-map (idempotent) same recipe | manager | single link row; recompute stable |

> Per [ARCHITECTURE.md §8.1](../../../../../../ARCHITECTURE.md), migrations/RLS live with the owning app. Tests run against supersolt's local DB. (No DDL in this feature.)

## 4. End-to-end (happy path)

- **Tool:** manual smoke (no Playwright in CI for this slice; matches `pos-catalog-import`).
- **Scenario:** mirrors [`flows.md`](flows.md) §1: open POS Items → `+ Create new recipe` on an in-use line → editor prefilled with POS name/price → add one ingredient + method → Confirm → drawer closes, row shows recipe name + cost/serve + GP%.
- **Assert:** `menu_item_recipes` link exists; `menu_items.gp_percent` non-zero; server logs `recipe_created_inline` + `recipe_mapped`.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/pos-recipe-inline-create.ts`.
- **Reset:** truncate + reseed before each integration test.
- **Determinism:** fixed UUIDs/timestamps.
- **Auth:** existing test-user helpers; manager + staff roles to exercise §3 RLS.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new files | ≥80% | Prefill helpers + cost recompute. |
| Integration cases in §3 | 100% present | Reviewed before merge. |
| Component tests #10–#14 | green | Create-intent, auto-map, columns, prefill. |
| Architecture lint | clean | `pnpm lint:architecture` from repo root. |

## 7. What NOT to test here

- `@workspace/ui` primitive internals.
- Supabase internals.
- Full recipe editor form logic already covered by recipes tests (only test the new `prefill` / `onCreated` props here).
- Square import path (covered by `pos-catalog-import` tdd).

## 8. Refactor checklist (after green)

- [ ] Cost/GP math lives **once** (reuse `menu-items.service` helpers; no copy in `pos-catalog-import.service`).
- [ ] Prefill logic is pure and shared (no inline mapping in the component).
- [ ] Editor promotion left a working re-export shim; recipes page imports unchanged.
- [ ] No `any`; generated DB types flow through.
- [ ] No new app-to-app imports; no `@workspace/ui` → Supabase edge.
- [ ] Components remain under ~250 lines; split if larger.
