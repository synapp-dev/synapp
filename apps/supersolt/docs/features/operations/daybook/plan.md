# Daybook (operations)

> **Product:** `apps/supersolt`  
> **Slug:** `operations/daybook`  
> **Parent Notion:** [Operations](https://www.notion.so/34f64094bde6802fac96c233c2bb484d)  
> **Route:** `/{organisation}/{venue}/operations/daybook`  
> **Created:** 2026-06-01  
> **Updated:** 2026-06-01

## 1. Summary

Daybook is the venue operational journal / daily close surface. Notion positions Operations as parent with Daybook as primary child; **Reviews** is Phase 2 (deferred).

**Notion:** [Daybook](https://www.notion.so/34f64094bde68069a07cd3643af202c6)

**Current code:** `app/(main)/…/operations/daybook/page.tsx` (verify client components).

**Gaps vs Notion:**

| Area | Status |
|------|--------|
| Daybook entries | **Partial** / stub |
| Delivery schedule integration | **Planned** |
| Reviews child | **Deferred** (Phase 2) |

## 2. Scope

### In scope (MVP-light)

- Route shell + permission gate
- Basic daily notes / close checklist (align when Notion Daybook body expanded)

### Out of scope

- Reviews module (Phase 2)

## 3. Architecture placement

App-only; venue-scoped API when persistence added.

## Cross-references

- [`purchasing/`](../purchasing/plan.md), [`workforce/roster/`](../workforce/roster/plan.md)

## Compliance audit (program 2026-06-01)

- Triad scaffolded; deepen when Notion Daybook page authored.
