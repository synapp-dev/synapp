# Inventory Setup — Inline Create Recipe from POS

> **Product:** `apps/supersolt`
> **Slug:** `pos-recipe-inline-create` (child of `inventory-setup`, sibling to `pos-catalog-import`)
> **Status:** Implemented (description→ingredient suggestion uses a deterministic parser; see §11)
> **Route:** `/{organisation}/{venue}/settings/inventory-setup/pos-items`
> **Owner:** TBD
> **Created:** 2026-06-13

## 1. Summary

After importing POS lines from Square (`menu_items`), operators must attach a recipe to every in-use line so the consumption engine (sales × recipe BOM) and gross-profit reporting work. Today the POS Items setup table only lets you **select an existing recipe** — but at that point in setup almost no recipes exist yet (chicken-and-egg). This feature makes the **POS Items table the single recipe-creation worklist**: each in-use line gains an inline **`+ Create new recipe`** action that opens the recipe editor **prefilled from the POS line** (name, Square price → GP target, category), and on save **auto-links** the recipe via `menu_item_recipes`.

It also closes a real gap: mapping a recipe today writes only the junction row and never recomputes `menu_items.cost_per_serve_cents` / `gp_percent`, so GP sits at `0`. This feature recomputes cost/GP on **every** map (inline-created or selected-existing) and surfaces **cost/serve + GP%** on the table so the payoff is visible where the work happens.

**Personas:** Venue manager, owner, or org admin completing setup after POS catalog import (Phase 3).

**Parent specs:** [`../plan.md`](../plan.md) (Phase 1), [`../unit-normalisation/plan.md`](../unit-normalisation/plan.md) (Phase 2), [`../pos-catalog-import/plan.md`](../pos-catalog-import/plan.md) (Phase 3 — this extends it).

### Grill-me decisions (locked)

| Topic | Decision |
|-------|----------|
| Worklist surface | POS Items table is the driving worklist; recipe is created inline per line |
| Create entry | `+ Create new recipe` option at top of the existing recipe `<Select>`; opens prefilled editor |
| Prefill — name | `menu_items.name` |
| Prefill — pricing | Seed recipe `suggestedPrice` / GP target from Square `menu_items.price_cents` |
| Prefill — category | Best-effort keyword map from `menu_items.section_name`; default `other`; user editable |
| Prefill — ingredients (AI) | AI-parse the POS item's Square **description** (`menu_item_groups.description`, e.g. "Chicken Schnitzel, Rocket, Pickled Onion, Salsa Verde") into suggested recipe ingredient lines, matched against the master inventory; user confirms/edits. Degrades gracefully when no description |
| Auto-link | Client orchestrates: `POST recipes` → `PUT …/pos-items/[menuItemId]/recipe` (existing `mapRecipe`) |
| Double-create guard | Disable Confirm while in-flight + clear the create-intent on success so a retry maps the existing recipe instead of re-creating |
| GP/cost recompute | `mapRecipe` recomputes `menu_items.cost_per_serve_cents` / `gp_percent` from linked recipes (applies to select-existing too) |
| Table columns | Add **cost/serve** + **GP%**; show **"incomplete recipe"** hint when linked recipe cost is `0` |
| Editor placement | Promote `recipe-editor-drawer-content` to `entities/recipes/components/`; re-export shim at old `menu/recipes/_components/` path (§7.2) |
| Reuse existing | Select-existing dropdown stays — shared recipes (Small/Large variants) are not duplicated |
| Completion gate | Unchanged: POS step complete when all in-use lines mapped; a linked draft counts; hint is non-blocking |
| Data model | No migration — `cost_per_serve_cents` / `gp_percent` columns and `menu_item_recipes` already exist |
| Rollout | Ship fully — no feature flag, no new env |

## 2. Scope

### In scope (MVP)

- **Inline create** — `+ Create new recipe` entry in the POS row recipe control opens the (promoted) recipe editor drawer, prefilled from the POS line.
- **Prefill mapping** — pure helpers: name passthrough, `price_cents` → GP-target seed, `section_name` → recipe `category` keyword map (default `other`).
- **Description → ingredient suggestion (AI)** — when the POS item's group has a Square `description`, call an LLM-backed suggest endpoint that parses it into candidate ingredient lines (name + best-match against master `ingredients`); prefill the editor's Ingredients tab with confirm/edit. Reuses the existing normalisation LLM stack (`server/inventory-normalisation/normalisation-suggest.service.ts` pattern). Source: `menu_item_groups.description` (see [`../pos-catalog-import/plan.md`](../pos-catalog-import/plan.md)).
- **Auto-link on save** — client calls existing recipe create, then existing `mapRecipe`; success closes the drawer and refreshes the row.
- **GP/cost recompute in `mapRecipe`** — server recomputes `menu_items.cost_per_serve_cents` (`Σ recipe.costPerServeCents × component qty`) and `gp_percent` (`(price − cost)/price × 100`) on link **and** on clear. Applies to all callers (inline-created + select-existing).
- **POS table columns** — add **cost/serve** and **GP%**; render **"incomplete recipe"** hint when the linked recipe’s `cost_per_serve_cents` is `0`.
- **Editor promotion** — move `recipe-editor-drawer-content` into `entities/recipes/components/`; thin re-export shim left at the old route path.
- **Auth** — venue member read; manager+ writes (reuse `assertInventorySetupWriteAccess`).

### Out of scope (deferred)

- **Multi-recipe composition per POS line** — existing `menu_item_recipes` supports many; MVP stays single-recipe (qty `1`), matching `pos-catalog-import`.
- **Modifier / combo / variation grouping** — no auto-merge of Small/Large into one recipe; operator reuses via the dropdown.
- **Batch / sub-recipe creation from POS** — recipe editor already supports sub-recipes; no POS-specific batch flow.
- **Reordering setup steps** — POS stays before Recipes in nav; the Recipes section remains the library/review surface.
- **Channel pricing / GST mode changes** — untouched.
- **Backfill of GP for already-mapped lines** — recompute happens on next map/clear; a one-shot backfill is a follow-up (see §10).
- **Playwright E2E in CI** — manual smoke per [`flows.md`](flows.md) §5.

### Non-goals

- Replacing the full Menu Items admin (`menu/menu-items`) editor or its multi-recipe component model.
- Auto-publishing recipes — inline-created recipes start as `draft` and are completed by adding ingredients/method.
- **Auto-committing** AI-suggested ingredients — the LLM parses the description into *candidate* lines that prefill the Ingredients tab; the user must confirm. Quantities are best-effort/blank (the description rarely states amounts) and stay user-entered. No silent recipe writes.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Recipe editor location | **Promote** to `entities/recipes/components/recipe-editor-drawer/`; re-export shim at `app/(main)/.../menu/recipes/_components/recipe-editor-drawer-content.tsx` | §7.1, §7.2 |
| POS table + create wiring | `entities/pos-catalog-import/components/` (extend existing) | §7.1 |
| Prefill helpers | `entities/pos-catalog-import/model/` (pure) | §7.1 |
| GP/cost recompute | `server/pos-catalog-import/pos-catalog-import.service.ts` (extend `mapRecipe`) reusing `server/menu-items/menu-items.service.ts` compute helpers | §7.1 |
| Auth dependency | `requireRequestAuth` + Drizzle RLS; manager+ in service | §3.2, §8.1 |
| New package edges | None | §3.2, §10 |

> "New package edges" is empty → no `ARCHITECTURE.md` update required (checklist §G).

### §7.2 migration note (editor promotion)

The recipe editor is moved into `entities/recipes/` because it now has a **real second consumer** (POS Items page + Recipes page). Per §7.2 we leave a **re-export shim** at the old route-colocated path so the Recipes page (and any deep imports) keep working unchanged while the canonical home becomes `entities/recipes/components/`.

## 4. Data model

**No migration of its own.** Cost/GP columns and `menu_item_recipes` already exist. The description → ingredient assist **reads** `menu_item_groups.description`, which is created by the [`pos-catalog-import`](../pos-catalog-import/plan.md) catalog-model migration — so this feature ships **after** that migration is applied (it degrades gracefully to "no description" if absent).

### Tables touched (writes)

| Table | Role |
|-------|------|
| `recipes` | New recipe created via existing recipes service (status `draft`, prefilled name/category/GP target) |
| `menu_item_recipes` | Link row `(menu_item_id, recipe_id, quantity = 1)` written by existing `mapRecipe` |
| `menu_items` | `cost_per_serve_cents` + `gp_percent` recomputed on map/clear (this feature) |

### Cost / GP recompute (no schema change)

On `mapRecipe` link or clear, recompute from the menu item’s linked recipes:

```text
cost_per_serve_cents = Σ ( recipe.cost_per_serve_cents × menu_item_recipes.quantity )
gp_percent           = price_cents > 0
                         ? round( (price_cents − cost_per_serve_cents) / price_cents × 100, 2 )
                         : 0
```

Reuse the existing helpers in `server/menu-items/menu-items.service.ts` (`computeGpPercent`, cost aggregation) rather than duplicating the math.

### RLS

No new policies. Existing policies on `recipes`, `menu_item_recipes`, `menu_items` apply (manager+ writes enforced in service via `assertInventorySetupWriteAccess` + Drizzle RLS).

### Generated types

No DB change → no `drizzle:pull` needed.

## 5. API surface

Reuses existing endpoints; only `mapRecipe` behavior is extended.

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| List POS setup rows | Route GET | `…/inventory-setup/pos-items` | Venue member | Extend response with `costPerServeCents`, `gpPercent`, `recipeCostIncomplete` |
| Create recipe | Route POST | `…/recipes` (existing `recipesApi`) | Manager+ | Body prefilled from POS line; returns `recipeId` |
| Map recipe (extended) | Route PUT | `…/inventory-setup/pos-items/[menuItemId]/recipe` | Manager+ | Body `{ recipeId }` or `{ recipeId: null }`. **Now also recomputes** `cost_per_serve_cents` / `gp_percent` |
| Suggest ingredients from description | Route POST | `…/inventory-setup/pos-items/[menuItemId]/recipe-ingredient-suggestions` | Manager+ | LLM parses group `description` → candidate ingredient lines matched to master inventory; returns `{ suggestions: [{ name, ingredientId? , quantity?, unit? , confidence }] }` |
| Setup progress | Route GET | `…/inventory-setup/progress` | Venue member | Unchanged (completion still = all in-use mapped) |

### Prefill helpers (pure, client + reusable)

```ts
// entities/pos-catalog-import/model/recipe-prefill.ts
export function mapSectionNameToRecipeCategory(sectionName: string): RecipeCategory
//   contains drink|coffee|bev|tea|juice|soda      → "drinks"
//   contains dessert|cake|sweet|ice cream|gelato  → "desserts"
//   contains side|fries|chips                      → "sides"
//   contains prep|batch|base|sauce|stock           → "prep"
//   else                                           → "other"
export function buildRecipePrefillFromPosLine(row: PosCatalogImportRow): RecipePrefill
//   { name: row.name, category, suggestedPriceCents: row.priceCents, gpTargetPercent: default }
```

### Description → ingredient suggestion (server, LLM)

```ts
// server/pos-catalog-import/suggest-recipe-ingredients.service.ts
// Input:  { description, venueIngredients: { id, name, unit }[] }
// LLM:    parse free-text description → ingredient names; fuzzy-match to venueIngredients
// Output: { suggestions: [{ name, ingredientId | null, quantity | null, unit | null, confidence }] }
// Pattern: mirrors server/inventory-normalisation/normalisation-suggest.service.ts
//          (graceful 503 → editor shows description as plain reference; manual entry).
```

Suggestions are **never auto-committed** — they prefill the editor's Ingredients tab for the user to confirm/edit (no silent recipe writes).

### Validation

- Recipe create validation unchanged (existing `recipes` Zod schema).
- `mapRecipe` body unchanged (`{ recipeId: string | null }`).
- Errors map to rows in [`flows.md`](flows.md) §2.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/
│   ├── settings/inventory-setup/pos-items/
│   │   └── page.tsx                                  # unchanged thin wrapper
│   └── menu/recipes/_components/
│       └── recipe-editor-drawer-content.tsx          # → re-export shim (§7.2)
├── entities/recipes/
│   └── components/recipe-editor-drawer/              # NEW canonical home (moved)
│       ├── recipe-editor-drawer-content.tsx
│       └── index.ts
├── entities/pos-catalog-import/
│   ├── model/
│   │   ├── recipe-prefill.ts                          # NEW pure helpers
│   │   └── types.ts                                   # extend PosCatalogImportRow
│   └── components/
│       ├── pos-catalog-import-page.tsx                # add cost/serve + GP% columns + hint
│       └── pos-item-recipe-select.tsx                 # add "+ Create new recipe" entry
└── server/
    ├── pos-catalog-import/pos-catalog-import.service.ts   # extend mapRecipe (recompute)
    └── menu-items/menu-items.service.ts                   # reuse compute helpers (export if needed)
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Select, Table, Drawer/Sheet, Badge, Button | `@workspace/ui` | Reuse; no Supabase imports |
| `RecipeEditorDrawer` | `entities/recipes/components/recipe-editor-drawer/` | Accepts optional `prefill` + `onCreated(recipeId)` |
| `PosItemRecipeSelect` | `entities/pos-catalog-import/components/` | Dropdown + `+ Create new recipe`; opens drawer |
| `PosCatalogImportPage` | `entities/pos-catalog-import/components/` | New cost/serve + GP% columns + incomplete hint |

### Recipe editor prop extension

The promoted editor gains optional props (additive, non-breaking for the Recipes page):

```ts
type RecipeEditorDrawerProps = {
  // …existing
  prefill?: { name?: string; category?: RecipeCategory; suggestedPriceCents?: number };
  onCreated?: (recipeId: string) => void; // POS page uses this to auto-map
};
```

### Theming

Tokens from `@workspace/ui` (§6). No new product override stylesheet.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — select, table, drawer/sheet, badge, button, toast.
- `@/lib/api/client` — `entities/pos-catalog-import/api/endpoints.ts`, `entities/recipes/api/endpoints.ts`.
- React Query hooks — `useRecipeMutations`, `posCatalogImportApi`, recipe queue/list queries.
- LLM stack already used by `server/inventory-normalisation/normalisation-suggest.service.ts` (AI SDK + model config) for description → ingredient suggestion.

### New external deps

None — reuses the existing AI SDK / model configuration.

### New package edges

None — no `ARCHITECTURE.md` update required (§10).

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../.cursor/skills/commit-organizer/SKILL.md). Each commit leaves the tree green.

1. `docs(supersolt): plan inventory-setup pos-recipe-inline-create` — this triad + parent links.
2. `test(supersolt): red tests for mapRecipe cost/gp recompute` — see [`tdd.md`](tdd.md) §1.
3. `feat(supersolt): recompute menu_item cost_per_serve/gp on recipe map+clear` — green for #2; reuse menu-items compute helpers.
4. `refactor(supersolt): promote recipe editor to entities/recipes with shim` — move + re-export; recipes page unchanged.
5. `test(supersolt): red tests for recipe prefill + category map` — pure helper tests.
6. `feat(supersolt): add recipe prefill helpers from POS line` — green for #5.
7. `feat(supersolt): inline create-recipe entry on POS recipe select` — drawer open + auto-map orchestration + double-create guard.
8. `test(supersolt): red tests for description→ingredient suggestion` — service + degraded path.
9. `feat(supersolt): description→ingredient AI suggest endpoint + prefill Ingredients tab` — reuse normalisation LLM pattern; confirm-before-commit.
10. `feat(supersolt): cost/serve + GP% columns + incomplete hint on POS table` — extend list response + UI.
11. `feat(supersolt): handle inline-create + suggest error + alt flows` — coverage for [`flows.md`](flows.md).
12. `docs(supersolt): mark pos-recipe-inline-create complete` — flip status.

## 9. Telemetry

Server structured logs only (matches `pos-catalog-import` — no client analytics in MVP).

| Log prefix | Trigger | Payload |
|------------|---------|---------|
| `[pos-catalog-import] recipe_created_inline` | Recipe created via POS create flow | `{ venueId, userId, menuItemId, recipeId }` |
| `[pos-catalog-import] ingredient_suggest` | Description parsed for ingredients | `{ menuItemId, hasDescription, suggestionCount, matchedCount }` |
| `[pos-catalog-import] recipe_mapped` | PUT recipe (link or clear) | `{ menuItemId, recipeId, costPerServeCents, gpPercent }` |
| `[pos-catalog-import] recipe_cost_incomplete` | Mapped recipe has `cost_per_serve_cents = 0` | `{ menuItemId, recipeId }` |

## 10. Rollout

- **Feature flag:** none — ship fully.
- **Env vars:** none new (reuses Square/auth config).
- **Migration sequencing:** none (no DDL).
- **Backfill:** existing already-mapped lines keep stale `cost_per_serve_cents = 0` until next map/clear; optional follow-up one-shot recompute script (`apps/supersolt/scripts/recompute-menu-item-costs.ts`) is **deferred** (§2 out of scope).
- **Backout:** revert app deploy. No data migration to unwind; recompute is idempotent and forward-safe. Inline-created recipes remain (forward-only, harmless drafts).

## 11. Open questions / decisions

- [x] Default `gpTargetPercent` seed for prefilled recipes — **reuses the editor's existing default (65%)**. The POS Square sell price is surfaced as a read-only reference in the editor's Details tab; the editor still derives suggested price from cost + GP target.
- [x] Backfill script — **deferred** (out of scope §2). Already-mapped lines recompute on next map/clear.
- [x] Description → ingredient suggestion — implemented as a **deterministic parser** (`server/pos-catalog-import/suggest-recipe-ingredients.service.ts`) rather than an LLM call. Square descriptions are comma-separated component lists, so a pure splitter + fuzzy-match against master ingredients is reliable, always available (no 503 path needed), and fully unit-tested. The endpoint is `GET …/pos-items/[menuItemId]/recipe-ingredient-suggestions` (read-only, venue member; create remains manager+). LLM enrichment can layer on later behind the same endpoint contract.

## 12. Cross-references

- Parent Phase 1: [`../plan.md`](../plan.md)
- Phase 2 normalisation: [`../unit-normalisation/plan.md`](../unit-normalisation/plan.md)
- Phase 3 POS import (extended here): [`../pos-catalog-import/plan.md`](../pos-catalog-import/plan.md)
- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
