# Inventory Setup Phase 1 — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order for suppliers + raw supplier items.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `normalizeRawDescription()` collapses whitespace, lowercases, trims | `server/supplier-raw-items/normalize-raw-description.test.ts` | red |
| 2 | unit | `buildRawItemDedupeKey(supplierId, description)` is stable | `server/supplier-raw-items/normalize-raw-description.test.ts` | red |
| 3 | unit | `aggregateInvoiceLinesToRawCatalog()` upserts new row | `server/supplier-raw-items/aggregate-invoice-lines.test.ts` | red |
| 4 | unit | `aggregateInvoiceLinesToRawCatalog()` updates `last_*` on duplicate description | same | red |
| 5 | unit | `aggregateInvoiceLinesToRawCatalog()` skips lines with empty description | same | red |
| 6 | unit | `inferDeliverySchedulesFromInvoices()` suggests weekday from modal invoice dates | `server/inventory-setup/infer-delivery-schedule.test.ts` | red |
| 7 | unit | `inferDeliverySchedulesFromInvoices()` does not overwrite non-empty schedule | same | red |
| 8 | unit | `evaluateInventorySetupProgress()` — incomplete when no suppliers | `server/inventory-setup/inventory-setup-progress.test.ts` | red |
| 9 | unit | `evaluateInventorySetupProgress()` — raw_items step green when ≥1 raw item | same | red |
| 10 | unit | `assertInventorySetupWriteAccess()` denies staff, allows manager | `server/inventory-setup/inventory-setup-auth.test.ts` | red |
| 11 | integration | RLS: org member reads own org raw items | `server/supplier-raw-items/supplier-raw-items.rls.test.ts` | red |
| 12 | integration | RLS: other org member gets empty/denied | same | red |
| 13 | integration | Unique constraint rejects duplicate `(supplier_id, raw_description_normalized)` | same | red |
| 14 | API | POST import-from-xero returns partial success when parse fails | `server/inventory-setup/inventory-setup.service.test.ts` | red |
| 15 | API | POST import-from-xero commits suppliers when invoice parse fails | same | red |
| 16 | API | POST raw-items returns 409 on dedupe collision | `server/supplier-raw-items/supplier-raw-items.service.test.ts` | red |
| 17 | API | GET progress returns locked `normalise` step | `server/inventory-setup/inventory-setup.service.test.ts` | red |

**Deferred (Phase 1):** Playwright E2E — manual smoke in [`flows.md`](flows.md) §5.

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions

#### `normalizeRawDescription` / dedupe key

- **Subject:** `server/supplier-raw-items/normalize-raw-description.ts`
- **Cases:**
  - `"  Box of Tomatoes — 10 kg  "` → `"box of tomatoes — 10 kg"`
  - Unicode dash variants normalised consistently
  - Empty string → validation error at call site (aggregation skips)

#### `aggregateInvoiceLinesToRawCatalog`

- **Subject:** `server/supplier-raw-items/aggregate-invoice-lines.ts`
- **Cases:**
  - Single line → one insert with `source: xero_api` or `invoice_parse`
  - Two lines same description → one row, `last_seen_at` updated
  - Lines from different suppliers → separate rows
  - Null unit/price allowed (stored as null)
- **Mocks:** in-memory row list or test DB fixture — no Xero HTTP.

#### `inferDeliverySchedulesFromInvoices`

- **Subject:** `server/inventory-setup/infer-delivery-schedule.ts`
- **Cases:**
  - Invoices on Mon/Wed/Fri → suggests order days on those weekdays
  - Supplier with existing `delivery_schedule` entries → no overwrite
  - <3 invoices → no suggestion (insufficient signal)

#### `evaluateInventorySetupProgress`

- **Subject:** `server/inventory-setup/inventory-setup-progress.ts`
- **Cases:**
  - `{ supplierCount: 0 }` → current step `suppliers`
  - `{ supplierCount: 2, rawItemCount: 0 }` → current step `raw_items`
  - `{ supplierCount: 2, rawItemCount: 5 }` → phase1Complete `true`, `normalise` locked

### Auth helper

- **Subject:** `server/inventory-setup/inventory-setup-auth.ts`
- **Cases:** owner, org admin, venue manager → pass; venue staff → `403`.

## 3. Integration tests (DB + RLS)

Run against local Supabase for `apps/supersolt` (`supabase start` + apply migrations).

### Setup

```ts
// Seed: org A, org B, supplier S1, user U1 member of A, user U2 member of B
// Insert raw item for S1 under org A
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| U1 reads S1 raw items | authenticated (org A) | rows returned |
| U2 reads S1 raw items | authenticated (org B) | empty (RLS) |
| U1 inserts raw item | authenticated (org A, manager) | success |
| Duplicate description insert | authenticated | unique violation |
| Anon select | anon | RLS denies |

> Migrations and RLS live in `apps/supersolt` per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md).

## 4. API / service tests (mocked boundaries)

### `inventory-setup.service.test.ts`

- Mock `syncVenueXeroSuppliers`, `syncVenueXeroInvoices`, `parseInvoiceAttachmentIfNeeded`, `aggregateInvoiceLinesToRawCatalog`.
- **Scenario A:** all steps succeed → full counts in payload.
- **Scenario B:** one parse failure → `parseFailed` populated; `rawItems.upserted > 0` from API lines.
- **Scenario C:** Xero disconnected → fatal `error`, no partial mutation (orchestrator short-circuits before writes).

### `supplier-raw-items.service.test.ts`

- Create manual raw item happy path.
- Duplicate → 409 with `existingId`.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/inventory-setup.ts`
- **Contents:** deterministic supplier ids, sample invoice lines (`Box of Tomatoes — 10 kg`, `Cucumber — 1 Each`), Xero contact stub.
- **Reset:** truncate `supplier_raw_items` in test transaction rollback.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new `server/supplier-raw-items/*`, `server/inventory-setup/*` | ≥80% | Changed paths only |
| Integration cases §3 | 100% present | Review before merge |
| E2E | Manual smoke | [`flows.md`](flows.md) §5 |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` table/sheet rendering — behavioral API tests sufficient.
- Full Xero OAuth flow — mock at service boundary.
- LLM parse quality — invoices module owns parser; stub `parseInvoiceDocument` return value.
- Phase 2 normalisation wizard — see [`unit-normalisation/tdd.md`](unit-normalisation/tdd.md).

## 8. Refactor checklist (after green)

- [ ] Aggregation logic single source: import orchestrator + invoice sync cron both call same function.
- [ ] Zod schemas shared between route handlers and services.
- [ ] Generated Drizzle types for `supplier_raw_items` — no `any`.
- [ ] No app-to-app imports.
- [ ] `SuppliersPageClient` mode prop — no duplicated list/detail components.
