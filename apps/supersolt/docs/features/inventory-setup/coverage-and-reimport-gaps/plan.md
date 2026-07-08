# Inventory Setup — Coverage Honesty & Non-Destructive Re-import

> **Product:** `apps/supersolt`
> **Parent feature:** [`inventory-setup`](../plan.md)
> **Slug:** `coverage-and-reimport-gaps`
> **Status:** Planned (design agreed 2026-06-26, grilling session)
> **Owner:** TBD
> **Created:** 2026-06-26

## 1. Summary

Closes a cluster of logic gaps in the inventory-setup phase, grouped under two
roots:

1. **Supplier coverage is dishonest.** A supplier ticked as an inventory source
   can leave the Suppliers stage green while silently having an empty catalog —
   nothing requires it to produce items, nothing surfaces when it doesn't, and
   readiness counts only *unreviewed* items (so zero items reads as "complete").
2. **Re-import is destructive.** Both parse paths bulldoze the raw-item table
   (`clearForVenueScope`) before re-aggregating, wiping every approval /
   normalisation decision and product link, and never propagate fresh invoice
   prices into already-approved products.

The fixes below make stage completion mean what it says (every kept supplier is
either priced or consciously parked), and make re-running the import an
incremental merge that preserves work and refreshes prices.

These supersede several "not yet built" pillars of the
[inventory-setup redesign](../plan.md) and the design memory
`supersolt-inventory-setup-redesign`.

## 2. The seven decisions

### A. Per-supplier completion contract (gaps: order-ready-with-zero-items, venue-global approval, silent empties)

- A supplier flagged `is_inventory_source` must end with **≥1 approved
  `supplier_product`** OR an explicit **"no catalog yet" ack**.
- `evaluateSupplierReadiness` gains a catalog requirement: an inventory supplier
  with zero products (not just zero *unreviewed* items) is **not** ready unless
  acked.
- `suppliers.approved` stops being venue-global (`unreviewedRawItemCount === 0`)
  and becomes per-supplier: every inventory supplier is `(reviewed + ≥1 product)`
  **or** no-catalog-acked.

### B. Stricter stage gate + empty-supplier warning

- An empty, un-acked inventory supplier **blocks** the Suppliers stage and
  appears in a new *"N kept suppliers produced no items"* warning.
- The ack converts a blocker into an accepted/parked state and removes it from
  the warning.
- Accepted trade-off: a venue with five kept suppliers must resolve all five
  (price or park) — more friction than today's "one good supplier completes the
  stage", and that is the intended honesty.

### C. Empty-supplier recovery cascade

Default **90-day** bulk sync (keeps PDF parsing cheap) → if a kept supplier is
empty:

1. **Per-supplier 12-month targeted retry** — re-sync + parse only that
   supplier's older bills. Distinguishes cause "invoiced &lt; quarterly" (older
   bills found) from "never invoiced".
2. **Manual invoice-PDF upload** — universal escape hatch through the existing
   attachment pipeline.
3. **"No catalog yet" ack** — keep on file, can't price yet.

Never seed a priceless catalog from PO lines — a PO line is priceless intent,
not a catalog fact; priceless `supplier_products` would pollute
`bestSupplierCostCents`. POs stay discovery-only.

### D. Orphan-bill attribution queue

Stop silently hiding + dropping un-foldable orphan bills (those whose account
code can't be folded to a single real supplier). Instead:

- Surface them in a **PDF-pre-filled attribution queue**. The bill carries the
  invoice PDF, so read the header identity (name / ABN / email via
  `enrichDetailsFromInvoice`) and offer two pre-filled actions:
  - **Match to existing supplier** (header matches a known supplier — one click).
  - **Create new supplier from this invoice** (no match — pre-populated form).
- Bills with **no PDF** carry no catalog value (just a coded lump-sum total) →
  counted and skipped, not queued.
- The deferred PDF-identity auto-match becomes a *pre-fill* for this queue, never
  the sole path.

### E. Non-destructive incremental re-import

- **Remove `clearForVenueScope`** from both parse paths
  (`inventory-setup.service.ts:478` legacy, `:646` gated). `upsertFromLine`
  already merges idempotently on `supplierId + rawDescriptionNormalized +
  rawUnitNormalized` and preserves `normalisationStatus` / `reviewedAt` /
  `supplierProductId`. The wipe stays bound to the explicit **restart** action
  only (`wipeVenueProcurementData` in `restart()`).
- **Disappeared items** (whose invoices aged out of the window on re-sync): keep,
  don't delete; light up the existing `staleness` hook as "not seen in N days"
  so the user can prune manually.
- **Accepted risk:** if PDF re-parsing ever drifts the normalized text for the
  same product, a near-duplicate row appears instead of an update. Judged
  low-to-negligible (re-parse is deterministic on stable text); no guard.

### F. Price propagation on re-import

`supplier_product.unitPriceCents` is a stored snapshot, and the ingredient's
`bestSupplierCostCents` is written from it at approve-time — so re-import
currently leaves catalog/costing stale.

- Add a propagation pass: for **already-linked, reviewed** raw items
  (`supplierProductId` set), when a **newer** invoice carries a different price,
  call the existing `updatePrice` path (records a price-change event + updates
  `bestSupplierCostCents`).
- **Forward-only** (an out-of-order older bill in the window can't regress a
  price), **linked-only** (never auto-price an unreviewed item; new/unlinked
  items still route to the review queue as pending). Auto-propagate, no
  re-confirm prompt.

### G. "No catalog yet" ack — per-supplier (not global)

The ack is per-supplier, but wizard `subStepAcks` are venue-global keyed
strings — so it lives on the supplier row, and readiness keys off live
`productCount` so it can't drift out of sync.

**Schema** (migration → `supabase-fclph` first, *then* edit `schema.ts`):

```sql
alter table suppliers
  add column no_catalog_acked_at timestamptz,
  add column no_catalog_acked_by  uuid;
```

**Readiness rule** (`entities/suppliers/model/supplier-readiness.ts`) — single
source of truth. Extend `SupplierReadinessInput` with `isInventorySource`,
`productCount`, `noCatalogAcked`, and compute the existing "items" section:

```ts
const needsCatalog =
  input.isInventorySource && input.productCount === 0 && !input.noCatalogAcked;
const items = Math.max(0, input.unreviewedItemCount) + (needsCatalog ? 1 : 0);
```

Yields the three states for free: empty+unacked → blocks; acked → suppressed
(parked = ready); `productCount > 0` → suppressed *regardless of the ack*
(self-correcting); non-inventory → never needs a catalog.

**Feed the inputs** (`suppliers.service.ts` `supplierReadinessFromRow`): add a
`productCount` map (`supplierProductsRepo.countBySupplierIds`) alongside the
existing `unreviewed` map; read `row.noCatalogAckedAt != null`. Both
`countReadySuppliersForVenue` and the detail drawer flow through this function,
so they stay in agreement.

**Stage gating** (`inventory-setup-progress.ts`): add
`unresolvedInventorySupplierCount` = `is_inventory_source` suppliers where
`unreviewedItems > 0` OR (`productCount === 0` AND not acked).
`suppliers.approved` complete = `rawItemCount >= 1 &&
unresolvedInventorySupplierCount === 0`. The warning surface = the
empty-and-unacked subset.

**Set/clear the ack:** endpoint `POST /suppliers/:id/no-catalog-ack { acked }`
(toggleable, so the user can un-park). **Auto-clear hygiene:** in
`approveAsProducts`, when `createdProducts > 0` for a supplier, null its
`no_catalog_acked_at` (not required for correctness — readiness already ignores
the ack once `productCount > 0` — just avoids a contradictory flag).

## 3. Key files

| Concern | File |
|---------|------|
| Both `clearForVenueScope` calls (remove) | `server/inventory-setup/inventory-setup.service.ts:478`, `:646` |
| Idempotent merge (already correct) | `server/supplier-raw-items/supplier-raw-items.repo.ts` `upsertFromLine` |
| Readiness rule (add catalog term) | `entities/suppliers/model/supplier-readiness.ts` |
| Readiness inputs (add productCount, ack) | `server/suppliers/suppliers.service.ts` `supplierReadinessFromRow` |
| Stage gating counts | `server/inventory-setup/inventory-setup-progress.ts`, `server/inventory-setup/wizard-model.ts` |
| Price update path (reuse) | `server/supplier-products/supplier-products.service.ts:194` |
| Orphan fold (extend to attribution queue) | `server/inventory-setup/fold-orphan-bills.ts` |
| Supplier schema (ack columns) | `drizzle/schema.ts` suppliers (after migration to `supabase-fclph`) |

## 4. Out of scope / deferred

- PDF-identity *auto-match* as anything more than a pre-fill for the attribution
  queue.
- Generalising the lump-sum-invoice assumption beyond the one probed tenant —
  confirm against other customers before hard-coding app-wide.
