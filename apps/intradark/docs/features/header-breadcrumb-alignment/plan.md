# Header breadcrumb alignment

> **Product:** `apps/intradark`
> **Slug:** `header-breadcrumb-alignment`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

Align **Intradark** chrome with the **Supersolt-style header breadcrumb** pattern: `usePathname` drives a trail built from `@workspace/ui` breadcrumb primitives, with the **existing spinning symbol** as the root crumb (link to `/`). A **single app-local module** defines **main top-level routes** (title + Lucide icon) consumed by **`AppSidebar`** and **`AppHeader`** so nav and crumbs stay consistent. **Session-aware `/`**: signed-in users go to **`/dashboard`**, signed-out to a new minimal **`/auth`** page; logic lives primarily in **`middleware.ts`** with a documented **fallback** when the session cannot be determined. **No** imports from `apps/supersolt`—behavior is reimplemented locally per **ARCHITECTURE.md §3.1**.

## 2. Scope

### In scope (MVP)

- **`AppHeader`**: Replace static wordmark block with **`<Breadcrumb>`** (star root + segment crumbs). Root: **spinning** `intradark-symbol-blue.svg` only (no wordmark in the trail). **`href="/"`** on the star whenever a tail segment exists (including on **`/dashboard`**, so the trail reads **star → Dashboard** per [`flows.md`](flows.md)); for **`/`** itself after any future non-redirect render, star alone as **current page** (`BreadcrumbPage`).
- **Pure helpers**: `formatSegment`, build list of `{ label, href, segmentIndex }`, attach **at most one** main-nav **icon** on the **first** pathname segment that matches the shared map; **≤3** total segments → **icon + label** for that crumb; **≥4** segments → **icon only** (suppress label) for that crumb.
- **`lib/` (or `config/`)** module: exported **route metadata** (path prefix, display label, `LucideIcon`) + helpers; **`AppSidebar`** refactored to consume it (sidebar stays shell-only **§7.1**).
- **`middleware.ts`**: After existing `updateSession`, branch **`/`** → `/dashboard` if `getUser()` has user, else `/auth`; branch **`/auth`** → `/dashboard` if user present.
- **`app/auth/page.tsx`**: Minimal sign-in hub (Steam / Discord entrypoints consistent with dashboard copy); **outside** `(main)` if that avoids signed-out users inheriting main chrome—pick at implementation (plain layout acceptable).
- **`app/page.tsx`**: Thin **fallback** redirect when middleware intentionally **passes through** (indeterminate session); document parity with middleware targets.
- **Vitest** for pure breadcrumb + threshold logic; **manual** checklist for redirects ([`tdd.md`](tdd.md)).
- **Live Supabase project (read-only introspection, 2026-05-04):** tables `steam_profiles`, `user_profiles`, `roles`, `user_roles`; migrations through `user_roles_profile_fk`. **This feature adds no DDL**—implementation does **not** call **`apply_migration`** for this slice. When other features add schema, continue applying via **`apply_migration`** in lockstep with **`apps/intradark/drizzle/`** per **ARCHITECTURE.md §8.1**; **`generate_typescript_types`** only when schema changes warrant it.

### Out of scope (deferred)

- **Entity-resolved labels** in the header (match title, player name, etc.)—requires data fetch + loading states; follow-up feature.
- **Playwright** smoke for middleware in MVP (Vitest + manual only).
- **Telemetry / analytics** for crumb clicks or redirects.
- **Feature flags** for this behavior.

### Non-goals

- **Not** extracting route metadata to **`packages/*`** until a **second product** consumes it (**§5.1**).
- **Not** changing **RLS** or **session storage** semantics beyond redirect branching.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | Shell: `components/organisms/app-header.tsx`, `components/organisms/app-sidebar.tsx`; **pure** route + breadcrumb helpers in `apps/intradark/lib/` (or `config/`) | §7.1 |
| Shell vs domain | Breadcrumb chrome is **shell**; no new `entities/<feature>/` required unless a helper grows large enough to split | §7.1 |
| Auth dependency | **`@supabase/ssr`** in middleware (existing `utils/supabase/middleware.ts`); align long-term with **`@workspace/supabase`** when the app standardizes (same posture as [News](../news/plan.md)) | §3.2 |
| New package edges | None | §3.2, §10 |

## 4. Data model

### Tables / columns

_No schema changes._ Live **public** tables (Supabase MCP, 2026-05-04): `steam_profiles`, `user_profiles`, `roles`, `user_roles`.

### RLS

_n/a_

### Migration ownership

- **Path:** _None for this feature._
- **Pattern:** App-owned (**§8.1**) when future DDL ships; this PR is **UI + middleware + route** only.
- **Backfill:** None.

### Generated types

_n/a_ for this feature.

## 5. API surface

_No new HTTP or server actions._ Reuse existing **`/api/auth/steam`**, **`/api/auth/discord`**, **`/api/auth/signout`** links on `/auth`.

### Validation

- _n/a_

## 6. UI composition

```
apps/intradark/
├── middleware.ts                 # / and /auth redirects after updateSession
├── app/
│   ├── page.tsx                  # Fallback redirect when session indeterminate
│   └── auth/page.tsx             # Minimal sign-in hub (layout TBD)
├── lib/
│   └── main-nav-routes.ts        # Shared segment → { label, icon } + breadcrumb builder (name TBD)
└── components/organisms/
    ├── app-header.tsx            # Breadcrumb + star
    └── app-sidebar.tsx           # Nav from shared lib
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Breadcrumb primitives | `@workspace/ui/components/breadcrumb` | Match supersolt composition; no fork |
| Star image | Same asset as today | `animate-spin-slow` on symbol |
| Icons | `lucide-react` | From shared route map |

### Theming

- Tokens from **`@workspace/ui`** (**§6**). No new global overrides required unless QA finds contrast issues on breadcrumb text.

## 7. Dependencies

### Existing packages used

- **`@workspace/ui`** — Breadcrumb, Separator, SidebarTrigger, existing header controls.
- **`@supabase/ssr`** — Middleware session (existing); do not introduce **`@workspace/ui` → `@workspace/supabase`** coupling.

### New external deps

- None.

### New package edges

- None.

## 8. Implementation order (commits)

1. `feat(intradark): add main nav route map module` — shared metadata + pure `buildBreadcrumbModel` (or equivalent); no UI wire yet.
2. `test(intradark): cover breadcrumb model + segment thresholds` — Vitest from [`tdd.md`](tdd.md).
3. `feat(intradark): wire app header breadcrumb` — star + crumbs; remove redundant wordmark from header cluster.
4. `refactor(intradark): drive sidebar nav from shared route map` — behavior parity with current URLs/icons.
5. `feat(intradark): add auth page and root session redirects` — `/auth` UI + middleware + `app/page.tsx` fallback.
6. `docs(intradark): mark header-breadcrumb-alignment planned → done` — status flip after verification.

## 9. Telemetry

_None in MVP_ (per grill-me). Remove placeholder events from acceptance if copying older templates.

## 10. Rollout

- **Feature flag:** None — always on once merged.
- **Env vars:** None new required; existing `NEXT_PUBLIC_SUPABASE_*` must remain set for deterministic redirects in dev/prod.
- **Migration sequencing:** None (no DDL).
- **Backout:** Revert commits in reverse order; restore previous `app/page.tsx` redirect if needed.

## 11. Open questions

- [ ] Whether **`/auth`** uses root `app/layout.tsx` only or a dedicated minimal `app/auth/layout.tsx` for marketing-free chrome — owner: intradark maintainers, due: implementation kickoff.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
