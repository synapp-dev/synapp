# Settings → Permissions / User

> **Product:** `apps/supersolt`
> **Slug:** `settings/permissions`
> **Parent:** Settings (Notion parent — future [`../plan.md`](../plan.md) optional)
> **Route:** `/{organisation}/{venue}/settings/permissions`
> **Status:** Implemented (pending migration apply + integration tests)
> **Owner:** TBD
> **Created:** 2026-06-01
> **Updated:** 2026-06-01 (grill-me complete)

## 1. Summary

Settings → Permissions is where the **Owner** manages platform access: who can log in, their permission level, venue assignments, invites, and archive/reactivate. The user list **is** the auth whitelist — invite adds email, archive revokes access immediately (whitelist + Supabase Admin signOut).

Position, pay rates, and employment fields live in **Workforce → People**; every accepted user gets a linked People stub (`user_profiles` + `user_organisations` + `user_venues`). Permission level (what they see) is decoupled from position (what they do).

**Personas:** Owner only (Notion MVP).

**Notion:** [Permissions/User (Module Overview)](https://www.notion.so/34f64094bde680d09de7cfcebbafe4b0) · parent [Settings](https://www.notion.so/34f64094bde6806db71ef1a5ba1e4dad)

**Grill-me decisions (locked):**

| Branch | Decision |
|--------|----------|
| Scope | Full Notion in-scope in one delivery |
| Role model | Keep slugs; rename display names; archive `supervisor` |
| Invites + whitelist | `organisation_member_invites` + `auth_whitelist` |
| API | Extend `/members/*` namespace |
| UI | `entities/organisations/members/` |
| Auth | Owner-only UI + API |
| Errors | Stable `permissions.*` codes |
| Archive | Immediate signOut + whitelist revoke |
| Telemetry | Full catalog + no-op stub |
| TDD | Unit + integration + component; E2E deferred |
| Rollout | Atomic with Authentication whitelist gate |

## 2. Scope

### In scope (MVP — Notion parity)

- User list: name, email, permission level, venue assignment(s), status (active / pending invite / archived)
- Filter by status, permission level, venue; search by name / email
- Read-only **position** column from People (link to Workforce → People for edit)
- **Single invite** — email, permission level, venue multi-select; magic-link via Supabase `inviteUserByEmail`
- **Bulk invite** — paste email list; default Staff + first venue; owner adjusts before send
- **Xero employee pull** — read-only import for bulk pre-fill (requires org Xero payroll connection)
- **User edit page** — display name, permission level, venue assignments; email read-only
- **Resend / revoke** pending invite (14-day expiry per Notion)
- **Archive / reactivate** user — cascade archive People record; re-activate both together
- **Four permission tiers** (customer-facing): Owner, Area Manager, Venue Manager, Staff
- **Auth whitelist sync** — active + pending (non-revoked) invites whitelisted; archive/revoke removes row
- **People stub auto-create** on invite accept
- **Owner-only** route + API gate; fix nav `canSeePermissions` to `roleSlug === 'owner'`
- Stable API error codes — see [`flows.md`](flows.md) §2
- Telemetry: `permissions.*` catalog + `members-telemetry.ts` no-op stub
- Refactor **Onboarding → Invite Team** to call shared members invite service (same deploy as auth gate)

### Out of scope (Phase 2)

- Custom permission levels (e.g. Manager + Integrations)
- SSO / Google Workspace; two-factor authentication
- Per-user permission audit log (Settings-wide audit Phase 2)
- Email change in-place (MVP: archive + re-invite)
- Auto-remind pending invites (day 3 / 7 cron) — manual resend only
- Partial re-activate employee without platform user (MVP: all staff are platform users)
- Playwright E2E (deferred until auth OTP + invite accept test harness exists)

### Non-goals

- Position taxonomy, pay rates, certifications — **Workforce → People**
- Authentication UI/OTP implementation — [`supersolt-authentication`](../../supersolt-authentication/plan.md) (coordinated release, not owned here)
- Promoting members UI to `packages/*` before second consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md))
- App-to-app imports ([ARCHITECTURE.md §3.1](../../../../ARCHITECTURE.md))

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | `entities/organisations/members/` | §7.1 |
| Shell vs domain | Settings tab shell in `settings/_components/`; members domain in `entities/` | §7.1 |
| Auth dependency | Supabase Auth via `@/utils/supabase/*` (server admin for invite/signOut only); Drizzle + RLS for data | §3.2 |
| New package edges | None | §3.2, §10 |

## 4. Data model

### Existing tables (reuse)

| Table | Role in Permissions |
|-------|---------------------|
| `user_profiles` | Identity (email, name); 1:1 with `auth.users` |
| `user_organisations` | Org membership + org-level `role_id`; created on **invite accept** |
| `user_venues` | Venue assignments; optional per-venue `role_id` override (MVP: inherit org role, set venues only) |
| `roles` | Platform roles; display names updated to Notion tiers |

### Role slug → Notion tier (grill-me B)

| Slug (stable) | Display name (UI) | `grants_org_admin` | Assignable by Owner |
|---------------|-------------------|--------------------|---------------------|
| `owner` | Owner | true | No (transfer flow out of scope) |
| `admin` | Area Manager | true | Yes |
| `manager` | Venue Manager | false | Yes |
| `crew` | Staff | false | Yes |
| `supervisor` | *(archived)* | false | No — backfill existing rows to `manager` or `crew` |

### New tables

```sql
-- apps/supersolt/supabase/migrations/YYYYMMDDHHMMSS_permissions_invites_whitelist.sql

CREATE TABLE public.auth_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  trial_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text])),
  added_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX auth_whitelist_active_email_org_uq
  ON public.auth_whitelist (lower(trim(email)), organisation_id)
  WHERE status = 'active';

CREATE TABLE public.organisation_member_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles (id),
  inviting_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  venue_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organisation_member_invites_email_format_chk
    CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX organisation_member_invites_org_pending_idx
  ON public.organisation_member_invites (organisation_id, expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Archive supervisor platform role + backfill user_organisations / user_venues role_id
UPDATE public.roles SET archived_at = now(), updated_at = now()
  WHERE organisation_id IS NULL AND slug = 'supervisor' AND archived_at IS NULL;

UPDATE public.user_organisations uo SET role_id = r_mgr.id, updated_at = now()
FROM public.roles r_sup, public.roles r_mgr
WHERE uo.role_id = r_sup.id AND r_sup.slug = 'supervisor'
  AND r_mgr.organisation_id IS NULL AND r_mgr.slug = 'manager' AND r_mgr.archived_at IS NULL;

UPDATE public.user_venues uv SET role_id = NULL, updated_at = now()
FROM public.roles r_sup
WHERE uv.role_id = r_sup.id AND r_sup.slug = 'supervisor';

UPDATE public.roles SET display_name = 'Area Manager', updated_at = now()
  WHERE organisation_id IS NULL AND slug = 'admin';
UPDATE public.roles SET display_name = 'Venue Manager', updated_at = now()
  WHERE organisation_id IS NULL AND slug = 'manager';
UPDATE public.roles SET display_name = 'Staff', updated_at = now()
  WHERE organisation_id IS NULL AND slug = 'crew';
```

### RLS

| Policy | Table | Rule |
|--------|-------|------|
| `auth_whitelist_select_org_admin` | `auth_whitelist` | SELECT where `is_org_admin(organisation_id)` |
| `auth_whitelist_manage_owner` | `auth_whitelist` | INSERT/UPDATE for org owner only (via service + RLS) |
| `auth_whitelist_service_read` | `auth_whitelist` | Auth route uses service role or SECURITY DEFINER helper for OTP pre-check |
| `organisation_member_invites_select_owner` | `organisation_member_invites` | SELECT where caller is org **owner** (not merely admin) |
| `organisation_member_invites_manage_owner` | `organisation_member_invites` | ALL for org owner |

> **Owner-only RLS:** Use `roles.slug = 'owner'` join on `user_organisations`, not `is_org_admin()`, so Area Managers cannot manage invites via SQL either.

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/YYYYMMDDHHMMSS_permissions_invites_whitelist.sql`
- **Pattern:** App-owned ([ARCHITECTURE.md §8.1](../../../../ARCHITECTURE.md))
- **Apply (implementation):** `apply_migration` on **`user-supabase-supersolt-mvp`** MCP project in same order as committed SQL; then `pnpm drizzle:pull` in `apps/supersolt`
- **Backfill:** Supervisor → manager migration in same file; seed `auth_whitelist` from active `user_organisations` + existing auth users (one-shot in migration or script `scripts/backfill-auth-whitelist.ts`)

### Generated types

Regenerate `apps/supersolt/drizzle/schema.ts` via `pnpm drizzle:pull` after migration applies. Do not hand-edit.

## 5. API surface

Extend existing members namespace. All routes: **`assertOrganisationOwner`** (not `assertOrganisationAdmin`).

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| List members + pending invites | Route Handler | `GET …/members` | Owner | Merged view; includes venue names, position from People |
| Single invite | Route Handler | `POST …/members/invites` | Owner | Creates invite row + whitelist + `inviteUserByEmail` |
| Bulk invite | Route Handler | `POST …/members/invites/bulk` | Owner | Validates emails; batch invites |
| Xero import preview | Route Handler | `POST …/members/import/xero` | Owner | Returns employee emails from Xero payroll API; no writes until bulk confirm |
| Resend invite | Route Handler | `POST …/members/invites/[inviteId]/resend` | Owner | New expiry; re-send email |
| Revoke invite | Route Handler | `POST …/members/invites/[inviteId]/revoke` | Owner | Revoke whitelist; mark invite revoked |
| Get member detail | Route Handler | `GET …/members/[userOrganisationId]` | Owner | Edit page payload |
| Update member | Route Handler | `PATCH …/members/[userOrganisationId]` | Owner | Role, venues, display name |
| Archive member | Route Handler | `POST …/members/[userOrganisationId]/archive` | Owner | Whitelist revoke + signOut + archive uo/uv + People cascade |
| Reactivate member | Route Handler | `POST …/members/[userOrganisationId]/reactivate` | Owner | Whitelist + unarchive uo + People |
| Accept invite (internal) | Service | `membersInviteService.acceptInvite` | System / first login hook | Called from auth post-OTP when invite token/metadata matches; creates uo/uv + People stub |
| Check email | Route Handler | `GET …/members/check-email` | Owner | Existing; keep |

**Deprecate:** `POST …/members` immediate `createUser` path — replace with invite flow.

### Validation

- **Input schemas:** `server/organisations/members.schemas.ts` (Zod)
- **Errors:** `MembersServiceError` with `{ code: PermissionsErrorCode, status, message }` — see [`flows.md`](flows.md) §2
- **Error module:** `server/organisations/members-errors.ts`

### Service layout

```
server/organisations/
├── organisation-members.service.ts   # extend / split list + member CRUD
├── members-invite.service.ts         # invite, bulk, resend, revoke, accept
├── members-whitelist.service.ts      # auth_whitelist sync
├── members-import-xero.service.ts    # Xero employee read
├── members-telemetry.ts
├── members-errors.ts
├── members.schemas.ts
├── organisation-members.repo.ts      # extend
└── organisation-member-invites.repo.ts
```

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/settings/
│   ├── permissions/
│   │   ├── page.tsx                           # thin → MembersListPageClient
│   │   └── [memberId]/
│   │       └── page.tsx                       # MemberEditPageClient
│   └── _components/
│       └── settings-layout-client.tsx         # canSeePermissions → owner only
├── entities/organisations/members/
│   ├── api/endpoints.ts
│   ├── model/keys.ts
│   ├── model/types.ts
│   ├── hooks/use-members-list.ts
│   ├── hooks/use-member-detail.ts
│   ├── hooks/use-member-mutations.ts
│   └── components/
│       ├── members-list-page.tsx
│       ├── members-table.tsx
│       ├── members-filters.tsx
│       ├── invite-member-dialog.tsx
│       ├── bulk-invite-dialog.tsx
│       ├── xero-import-dialog.tsx
│       └── member-edit-page.tsx
└── entities/access/
    └── scoped-settings-access.ts              # canSeePermissions: roleSlug === 'owner'
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Table, Card, Dialog, Badge, Button, Select | `@workspace/ui` | Reuse |
| Members list + edit | `entities/organisations/members/components/` | Notion table + edit **page** |
| Settings tabs | `settings/_components/settings-layout-client.tsx` | Owner-only Permissions tab |

## 7. Dependencies

### Existing packages

- `@workspace/ui` — table, forms, dialogs, badges
- Drizzle + Supabase Auth per `AGENTS.md`
- Xero payroll client — `server/xero/payroll/xero-payroll-client.ts` (read employees for import)

### Upstream / downstream

| Module | Relationship |
|--------|--------------|
| [`supersolt-authentication`](../../supersolt-authentication/plan.md) | **Co-release** — OTP whitelist reads `auth_whitelist`; accept hook |
| [Settings (Notion)](https://www.notion.so/34f64094bde6806db71ef1a5ba1e4dad) | Parent nav / permission gating |
| [Onboarding → Invite Team](https://www.notion.so/35064094bde68069a7b2c6c215268d31) | **Consumer** of shared invite service |
| [`workforce` People](../../workforce/plan.md) | **Downstream** — stub on accept; cascade archive; read-only position column |
| All modules | Consume org role + venue assignments via existing RBAC |

### New external deps

None.

### New package edges

None — no `ARCHITECTURE.md` update required.

## 8. Implementation order (commits)

Coordinated **atomic release** with auth whitelist gate (same deploy window).

1. `docs(supersolt): plan settings permissions triad` — this folder + mapping.md row
2. `feat(supersolt): permissions invites + whitelist migration` — DDL, RLS, role display names, supervisor backfill
3. `test(supersolt): red members policy + error code unit tests` — per [`tdd.md`](tdd.md)
4. `feat(supersolt): members invite + whitelist services` — invite lifecycle green
5. `test(supersolt): members integration + RLS` — owner-only, whitelist sync, archive signOut mocked
6. `feat(supersolt): members API routes` — extend `/members/*`
7. `feat(supersolt): auth whitelist OTP gate` — update [`supersolt-authentication`](../../supersolt-authentication/plan.md) implementation; accept hook
8. `feat(supersolt): refactor onboarding invite to members service`
9. `feat(supersolt): members xero import service` — read-only employee list
10. `feat(supersolt): permissions UI entities + routes` — list, edit, invite dialogs
11. `feat(supersolt): owner-only settings permissions nav gate`
12. `feat(supersolt): people stub on invite accept + archive cascade`
13. `chore(supersolt): members telemetry stub`
14. `test(supersolt): members component tests`
15. `docs(supersolt): mark settings permissions specced` — flip status; update auth plan cross-ref

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `permissions.viewed` | List page mount | `{ organisation_id }` | `members-telemetry.ts` no-op |
| `permissions.invite_sent` | Single invite success | `{ organisation_id, role_slug, venue_count }` | no-op |
| `permissions.invite_bulk` | Bulk send success | `{ organisation_id, count }` | no-op |
| `permissions.invite_resent` | Resend success | `{ organisation_id, invite_id }` | no-op |
| `permissions.invite_revoked` | Revoke success | `{ organisation_id, invite_id }` | no-op |
| `permissions.member_archived` | Archive success | `{ organisation_id, user_organisation_id }` | no-op |
| `permissions.member_reactivated` | Reactivate success | `{ organisation_id, user_organisation_id }` | no-op |
| `permissions.role_changed` | PATCH role | `{ organisation_id, from_slug, to_slug }` | no-op |
| `permissions.venues_changed` | PATCH venues | `{ organisation_id, venue_count }` | no-op |
| `permissions.xero_import` | Xero preview/load | `{ organisation_id, employee_count }` | no-op |
| `permissions.failed` | API 4xx/5xx | `{ organisation_id, operation, code }` | no-op |

**Destination:** `server/organisations/members-telemetry.ts` — `console.debug` in dev until analytics pipeline exists.

## 10. Rollout

- **Feature flag:** none — atomic cutover with Authentication whitelist OTP gate
- **Env vars:** existing `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`; transactional email vars per auth plan
- **Migration sequencing:** apply migration → `drizzle:pull` → deploy app + auth gate in **same window**; backfill whitelist from existing members before enabling gate
- **Backout:** redeploy previous app if migration not applied; if migration applied, forward-only (do not drop tables without export)
- **Supabase MCP:** implementation applies DDL via `apply_migration` on **`user-supabase-supersolt-mvp`** per `AGENTS.md`

## 11. Open questions

### Product (from Notion — lean defaults in plan)

- Venue Manager cross-venue summary tiles — **strict isolation MVP** (Notion lean)
- Pending-invite auto-remind — **manual resend only MVP**

### Engineering

- [ ] **Supervisor backfill target** — default `manager` vs per-row heuristic — owner: eng, due: migration PR
- [ ] **Xero employee field mapping** — which Xero Payroll API shape for email + name — owner: eng, due: import service PR
- [ ] **Invite accept hook placement** — auth callback vs dedicated `POST /api/auth/accept-invite` — owner: eng, due: auth co-release PR
- [ ] **Update auth plan** — add `auth_whitelist` DDL to [`supersolt-authentication/plan.md`](../../supersolt-authentication/plan.md) §4 when implementing — owner: eng, due: co-release

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Authentication (co-release): [`supersolt-authentication/plan.md`](../../supersolt-authentication/plan.md)
- Workforce parent: [`workforce/plan.md`](../../workforce/plan.md)
- Architecture: [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

## Decision log

- *1 Jun 2026 (grill-me)* — Full Notion scope (A); role display remap + archive supervisor (B); invites + whitelist tables (A); extend members API (A); entities/organisations/members (A); owner-only (A); stable error codes (A); immediate archive signOut (A); full telemetry stub (A); unit+integration+component tests (B); atomic auth co-release (A).

## Compliance audit (program 2026-06-01)

Full triad; parent [`settings/plan.md`](../plan.md). Route `settings/permissions` matches Notion. **Done.**

**Updated:** 2026-06-01
