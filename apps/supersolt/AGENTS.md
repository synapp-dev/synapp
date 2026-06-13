# Supersolt — agent notes

## Data access (Drizzle + RLS)

Server data reads and writes go through **Drizzle** on Postgres with Supabase RLS, not `supabase.from()`.

- **Repos** (`server/**/**.repo.ts`): first parameter `tx: RlsTx`; import tables from `@/server/db/schema`.
- **Services** (`server/**/**.service.ts`): take `ctx: RequestAuthContext` from `@/server/auth/context`; use `ctx.appDb.rls((tx) => repo.fn(tx, …))` for tenant-scoped work; use `ctx.appDb.admin` only when RLS cannot see rows the user may access (OAuth tokens, forecast/daily-sales upserts, Xero sync).
- **API routes** (`app/api/**/route.ts`): `const { ctx, errorResponse } = await requireRequestAuth(request)` from `@/lib/api/route-auth`; pass `ctx` into services (no `createServerClient()` for data).
- **Venue scope**: `scopeRepo.getVenueContextBySlugs(tx, orgSlug, venueSlug)` + `assertVenueMember(ctx.tenantRoles, { organisationId, venueId })`.
- **Client fetch**: prefer `api` from `@/lib/api/client` (domain `entities/*/api/endpoints.ts`).
- **Supabase JS** remains for **Auth only** (`auth.admin`, session/JWT in `server/db/request-auth.ts`) — not for `.from()` queries.

### Authorization

- **Postgres RLS** — enforced inside `db.rls` transactions (`request.jwt.claims`, `SET LOCAL ROLE`).
- **`server/auth/rbac.ts`** — tenant roles, `assertVenueMember`, `assertOrganisationAdmin`, slug → id helpers.
- **`server/auth/capabilities.ts`** — product capabilities (dashboard, integrations).
- **`server/access/`** — access-context payload for nav / bootstrap (uses Drizzle + RBAC).
- **Migrations** — SQL in `supabase/migrations/`; TypeScript mirror via `pnpm drizzle:pull` (do not hand-edit `drizzle/schema.ts`).

## Supabase MCP

For this app, use the **`user-supabase-supersolt-mvp`** MCP server for Supabase operations (`apply_migration`, `execute_sql`, `list_migrations`, advisors, etc.). That project is the current Supabase target for local/dev work.

Do **not** use a legacy **`user-supabase-supersolt`** (or similarly named) MCP server for this codebase unless the team explicitly switches back.
