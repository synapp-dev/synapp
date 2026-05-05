# Synapp monorepo architecture

This document is the **source of truth** for how code is placed, shared, and evolved across `apps/*` and `packages/*`. It reflects agreed decisions for this workspace; update it when rules change.

## 1. Goals

- **Modular**: clear boundaries, small public surfaces, no accidental coupling.
- **Consistent**: one design-system base, predictable folders, enforceable import rules.
- **Transparent**: where something lives should be obvious from its role and reuse scope.
- **Reusable across products** only through **`packages/*`** (never app-to-app).

## 2. Workspace mechanics

- **Package manager:** pnpm (`pnpm-workspace.yaml` includes `apps/*`, `packages/*`).
- **Task orchestration:** Turborepo (`turbo.json`).
- **Shared config packages:** `@workspace/eslint-config`, `@workspace/typescript-config` (and similar) remain the home for lint/tsconfig presets.

## 3. Product coupling and imports

### 3.1 Hard rule: no app-to-app imports

- **`apps/<product>` must not import implementation code from another `apps/<product>`.**
- Cross-product reuse flows **only** through **`packages/*`** exports (parent inheritance, not sibling coupling).

### 3.2 Package dependency direction

| Layer | May import |
| --- | --- |
| `apps/*` | `packages/*`, local app code |
| `packages/*` | Other `packages/*` only where explicitly allowed below |
| `@workspace/ui` | **Presentation only.** No `@supabase/*`, no `@workspace/supabase`, no product/domain types. |
| `@workspace/supabase` | Supabase/auth/session utilities; **may** depend on `@workspace/ui` for **optional** prebuilt UI. **`@workspace/ui` must not** depend on `@workspace/supabase`. |

Cycles between packages are forbidden; new edges require an update to this doc.

## 4. Enforcement

### 4.1 Rules (minimal first slice)

- No resolved imports from **`apps/<A>`** into **`apps/<B>`** when **A ≠ B** (sibling products).
- **`packages/*` must not import `apps/*`**.
- **`@workspace/ui` must not import** `@workspace/supabase` or **`@supabase/*`**.

### 4.2 Implementation in this repo

- **`eslint-plugin-boundaries`** (`packages/eslint-config/monorepo-boundaries.js`) encodes the app↔app and package→app graph. It is merged into **`@workspace/eslint-config/next-js`** (all Next apps) and **`@workspace/eslint-config/react-internal`** (`@workspace/ui`).
- **`eslint-import-resolver-typescript`** is required so relative imports between `apps/*` resolve; otherwise boundary violations would not be detected.
- **`eslint-plugin-only-warn`** in the shared base config downgrades ESLint **severity 2 → 1** globally. Boundary hits therefore appear as **warnings** in per-app `next lint` / IDE runs.
- **Strict CI / merge gate:** run from the monorepo root:

  `pnpm lint:architecture`

  This uses **`eslint.architecture.mjs`** (same boundary rules, **no** `only-warn` patch) plus `no-restricted-imports` for `@workspace/ui` → Supabase. **`--no-inline-config`** avoids failures on files that contain `eslint-disable` comments for plugins not loaded in this minimal config.

Wire **`pnpm lint:architecture`** into CI alongside existing **`turbo lint`**.

## 5. When to extract to `packages/*`

### 5.1 Non-UI contracts (schemas, enums, shared API types)

- **Default:** own the code in the **originating app** until a **second app is a real consumer**.
- **Then:** extract to a named package (e.g. `@workspace/contracts`, `@workspace/schemas`) with a stable API.

### 5.2 UI primitives and generic composition

- **Agnostic building blocks** (atomic-style, product-neutral) belong in **`@workspace/ui`** (or a future split package if size demands it), **not** duplicated under `apps/*/components/atoms|molecules` in parallel.

### 5.3 North star: “module engine” (future)

- Mature features may be promoted to **`packages/<module>`** as **data-agnostic shells** (implementation + docs + neutral defaults), wired per product via **explicit context/adapters**.
- This does **not** imply a **shared hosted database** across products; each deployable keeps **sovereign data**.

### 5.4 Documentation-only workspace packages

- **`@workspace/rbac-contract`** (`packages/rbac-contract/`) holds **RBAC migration contract** notes and cross-app conventions (catalog + assignment tables, RLS expectations, Phase 2 prefix scopes). **MVP has no required runtime imports** from apps; each product still owns DDL under **`apps/<product>/`** per §8.1.
- Rationale: [`apps/intradark/docs/features/admin-panel/plan.md`](apps/intradark/docs/features/admin-panel/plan.md) and alignment with future per-module gates (see package `README.md`).

## 6. Theming and visual base

- **Single base:** design tokens and global primitives live in **`@workspace/ui`** (e.g. shared `globals.css` and CSS variables).
- **Product overrides:** each app may ship a small **override stylesheet** (imported **after** workspace globals) for product-specific color, typeface, radius, spacing, etc.—analogous to a **patch** on semantic tokens, not a fork of the component system.

## 7. Application code layout

### 7.1 Target mental model

| Location | Role |
| --- | --- |
| `packages/*` (especially `@workspace/ui`) | Product-**agnostic** UI and tokens; reusable across deployables. |
| `apps/<product>/entities/` | **Domain-specific** compositions: product copy, workflows, data shapes, tweaks **on top of** workspace primitives. |
| `apps/<product>/components/` | **Product-wide shell UI** only: chrome, branding, logo behavior, sidebars, cross-cutting dialogs—**not** a second atomic library. Must not shadow primitives already provided by `@workspace/ui`. |
| `apps/<product>/app/` | Routes, layouts, route-colocated UI where appropriate. |

### 7.2 Legacy and migration

- Existing apps may diverge from this layout today.
- **Refactors should be incremental:** prefer **re-export shims** or short-lived barrels at old paths so behavior and aesthetics stay stable while files move into the target hierarchy.

## 8. Data ownership and migrations

### 8.1 Default: each app is end-to-end for its database

- Migrations, generated types, RLS, and Supabase (or other) project mapping **belong to the product** that owns the data.
- There is **no monorepo-level shared database** across products.

### 8.2 Packaged modules: migrations **in the package** (pattern A)

- For a reusable **module package** (including engine-promoted modules), **default** to **versioned SQL migrations (or equivalent DDL) shipped beside the module**—e.g. `packages/<module>/migrations/`—as **templates**.
- **Each consuming app** applies those migrations to **its own** database project when integrating the module. The app **owns** whether, when, and how to apply them.

### 8.3 When pattern A **must not** be used (use app-owned migrations + contract docs instead)

Use **app-owned migrations** (and optionally **document-only** schema requirements in the package) when **any** of the following holds:

1. **Regulatory / audit / change control** requires migrations to live only in the product repo or a governed path.
2. **Tenant- or customer-specific schema** differs in ways a single template cannot express safely.
3. **Existing production databases** where a packaged migration would **collide** (object names, extensions, privilege model) or require **non-deterministic** manual backfill.
4. **Data backfill or long-running cutover** is required and cannot be expressed as a safe, reusable template.
5. **The module is UI-only** and has **no persistent schema**—then the package ships **no** DDL.
6. **Breaking DDL** would fork consumer apps on incompatible timelines; consumers must ship **coordinated** migrations rather than copying a single global file blindly.

In those cases, the package must still publish a **clear contract**: required tables/columns, indexes, RLS expectations, and upgrade notes—so integrators can author correct **app-local** migrations.

## 9. Industry tensions (explicit)

- **“Everything shared” in packages** fights **YAGNI** and creates churn—hence **promote on second consumer** for non-UI shared code.
- **Engine-extracted modules** must expose **explicit adapters and migration contracts** to avoid a **distributed monolith** of implicit globals and hidden context keys.
- **Strict `components/` at app root** vs **domain slices** is balanced here: shell/branding at `app/components/`, domain at `entities/`, agnostic UI in `@workspace/ui`.

## 10. Document maintenance

- Any new **allowed** package-to-package edge, **new** shared package, or **change** to migration defaults requires an **update to this file** in the same change as the code.
- Example: **`@workspace/rbac-contract`** added under §5.4 with rationale in [`apps/intradark/docs/features/admin-panel/plan.md`](apps/intradark/docs/features/admin-panel/plan.md).
