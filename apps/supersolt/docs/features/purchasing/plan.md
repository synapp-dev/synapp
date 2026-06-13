# Purchasing

> **Product:** `apps/supersolt`  
> **Slug:** `purchasing`  
> **Route:** `/{organisation}/{venue}/purchasing/*`  
> **Created:** 2026-06-01  
> **Updated:** 2026-06-01

## 1. Summary

Purchasing is the procurement spine: **suppliers**, **orders** (order guide + POs), and **invoices** (management UI — automation in [`invoices-module/`](../invoices-module/plan.md)). Loop: supplier setup → order → receive → invoice match → recipe cost → GP% in Sales.

**Notion:** [Purchasing](https://www.notion.so/34f64094bde6807585cbf41829c7b310)

**URL drift:** Notion parent `…/inventory`; code uses `…/purchasing/*`. **Code canonical.**

**Current code:**

| Child | Route | Status |
|-------|-------|--------|
| Orders | `purchasing/orders/` | Partial (tabs: order guide, POs) |
| Invoices | `purchasing/invoices/` | Partial — see invoices-module |
| Suppliers | `purchasing/suppliers/` | Partial (detail, products) |

**Gaps vs Notion:**

| Area | Status |
|------|--------|
| Suppliers LIVE | **Partial** — CRUD exists |
| Orders DEMO/seeded | **Partial** — UI; forecast Order Guide |
| Invoice loop | **Partial** — automation + thin UI |
| Email PO outbound | **Planned** |
| Active supplier product per ingredient | **Partial** |
| Recipe cost propagation prompt | **Partial** |

## 2. Scope

### In scope (MVP)

- Supplier + supplier product + ingredient mapping
- Order guide suggestions (forecast phase-1 approx)
- PO lifecycle Draft → Submitted → … → Delivered
- Tight coupling to invoice module and email infra

### Out of scope (Phase 2)

- EDI supplier integrations, BAS from invoices, per-venue active product

## Notion specification

See Notion page sections: Purpose, procurement lifecycle, cross-cutting decisions (three-table model, active product, email inbox), MVP forecast integration (MVP.3).

### Sub-modules (sections)

| Child | Notion | Code route |
|-------|--------|------------|
| Suppliers | [link](https://www.notion.so/34f64094bde68055afa7c4a2fc6a5f82) | `purchasing/suppliers` |
| Orders | [link](https://www.notion.so/34f64094bde6801fbc94ef7a90e4be9d) | `purchasing/orders` |
| Invoices | [link](https://www.notion.so/34f64094bde680879fcdc09007b7ba24) | `purchasing/invoices` → `invoices-module/` |

## 3. Architecture placement

`apps/supersolt` only; `server/` purchasing + suppliers repos; Drizzle + RLS.

## 4. Data model

Supplier, supplier_product, ingredient linkage, purchase_orders — existing migrations; extend per Notion pipelines.

## 5. API surface

Venue-scoped routes under `app/api/organisations/[organisation]/venues/[venue]/` for suppliers, orders, invoices.

## Cross-references

- [`invoices-module/`](../invoices-module/), [`insights-platform/forecast-engine/`](../insights-platform/forecast-engine/), [`onboarding/`](../onboarding/) (supplier list step)

## Compliance audit (program 2026-06-01)

- Triad created; product text synced from Notion Purchasing page.
- Implementation gaps tracked in table above.
