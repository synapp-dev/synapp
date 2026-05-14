# @workspace/rbac-contract

**Documentation-first** package: shared **words** for role-based access across Synapp products. It does **not** ship runtime RBAC logic in MVP (see [ARCHITECTURE.md](../../ARCHITECTURE.md) §5.1 vs §5.4). Each app keeps **migrations and Drizzle** in **`apps/<product>/`**; this package holds **contract text** so multiple apps can converge without premature extraction.

## Goals

- One **catalog** table pattern (`roles` or equivalent): stable **`slug`** (e.g. `news.editor`, `sandbox.access`), human **`label`**, optional description.
- One **assignment** table (`user_roles`): subject **`user_profile_id`** (or product-specific stable profile key) ↔ `role_id`, audit columns (`granted_at`, `granted_by` referencing the grantor profile when applicable).
- **RLS:** default stance — **no** casual browser writes to assignments; grants via **service role** or controlled admin tooling.
- **Module ↔ route:** document which **slug** gates which **URL prefix** per app (Intradark: [`apps/intradark/docs/features/admin-panel/plan.md`](../../apps/intradark/docs/features/admin-panel/plan.md)).

## Phase 2 (not MVP): hierarchical / prefix scopes

When a single slug is too coarse (e.g. sandbox **authentication** subtree vs **match** subtree):

- Introduce **`resource_prefix`** (or `role_scopes`) keyed to profile or `user_id` + prefix string **or** normalized **resource keys**.
- **Gate:** longest-prefix match wins; undocumented paths fail closed to **404** if anti-enumeration is required.
- Align conceptually with **Bullyproof** admin + school role patterns (`apps/bullyproof/entities/roles/`, filtered nav) — extract shared **code** only when a **second deployable** is a real consumer (**ARCHITECTURE.md §5.1**).

## Intradark implementation pointer

- **Owns first DDL** for `roles` / `user_roles` + seeds `sandbox.access`, `news.editor`.
- Apply remote migrations with Cursor MCP **`user-supabase-intradark`** (`apply_migration`) in lockstep with `apps/intradark/drizzle/*.sql`.
- **News** adds `news_articles` after this catalog exists: [`apps/intradark/docs/features/news/plan.md`](../../apps/intradark/docs/features/news/plan.md).
- **Navigation RBAC + templates** (optional extension of the same catalog pattern): grouping tables **`role_templates`** + **`role_template_roles`** + **`user_role_templates`** — atomic rows remain in **`roles`**; templates bundle capability IDs for join-at-read expansion. Spec: [`apps/intradark/docs/features/navigation-rbac/plan.md`](../../apps/intradark/docs/features/navigation-rbac/plan.md). Conceptually similar to Bullyproof **`permission_templates`** + **`permission_template_rules`**, but Intradark references **`roles`** directly instead of separate feature rows.

## Maintenance

Update this README when a new product adopts the contract or when Phase 2 scope is implemented anywhere.
