# Inventory Setup — Phase 1 (Suppliers + Raw Items)

> **Product:** `apps/supersolt`
> **Slug:** `inventory-setup`
> **Status:** In progress
> **Route:** `/{organisation}/{venue}/settings/inventory-setup`
> **Owner:** TBD
> **Created:** 2026-06-11
> **Updated:** 2026-06-11

## 1. Summary

Inventory Setup is the guided path operators follow to stand up procurement data before recipes, stock counts, and ordering can run accurately. **Phase 1** (this spec) covers **suppliers** and **raw supplier items** — the bottom two layers of the SuperSolt inventory architecture (Step 0–1: invoices → raw catalog).

When a venue opens Inventory Setup and has not completed Phase 1, they land on **Suppliers** (not Master Inventory List). Operators add or import suppliers, then capture each supplier's invoice wording as **raw items** (`Box of Tomatoes — 10 kg`, `Continental Cucumber — 1 Each`) in a dedicated catalog table. This raw layer is intentionally **unparsed** — unit normalisation (box → kg/g) ships in **Phase 2** ([`unit-normalisation`](unit-normalisation/plan.md), planned).

**Personas:** Venue manager, owner, or org admin setting up a new venue or backfilling procurement data.

**Architecture reference:** SuperSolt Inventory Architecture (Suppliers → Raw → Normalise → Inventory Items → Recipes → POS).

### Current code (baseline)

| Area | Location | Notes |
|------|----------|-------|
| Inventory setup routes | `app/(main)/[organisation]/[venue]/settings/inventory-setup/` | Index redirects to `master-inventory-list` today — **change to suppliers when Phase 1 incomplete** |
| Suppliers UI (shared) | `entities/suppliers/components/suppliers-page.tsx`, `supplier-detail-page.tsx` | Also used by `purchasing/suppliers` |
| Xero supplier sync | `server/xero/xero-suppliers.service.ts`, `POST …/xero/suppliers/sync` | Contacts → `suppliers` (address, email, phone, ABN) |
| Xero invoice sync | `server/xero/xero-invoices.service.ts`, `POST …/xero/invoices/sync` | Headers + API line items → `venue_invoices`, `venue_invoice_line_items` |
| Invoice PDF parse | `server/invoices/invoice-parser.service.ts` | LLM parse → line items when attachment needed |
| Parsed SKU layer | `supplier_products` → `ingredients` | **Parsed layer** — not raw; hidden in setup mode until Phase 2 |
| Readiness | `server/readiness/modules.ts` | `has_suppliers` CTA points at `purchasing/suppliers` — **update to inventory-setup** |

### Phased delivery (grill-me — locked)

| Phase | Ships | Spec |
|-------|--------|------|
| **1 (this doc)** | Suppliers + raw catalog + Xero/manual import + setup UX | `plan.md` / `tdd.md` / `flows.md` |
| **2** | Unit normalisation wizard (ambiguous units → g/ml) → `supplier_products` / `ingredients` | [`unit-normalisation/plan.md`](unit-normalisation/plan.md) |
| **3** | Square catalog import → `menu_items` + recipe map on POS Items setup | [`pos-catalog-import/plan.md`](pos-catalog-import/plan.md) |
| **3a** | Inline create recipe from POS line (prefill + auto-map + GP recompute) | [`pos-recipe-inline-create/plan.md`](pos-recipe-inline-create/plan.md) |
| **Wizard** | Guided big-card wizard (Suppliers → Inventory → Products → Storage) narrating + orchestrating all phases on the setup index | [`setup-wizard/plan.md`](setup-wizard/plan.md) |

## 2. Scope

### In scope (Phase 1 MVP)

- **Landing behaviour:** `settings/inventory-setup` redirects to **suppliers** when Phase 1 progress incomplete; otherwise existing default (`master-inventory-list`) until Phase 2 unlocks further sections.
- **Setup stepper banner** in inventory-setup mode: `1. Suppliers → 2. Raw items → 3. Normalise` (step 3 disabled, links to Phase 2 spec).
- **Supplier management** (reuse shared UI with `inventorySetupMode`):
  - Manual CRUD (existing).
  - **Import from Xero** orchestration (contacts + historical invoices).
  - Enrich supplier profile: address, contact email/phone, ABN (Xero contacts + invoice header parse where gaps exist).
  - **Delivery schedule suggestions** inferred from invoice date frequency (operator confirms/edits on Schedule tab).
- **Raw supplier items catalog** (`supplier_raw_items`):
  - Populated from Xero API line items, LLM-parsed PDF lines, and manual entry.
  - Deduped per supplier by normalised description hash.
  - Stores invoice language: description, unit string, last price/qty, source, first/last seen.
  - `normalisation_status = pending` (Phase 2 sets `supplier_product_id`).
- **API:** orchestration endpoint, progress GET, nested raw-item CRUD.
- **Incremental sync:** ongoing invoice sync (Purchasing) upserts raw catalog via shared helper.
- **Auth:** manager+ for setup writes/import; venue-member read + RLS.
- **Readiness path update:** `has_suppliers` → `settings/inventory-setup/suppliers`.
- **Ship fully** — no feature flag (beta).

### Out of scope (Phase 2 — [`unit-normalisation`](unit-normalisation/plan.md))

- Normalisation wizard (`box` / `crate` / `each` → g, kg, ml, L).
- Creating/updating `supplier_products` and `ingredients` from raw items.
- Unlocking Master Inventory List, Recipes, POS Items setup sections for net-new venues.
- Batch/house-made items.

### Non-goals

- Replacing the Purchasing → Invoices review queue (intake stays authoritative for invoice approval).
- Duplicating supplier UI under a separate wizard-only codebase path.
- Cross-product package extraction.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | Section |
|----------|--------|---------|
| Lives in app vs package | `apps/supersolt` only | §5.1 |
| Domain — suppliers | `entities/suppliers/` (extend with `inventorySetupMode`) | §7.1 |
| Domain — raw items | `entities/supplier-raw-items/` (new) | §7.1 |
| Server | `server/inventory-setup/`, `server/supplier-raw-items/` | §7.1 |
| Routes | `app/(main)/…/settings/inventory-setup/` (thin wrappers) | §7.1 |
| Auth | `requireRequestAuth` + Drizzle RLS; manager+ guard in setup services | §3.2, §8.1 |
| New package edges | None | §10 |

## 4. Data model

Live project verified via **`user-supabase-supersolt-mvp`** (`list_tables`, `list_migrations`, 2026-06-11): `suppliers`, `supplier_products`, `venue_invoices`, `venue_invoice_line_items` exist; **`supplier_raw_items` does not** — new migration required.

### Existing tables (unchanged in Phase 1)

- **`suppliers`** — org-scoped (`venue_id` null = shared). Already has address, `delivery_schedule` jsonb, `xero_contact_id`, contact fields (`20260404120000_supplier_detail…`, `20260529150000_suppliers_xero_contact_id.sql`).
- **`venue_invoice_line_items`** — transactional audit trail per invoice; remains source rows for aggregation.
- **`supplier_products`** — parsed/SKU layer; **not written** in Phase 1 setup flows.

### New table: `supplier_raw_items`

```sql
CREATE TABLE public.supplier_raw_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  -- Invoice language (unparsed)
  raw_description text NOT NULL,
  raw_description_normalized text NOT NULL, -- lower(trim(collapse_ws)) for dedupe
  raw_unit text,                            -- as printed: "box", "kg", "each"
  -- Last observed economics (updated on re-import)
  last_quantity numeric,
  last_unit_price_cents integer,
  last_line_total_cents integer,
  -- Provenance
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('xero_api', 'invoice_parse', 'manual')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_invoice_id uuid REFERENCES public.venue_invoices (id) ON DELETE SET NULL,
  -- Phase 2 bridge (null in Phase 1)
  normalisation_status text NOT NULL DEFAULT 'pending'
    CHECK (normalisation_status IN ('pending', 'normalised', 'skipped')),
  supplier_product_id uuid REFERENCES public.supplier_products (id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT supplier_raw_items_supplier_dedupe_uq
    UNIQUE (supplier_id, raw_description_normalized)
);

CREATE INDEX idx_supplier_raw_items_org_supplier
  ON public.supplier_raw_items (organisation_id, supplier_id)
  WHERE archived_at IS NULL;

CREATE INDEX idx_supplier_raw_items_pending
  ON public.supplier_raw_items (supplier_id)
  WHERE archived_at IS NULL AND normalisation_status = 'pending';
```

### RLS

| Policy | Role | Rule |
|--------|------|------|
| `supplier_raw_items_select` | `authenticated` | Active org member (`user_organisations` match on `organisation_id`) |
| `supplier_raw_items_write` | `authenticated` | Same org membership (manager+ enforced in service layer for mutations) |

Mirror existing `supplier_products` org-scoped RLS pattern from `20260527120000_purchase_orders_module.sql`.

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260611120000_supplier_raw_items.sql`
- **Pattern:** App-owned (§8.1 default).
- **After apply:** `pnpm drizzle:pull` in `apps/supersolt` (do not hand-edit `drizzle/schema.ts`).
- **Remote apply (implementation session):** `apply_migration` on **`user-supabase-supersolt-mvp`** with the same SQL body, in migration order alongside committed files.
- **Types:** run `generate_typescript_types` on supersolt project when regenerating client types is part of the workflow.
- **Backfill:** none required; catalog populated on first import or manual add.

### Progress model (application layer, no new table)

`GET …/inventory-setup/progress` derives:

| Step | Complete when |
|------|----------------|
| `suppliers` | `supplier_count >= 1` (org-visible to venue) |
| `raw_items` | `raw_item_count >= 1` for at least one supplier |
| `normalise` | Phase 2 — `locked` until Phase 1 complete; see [`unit-normalisation/plan.md`](unit-normalisation/plan.md) |

Phase 1 **complete** when both `suppliers` and `raw_items` steps are green. Phase 2 **complete** when all non-archived raw items are `normalised` or `skipped` (zero `pending`).

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| Get setup progress | Route GET | `…/inventory-setup/progress` | Venue member | Drives redirect + stepper |
| Import from Xero | Route POST | `…/inventory-setup/import-from-xero` | Manager+ | Orchestrates below; partial success payload |
| List raw items | Route GET | `…/suppliers/[supplierId]/raw-items` | Venue member | Paginated, filter `pending` |
| Create raw item | Route POST | `…/suppliers/[supplierId]/raw-items` | Manager+ | Manual entry; 409 on dedupe |
| Update raw item | Route PATCH | `…/suppliers/[supplierId]/raw-items/[rawItemId]` | Manager+ | Description/unit edits |
| Archive raw item | Route DELETE | `…/suppliers/[supplierId]/raw-items/[rawItemId]` | Manager+ | Soft archive |
| Sync suppliers | Route POST | `…/xero/suppliers/sync` | Existing | Called by orchestrator |
| Sync invoices | Route POST | `…/xero/invoices/sync` | Existing | Called by orchestrator |

### Orchestration sequence (`import-from-xero`)

1. `syncVenueXeroSuppliers` — contacts → `suppliers`.
2. `syncVenueXeroInvoices` — bills + API line items → `venue_invoice_line_items`.
3. For invoices with attachments lacking lines: `parseInvoiceAttachmentIfNeeded` (reuse invoices module).
4. `aggregateInvoiceLinesToRawCatalog(ctx, { organisationId, venueId })` — upsert `supplier_raw_items`.
5. `inferDeliverySchedulesFromInvoices(ctx, { organisationId })` — suggest `delivery_schedule` patches (non-destructive: only fill empty schedule slots; operator confirms in UI).

### Import response shape (partial success)

```ts
type InventorySetupImportResult = {
  suppliers: { created: number; updated: number; skipped: number; errors: string[] };
  invoices: { synced: number; parseFailed: Array<{ invoiceId: string; reason: string }> };
  rawItems: { upserted: number; skipped: number };
  deliverySuggestions: { suppliersSuggested: number };
  error: string | null; // fatal only (Xero disconnected, token expired)
};
```

### Validation

- Zod schemas: `server/inventory-setup/inventory-setup.schemas.ts`, `server/supplier-raw-items/supplier-raw-items.schemas.ts`.
- Dedupe collision → HTTP 409 with existing raw item id.
- Errors map to [`flows.md`](flows.md) §2.

### Shared helper (also called from invoice sync)

`server/supplier-raw-items/aggregate-invoice-lines.ts`:

- Input: invoice line rows (`parsed_description`, `unit`, prices) + `supplier_id`.
- Normalise description → upsert on `(supplier_id, raw_description_normalized)`.
- Update `last_*` fields and `last_seen_at`.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/settings/inventory-setup/
│   ├── page.tsx                          # Redirect: progress → suppliers | master-inventory-list
│   ├── layout.tsx                        # Existing section nav
│   └── suppliers/page.tsx                # Thin: SuppliersPageClient inventorySetupMode
├── entities/suppliers/components/
│   ├── suppliers-page.tsx                # + setup banner, import CTA, mode prop
│   └── supplier-detail-page.tsx          # + Raw items tab (setup mode); hide Products tab
├── entities/supplier-raw-items/          # NEW
│   ├── api/endpoints.ts
│   ├── model/types.ts, keys.ts, hooks
│   └── components/raw-items-table.tsx, raw-item-form-sheet.tsx
├── entities/inventory-setup/             # NEW (thin)
│   ├── api/endpoints.ts
│   └── components/setup-stepper-banner.tsx
└── server/inventory-setup/
    ├── inventory-setup.service.ts
    └── infer-delivery-schedule.ts
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Table, Sheet, Button, Stepper primitives | `@workspace/ui` | No Supabase imports |
| `SetupStepperBanner` | `entities/inventory-setup/` | Phase 1 steps |
| `RawItemsTable` | `entities/supplier-raw-items/` | Replaces Products tab in setup mode |
| `SuppliersPageClient` | `entities/suppliers/` | `inventorySetupMode?: boolean` |

### Section nav (Phase 1)

| Section | Phase 1 access |
|---------|----------------|
| Suppliers | **Active** — default landing |
| Master Inventory List, Recipes, POS Items, Storage Locations | **Visible but locked** with tooltip: "Complete supplier setup and normalisation first" until Phase 2 |

### Theming

Tokens from `@workspace/ui` (§6). No new product override stylesheet required.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — table, sheet, button, badge, toast patterns
- `@/lib/api/client` — client fetch (`entities/*/api/endpoints.ts`)
- `@ai-sdk/openai` + `ai` — invoice parse (via invoices module, already deployed)

### New external deps

None.

### New package edges

None — no `ARCHITECTURE.md` update required.

## 8. Implementation order (commits)

1. `docs(supersolt): plan inventory-setup phase 1 feature` — this triad.
2. `feat(supersolt): add supplier_raw_items migration` — DDL + RLS + `drizzle:pull`.
3. `test(supersolt): red tests for raw item aggregation and dedupe` — see [`tdd.md`](tdd.md).
4. `feat(supersolt): supplier-raw-items repo and service` — CRUD + aggregation helper.
5. `feat(supersolt): inventory-setup import orchestration API` — compose Xero + parse + aggregate.
6. `feat(supersolt): inventory-setup progress GET and landing redirect`.
7. `feat(supersolt): supplier raw items UI in inventory setup mode`.
8. `feat(supersolt): wire invoice sync to raw catalog aggregation`.
9. `feat(supersolt): update readiness paths to inventory-setup suppliers`.
10. `feat(supersolt): infer delivery schedule suggestions from invoice dates`.

## 9. Telemetry

Server structured logs only (no client analytics in Phase 1).

| Log prefix | Trigger | Payload |
|------------|---------|---------|
| `[inventory-setup] import_started` | POST import-from-xero | `{ venueId, userId }` |
| `[inventory-setup] import_completed` | Import finishes | Full `InventorySetupImportResult` |
| `[supplier-raw-items] aggregated` | Aggregation run | `{ upserted, skipped, supplierId? }` |

## 10. Rollout

- **Feature flag:** none — ship fully (beta).
- **Env vars:** reuse existing `OPENAI_API_KEY` (invoice parse); Xero OAuth vars already required.
- **Migration sequencing:** apply `20260611120000_supplier_raw_items.sql` **before** deploy (local + remote via supersolt MCP `apply_migration`).
- **Readiness:** update `READINESS_CHECK_BLOCKERS.has_suppliers.pathSuffix` → `settings/inventory-setup/suppliers`.
- **Backout:** revert app deploy; empty/unused `supplier_raw_items` table is harmless (forward-only).

## 11. Open questions

- [ ] Delivery inference UX: auto-apply suggested schedule vs always require explicit "Accept suggestion" click — owner: product, due: Phase 1 implementation kickoff.
- [ ] Raw item list: show all suppliers' items on one review screen post-import vs only per-supplier detail — lean: per-supplier detail tab only in Phase 1.

## 12. Cross-references

- Phase 2 normalisation: [`unit-normalisation/plan.md`](unit-normalisation/plan.md), [`unit-normalisation/tdd.md`](unit-normalisation/tdd.md), [`unit-normalisation/flows.md`](unit-normalisation/flows.md)
- Phase 3 POS catalog import: [`pos-catalog-import/plan.md`](pos-catalog-import/plan.md), [`pos-catalog-import/tdd.md`](pos-catalog-import/tdd.md), [`pos-catalog-import/flows.md`](pos-catalog-import/flows.md)
- Phase 3a inline create recipe from POS: [`pos-recipe-inline-create/plan.md`](pos-recipe-inline-create/plan.md), [`pos-recipe-inline-create/tdd.md`](pos-recipe-inline-create/tdd.md), [`pos-recipe-inline-create/flows.md`](pos-recipe-inline-create/flows.md)
- Setup wizard (guided big-card UX over all phases): [`setup-wizard/plan.md`](setup-wizard/plan.md), [`setup-wizard/tdd.md`](setup-wizard/tdd.md), [`setup-wizard/flows.md`](setup-wizard/flows.md)
- Invoices intake: [`../invoices-module/plan.md`](../invoices-module/plan.md)
- Onboarding deferral: [`../onboarding/plan.md`](../onboarding/plan.md) § suppliers in-module wizard
- Readiness: `server/readiness/modules.ts`
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
