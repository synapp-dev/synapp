# POS Catalog Import (Square) — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `buildMenuItemName()` combines item + variation names | `server/inventory-setup/map-square-catalog-to-menu-drafts.test.ts` | red |
| 2 | unit | `filterVariationForLocation()` includes `present_at_all_locations` | same | red |
| 3 | unit | `filterVariationForLocation()` includes variation with venue location id | same | red |
| 4 | unit | `filterVariationForLocation()` excludes variation not at venue location | same | red |
| 5 | unit | `mapSquareCatalogToMenuDrafts()` resolves CATEGORY → `section_name` | same | red |
| 6 | unit | `mapSquareCatalogToMenuDrafts()` sets `showOnMenu` from sold-out / availability | same | red |
| 7 | unit | `mapSquareCatalogToMenuDrafts()` skips non-ITEM_VARIATION objects | same | red |
| 8 | unit | `computeMissingFromSquare()` flags linked ids absent from latest pull | `server/pos-catalog-import/pos-catalog-import.service.test.ts` | red |
| 9 | unit | `evaluateInventorySetupProgress()` — POS step locked until `phase2Complete` | `server/inventory-setup/inventory-setup-progress.test.ts` | red |
| 10 | unit | `evaluateInventorySetupProgress()` — POS pending when import never run | same | red |
| 11 | unit | `evaluateInventorySetupProgress()` — POS pending when unmapped in-use rows remain | same | red |
| 12 | unit | `evaluateInventorySetupProgress()` — POS complete when import ran + all in-use mapped | same | red |
| 13 | unit | `listSquareCatalogPage()` parses cursor pagination (mocked fetch) | `server/square/list-catalog.test.ts` | red |
| 14 | integration | Import creates `menu_item` + catalog link for new variation | `server/inventory-setup/square-catalog-import.service.test.ts` | red |
| 15 | integration | Re-import updates linked menu item fields | same | red |
| 16 | integration | Re-import does not touch menu items without catalog link | same | red |
| 17 | integration | Import job steps advance with page progress | same | red |
| 18 | integration | `findActiveForVenue` scopes by `job_type` (xero + square concurrently) | `server/inventory-setup/inventory-setup-import-job.repo.test.ts` | red |
| 19 | API | POST import-from-square 403 for staff role | `server/inventory-setup/square-catalog-import.service.test.ts` | red |
| 20 | API | POST import-from-square 400 when Square not connected | same | red |
| 21 | API | POST import-from-square 400 when `square_location_id` missing | same | red |
| 22 | API | PUT recipe map upserts `menu_item_recipes` | `server/pos-catalog-import/pos-catalog-import.service.test.ts` | red |
| 23 | API | PUT recipe map 404 for menu item outside venue | same | red |
| 24 | component | `PosCatalogImportPage` renders import CTA when Square connected | `entities/pos-catalog-import/components/pos-catalog-import-page.test.tsx` | red |
| 25 | component | Progress dialog shows fetch + upsert steps with counts | `entities/inventory-setup/components/import-progress-dialog.test.tsx` | red |
| 26 | component | Table shows “Missing from Square” badge | `entities/pos-catalog-import/components/pos-catalog-import-page.test.tsx` | red |
| 27 | unit | `mapSquareCatalogToGroupDrafts()` resolves ITEM → group (name, `section_name`, `description`) | `server/inventory-setup/map-square-catalog-to-group-drafts.test.ts` | red |
| 28 | unit | `mapSquareCatalogToModifierDrafts()` maps MODIFIER_LIST/MODIFIER (name, price, `selection_type`, min/max) | `server/inventory-setup/map-square-catalog-to-modifier-drafts.test.ts` | red |
| 29 | unit | `mapSquareCatalogToModifierDrafts()` maps `item.modifier_list_info` → group↔list links with enabled + min/max | same | red |
| 30 | unit | menu draft carries `groupId` (parent ITEM) and `squareRaw` (variation object) | `server/inventory-setup/map-square-catalog-to-menu-drafts.test.ts` | red |
| 31 | unit | `listSquareCatalogPage()` requests `types=…,MODIFIER_LIST,MODIFIER` | `server/square/list-catalog.test.ts` | red |
| 32 | integration | Import upserts `menu_item_groups`, sets `menu_items.group_id`, stores `square_raw` on both | `server/inventory-setup/square-catalog-import.service.test.ts` | red |
| 33 | integration | Import upserts modifier catalog + group links; re-import dedupes (no duplicate groups/lists/modifiers) | same | red |
| 34 | integration | Two variations of same ITEM share one group; group `description` set once | same | red |
| 35 | API | GET `…/pos-items/[id]/modifiers` returns flattened lists → modifiers with selection rules | `server/pos-catalog-import/pos-catalog-import.service.test.ts` | red |
| 36 | API | GET `…/pos-items/[id]/modifiers` 404 for menu item outside venue | same | red |
| 37 | integration | RLS: member reads groups/modifiers; other-org member denied | `server/pos-catalog-import/pos-catalog-import.repo.test.ts` | red |
| 38 | component | Table groups rows by category → subcategory; shows modifier count + opens modifiers drawer | `entities/pos-catalog-import/components/pos-catalog-import-page.test.tsx` | red |

**Deferred:** Playwright E2E — manual smoke in [`flows.md`](flows.md) §5.

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### `mapSquareCatalogToMenuDrafts`

- **Subject:** `server/inventory-setup/map-square-catalog-to-menu-drafts.ts`
- **Fixtures:** Minimal Square catalog JSON — ITEM, two VARIATIONs, CATEGORY, one variation location-scoped to Hawthorn.
- **Cases:**
  - Single-variation item → name = item name only
  - Multi-variation → `"Cappuccino — Large"`
  - Category `PANINI` → `sectionName: "PANINI"`
  - No category → `sectionName: "Uncategorised"`
  - Sold out at venue location → `showOnMenu: false`
  - `price_money.amount: 200` → `priceCents: 200`

### `evaluateInventorySetupProgress` (extend)

- **Subject:** `server/inventory-setup/inventory-setup-progress.ts`
- **New args:** `{ …existing, posImportRan, inUseMenuItemCount, mappedInUseCount }`
- **Cases:**
  - `!phase2Complete` → POS step `locked`
  - `phase2Complete && !posImportRan` → POS `pending`
  - `posImportRan && mappedInUseCount < inUseMenuItemCount` → POS `pending`
  - `posImportRan && mappedInUseCount === inUseMenuItemCount` (inUse > 0) → POS `complete`
  - `inUseMenuItemCount === 0` after import → POS `complete` (nothing to map)

### `listSquareCatalogPage`

- **Subject:** `server/square/list-catalog.ts`
- **Mocks:** `fetch` returns `{ objects: [...], cursor: "abc" }`
- **Cases:**
  - Correct URL query `types=ITEM,ITEM_VARIATION,CATEGORY,MODIFIER_LIST,MODIFIER`
  - Bearer token + `Square-Version` header
  - Sandbox vs production base URL from stored environment

### `mapSquareCatalogToGroupDrafts` (new)

- **Subject:** `server/inventory-setup/map-square-catalog-to-group-drafts.ts`
- **Cases:**
  - ITEM `JUICE` (category DRINKS) → `{ squareItemId, name: "JUICE", sectionName: "DRINKS", description }`
  - ITEM with `description_plaintext` only → description populated from plaintext
  - Missing category → `sectionName: "Uncategorised"`
  - `squareRaw` equals the raw ITEM object

### `mapSquareCatalogToModifierDrafts` (new)

- **Subject:** `server/inventory-setup/map-square-catalog-to-modifier-drafts.ts`
- **Cases:**
  - MODIFIER_LIST "ADD ONS" `selection_type SINGLE` → `single`; otherwise `multi`
  - MODIFIER "Prosciutto" `price_money.amount 200` → `priceCents: 200`
  - `item.modifier_list_info: [{ modifier_list_id, enabled, min/max }]` → group↔list link drafts
  - Modifier with no price → `priceCents: 0`
  - No mocks — pure functions.

## 3. Integration tests (DB + RLS)

Run against local Supabase for `apps/supersolt` (`supabase start` + migrations including `job_type`).

### Setup

```ts
// Fixture: venue V1, square connection with location_id L1, empty menu_items
// Mock list-catalog to return 2 variations (1 at L1, 1 other location only)
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Manager imports catalog | manager | 1 menu_item created, 1 link, 1 group, job `completed` |
| Re-import same catalog | manager | `updated: 1`, name/price refreshed; no duplicate group/modifier rows |
| Import multi-variation ITEM | manager | 2 menu_items share 1 `group_id`; group `description` set |
| Import ITEM with modifier lists | manager | modifier lists + modifiers upserted; `menu_item_group_modifier_lists` links created |
| GET pos-item modifiers | member | flattened lists → modifiers with min/max |
| Staff POST import | staff | 403 |
| Org member GET pos-items list | member | rows returned with group/subcategory/description/modifierCount |
| Other org GET pos-items / modifiers | member org B | empty (RLS) |

## 4. End-to-end (happy path)

- **Tool:** Manual smoke (Playwright not required for MVP).
- **Scenario:** mirrors [`flows.md`](flows.md) §1.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/square-catalog.ts`
- **Contents:** Square Catalog API response snippets — ITEM (incl. `description` + `modifier_list_info`) + multiple VARIATIONs + CATEGORY + MODIFIER_LIST + MODIFIER; deterministic UUIDs for menu/group/modifier/recipe rows.
- **Auth:** existing supersolt test user helpers.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new `server/inventory-setup/*`, `server/square/list-catalog.ts` | ≥80% | Changed paths only |
| Integration cases §3 | 100% present | Reviewed before merge |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- Square API live integration in CI (mock `fetch` / inject catalog fixture).
- `@workspace/ui` primitive snapshots.
- Full menu-items CRUD outside POS setup scope.

## 8. Refactor checklist (after green)

- [ ] Catalog fetch + map + upsert separated (testable pure functions).
- [ ] Job step updates use shared `InventorySetupImportJobTracker` pattern from Xero.
- [ ] No `any` on catalog object shapes — narrow types for fields we read.
- [ ] Progress dialog shared; no duplicated step icon logic.
- [ ] No new app-to-app imports.
