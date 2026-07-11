# Consumption Engine (Backend)

> **Product:** `apps/supersolt`
> **Slug:** `stock-management/consumption-engine`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** none (backend service; nightly cron + on-demand refresh)
> **Status:** Phases A + B built 2026-07-11 (engine, exceptions, waste entries, SOH, demand rates, endpoints). Phase C (modifiers) + D (UI surfacing) pending. Historical order lines are all unmapped pending a sales re-match; engine surfaces them as unmapped_sale exceptions.
> **Owner:** Aaron
> **Created:** 2026-07-11
> **Updated:** 2026-07-11

## 1. Summary

The Consumption Engine turns POS sales into theoretical stock usage: every sold item explodes through its recipe (recursively, batch-to-raw) to ingredient-level quantities, producing the **consumption** term in `stock on hand = last count + receipts - consumption - waste`. It has no screen of its own; Stock on Hand, Stock Counts (expected qty), Order Guide and Inventory Insights all read from it.

**Notion:** [Consumption Engine (Backend)](https://www.notion.so/37c64094bde681bfb174cf5fec3090a3) · parent [Stock Management](https://www.notion.so/34f64094bde680049607f3783f7df279)

A partial engine already exists (`server/stock-counts/consumption-daily.{service,repo}.ts` + `app/api/cron/ingredient-consumption-daily/route.ts`, cron `0 16 * * *` in `vercel.json`). It computes sales x flat BOM per venue-day into `ingredient_consumption_daily`. This build fixes its spec violations and completes the ledger.

### Locked decisions (from Notion spec, veto if wrong)

| Decision | Rule |
|----------|------|
| Refunds | Do not reverse consumption. (Verified: `venue_square_order_lines` carries no refund state; refunds live on payments only, so current data is already compliant.) |
| Comps / $0 sales | Still consume stock; quantity drives consumption, not price. |
| Channel | Irrelevant to quantity. |
| Recipe edits | Apply **forward only**; past daily facts are immutable. Counts re-anchor drift. Versioned BOMs are Phase 2. |
| Batches | Formulas, not stock. Recursive explosion to raws; nothing depletes at batch level; no production events in MVP. |
| Demand windows | Trailing 14 and 28 days. |
| Exceptions | Never silently dropped: unmapped sales, empty recipes, missing modifier recipes, unit-conversion failures. |
| Modifiers | Explode flat modifier recipes; per-parent overrides are pending a product decision, engine must not assume them. |

## 2. Current state and gaps

| # | Current behaviour | Spec requirement | Fix |
|---|-------------------|------------------|-----|
| 1 | Nightly cron recomputes a 30-day lookback with current recipes (rewrites history) | Daily facts immutable; forward-only | Nightly run finalizes **yesterday only**; today is a volatile row recomputed on demand |
| 2 | `isSubRecipe = true` lines excluded from BOM | Recursive batch-to-raw explosion | Explosion helper with cycle guard + depth cap |
| 3 | `matchSource = 'unmapped'` lines silently skipped | Unmapped Sales exception list with count + $ | `consumption_exceptions` table + surfacing |
| 4 | No unit conversion (raw multiply) | Convert recipe unit to ingredient base unit; failure = exception, line skipped | Unit conversion layer (extend `mixed-unit-convert` primitives) |
| 5 | Facts are qty-only | Facts carry qty + cost at current Main-supplier cost | `cost_cents` column, snapshotted at compute time |
| 6 | No demand rates | Trailing 14/28-day average daily usage | Computed on read from facts (no new table) |
| 7 | No on-demand refresh | Triggered by Stock Count open, Order Guide open, manual | `refreshToday` service + call sites |
| 8 | No stock-on-hand computation; `ingredients.current_stock_level` never engine-updated | SOH = last count + receipts - consumption - waste | SOH service; `current_stock_level` becomes a write-through cache |
| 9 | No waste input anywhere (no table; Waste page is mock) | Formula needs a waste term | Minimal `waste_entries` table + explosion for batch waste; full Waste module UI is its own build |
| 10 | Square sync does not capture line modifiers (`SquareOrderLineDto` has no modifiers field) | Modifier recipes add their own lines | Extend sync to store modifiers, then explode; data flows forward from deploy only |
| 11 | `recipes.waste_percent` exists in schema but spec explosion rules have no yield factor | n/a | **Ignore in engine** (spec-faithful). Field stays for recipe costing UI. Revisit only as an explicit product decision |

## 3. Schema changes

Migration first against the live DB (`supabase-fclph` MCP project), then `pnpm drizzle:pull` to regenerate `drizzle/schema.ts` (never hand-edit; per repo convention the migration must be applied **before** the schema file changes, or all queries on the touched tables break).

1. **`ingredient_consumption_daily`** (extend)
   - `cost_cents bigint not null default 0` - qty x active-supplier unit cost at compute time
   - `is_final boolean not null default false` - true once the venue-day is closed by the nightly run; final rows are never overwritten
2. **`consumption_exceptions`** (new)
   - `id uuid pk`, `organisation_id`, `venue_id`, `date date` (venue-local), `kind text` check in (`unmapped_sale`, `empty_recipe`, `missing_modifier_recipe`, `unit_conversion_failure`), `menu_item_id uuid null`, `recipe_id uuid null`, `ingredient_id uuid null`, `detail jsonb` (names, units, square ids), `qty numeric null`, `value_cents bigint null`, `computed_at timestamptz`
   - Recompute contract: delete + reinsert per `(venue_id, date)`; unique index on `(venue_id, date, kind, coalesce(menu_item_id), coalesce(recipe_id), coalesce(ingredient_id))`
   - RLS: venue-member read; writes via service role (cron/admin path)
3. **`waste_entries`** (new, minimal for the formula; Waste module owns the rich UX later)
   - `id`, `organisation_id`, `venue_id`, `ingredient_id uuid null`, `recipe_id uuid null` (batch waste; exactly one of the two set), `qty numeric`, `unit text`, `qty_base_units numeric` (resolved at write time), `cost_cents bigint`, `reason text` check in (`spoilage`, `prep_error`, `breakage`, `theft`, `correction`, `other`), `note text`, `occurred_at timestamptz`, `created_by`, `created_at`
   - Negative qty allowed (`correction` reason) per spec's "negative waste entry" escape hatch
   - RLS: venue-member read/insert; delete Owner/Manager
4. **`venue_square_order_lines`** (extend, phase C)
   - `modifiers jsonb null` - array of `{ catalogObjectId, name, quantity }` captured by `square-sales-sync` going forward

No table for demand rates or stock on hand: both are computed on read (SQL over facts + anchors), with `ingredients.current_stock_level` maintained as a cache for existing readers (Order Guide).

## 4. Engine design

New domain `server/consumption/` (existing `consumption-daily.*` files move here; old paths re-export until callers migrate):

- `explosion.ts` (pure) - builds the venue BOM: `menu_item_recipes -> recipes -> recipe_ingredients`, recursively resolving `sub_recipe_id` through batch formulas until only raw `ingredient_id` lines remain. Cycle guard (visited set) + depth cap 10; a cycle emits an `empty_recipe`-style exception naming the recipe rather than throwing. Per-serve semantics: sub-recipe line qty divided by the sub-recipe's `serves` before multiplying through, matching recipe-costing behaviour elsewhere in the app.
- `units.ts` (pure) - canonical unit registry (mass g/kg, volume ml/l/L, count each/unit) + `convert(qty, fromUnit, toUnit)` returning `null` on failure (which becomes a `unit_conversion_failure` exception). Reuses the normalisation logic from `server/stock-counts/mixed-unit-convert.ts`; that file's carton/pack path stays where it is.
- `consumption.service.ts` - run orchestration:
  - `finalizeDay(venueId, date)` - nightly path. Skips if a final row set already exists for the day (immutability). Computes facts + exceptions, writes with `is_final = true`, snapshots cost from the active supplier product (`ingredients.cost_per_unit_cents` fallback), then updates the SOH cache.
  - `refreshToday(venueId)` - on-demand path. Recomputes today's venue-local window into non-final rows; debounced (skip if `computed_at` under 2 minutes old).
  - `backfillMissingDays(venueId, maxDays)` - fills gaps where the cron never ran (each closed day computed once, then final; still forward-only because it uses current recipes only for days never computed before).
- `consumption.repo.ts` / `exceptions.repo.ts` - IO, `appDb.admin` for cron paths, RLS repos for venue-scoped reads.
- `stock-on-hand.service.ts` - per ingredient: anchor = latest approved stock count entry (`counted_qty`) at or before now; receipts = mapped `venue_invoice_line_items` after the anchor timestamp, converted to base units via `supplier_products` pack data; minus consumption facts and `waste_entries` after the anchor. Ingredients with no approved count ever = `null` SOH (surfaced as "needs baseline count", the existing `stockCountMissing` concept in Order Guide). Writes `ingredients.current_stock_level` as cache after nightly + on-demand runs.
- `demand-rates.repo.ts` - trailing 14/28-day average daily usage per ingredient from final facts (window excludes today's volatile row).

**Exception semantics per source:**

- Unmapped sale: order line with null `menu_item_id` or `match_source = 'unmapped'` -> one exception row per (day, menu item / square object) with summed qty + line revenue as `value_cents`.
- Mapped menu item whose recipes have zero exploded raw lines -> `empty_recipe`, recipe named.
- Line modifier with no linked modifier recipe -> base recipe still consumes; `missing_modifier_recipe` exception (phase C).
- Unit conversion failure -> line skipped, exception carries recipe, ingredient, from/to units.

## 5. Triggers and API

- Cron `ingredient-consumption-daily` (schedule unchanged): for each venue, `finalizeDay(yesterday)` + `backfillMissingDays` + SOH cache update. The 30-day lookback recompute is deleted.
- `refreshToday` call sites: stock count open/submit (already calls `refreshWindow`; repoint), Order Guide load, and `POST /api/organisations/[organisation]/venues/[venue]/consumption/refresh` for a manual button.
- Read endpoints (venue-scoped, `requireRequestAuth` + venue membership):
  - `GET .../consumption/exceptions?from&to` - exception list grouped by kind (Insights alert card + POS Items badge)
  - `GET .../consumption/demand-rates` - 14/28-day rates (Order Guide)
  - `GET .../stock-on-hand` - per-ingredient SOH with anchor metadata (Stock Counts expected, Inventory Insights)
  - `POST .../waste-entries` / `GET .../waste-entries?from&to` - minimal waste input so the formula term is real

## 6. UI surfacing (thin, this build only)

Match the existing shell conventions (server page -> `*PageClient`, cards from `@workspace/ui`, lucide icons, `EmptyState`-style patterns):

- **Insights -> Inventory**: replace the relevant mock tiles with real data: "Unmapped sales this week" alert card (count + $ + link), theoretical consumption summary. Full Inventory Insights stays its own module build.
- **POS Items badge**: unmapped-sales count badge on the inventory-setup products section header (canonical POS Items home until the IA cleanup).
- **Stock count expected qty**: wire `expected_qty` to SOH service at count open (the spec's "current to the minute" flow).
- No new nav items. Waste module UI, Order Guide rebuild, and Dashboard tiles consume these outputs in their own builds.

## 7. Build order

| Phase | Contents | Depends on |
|-------|----------|-----------|
| **A. Physics fix** | Migration 1+2; `server/consumption/` domain; recursive explosion; unit conversion; exceptions; cost snapshot; immutable nightly + `refreshToday`; cron rewrite | - |
| **B. Ledger** | Migration 3 (waste_entries); SOH service; receipts conversion; `current_stock_level` cache; demand rates; stock-count + Order Guide wiring; read endpoints | A |
| **C. Modifiers** | Migration 4; `square-sales-sync` captures line modifiers; modifier-recipe resolution + `missing_modifier_recipe` exceptions | A |
| **D. Surfacing** | Insights alert card, POS Items badge, manual refresh endpoint + button | A (B for SOH tiles) |

Each phase is deployable alone. C is deliberately last: modifier data only flows forward from deploy, so shipping it early maximises captured history, but it needs A's exception plumbing; if sequencing pressure appears, land the sync capture (migration 4 + sync change) with A and the explosion part later.

## 8. Testing and verification

- Unit: explosion (the spec's Reuben Panini case: 30 sold -> flour/yeast/butter via roll batch + pastrami 2.4kg + kraut 0.9kg, no roll movement), cycle guard, per-serve division, unit conversion matrix, cost snapshot, exception generation per kind.
- Integration: seeded venue -> `finalizeDay` twice (second run is a no-op: immutability), `refreshToday` overwrite behaviour, backfill, SOH formula against hand-computed fixture including receipts + waste + negative waste.
- Manual E2E on the dev venue: run cron route locally, open a stock count, confirm expected qty includes this morning's sales; compare a week of `ingredient_consumption_daily` totals before/after the rewrite for sanity (values will legitimately shift where sub-recipes/units now count).
- Read-only probes only against live data; no writes outside the migration path.

## 9. Risks and open questions

- **Recompute value shift.** Fixing sub-recipes and units changes historical numbers on next backfill of never-final days. Mitigation: existing rows are grandfathered as final at migration time (`is_final = true` for all rows older than yesterday) so history doesn't silently move.
- **Free-text units.** Real recipe data may hold unconvertible units ("bunch", "slice"). That's exactly what the exception list is for; expect a triage burst on first run.
- **Modifier recipe linkage.** Inventory setup produces modifier drafts; the link from a Square line modifier to a recipe needs confirming against real catalog data during phase C.
- **Per-parent modifier overrides** remain an open product decision; engine explodes flat modifier recipes until decided.
- **`recipes.waste_percent`** deliberately unused by the engine (see gap 11); flag to product owner.

## Decision log

- *2026-07-11* - Plan drafted from Notion spec (specced 11 Jun, batch rule 12 Jun) + codebase audit. Nightly finalize-yesterday model replaces 30-day rolling recompute to honour fact immutability. Demand rates + SOH computed on read; `current_stock_level` kept as cache. Minimal `waste_entries` lands here; Waste module UX stays a separate build.
