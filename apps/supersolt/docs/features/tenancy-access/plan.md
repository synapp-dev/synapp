# Tenancy and access context

> **Product:** `apps/supersolt`  
> **Slug:** `tenancy-access`  
> **Status:** In progress  
> **Created:** 2026-06-01  
> **Updated:** 2026-06-01

## 1. Summary

Every operational module assumes a resolved **organisation + venue** scope. Tenancy covers URL structure `/{organisation}/{venue}/…`, bootstrap of roles and nav, venue switching, and server-side re-validation on every API call.

**Notion:** Implied by all Module Overview scoped App URLs.

**Current code:**

| Area | Location |
|------|----------|
| Routes | `app/(main)/[organisation]/[venue]/` |
| Access API | `app/api/access/context/route.ts` |
| Store | `stores/app-context-store.ts` |
| Server | `server/access/`, `server/auth/rbac.ts`, `server/auth/capabilities.ts` |

**Gaps vs Notion:**

| Requirement | Status | Notes |
|-------------|--------|-------|
| Scoped URLs | **Shipped** | Dynamic segments |
| Venue switch preserves section | **Partial** | `DEFAULT_SCOPED_SECTION_PATH` in sidebar |
| Multi-org selector post-auth | **Partial** | See authentication plan |
| API denies cross-venue | **Shipped** | `assertVenueMember` pattern |

## 2. Scope

### In scope

- Org/venue slug resolution, membership checks, access context payload for client bootstrap
- Capability gates (dashboard, integrations, etc.)

### Out of scope

- Billing per org; SSO

## 3. Architecture placement

| Decision | Choice |
|----------|--------|
| App-only | `apps/supersolt` |
| Auth | `requireRequestAuth` + `ctx.appDb.rls` per AGENTS.md |
| UI | Shell in `components/`; domain in `entities/access/` |

## 4. Data model

Existing `organisations`, `venues`, `user_organisations`, role tables — no new MVP tables.

## 5. API surface

| Operation | Path |
|-----------|------|
| Access context | `GET /api/access/context` |
| Me | `GET /api/me` |

## 6–12. See [`tdd.md`](tdd.md), [`flows.md`](flows.md)

## Cross-references

- [`onboarding/plan.md`](../onboarding/plan.md), [`settings/permissions/`](../settings/permissions/plan.md)
