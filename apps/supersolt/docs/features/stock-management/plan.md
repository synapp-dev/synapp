# Stock management

> **Product:** `apps/supersolt`  
> **Slug:** `stock-management`  
> **Parent:** Notion **Stock Management** (blank page body as of sync)  
> **Route:** `/{organisation}/{venue}/stock-management/*`  
> **Created:** 2026-06-01  
> **Updated:** 2026-06-01

## 1. Summary

Stock management covers physical inventory operations: **stock counts** and **waste**, feeding Insights Inventory and the purchasing Order Guide (current stock input). Notion parent page is **blank**; children **Stock Counts** and **Waste** define operational intent via Module Overview URLs (legacy `inventory/*` in Notion).

**Notion:** [Stock Management](https://www.notion.so/34f64094bde680049607f3783f7df279) · [Stock Counts](https://www.notion.so/34f64094bde6801197f2e8f96cc790a1) · [Waste](https://www.notion.so/34f64094bde680c6a9d7f4e3048fbcf8)

**URL drift:** Notion `…/catalog` parent vs code `…/stock-management/*`. **Code canonical** for v1.

**Current code:**

| Child | Route | Notes |
|-------|-------|-------|
| Stock counts | `stock-management/stock-counts/page.tsx` | |
| Waste | `stock-management/waste/_components/waste-page-client.tsx` | |
| Catalog/menu | `catalog/`, `menu/ingredients`, `menu/recipes` | Costing inputs — related, separate |

**Gaps vs Notion:**

| Area | Status |
|------|--------|
| Stock count → variance → insights | **Partial** |
| Waste → cost impact | **Partial** |
| Parent Notion spec | **Missing** (blank page) |

## 2. Scope

### In scope (MVP)

- Stock count sessions (create, count lines, submit)
- Waste logging linked to ingredients
- Permission gating by venue role

### Out of scope

- Full warehouse multi-location (Phase 2)

## 3. Architecture placement

App-owned; `entities/` per subdomain; migrations in `supabase/migrations/`.

## 4–12. Engineering detail

- **Stock counts:** full triad in [`stock-counts/`](stock-counts/plan.md) (Notion spec + grill-me locked).
- **Waste:** stub [`tdd.md`](tdd.md), [`flows.md`](flows.md) — separate triad when specced.

## Children

### Stock counts

- **Triad:** [`stock-counts/plan.md`](stock-counts/plan.md) · [`tdd.md`](stock-counts/tdd.md) · [`flows.md`](stock-counts/flows.md)
- Route: `…/stock-management/stock-counts`
- Notion: [Stock Counts](https://www.notion.so/34f64094bde6801197f2e8f96cc790a1)
- Feeds inventory insights variance when approved counts exist.

### Waste

- Route: `…/stock-management/waste`
- Records waste events against ingredients/recipes.

## Cross-references

- [`purchasing/plan.md`](../purchasing/plan.md) (Order Guide stock input)
- [`insights-platform/inventory/`](../insights-platform/inventory/plan.md)
