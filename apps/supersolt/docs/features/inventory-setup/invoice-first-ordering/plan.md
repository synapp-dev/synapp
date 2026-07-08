# Invoice-First Identity & The Ordering Capability Ladder

> **Product:** `apps/supersolt`
> **Parent feature:** [`inventory-setup`](../plan.md)
> **Slug:** `invoice-first-ordering`
> **Status:** Design locked (grilling session 2026-07-02); not yet built
> **Supersedes:** the supplier-stage item-approval flow (`approveAsProducts` as a
> product-minting step) and Xero-contact-based supplier identity. Extends
> [`coverage-and-reimport-gaps`](../coverage-and-reimport-gaps/plan.md) (coverage
> contract survives, re-keyed).

## 1. North star

The whole pipeline exists to produce one recurring artifact: **the per-supplier
order sheet** — "order these packs, in these quantities, from this supplier, by
this cutoff" — computed as:

```
order = (expected usage until next delivery + buffer) − (stock on hand + already on order)
```

Everything upstream is data collection for that equation. Invoices are the
ground truth throughout: suppliers, items, packs, prices, and delivery rhythms
are all *read off parsed invoices*, as if the client handed us a year's stack of
printed invoices and we worked from the headers and line items alone.

## 2. The core reframe: stages are capability unlocks, not gates

Nothing blocks ordering. Each completed stage upgrades the order sheet's
accuracy:

| Completed | Order sheet capability |
|---|---|
| Invoice import + triage | **v0 — cadence orders**: draft POs per supplier from purchase rhythm alone ("~6 boxes/wk, 8 days since last, cutoff Tuesday"). No ingredients, counts, recipes, or POS needed. A smart shopping list — not yet stock-aware. |
| + Normalisation (ingredients) | **v1 — stock-aware**: pack variants and cross-supplier duplicates unify into one countable ingredient; counts anchor stock-on-hand; costing + cross-supplier price comparison unlock. |
| + ≥2 counts per ingredient | **v2 — true usage**: count-to-count actual consumption (includes waste) replaces cadence per ingredient, automatically. |
| + Recipes / POS mapping | **v3 — forward-looking**: this week's actual sales × recipes drive depletion, calibrated by the actual-vs-theoretical ratio; unlocks the variance report (waste / over-portioning / wrong-recipe detection). |

Counts are the one non-negotiable: they anchor stock-on-hand at every rung and
reset drift that sales math can never see (waste, spillage, staff drinks).

## 3. Locked decisions

### D1 — End artifact
Auto-drafted per-supplier order sheet (§1). "Accurate stock and costs" are
by-products, not the goal.

### D2 — Supplier identity is invoice-first (ABN-keyed)
Suppliers are minted from **parsed invoice headers**, not Xero contacts. Every
parsed invoice enters a pool; identity resolution runs in tiers:

1. **Normalized ABN exact match** (every AU tax invoice prints one; the parser
   already extracts it)
2. **Name + address fuzzy match** (for parse failures / missing ABN)
3. **LLM adjudication** for the ambiguous tail
4. **Human attribution queue** as the floor (machinery already built for orphan
   bills) — nothing is silently dropped

**Xero is demoted to courier + alias, not deleted**: it remains how bills/PDFs
are discovered, and each supersolt supplier keeps a **junction of linked Xero
contact ids** (many contacts → one supplier — exactly the client's mess). The
links are non-authoritative but required for future PO push / bill
reconciliation back into Xero. Rationale: the client's split-contact problem is
unfixable under contact identity; ABN grouping dissolves it upstream.

### D3 — Supplier stage = triage + coverage only; normalisation is the single writer
The supplier-stage item-approval wizard (`approveAsProducts` minting
`supplier_products` with `ingredientId: null`) is removed — it produced a
half-artifact the normalise commit had to adopt anyway (two writers, double
review of every item). New shape:

- **Supplier stage** answers "who do I buy from, which of their lines are
  stock?" — a fast bulk classification pass, not one-at-a-time review.
- **Normalisation** answers "what IS this thing, in what units, at what cost?"
  and is the **only** creator of `supplier_products` + ingredients (the
  twin-folding, newest-invoice-price commit built 2026-07-02).
- The coverage contract survives re-keyed: stage gate becomes "every kept
  supplier has ≥1 **confirmed-inventory item** (or is parked)" instead of "≥1
  approved product". Empty-supplier recovery cascade unchanged.
- The approve-time price-history backfill (per-pack, from invoice observations)
  ports into the normalise commit.
- Litmus test that decided this: *a decision made twice is a decision the
  system doesn't trust itself to remember.*

### D4 — Three-bucket triage; ingredients-first build
Item classification is three-way, AI-preclassified, human-confirmed in bulk:

1. **Ingredient** — recipe-tracked stock (eggs, milk)
2. **Consumable** — counted + reordered but not in recipes (cups, gloves,
   napkins); depletes by par/usage
3. **Not stock** — fees, equipment, one-offs

The class is stored on the item **now** (one enum) so no re-triage later, but
the build order is ingredients-first: consumables skip normalisation and get
par-based reordering in a later phase. Calling consumables "non-inventory"
today was rejected — it throws away a classification needed within months.

### D5 — Item naming: modal wording
A supplier item's display name is its **most frequent invoice wording** (tie →
most recent); the noise-stripped form stays the grouping key underneath.
(`MILK SOY **** MILKLAB **** 1lt x 8` displays if 6 of 7 invoices printed it.)

### D6 — Estimator ladder, no recipe gate
The order equation ships once; the usage estimator upgrades per §2. Recipes are
an incremental accuracy investment — **top sellers first, milk-relevant POS
modifiers as first-class recipe lines** — never a wall. The Products stage gate
softens from "all in-use items mapped" to "top sellers mapped, rest optional."
Each order-sheet line shows which estimator priced it.

### D7 — Multi-supplier ingredients: cheapest defaults, sticky after confirm
First time an ingredient hits the sheet → cheapest supplier gets the line, with
a "N suppliers" badge. Whichever supplier the user confirms becomes **sticky**
for future sheets. A cheaper-elsewhere nudge reappears whenever the sticky
choice is beaten. No silent auto-switching (trust > cleverness).

### D8 — Build order: Path C
1. **Phase 1 — invoice-first import + triage + v0 cadence orders.** One
   coherent phase; the identity rework *is* the fastest path to the payoff.
   Onboarding story: "connect Xero, get draft orders the same day."
2. **Phase 2 — normalisation → counts → stock-aware ordering (v1/v2).** The
   pilot venue is already most of the way up this rung (twin-folding wizard
   built; counts machinery exists with mixed-unit breakdown, cycle scopes,
   approval flow, variance).
3. **Phase 3 — recipes top-sellers-first → sales-driven ordering + variance
   (v3).** `ingredient_consumption_daily` already exists for this.

Migration note: the identity rework reshapes **suppliers** only. Ingredients,
counts, recipes are venue-level and survive; merged suppliers get their
`supplier_products` / raw items re-pointed mechanically. Normalisation labor
done before Phase 1 lands is not wasted.

## 4. Already built / reusable

- Invoice header extraction (ABN/address/email/phone) — in the parse schema
- Orphan-bill attribution queue + `enrichDetailsFromInvoice` prefill
- Delivery-day inference from invoice dates
- Twin-folding, newest-invoice-price normalise commit; canonical
  `descriptionsLikelySameProduct` (no price gate) + `packSignatureForDescription`
- Forward-only re-import price propagation (folded rows now stamp `reviewedAt`)
- Stock counts: schedules/templates/approval, full/location/cycle/category
  scopes, `mixedUnitBreakdown`, variance qty+cents, photos
- `ingredient_consumption_daily`, `order_guide_cache`, `ingredient_order_buffers`
- Suppliers: `leadTimeDays`, `minimumOrderCents`, delivery schedules

## 5. Explicitly deferred

- Pack-structure human confirmation at supplier stage ("option C") — build only
  when a real false merge is observed (zero observed on live data post
  noise-stripping)
- Consumable par-based ordering engine (schema/classification lands in Phase 1)
- PO push back into Xero (needs the contact alias junction — designed for)
- Generalising beyond the pilot tenant's invoice conventions — revalidate tier-2
  fuzzy matching on other customers' invoice formats
