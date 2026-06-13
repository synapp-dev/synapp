# Settings

> **Product:** `apps/supersolt`  
> **Slug:** `settings`  
> **Route:** `/{organisation}/{venue}/settings/*`  
> **Created:** 2026-06-01  
> **Updated:** 2026-06-01

## 1. Summary

Settings is the cross-cutting configuration hub: permissions, organisation, venues, integrations, recipes, inventory ingredients, devkit. Child specs vary; **Permissions** has a full triad.

**Notion:** [Settings](https://www.notion.so/34f64094bde6806db71ef1a5ba1e4dad)

**Current routes (sidebar):** permissions, organisation, venue, integrations, venues, recipes, devkit, award-rates (workforce doc).

## Children

| Child | Notion | Triad |
|-------|--------|-------|
| Permissions/User | [link](https://www.notion.so/34f64094bde680d09de7cfcebbafe4b0) | [`permissions/`](permissions/plan.md) |
| Organisation | [link](https://www.notion.so/34f64094bde68095abd1e00f4e2f2c68) | § below |
| Venues | [link](https://www.notion.so/35564094bde6813fb438ea63af13a89b) | § below |
| Integrations | [link](https://www.notion.so/34f64094bde6808ba8c2d4e8d74ff6a0) | § below |
| Recipes | [link](https://www.notion.so/34f64094bde680d5a2bec5b34fef0072) | § below; `menu/recipes` rewrite |
| Inventory (Settings row) | [link](https://www.notion.so/34f64094bde68041a76ce61f5f234f7d) | `menu/ingredients` |

**Gaps vs Notion:**

| Area | Status |
|------|--------|
| Permissions | **Partial** — triad exists |
| Integrations Square/Xero | **Partial** |
| Org/venue extended fields moved from onboarding | **Partial** |
| Recipes backbone | **Partial** |

## 2. Scope

### In scope

- RBAC-aware settings nav (`entities/access/scoped-settings-access.ts`)
- Re-auth flows for integrations post-onboarding

### Out of scope

- Billing settings

## Cross-references

- [`settings/permissions/plan.md`](permissions/plan.md)
- [`onboarding/plan.md`](../onboarding/plan.md)
- [`workforce/award-rate-library/`](../workforce/award-rate-library/plan.md)

## Compliance audit (program 2026-06-01)

- Parent plan added; permissions compliance in child triad.
