# News

> **Product:** `apps/intradark`
> **Slug:** `news`
> **Status:** Implemented (MVP)
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

First-party **news** for Intradark: a public **listing** and **article detail** experience plus a **staff-only** authoring surface using **TipTap** (body stored as JSON in Postgres). Access control uses a **modular app-owned RBAC** model (`roles` + `user_roles`) seeded minimally for **`news.editor`** so other modules (PUG moderation, etc.) can attach capabilities later without a parallel ad-hoc staff table. The **`roles` / `user_roles` tables and `news.editor` seed row** are introduced by **[Admin panel + RBAC](../admin-panel/plan.md)**; this feature adds **`news_articles`** and news-specific RLS/policies on top. Public routes stay **on** from day one with an **empty state** until the first publish. **Forums** and **media** remain separate feature triads; they are cross-linked from here only.

## 2. Scope

### In scope (MVP)

- Drizzle schema: **`news_articles`** (or equivalent name) with **RLS** aligned to published vs draft visibility. **`roles`** and **`user_roles`** already exist from [Admin panel](../admin-panel/plan.md) (includes seed **`news.editor`**).
- **No duplicate seed** for `news.editor` in a news-only migration.
- Public **`/news`** list (published only) and **`/news/[slug]`** detail; **404** for draft-only slugs on public routes (**§ error policy** in [`flows.md`](flows.md)).
- **Staff** routes under a clear prefix (e.g. **`/news/admin`** or **`/admin/news`**) — pick one convention at implementation; guard with session + role resolution server-side.
- **Server Actions** for create / update / save draft / publish / unpublish; **Drizzle in Server Components** for reads.
- **`entities/news/`** for list/detail/editor compositions; **`@workspace/ui`** primitives; **`components/`** remains shell-only (**ARCHITECTURE.md §7.1**).
- **TipTap** editor shell in a **client island**; server persists **JSON** (consider max size and validation in the action).
- **Manual save only** (no autosave in MVP); **inline persistent error banner** on save/publish failure (**[`flows.md`](flows.md)**).
- **Vitest** at `apps/intradark` for **pure helpers** (slug rules, role checks, payload guards) per [`tdd.md`](tdd.md).
- **Vercel Web Analytics:** add **`@vercel/analytics`**, render **`<Analytics />`** in root layout, document **enabling Analytics in the Vercel dashboard**; optional **`track()`** for key news events.

### Out of scope (deferred)

- **Autosave** / debounced server saves / optimistic concurrency — document follow-up in this file after MVP.
- **Comments, reactions, forums** integration — see roadmap [Community: news, forums, media](../../roadmap.md); separate triads.
- **RSS, sitemap, full-text search** — later.
- **Headless CMS** (Sanity, Contentful, etc.) — deferred; canonical body is Postgres.
- **Playwright E2E** and **Drizzle+RLS integration tests** in CI — listed in [`tdd.md`](tdd.md) as follow-up unless harness lands first.
- **Syndicated ingest** (RSS partners) — not MVP.

### Non-goals

- **Not** a second atomic component library under `components/` — domain UI lives in **`entities/news/`** (**§7.1**).
- **Not** extracting **runtime** RBAC or news types to **`packages/*`** until a **real second consumer** exists (**§5.1**). **`@workspace/rbac-contract`** is documentation-only and does not change this rule.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/news/` | §7.1 |
| Shell vs domain | Thin routes under `app/(main)/news/` (and admin subtree); domain in `entities/news/` | §7.1 |
| Auth dependency | Server-only: `@/utils/supabase/server` + `getCurrentUserProfiles()` (or successor). **Align long-term** with `@workspace/supabase` per checklist F — no `@workspace/ui` → Supabase imports. | §3.2 |
| New package edges | None for news-only code; **`@workspace/rbac-contract`** is added by [admin-panel](../admin-panel/plan.md) (docs package, **§5.4**) | §3.2, §5.4, §10 |

> Architecture compliance gate ([`checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md)) walked for this plan: every item **yes** or **n/a**. **`ARCHITECTURE.md`** gains **§5.4** via admin-panel PR (not duplicated here).

## 4. Data model

### Tables / columns (conceptual)

Naming is indicative; final names live in `drizzle/schema.ts` + migration.

```sql
-- public.roles — catalog of platform roles (extensible by other modules)
-- id, slug (unique), label, description (nullable), created_at

-- public.user_roles — many-to-many: which **profiles** hold which roles
-- user_profile_id → user_profiles.id (profile’s user_id → auth.users), role_id → roles.id, granted_at, granted_by (nullable → user_profiles.id), UNIQUE(user_profile_id, role_id)

-- public.news_articles
-- id, slug (unique), title, excerpt (nullable), body_json (jsonb), status ('draft' | 'published'),
-- published_at (nullable), author_user_id, created_at, updated_at
-- optional: updated_by, search_vector (deferred)
```

**Modular RBAC rule:** New capabilities add a **row** to `roles` (e.g. `pug.moderator`) and policies that `EXISTS` join `user_roles` + `roles` on that slug. Do **not** fork parallel staff tables per feature.

### RLS (sketch)

| Policy area | Audience | Rule (conceptual) |
|-------------|----------|-------------------|
| `news_articles` SELECT | `anon` + authenticated | Only rows with `status = 'published'` (and `published_at` not null if used). |
| `news_articles` SELECT | User with `news.editor` | May read drafts they need for admin UI (narrow to `author_user_id` or global editor — **decide at implementation**; document in migration). |
| `news_articles` INSERT/UPDATE/DELETE | User with `news.editor` | Allowed columns only; service role for seed scripts, not browser. |
| `roles` | authenticated | Read catalog where needed for admin UI; writes via controlled path only (or service role seed). |
| `user_roles` | — | Typically **no** direct client write; grants via admin tooling or SQL in MVP. |

Tighten predicates in SQL when implementing; mirror in Drizzle `pgPolicy` like existing `user_profiles` policies.

### Migration ownership

- **Path:** `apps/intradark/drizzle/*.sql` (next migration after admin-panel RBAC migration).
- **Pattern:** **App-owned** (**§8.1**). Not a packaged module template (**§8.2**).
- **Sequencing:** **`news_articles`** only after **`roles` / `user_roles`** and **`news.editor`** seed exist ([admin-panel §4](../admin-panel/plan.md#4-data-model)). **Backfill:** first editor = insert into `user_roles` (`user_profile_id`, `role_id`) for that user’s **`user_profiles.id`** and the `news.editor` role (SQL or service-role script; role row already exists).

### Generated types

Regenerate **`apps/intradark/types/supabase`** (or project convention) after Supabase reflects migrations; keep Drizzle schema in sync with `pull-and-fix-schema` if used.

## 5. API surface

| Operation | Surface | Auth | Notes |
|-----------|---------|------|-------|
| List published articles | Server Component + Drizzle | Public | Pagination cursor optional in MVP. |
| Read published article by slug | Server Component + Drizzle | Public | `notFound()` if missing or unpublished. |
| Create article | Server Action | `news.editor` | Initial `draft`, generate unique slug from title if blank. |
| Update draft / metadata | Server Action | `news.editor` + ownership rule | Validate body JSON size/shape. |
| Publish / unpublish | Server Action | `news.editor` | Sets `status`, `published_at`. |
| Admin list (drafts) | Server Component + Drizzle | `news.editor` | Separate query from public index. |

### Validation

- **Zod** (or equivalent) colocated with actions under `apps/intradark/entities/news/` or `lib/news/` — single schema imported by actions only (server).
- Map failures to user-visible rows in [`flows.md`](flows.md) §2; return **discriminated errors** to the client island for the **inline banner**.

## 6. UI composition

```
apps/intradark/
├── app/(main)/news/
│   ├── page.tsx                 # Public list — SC, Drizzle
│   ├── [slug]/page.tsx        # Public detail — SC; notFound() for draft
│   ├── admin/…                # Editor routes — layout checks role
│   └── loading.tsx            # Optional skeletons
├── entities/news/
│   ├── components/            # ArticleCard, ArticleBody, NewsEditorShell, …
│   ├── actions.ts             # "use server" exports OR sibling server-actions file
│   └── lib/                   # slug helpers, role resolution (unit-tested)
└── components/                # Shell only — no new atoms for news here
```

### Component map

| Need | Source |
|------|--------|
| Buttons, inputs, cards, dialogs, typography | `@workspace/ui` |
| News-specific layout, TipTap shell, rendered body | `entities/news/components/` |

### Theming

- **§6:** consume `@workspace/ui` tokens; product overrides stay in `app/globals.css` if needed.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — layout, buttons, forms, alerts for list/editor chrome.
- `@supabase/ssr` / `@supabase/supabase-js` — via **`@/utils/supabase/server`** (current intradark pattern).

### New external deps

- **`@vercel/analytics`** — `pnpm add @vercel/analytics --filter intradark` (or from monorepo root per workspace convention).
- **TipTap** packages — add when implementing editor (`@tiptap/react`, starter-kit or curated extensions); pin versions in `apps/intradark/package.json`.

### New package edges

- **None** for npm/runtime edges in the news PR. **`@workspace/rbac-contract`** is introduced with [admin-panel](../admin-panel/plan.md) (**ARCHITECTURE.md §5.4**).

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../.cursor/skills/commit-organizer/SKILL.md). Adjust; keep tree green.

1. `docs(intradark): add news feature triad` — this folder (if not already landed).
2. `feat(intradark): add news_articles migration` — DDL + RLS (depends on admin-panel **`roles` / `user_roles`** migration).
3. `chore(intradark): vitest and news unit tests` — red then green for helpers (Vitest may already exist from admin-panel).
4. `feat(intradark): news server actions` — create/update/publish with Zod.
5. `feat(intradark): public news list and detail` — `entities/news` + routes.
6. `feat(intradark): news editor admin routes` — TipTap island + error banner behavior.
7. `feat(intradark): add vercel analytics` — dependency + `<Analytics />` + env/docs note to **enable in Vercel**.
8. `docs(intradark): mark news feature implemented` — status flip in this file when done.

## 9. Telemetry

| Event / signal | Trigger | Payload | Destination |
|----------------|---------|---------|-------------|
| Automatic page views | Route navigations | (provider default) | Vercel Web Analytics |
| `track('news_published', { slug })` | Successful publish action | article slug (no PII) | Vercel Analytics custom event |
| Optional `track('news_editor_save_failed', { code })` | Server action failure | error code enum | Same |

**Reminder:** After installing the package, open the **Vercel project → Analytics → Web Analytics** and **enable** collection for the deployment; local dev may show limited data.

## 10. Rollout

- **Feature flag:** **None** for MVP — **`/news`** stays in nav; empty list until first publish (**rollout branch A**).
- **Env vars:** Document in `env.example` only if analytics needs optional keys; `@vercel/analytics` typically uses project linkage, not secrets.
- **Migration sequencing:** Ensure [admin-panel](../admin-panel/plan.md) **`roles` / `user_roles` / `news.editor` seed** is applied first; then apply **`news_articles`** migration; deploy after migrations in hosted Supabase/Neon (use **`user-supabase-intradark`** MCP per app convention).
- **Backout:** Forward-only data; rollback code without dropping tables if needed; to remove feature, unpublish all articles and hide routes in a follow-up PR (not MVP).

## 11. Open questions

- [ ] **Public draft URL:** confirm **404** for all non-editors (resolved in grill-me; restate if product changes).
- [ ] **Editor read scope:** any `news.editor` sees all drafts vs author-only — pick at RLS implementation.
- [ ] **Supabase client path:** migrate `utils/supabase` usage toward **`@workspace/supabase`** when the app standardizes — owner: intradark maintainers.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows + errors: [`flows.md`](flows.md)
- RBAC + admin shell: [`../admin-panel/plan.md`](../admin-panel/plan.md)
- Contract package: [`packages/rbac-contract/README.md`](../../../../../packages/rbac-contract/README.md)
- Roadmap context: [Community: news, forums, media](../../roadmap.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
