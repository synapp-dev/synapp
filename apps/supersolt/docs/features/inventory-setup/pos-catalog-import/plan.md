# Inventory Setup — POS Catalog Import (Square)

> **Product:** `apps/supersolt`
> **Slug:** `pos-catalog-import` (child of `inventory-setup`)
> **Status:** Planned
> **Route:** `/{organisation}/{venue}/settings/inventory-setup/pos-items`
> **Owner:** TBD
> **Created:** 2026-06-11
> **Updated:** 2026-06-11

## 1. Summary

Phase 3 of Inventory Setup imports the **Square Item Library** into Supersolt as a three-tier catalog — **category → subcategory (Square ITEM) → POS item (Square ITEM_VARIATION)** — with automatic **Square catalog links** (`menu_item_square_catalog_links`), so operators can tick which POS lines are in use and **map each to a recipe**. It also imports the **modifier catalog** (Square `MODIFIER_LIST` / `MODIFIER`, with selection rules) and each item's **description**, and stores the **raw Square objects** as `jsonb` so no field is lost. This scaffolds the recipe layer that later drives consumption (sales × recipe BOM) and feeds recipe creation ([`../pos-recipe-inline-create/plan.md`](../pos-recipe-inline-create/plan.md)) — the Square description AI-parses into suggested recipe ingredients.

Import uses the public **Square Connect Catalog API** (`GET /v2/catalog/list`), not Square Dashboard internal APIs (`app.squareup.com/api/v3/itemsfe/*`). Progress mirrors the Xero import UX: stepped job in `inventory_setup_import_jobs`, Supabase Realtime subscription, and the shared progress dialog pattern.

### Catalog hierarchy (Square → Supersolt)

| Tier | Square object | Supersolt entity | Example |
|------|---------------|------------------|---------|
| 1 — Category | `CATEGORY` (reporting) | `menu_item_groups.section_name` | DRINKS |
| 2 — Subcategory | `ITEM` | `menu_item_groups` (new) | JUICE, COCA COLA, COTOLETTA |
| 3 — POS item | `ITEM_VARIATION` | `menu_items` (extended, `group_id`) | Apple, Orange / Coca-Cola, Zero |
| Modifier list (+ rules) | `MODIFIER_LIST` | `venue_modifier_lists` (new) | "ADD ONS" (Optional/19 max) |
| Modifier | `MODIFIER` | `venue_modifiers` (new) | Prosciutto, NO Rocket |
| Item → modifier list | `ITEM.modifier_list_info` | `menu_item_group_modifier_lists` (new) | COTOLETTA → ADD ONS, Remove Ingredients |

**Personas:** Venue manager, owner, or org admin completing setup after unit normalisation (Phase 2).

**Parent specs:** [`../plan.md`](../plan.md) (Phase 1), [`../unit-normalisation/plan.md`](../unit-normalisation/plan.md) (Phase 2).

**Client reference:** Stock domain diagram — Square catalog pull → tick in-use → map to recipe (consumption engine deferred).

### Grill-me decisions (locked)

| Topic | Decision |
|-------|----------|
| MVP outcome | Upsert `menu_items` + auto `menu_item_square_catalog_links` |
| Progress UX | Reuse `inventory_setup_import_jobs` + Realtime + stepped dialog (like Xero) |
| Catalog granularity | One `menu_item` per **ITEM_VARIATION**; link `square_catalog_object_id` = variation id |
| Re-import | Upsert by `(venue_id, square_catalog_object_id)`; update name, price, `section_name`, `show_on_menu` |
| Location scope | Venue `square_location_id` only (`present_at_all_locations` or location id match) |
| Post-import map | Lightweight **recipe** link (search/select existing recipe); skip allowed |
| In-use | `show_on_menu`; default from Square availability (Available → true, Sold out/inactive → false) |
| Recipe target | Single existing recipe via `menu_item_recipes` (qty `1`) |
| Import jobs | Add `job_type` (`xero` \| `square_catalog`); one active job per venue **per type** |
| Removed from Square | “Missing from Square” badge only; no auto-archive |
| `section_name` | Square reporting **CATEGORY** name; fallback `"Uncategorised"` |
| **Subcategory tier** | New `menu_item_groups` table = Square **ITEM**; `menu_items.group_id` nullable FK so existing consumers (menu admin, consumption) are unaffected |
| **Modifiers** | Import `MODIFIER_LIST` + `MODIFIER` into venue-wide `venue_modifier_lists` / `venue_modifiers`; link **lists to groups** (`menu_item_group_modifier_lists`) preserving selection rules; flattened read for "modifiers for a POS item" |
| **Description** | Store Square `ITEM.item_data.description` on `menu_item_groups.description`; surfaced for AI recipe-ingredient suggestion in `pos-recipe-inline-create` |
| **Raw capture** | `square_raw jsonb` on `menu_item_groups`, `menu_items`, `venue_modifier_lists`, `venue_modifiers` — full raw object as catch-all |
| **Fetch types** | Add `MODIFIER_LIST,MODIFIER` to catalog list types (was `ITEM,ITEM_VARIATION,CATEGORY`) |
| Modifier → ingredient cost | **Deferred** — raw + catalog stored now; mapping modifiers to recipe cost is a later feature |
| Nested Square categories | Use Square ITEM as subcategory; Square category parent/child tree is captured only in `square_raw` (no dedicated nested-category UI in MVP) |
| Rollout | Ship fully — no feature flag |
| Setup stepper | Add **POS items** step; complete when import ran + all `show_on_menu = true` lines have recipe link; **does not** re-lock downstream sections |

## 2. Scope

### In scope (MVP)

- **Route** `settings/inventory-setup/pos-items` — replace placeholder with full client page.
- **Import from Square** — orchestration service paginates Catalog API (now incl. `MODIFIER_LIST,MODIFIER`), filters variations by venue location, upserts groups + menu rows + catalog links + modifier catalog.
- **Subcategory tier** — upsert `menu_item_groups` (one per Square ITEM at the venue); set `menu_items.group_id`; store item `description` + `square_raw`.
- **Modifier catalog** — upsert `venue_modifier_lists` + `venue_modifiers` (venue-wide, deduped by Square id); link lists to groups via `menu_item_group_modifier_lists` with `enabled` + min/max.
- **Raw capture** — persist `square_raw jsonb` on group, menu item, modifier list, and modifier.
- **Stepped import job** — extend `inventory_setup_import_jobs` with `job_type`; Square-specific steps with page-level progress (`current` / `total`); add a modifier-upsert step.
- **Progress dialog** — generalise `ImportFromXeroProgressDialog` (or shared `InventorySetupImportProgressDialog`) to render steps by `job_type`.
- **POS items table** — grouped by **category → subcategory**; columns: name, price, Square status, in-use toggle (`show_on_menu`), recipe (mapped / unmapped), modifier count, missing-from-Square badge.
- **Recipe map** — inline select existing venue recipe → upsert `menu_item_recipes`; clear link allowed. (Inline create + description AI assist in [`../pos-recipe-inline-create/plan.md`](../pos-recipe-inline-create/plan.md).)
- **Setup progress extension** — `GET …/inventory-setup/progress` adds POS step + counts (`importedCount`, `inUseCount`, `mappedCount`); stepper shows POS after Normalise.
- **Section access** — POS section remains unlocked after Phase 2 complete (existing nav rule).
- **Auth** — venue member read; manager+ writes (reuse `assertInventorySetupWriteAccess`).

### Out of scope (deferred)

- Creating recipes or batch items inline from POS lines (deep-link to Recipes / Batches setup only). **Superseded for recipes** by [`../pos-recipe-inline-create/plan.md`](../pos-recipe-inline-create/plan.md), which adds inline create + auto-map + GP recompute.
- Multi-recipe composition per menu line (existing `menu_item_recipes` supports many; MVP UI is single-recipe select).
- **Modifier → ingredient / cost mapping** — modifiers are imported and linked, but mapping a modifier (e.g. "+ Prosciutto") to an ingredient/cost or to recipe GP is a **later feature**. Raw + catalog stored now to enable it.
- **Nested Square category trees** — Square category parent/child captured only in `square_raw`; no dedicated nested-category navigation in MVP (subcategory = Square ITEM).
- **Modifier editing / write-back to Square** — read-only import; no `ITEMS_WRITE`.
- Auto-archive when Square removes catalog objects (badge only in MVP).
- Channel pricing (Uber/Deliveroo) — unscoped per client diagram.
- Consumption engine wiring (sales × BOM) — separate feature.
- Playwright E2E in CI — manual smoke per [`flows.md`](flows.md) §5.

### Non-goals

- Calling Square Dashboard private APIs (`itemsfe`).
- Replacing Settings → Integrations manual catalog ID paste (can remain; import supersedes for setup flow).
- Duplicating full Menu Items admin UI under a second codebase path.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md).

| Decision | Choice | Section |
|----------|--------|---------|
| Lives in app vs package | `apps/supersolt` only | §5.1 |
| Domain — POS import UI | `entities/pos-catalog-import/` (new) | §7.1 |
| Domain — setup chrome | extend `entities/inventory-setup/` (progress, import provider, dialog) | §7.1 |
| Server — Square catalog | `server/square/list-catalog.ts` (new) | §7.1 |
| Server — import orchestration | `server/inventory-setup/square-catalog-import.service.ts` (new) | §7.1 |
| Server — POS setup API | `server/pos-catalog-import/` (new) or colocate in `inventory-setup/` | §7.1 |
| Reuse | `menu-items` repo/service, `menu-catalog-links` repo, `square-connections` repo | §7.1 |
| Routes | thin wrappers under `app/(main)/…/settings/inventory-setup/pos-items/` + `app/api/…/inventory-setup/` | §7.1 |
| Auth | `requireRequestAuth` + Drizzle RLS; manager+ in services | §3.2, §8.1 |
| New package edges | None | §10 |

## 4. Data model

### Existing tables (primary writes)

| Table | Role in POS import |
|-------|-------------------|
| `menu_items` | Upserted POS line (variation): `name`, `section_name`, `price_cents`, `show_on_menu`, `status`; **new** `group_id`, `square_raw` |
| `menu_item_square_catalog_links` | Dedupe key `(venue_id, square_catalog_object_id)` → `menu_item_id` |
| `menu_item_recipes` | Operator maps in-use line → `recipe_id` (qty `1`) |
| `venue_square_connections` | OAuth token + `square_location_id` for API + location filter |
| `inventory_setup_import_jobs` | Job progress (extend with `job_type`) |

### New tables (this expansion)

| Table | Role |
|-------|------|
| `menu_item_groups` | Tier-2 subcategory = Square **ITEM**: `square_item_id` (unique per venue), `name`, `section_name` (category), `description`, `square_raw` |
| `venue_modifier_lists` | Venue-wide Square `MODIFIER_LIST`: `square_modifier_list_id` (unique per venue), `name`, `selection_type` (`single`/`multi`), `min_selected`, `max_selected`, `square_raw` |
| `venue_modifiers` | Venue-wide Square `MODIFIER`: `square_modifier_id` (unique per venue), `modifier_list_id` FK, `name`, `price_cents`, `square_raw` |
| `menu_item_group_modifier_lists` | Item → modifier-list attachment from `ITEM.modifier_list_info`: `group_id`, `modifier_list_id`, `enabled`, `min_selected`, `max_selected` overrides |

```sql
CREATE TABLE public.menu_item_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  square_item_id text NOT NULL,
  name text NOT NULL,
  section_name text NOT NULL DEFAULT 'Uncategorised',
  description text,
  square_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid,
  UNIQUE (venue_id, square_item_id)
);

ALTER TABLE public.menu_items
  ADD COLUMN group_id uuid REFERENCES public.menu_item_groups (id) ON DELETE SET NULL,
  ADD COLUMN square_raw jsonb;

CREATE TABLE public.venue_modifier_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  square_modifier_list_id text NOT NULL,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'multi' CHECK (selection_type IN ('single','multi')),
  min_selected integer, max_selected integer,
  square_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, square_modifier_list_id)
);

CREATE TABLE public.venue_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  modifier_list_id uuid NOT NULL REFERENCES public.venue_modifier_lists (id) ON DELETE CASCADE,
  square_modifier_id text NOT NULL,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  square_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, square_modifier_id)
);

CREATE TABLE public.menu_item_group_modifier_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.menu_item_groups (id) ON DELETE CASCADE,
  modifier_list_id uuid NOT NULL REFERENCES public.venue_modifier_lists (id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  min_selected integer, max_selected integer,
  UNIQUE (group_id, modifier_list_id)
);
```

> `menu_items.group_id` is **nullable** so existing menu admin / consumption rows (and any non-Square menu lines) are unaffected (§7.2 incremental). Square catalog stays transient otherwise — persisted state lives in these tables + `square_raw`.

### Migration: `job_type` on import jobs

```sql
ALTER TABLE public.inventory_setup_import_jobs
  ADD COLUMN job_type text NOT NULL DEFAULT 'xero'
    CHECK (job_type IN ('xero', 'square_catalog'));

CREATE INDEX inventory_setup_import_jobs_venue_type_active_idx
  ON public.inventory_setup_import_jobs (venue_id, job_type, created_at DESC)
  WHERE status IN ('pending', 'running');
```

Backfill: existing rows default `xero`. Update `findActiveForVenue` to filter by `job_type`.

### Field mapping (Square → Supersolt)

| Square source | `menu_items` column | Notes |
|---------------|---------------------|-------|
| ITEM.name + VARIATION.name | `name` | `"Cappuccino — Large"` when variation name differs from item |
| CATEGORY.name (reporting) | `section_name` | Via `item_data.category_id` → related CATEGORY object |
| VARIATION.price_money.amount | `price_cents` | Square minor units |
| Location availability | `show_on_menu` | Available → `true`; sold out / not present at venue → `false` |
| VARIATION id | link.`square_catalog_object_id` | Dedupe key |
| — | `gst_mode` | Default `inclusive` (unchanged on re-import unless product adds tax mapping later) |
| — | `status` | `active` when imported; `inactive` when Square sold out |
| ITEM id | `menu_items.group_id` | Resolved via upserted `menu_item_groups` row |
| ITEM object | `menu_items.square_raw` / `menu_item_groups.square_raw` | Full raw variation + item objects |

### Field mapping (Square ITEM → `menu_item_groups`)

| Square source | Column | Notes |
|---------------|--------|-------|
| ITEM.id | `square_item_id` | Dedupe key `(venue_id, square_item_id)` |
| ITEM.item_data.name | `name` | Subcategory label (e.g. "JUICE") |
| CATEGORY.name (reporting) | `section_name` | Same resolution as today (`resolveItemCategoryId`) |
| ITEM.item_data.description (or `description_plaintext`) | `description` | Used for recipe-ingredient AI assist |
| ITEM object | `square_raw` | Catch-all |

### Field mapping (Square MODIFIER_LIST / MODIFIER)

| Square source | Target | Notes |
|---------------|--------|-------|
| MODIFIER_LIST.id | `venue_modifier_lists.square_modifier_list_id` | Dedupe per venue |
| MODIFIER_LIST.modifier_list_data.name | `venue_modifier_lists.name` | "ADD ONS" |
| MODIFIER_LIST.modifier_list_data.selection_type | `selection_type` | `SINGLE`→`single`, else `multi` |
| MODIFIER_LIST min/max (or `item.modifier_list_info`) | `min_selected` / `max_selected` | "Optional/19 max" etc. |
| MODIFIER.id | `venue_modifiers.square_modifier_id` | Dedupe per venue |
| MODIFIER.modifier_data.name | `venue_modifiers.name` | "Prosciutto" |
| MODIFIER.modifier_data.price_money.amount | `venue_modifiers.price_cents` | Minor units |
| ITEM.item_data.modifier_list_info[] | `menu_item_group_modifier_lists` | `{ modifier_list_id, enabled, min/max }` per group |

### Missing-from-Square detection

After import, compute set of linked `square_catalog_object_id` values seen in latest pull. Rows with links not in set get `missingFromSquare: true` in API response (computed, not stored).

### RLS

New tables (`menu_item_groups`, `venue_modifier_lists`, `venue_modifiers`, `menu_item_group_modifier_lists`) get **venue-scoped tenant RLS** mirroring `menu_items` (member read; manager+ write via service guard). Existing policies on `menu_items`, `menu_item_square_catalog_links`, `menu_item_recipes`, `inventory_setup_import_jobs` apply.

### Migration ownership

- **Path (job_type):** `apps/supersolt/supabase/migrations/20260612120000_inventory_setup_import_job_type.sql`
- **Path (catalog model):** `apps/supersolt/supabase/migrations/20260613120000_pos_catalog_groups_modifiers.sql` — new tables + `menu_items.group_id/square_raw` + RLS.
- **Pattern:** App-owned §8.1
- **Backfill:** none — `group_id` nullable; existing menu rows keep `null` group until next import.
- **Apply:** local + remote via **`user-supabase-supersolt-mvp`** `apply_migration` (DDL matches committed SQL)
- **Types:** `pnpm drizzle:pull` after apply (mirrors new tables into `drizzle/schema.ts`)

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| List POS setup rows | Route GET | `…/inventory-setup/pos-items` | Venue member | Menu items with Square link, recipe name, `missingFromSquare` flag, **`groupId`/`subcategoryName`/`sectionName`, `description`, `modifierCount`** |
| Get POS item modifiers | Route GET | `…/inventory-setup/pos-items/[menuItemId]/modifiers` | Venue member | Flattened read: group → lists → modifiers with selection rules |
| Import from Square | Route POST | `…/inventory-setup/import-from-square` | Manager+ | Body: `{ jobId? }`; async steps via job tracker |
| Create Square import job | Route POST | `…/inventory-setup/import-jobs` | Manager+ | Body: `{ jobType: 'square_catalog' }`; returns job row |
| Get active import job | Route GET | `…/inventory-setup/import-jobs/active?jobType=square_catalog` | Manager+ | Per-type active job |
| Get import job | Route GET | `…/inventory-setup/import-jobs/[jobId]` | Venue member | Existing route; works for both types |
| Map recipe | Route PUT | `…/inventory-setup/pos-items/[menuItemId]/recipe` | Manager+ | Body: `{ recipeId }` or `{ recipeId: null }` to clear |
| Toggle in-use | Route PATCH | `…/inventory-setup/pos-items/[menuItemId]` | Manager+ | Body: `{ showOnMenu: boolean }` |
| Setup progress (extend) | Route GET | `…/inventory-setup/progress` | Venue member | Add POS step + counts |

### Square import job steps (`INITIAL_SQUARE_CATALOG_IMPORT_STEPS`)

| Step id | Label | Progress |
|---------|-------|----------|
| `verify_connection` | Connect to Square | — |
| `fetch_catalog` | Fetch item library | Pages: `current` / `total` |
| `upsert_modifiers` | Import modifiers | Lists + modifiers: `current` / `total` |
| `upsert_menu_items` | Import POS lines | Rows: `current` / `total` (groups + variations + modifier links) |
| `summary` | Finish | Counts: created / updated / skipped |

### Import response shape

```ts
type SquareCatalogImportResult = {
  groups: { created: number; updated: number };
  menuItems: { created: number; updated: number; skipped: number };
  modifierLists: { created: number; updated: number };
  modifiers: { created: number; updated: number };
  groupModifierLinks: number;
  catalogPages: number;
  variationsSeen: number;
  error: string | null; // fatal only (not connected, token expired, missing location)
};
```

### Validation

- Zod: `server/inventory-setup/square-catalog-import.schemas.ts`
- Errors map to [`flows.md`](flows.md) §2.

### Square API client

```ts
// server/square/list-catalog.ts
// GET {connectBase}/v2/catalog/list?types=ITEM,ITEM_VARIATION,CATEGORY,MODIFIER_LIST,MODIFIER&cursor=...
// Headers: Authorization: Bearer {token}, Square-Version: 2025-12-17
// Scope: ITEMS_READ (already in default OAuth scopes — covers modifiers)
// Extend SquareCatalogObjectRaw with:
//   item_data.description / description_plaintext, item_data.modifier_list_info[]
//   modifier_list_data { name, selection_type, modifiers[] }
//   modifier_data { name, price_money, modifier_list_id }
```

Pure transforms in `server/inventory-setup/`:
- `map-square-catalog-to-menu-drafts.ts` — variations → menu drafts (extend with `groupId`/`squareRaw`).
- `map-square-catalog-to-group-drafts.ts` (new) — ITEMs → group drafts (name, category, description, raw).
- `map-square-catalog-to-modifier-drafts.ts` (new) — MODIFIER_LIST/MODIFIER → modifier catalog + `item.modifier_list_info` → group links.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/settings/inventory-setup/
│   └── pos-items/
│       └── page.tsx                          # thin → PosCatalogImportPageClient
├── entities/pos-catalog-import/
│   ├── api/endpoints.ts
│   ├── model/types.ts, keys.ts, hooks
│   └── components/
│       ├── pos-catalog-import-page.tsx       # grouped table (category → subcategory) + import CTA + banner
│       ├── pos-item-recipe-select.tsx        # recipe combobox per row
│       ├── pos-item-modifiers-drawer.tsx     # flattened modifiers for a POS item
│       └── pos-import-summary-banner.tsx     # mapped / in-use counts
├── entities/inventory-setup/                 # EXTEND
│   ├── components/import-progress-dialog.tsx # generalise from Xero dialog
│   ├── components/inventory-setup-import-provider.tsx  # jobType filter
│   └── model/import-job-types.ts             # square step ids
└── server/
    ├── square/list-catalog.ts
    └── inventory-setup/square-catalog-import.service.ts
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Table, Dialog, Progress, Select, Badge, Switch, Drawer, Accordion | `@workspace/ui` | No Supabase imports |
| `PosCatalogImportPage` | `entities/pos-catalog-import/` | Grouped table (category → subcategory); import button opens progress dialog |
| `PosItemModifiersDrawer` | `entities/pos-catalog-import/` | Reads `…/pos-items/[id]/modifiers`; shows lists + selection rules + modifiers |
| `ImportProgressDialog` | `entities/inventory-setup/` | Steps from `job.steps`; title varies by `job_type` |
| `SetupStepperBanner` | `entities/inventory-setup/` | Add POS step after Normalise |

### Section nav

| Section | Access |
|---------|--------|
| POS Items | Unlocked when `phase2Complete` (unchanged) |
| Stepper POS step | Locked until `phase2Complete`; pending until import + all in-use mapped |

### Theming

Tokens from `@workspace/ui` (§6). No new product override stylesheet.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — table, dialog, progress, select, switch, toast
- `@/lib/api/client` — `entities/pos-catalog-import/api/endpoints.ts`
- Square OAuth — `venue_square_connections`, `ITEMS_READ` scope in `server/square/config.ts`

### New external deps

None.

### New package edges

None — no `ARCHITECTURE.md` update required.

## 8. Implementation order (commits)

1. `docs(supersolt): plan inventory-setup pos-catalog-import` — this triad + parent link.
2. `feat(supersolt): add import job_type migration` — DDL + `drizzle:pull`.
3. `feat(supersolt): add pos catalog groups + modifiers migration` — `menu_item_groups`, `venue_modifier_lists`, `venue_modifiers`, `menu_item_group_modifier_lists`, `menu_items.group_id/square_raw` + RLS + `drizzle:pull`.
4. `test(supersolt): red tests for square catalog map + import` — see [`tdd.md`](tdd.md).
5. `feat(supersolt): add list-catalog square client` — paginated Catalog API incl. modifiers; extend raw type.
6. `feat(supersolt): map square items to group + modifier drafts` — new pure transforms.
7. `feat(supersolt): square catalog import service + map drafts` — location filter, upsert groups/variations/modifiers/links + square_raw.
8. `feat(supersolt): import-from-square API + square job steps` — job tracker incl. modifier step.
9. `feat(supersolt): extend inventory-setup progress for POS step` — stepper counts.
10. `feat(supersolt): generalise import progress dialog for job_type` — Realtime unchanged.
11. `feat(supersolt): pos-catalog-import page (grouped) + recipe map + modifiers read API` — table UI grouped by category→subcategory, modifier count + drawer.
12. `feat(supersolt): wire POS import provider on inventory-setup layout` — optional: scope provider to pages that import.

## 9. Telemetry

Server structured logs only (no client analytics in MVP).

| Log prefix | Trigger | Payload |
|------------|---------|---------|
| `[pos-catalog-import] import_started` | POST import-from-square | `{ venueId, userId, jobId }` |
| `[pos-catalog-import] modifiers_upserted` | Modifier step done | `{ venueId, lists, modifiers, groupLinks }` |
| `[pos-catalog-import] import_completed` | Import finishes | `SquareCatalogImportResult` |
| `[pos-catalog-import] recipe_mapped` | PUT recipe | `{ menuItemId, recipeId }` |
| `[inventory-setup] pos_step_complete` | All in-use mapped | `{ venueId, mappedCount, inUseCount }` |

## 10. Rollout

- **Feature flag:** none — ship fully.
- **Env vars:** reuse existing Square OAuth vars (`square.env.example`); no new vars.
- **Re-authorize:** venues connected before `ITEMS_READ` was added must disconnect/reconnect Square (`ITEMS_READ` also covers modifiers).
- **Migration sequencing:** apply `job_type` then `pos_catalog_groups_modifiers` migration before deploy.
- **Backout:** revert app deploy; new tables + nullable `group_id`/`square_raw` are harmless if unused; menu/group/modifier rows created by import remain (forward-only).

## 11. Open questions

- [ ] Import button placement: POS page only vs also Settings → Integrations — owner: product, due: implementation kickoff.
- [ ] Price updates on re-import when operator manually edited `price_cents` in Menu — lean: always overwrite from Square (matches re-import A); confirm in implementation.

## 12. Cross-references

- Parent Phase 1: [`../plan.md`](../plan.md)
- Phase 2 normalisation: [`../unit-normalisation/plan.md`](../unit-normalisation/plan.md)
- Square sales mirror (catalog link resolution): [`../../insights-platform/square-sales-mirror/plan.md`](../../insights-platform/square-sales-mirror/plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
