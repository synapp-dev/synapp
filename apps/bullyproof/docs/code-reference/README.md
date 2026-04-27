# Bullyproof code reference

Machine-assisted catalog of TypeScript, TSX, SQL migrations, and operational scripts under `apps/bullyproof/`. Each numbered document lists **every inventoried source path** with **Path**, **Kind**, and **Summary** so onboarding and refactors stay grounded in the repo layout.

## Contents

| Document | Scope |
|----------|--------|
| [00-overview.md](./00-overview.md) | Stack, request flow, and how major folders relate (hand-maintained). |
| [01-app-routing.md](./01-app-routing.md) | `app/` UI: route groups, `page.tsx`, `layout.tsx`, colocated clients (excludes `app/api`). |
| [02-app-api.md](./02-app-api.md) | `app/api/**/route.ts` HTTP handlers. |
| [03-server.md](./03-server.md) | `server/` persistence and domain logic (repos, services, validators, `lib`, `auth`, `db`). |
| [04-entities.md](./04-entities.md) | `entities/` feature slices (client API, UI, model). |
| [05-components.md](./05-components.md) | Shared `components/` (atoms → templates). |
| [06-hooks-stores-providers.md](./06-hooks-stores-providers.md) | `hooks/`, `stores/`, `providers/`. |
| [07-lib-utils-types-config.md](./07-lib-utils-types-config.md) | `lib/`, `utils/`, `types/`, `config/`, root `middleware.ts`, Next/Drizzle config. |
| [08-drizzle-and-data.md](./08-drizzle-and-data.md) | `drizzle/schema.ts`, `relations.ts`, and `*.sql` migrations. |
| [09-scripts-and-ops.md](./09-scripts-and-ops.md) | `scripts/` and `server/migrations/` tooling. |

## Conventions

- **Path** is always relative to `apps/bullyproof/`.
- **Kind** is inferred from filename and folder (see `inferKind` in `scripts/generate-code-reference-inventory.ts`).
- **Summary** defaults to path-aware heuristics; leading `/** ... */` docblocks in source are appended when present.
- Pure barrel `index.ts` / `index.tsx` files that only re-export are labeled **Barrel** with a short summary.

## Regenerating

From `apps/bullyproof/`:

```bash
pnpm docs:code-reference:generate
```

Writes `_inventory.json` and regenerates `01-` through `09-` markdown. **Do not hand-edit numbered files** if you intend to keep them in sync with the generator; change heuristics or source comments and re-run.

```bash
pnpm docs:code-reference:check
```

Fails if any inventory path is missing a matching `**Path**:` entry in the numbered markdown files.

```bash
pnpm docs:code-reference:inventory
```

Updates `_inventory.json` only (no markdown refresh).

## Inventory artifact

- [`_inventory.json`](./_inventory.json) — full list with `section`, `kind`, optional `firstDocblock`, and `bySection` grouping (JSON is regenerated; safe for tooling, not for manual curation).

Last regenerated: run `pnpm docs:code-reference:generate` and see `generatedAt` inside `_inventory.json`.
