# Inventory Setup — Phase 2 (Unit Normalisation)

> **Product:** `apps/supersolt`
> **Slug:** `unit-normalisation` (child of `inventory-setup`)
> **Status:** Planned
> **Route:** `/{organisation}/{venue}/settings/inventory-setup/normalise`
> **Owner:** TBD
> **Created:** 2026-06-11
> **Updated:** 2026-06-11

## 1. Summary

Phase 2 of Inventory Setup converts **raw supplier items** (`supplier_raw_items` — invoice language) into **usable inventory** (`supplier_products` linked to venue-scoped `ingredients` on the Master Inventory List). Operators work through a **hybrid queue + guided 4-step sheet**: a table of pending lines (with a separate “likely non-inventory” bucket), opening each row into a wizard that parses pack economics, links or creates an ingredient, and confirms cost-per-base-unit before commit.

**AI assist** (same `generateObject` + Zod pattern as [`invoice-parser.service.ts`](../../../../server/invoices/invoice-parser.service.ts)) prefills wizard fields from raw descriptions (e.g. `Gourmet tomato 10kg - Box - $32` → 10 kg per box, $32 pack price, ingredient name “Gourmet Tomato”). Keyword rules bucket fuel surcharges and delivery fees without LLM on page load; LLM runs on sheet open for the main queue.

**Personas:** Venue manager, owner, or org admin completing procurement setup after Phase 1 (suppliers + raw catalog).

**Parent spec:** [`../plan.md`](../plan.md) (Phase 1). Phase 2 unlocks Master Inventory List, Recipes, POS Items, and Storage Locations once every non-archived raw item is `normalised` or `skipped`.

**Architecture reference:** SuperSolt Inventory Architecture — Suppliers → Raw → **Normalise** → Inventory Items → Recipes → POS.

### Grill-me decisions (locked)

| Topic | Decision |
|-------|----------|
| UX pattern | Hybrid: pending table + 4-step sheet per row |
| Step completion | All raw items actioned (`normalised` or `skipped`; zero `pending`) |
| Ingredient link | Create new **or** link existing ingredient |
| Skip | Soft exclude + unskip; re-import updates economics, no auto-unskip |
| Wizard steps | Review → Pack → Ingredient → Confirm (cost-per-base-unit) |
| Non-inventory | Separate table section; AI warns; explicit skip/normalise required |
| AI timing | Keyword bucket on load; LLM on sheet open (+ per-row Retry suggest) |
| Nav | Route in **stepper and section nav** (`normalise` between Suppliers and Master List) |
| Post-normalise edit | Re-open wizard on normalised rows |
| LLM failure | Auto-retry once, then manual degrade |
| New raw items after complete | Re-open normalise step (warning badge); **do not** re-lock downstream sections |
| Rollout | Full deploy — core feature, no feature flag |

## 2. Scope

### In scope (MVP)

- **Route** `settings/inventory-setup/normalise` with setup stepper + section nav entry (unlocked after Phase 1).
- **Queue table** — org-wide pending raw items visible to venue setup (filter by supplier, status, search); sections: **To normalise**, **Likely non-inventory**, **Done** (normalised + skipped).
- **4-step normalisation sheet** per raw item (create, edit, re-open):
  1. **Review** — raw description, supplier, last qty/price, source badge.
  2. **Pack** — `packLabel`, `unitsPerPack`, `packUnit` (`g` \| `kg` \| `mL` \| `L` \| `each`), `unitPriceCents` (pack price); AI prefill when available.
  3. **Ingredient** — create new (name, category, unit) **or** link existing (search/select); option to set as active supplier source (`isActiveForIngredient`).
  4. **Confirm** — summary + **cost per base unit** preview; commit.
- **Atomic commit** — single service transaction: upsert `supplier_product`, create/link `ingredient`, update `supplier_raw_items` (`normalisation_status = 'normalised'`, `supplier_product_id`).
- **Skip / unskip** — `normalisation_status = 'skipped'`; unskip returns to `pending`.
- **AI suggest** — `POST …/normalise/suggest` (LLM structured output); keyword classifier `classifyRawItemBucket()` for non-inventory lines (no LLM).
- **Progress extension** — `GET …/inventory-setup/progress` adds Phase 2 counts; index redirect: Phase 1 incomplete → suppliers; Phase 1 done + Phase 2 incomplete → **normalise**; Phase 2 done → master-inventory-list.
- **Section unlock** — Master Inventory List, Recipes, POS, Storage Locations locked until Phase 2 complete (replace Phase 1-only lock).
- **Auth** — venue member read; manager+ writes (reuse `assertInventorySetupWriteAccess`).

### Out of scope (deferred)

- Batch auto-normalise without per-row confirm (operator must confirm each commit).
- Multi-raw-item → single supplier_product merge (one raw item → one supplier_product).
- House-made / batch recipe items.
- Persisting LLM suggestions on `supplier_raw_items` (ephemeral per sheet session; re-fetch on reopen).
- Playwright E2E in CI (manual smoke per [`flows.md`](flows.md) §5).

### Non-goals

- Replacing manual ingredient CRUD on Master Inventory List (normalisation is the guided onboarding path, not the only editor).
- Re-parsing invoice PDFs (Phase 1 / invoices module owns intake).
- Cross-product package extraction.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md).

| Decision | Choice | Section |
|----------|--------|---------|
| Lives in app vs package | `apps/supersolt` only | §5.1 |
| Domain — normalisation UI | `entities/inventory-normalisation/` (new) | §7.1 |
| Domain — setup chrome | extend `entities/inventory-setup/` (progress types, stepper) | §7.1 |
| Server | `server/inventory-normalisation/` (new); extend `server/inventory-setup/inventory-setup-progress.ts` | §7.1 |
| Reuse | `server/supplier-products/`, `server/ingredients/` (or repo), `server/supplier-raw-items/` | §7.1 |
| Routes | `app/(main)/…/settings/inventory-setup/normalise/page.tsx` (thin wrapper) | §7.1 |
| Auth | `requireRequestAuth` + Drizzle RLS; manager+ in services | §3.2, §8.1 |
| New package edges | None | §10 |

## 4. Data model

### Existing tables (no new DDL in MVP)

Phase 2 **writes** existing tables only. Schema verified in `apps/supersolt/drizzle/schema.ts` and migration `20260611120000_supplier_raw_items.sql`.

| Table | Role in Phase 2 |
|-------|-----------------|
| `supplier_raw_items` | Source queue; bridge `supplier_product_id`; status `pending` \| `normalised` \| `skipped` |
| `supplier_products` | Parsed pack layer (`packLabel`, `unitsPerPack`, `packUnit`, `unitPriceCents`, `ingredient_id`) |
| `ingredients` | Master Inventory List row (venue-scoped `name`, `category`, `unit`, cost fields) |

### Bridge semantics

On **normalise commit**:

```text
supplier_raw_items.normalisation_status  → 'normalised'
supplier_raw_items.supplier_product_id   → new or updated supplier_products.id
supplier_products.supplier_id            → raw item's supplier_id
supplier_products.venue_id               → current setup venue
supplier_products.ingredient_id          → created or linked ingredient
ingredients.unit                         → aligns with pack base (packUnit for weight/volume; see §4.1)
```

On **skip**: `normalisation_status → 'skipped'`, `supplier_product_id` unchanged (null).

On **unskip**: `normalisation_status → 'pending'`.

On **edit** (re-open wizard): update linked `supplier_product` + ingredient fields; raw item stays `normalised`.

### §4.1 Cost-per-base-unit (confirm step)

Pure function `computeCostPerBaseUnitCents({ unitPriceCents, unitsPerPack, packUnit })`:

- `packUnit ∈ { g, kg, mL, L, each }` (matches [`supplier-products.service.ts`](../../../../server/supplier-products/supplier-products.service.ts) `PACK_UNITS`).
- Display: pack price ÷ `unitsPerPack` = price per `packUnit` (e.g. $32 / 10 kg = $3.20/kg).
- On commit, when `makeActive` / first source: propagate `unitPriceCents / unitsPerPack` to `ingredients.costPerUnitCents` and `bestSupplierCostCents` (reuse `propagateIngredientCost` pattern in supplier-products service).

### RLS

No new policies. Existing org-member policies on `supplier_raw_items`, `supplier_products`, `ingredients` apply. Manager+ enforced in service layer for mutations.

### Migration ownership

- **Path:** none for MVP (application-layer only).
- **Pattern:** App-owned §8.1.
- **If later:** optional `supplier_raw_items.last_suggestion_jsonb` — **not** in MVP.

### Generated types

No migration → no `drizzle:pull` required for Phase 2 MVP.

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| List normalisation queue | Route GET | `…/inventory-setup/normalise/queue` | Venue member | Pending/skipped/normalised counts; bucket per row (keyword classifier) |
| Suggest normalisation | Route POST | `…/inventory-setup/normalise/suggest` | Manager+ | Body: `{ rawItemId }`; LLM structured output; 503 if OpenAI unavailable after retry |
| Commit normalise | Route POST | `…/inventory-setup/normalise/commit` | Manager+ | Atomic: ingredient + supplier_product + raw item bridge |
| Update normalise (edit) | Route PATCH | `…/inventory-setup/normalise/[rawItemId]` | Manager+ | Same payload as commit; updates linked rows |
| Skip raw item | Route POST | `…/inventory-setup/normalise/[rawItemId]/skip` | Manager+ | Sets `skipped` |
| Unskip raw item | Route POST | `…/inventory-setup/normalise/[rawItemId]/unskip` | Manager+ | Sets `pending` |
| Setup progress (extend) | Route GET | `…/inventory-setup/progress` | Venue member | Add `phase2Complete`, `pendingRawItemCount`, normalise step status |

### Suggest response shape (Zod)

```ts
type NormalisationSuggestion = {
  confidence: "high" | "medium" | "low";
  likelyNonInventory: boolean;
  nonInventoryReason: string | null;
  productName: string;           // cleaned supplier product name
  packLabel: string;             // e.g. "box", "crate", "each"
  unitsPerPack: number;
  packUnit: "g" | "kg" | "mL" | "L" | "each";
  unitPriceCents: number | null; // from raw last price if inferable
  ingredientName: string;
  ingredientCategory: IngredientCategory;
  ingredientUnit: string;        // base unit for master list
  rationale: string;             // short operator-facing explanation
};
```

### Commit payload shape (Zod)

```ts
type NormaliseCommitInput = {
  rawItemId: string;
  mode: "create" | "link";
  ingredientId?: string;         // required when mode = link
  ingredient?: UpsertIngredientInput; // required when mode = create
  supplierProduct: {
    name: string;
    skuCode?: string | null;
    packLabel: string;
    unitsPerPack: number;
    packUnit: string;
    unitPriceCents: number;
  };
  makeActiveSource: boolean;
};
```

### Validation

- Schemas: `server/inventory-normalisation/inventory-normalisation.schemas.ts`
- Parser: `server/inventory-normalisation/normalisation-suggest.service.ts`
- Classifier: `server/inventory-normalisation/classify-raw-item-bucket.ts` (pure, unit-tested)
- Errors map to [`flows.md`](flows.md) §2.

### Idempotency

- Re-commit same `rawItemId` with same `supplier_product_id` → update path (edit), not duplicate product.
- Skip on already-skipped → 200 no-op.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/settings/inventory-setup/
│   ├── normalise/page.tsx                    # Thin: NormalisationPageClient
│   └── _components/
│       ├── inventory-setup-sections.ts       # + normalise slug
│       └── inventory-setup-section-nav.tsx   # Phase 2 lock rules
├── entities/inventory-normalisation/         # NEW
│   ├── api/endpoints.ts
│   ├── model/types.ts, keys.ts, hooks
│   └── components/
│       ├── normalisation-queue-page.tsx      # Table + sections
│       ├── normalisation-wizard-sheet.tsx    # 4-step stepper inside Sheet
│       ├── normalisation-confirm-step.tsx    # Cost-per-base-unit preview
│       └── normalisation-progress-banner.tsx # X of Y actioned
├── entities/inventory-setup/                 # EXTEND
│   └── components/setup-stepper-banner.tsx   # Unlock normalise step
└── server/inventory-normalisation/
    ├── inventory-normalisation.service.ts
    ├── inventory-normalisation.repo.ts
    ├── normalisation-suggest.service.ts
    ├── classify-raw-item-bucket.ts
    └── compute-cost-per-base-unit.ts
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Table, Sheet, Stepper, Badge, Button | `@workspace/ui` | No Supabase imports |
| `NormalisationQueuePage` | `entities/inventory-normalisation/` | Three sections; row actions: Normalise, Skip, Unskip, Edit |
| `NormalisationWizardSheet` | same | Steps 1–4; AI loading skeleton on step 2 open |
| `SetupStepperBanner` | `entities/inventory-setup/` | Phase 2 step states |
| `IngredientsPageClient` | `entities/ingredients/` | Unchanged; unlocked after Phase 2 |

### Section nav (Phase 2)

| Section | Access |
|---------|--------|
| Suppliers | Always (setup) |
| **Normalise** | Unlocked when Phase 1 complete |
| Master Inventory List, Recipes, POS, Storage | Unlocked when Phase 2 complete |

### Index redirect logic

| Condition | Redirect target |
|-----------|-----------------|
| `!phase1Complete` | `…/inventory-setup/suppliers` |
| `phase1Complete && !phase2Complete` | `…/inventory-setup/normalise` |
| `phase2Complete` | `…/inventory-setup/master-inventory-list` |

### Theming

Tokens from `@workspace/ui` (§6). No new product override stylesheet.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — table, sheet, stepper, badge, toast
- `@ai-sdk/openai` + `ai` — `generateObject` for suggest (same as invoices)
- `@/lib/api/client` — client fetch
- `server/supplier-products/`, `server/supplier-raw-items/`, ingredients repo/service

### New external deps

None.

### New package edges

None — no `ARCHITECTURE.md` update required.

## 8. Implementation order (commits)

1. `docs(supersolt): plan inventory-setup unit-normalisation phase 2` — this triad + parent cross-ref.
2. `test(supersolt): red tests for normalisation classifier and progress` — see [`tdd.md`](tdd.md).
3. `feat(supersolt): extend inventory-setup progress for phase 2` — evaluator + GET progress + index redirect.
4. `feat(supersolt): inventory-normalisation repo and classify bucket` — queue query + keyword rules.
5. `feat(supersolt): normalisation suggest service` — LLM parser + retry/degrade.
6. `feat(supersolt): normalisation commit service` — atomic ingredient + supplier_product + raw bridge.
7. `feat(supersolt): inventory-normalisation API routes` — queue, suggest, commit, skip, unskip.
8. `feat(supersolt): normalise page and section nav` — route + nav slug + lock rules.
9. `feat(supersolt): normalisation wizard UI` — queue table + 4-step sheet.
10. `feat(supersolt): unlock master inventory list after phase 2` — section nav + readiness messaging.

## 9. Telemetry

Server structured logs only (no client analytics in MVP).

| Log prefix | Trigger | Payload |
|------------|---------|---------|
| `[inventory-normalisation] queue_loaded` | GET queue | `{ venueId, pending, skipped, normalised }` |
| `[inventory-normalisation] suggest_started` | POST suggest | `{ rawItemId, venueId }` |
| `[inventory-normalisation] suggest_completed` | Suggest success | `{ rawItemId, confidence, likelyNonInventory }` |
| `[inventory-normalisation] suggest_failed` | Suggest fail after retry | `{ rawItemId, reason }` |
| `[inventory-normalisation] committed` | POST commit | `{ rawItemId, ingredientId, supplierProductId, mode }` |
| `[inventory-normalisation] skipped` | POST skip | `{ rawItemId }` |
| `[inventory-normalisation] phase2_complete` | Last pending cleared | `{ venueId }` |

## 10. Rollout

- **Feature flag:** none — full deploy (core feature).
- **Env vars:** reuse `OPENAI_API_KEY` (suggest degrades gracefully if unset).
- **Migration sequencing:** none for MVP.
- **Backout:** revert app deploy; `supplier_raw_items` with `normalised` rows remain valid forward-only data.

## 11. Open questions

- [ ] Default `makeActiveSource` when linking ingredient that already has an active supplier product — owner: product, due: implementation kickoff.
- [ ] Queue default sort: supplier name vs last_seen_at vs AI confidence — owner: product, due: UI pass.

## 12. Cross-references

- Parent Phase 1: [`../plan.md`](../plan.md), [`../tdd.md`](../tdd.md), [`../flows.md`](../flows.md)
- Phase 3 POS catalog import (after normalisation): [`../pos-catalog-import/plan.md`](../pos-catalog-import/plan.md)
- Invoice parser pattern: [`../../../../server/invoices/invoice-parser.service.ts`](../../../../server/invoices/invoice-parser.service.ts)
- Supplier products: [`../../../../server/supplier-products/supplier-products.service.ts`](../../../../server/supplier-products/supplier-products.service.ts)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
