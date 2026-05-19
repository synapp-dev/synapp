# Add existing user to school (email-first)

> **Product:** `apps/bullyproof`
> **Slug:** `school-add-user-existing`
> **Status:** Implemented
> **Owner:** TBD
> **Created:** 2026-05-19

## 1. Summary

Platform and school admins add users through several dialogs and API routes. Today, when an email is already registered in Supabase Auth but not returned by the first page of `admin.listUsers()`, creation fails with `email_exists` (422) and the UI shows a blocking error. This feature fixes backend user resolution, adds a shared email lookup API, and standardizes manual add-user flows on an email-first wizard: the server confirms whether the address exists, prefills name and (when applicable) current school roles on step 2, and on submit creates the auth user only if needed then assigns roles—never failing solely because the account already exists.

## 2. Scope

### In scope (MVP)

- `GET /api/users/lookup?email=&schoolId=` — exists check + minimal prefill (`firstName`, `lastName`, `schoolRoles` when `schoolId` provided).
- Shared server helper to resolve auth user by email (paginated `listUsers`, `user_profile` fallback, handle `email_exists` on `createUser`).
- Harden all `POST /api/users/new*` route handlers and bulk user create to use the helper.
- Shared client hook `useUserEmailLookup` in `entities/users/`.
- Email-first manual UX:
  - `AddManualUserDialog` (Admin → Schools → Users, school Settings → Users).
  - `AddUserSheet` (Admin → Users) — replace “existing user” fork with prefill + continue.
- CSV/import paths: no wizard; server-side exists handling only (`add-user-dialog.tsx` bulk, `import-users-dialog.tsx` if applicable).
- Add-only role assignment in Add User dialogs (prefill current school roles; submit assigns newly selected roles not already held).
- Idempotent success when user already has selected roles at the school.

### Out of scope (deferred)

- Playwright E2E for add-user (no harness in app today).
- Product analytics events (rely on server logs).
- Role **removal** via Add User (stays on user detail / edit-school-roles).
- Email autocomplete or searchable user lists for school admins.
- Changes to invite/onboarding flows (`invites.service.ts`) unless they share the same broken `listUsers()` pattern and are trivial to align.

### Non-goals

- Cross-school user directory for school admins.
- Changing RBAC model or `user_roles` schema.
- Merging all create endpoints into a single orchestration route (deferred; Option B from grill-me).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/bullyproof` only | §3.2, §5.1 |
| Domain code location | `entities/users/hooks/`, `server/user/` helper; dialogs stay in existing paths | §7.1 |
| Shell vs domain | Dialogs remain in `entities/dashboard/...` and `app/(main)/admin/users/`; shared hook in `entities/users/` | §7.1 |
| Auth dependency | Route handlers + `createServerAdminClient` / Drizzle via app server layer; client uses `apiFetch` only | §3.2, §8.1 |
| New package edges | None | §3.2, §10 |

> No `ARCHITECTURE.md` update required.

## 4. Data model

### Tables / columns

No schema changes. Uses existing:

- `auth.users` (Supabase Auth)
- `user_profile` (`first_name`, `last_name`, `email`)
- `user_roles` + `roles` (school-scoped assignment)

### RLS

No new policies. Lookup and create routes use existing server-side auth checks (`checkFeatureAccess`, `getUserScopedRoles`, `school:manage-school-user-roles`).

| Policy | Role | Rule |
|--------|------|------|
| n/a | — | Authorization enforced in route handlers, not new RLS |

### Migration ownership

- **Path:** n/a — no DDL
- **Pattern:** App-owned (§8.1); no migration
- **Backfill:** None

### Generated types

No regeneration required.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Lookup by email | Route Handler | `app/api/users/lookup/route.ts` `GET ?email=&schoolId=` | Platform: `/admin/users` OR school admin: `school:manage-school-user-roles` at `schoolId` | Returns minimal DTO; never lists users |
| Create + assign (existing) | Route Handler | `app/api/users/new/route.ts` (+ siblings) | Unchanged | Use shared `resolveAuthUserByEmail` |
| Create + assign (bulk) | Route Handler | `app/api/users/bulk/route.ts` | Unchanged | Align pagination / helper with generic route |
| Profile by email (admin) | Route Handler | `GET /api/users?email=` | `/admin/users` only | Keep for backward compat; prefer `/users/lookup` for new UI |

### Lookup response shape

```ts
type UserLookupResponse = {
  exists: boolean;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  /** Role keys at schoolId, e.g. ["SCHOOL_STAFF", "TEACHER"] */
  schoolRoleKeys?: string[];
};
```

### Shared server helper (new)

- **Location:** `apps/bullyproof/server/user/resolve-auth-user-by-email.ts` (name TBD)
- **Behavior:**
  1. Query `user_profile` by normalized email (case-insensitive).
  2. If missing, paginate `adminClient.auth.admin.listUsers({ page, perPage: 1000 })` until found or exhausted (mirror `app/api/users/bulk/route.ts`).
  3. On `createUser`, if error code `email_exists`, resolve user by email via steps 1–2 and return id (do not throw 500).

### Validation

- Lookup: Zod in `server/user/user.validators.ts` — `email`, optional `schoolId` (required when caller is school-scoped only).
- Create routes: existing `createUserSchema`; no breaking changes.
- Error mapping: [`flows.md`](flows.md) §2.

### Authorization matrix (lookup)

| Caller | `schoolId` | Allowed |
|--------|------------|---------|
| Platform admin (`/admin/users`) | Optional | Lookup any email; if `schoolId` set, include `schoolRoleKeys` for that school |
| School admin | Required, must match admin’s school | Lookup only when `schoolId` passes `canManageSchoolUsers` |
| Other | — | 403 |

School admins **cannot** call list/search endpoints for users outside their school; they only pass an exact email they typed.

## 6. UI composition

```
apps/bullyproof/
├── app/api/users/
│   ├── lookup/route.ts          # NEW
│   └── new/route.ts             # USE shared resolver
├── server/user/
│   └── resolve-auth-user-by-email.ts   # NEW
├── entities/users/
│   ├── hooks/use-user-email-lookup.ts  # NEW
│   └── api/endpoints.ts                # ADD lookup client
├── entities/dashboard/.../schools/components/
│   ├── add-manual-user-dialog.tsx      # email step 1, prefill step 2
│   └── add-user-dialog.tsx             # bulk: no wizard; server fix only
└── app/(main)/admin/users/components/
    └── add-user-sheet.tsx              # email step 1, drop blocking fork
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Dialog, Input, Label, Checkbox, Button | `@workspace/ui` | Reuse |
| `useUserEmailLookup` | `entities/users/hooks/` | Calls `GET /api/users/lookup` |
| `AddManualUserDialog` | `entities/dashboard/.../add-manual-user-dialog.tsx` | Steps: `email` → `details` (existing `preview` merged or kept) |
| `AddUserSheet` | `app/(main)/admin/users/components/add-user-sheet.tsx` | Step 1 email-only + lookup; step 2+ retains user type / school / role |

### Manual wizard steps (all manual add UIs)

| Step | Fields | Notes |
|------|--------|-------|
| 1 | Email only | Next → `lookup`; loading spinner on button |
| 2 | First name, last name, roles (+ platform: user type, school) | If `exists`: names disabled, prefilled; `schoolRoleKeys` pre-check roles; new user: editable names |
| Submit | — | POST existing create/assign endpoints; add-only role delta |

Reset step 2 when email changes or user navigates back to step 1.

### Theming

- No new tokens. Role checkbox colors unchanged (`--role-*` variables).

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — dialog, form controls
- App-local `@/utils/supabase/admin`, `@/server/db/drizzle`, `@/lib/api/fetcher.client`

### New external deps

- None

### New package edges

- None

## 8. Implementation order (commits)

1. `test(bullyproof): add user lookup and create resolver tests` — red tests per [`tdd.md`](tdd.md) (introduce vitest config if missing).
2. `feat(bullyproof): add resolveAuthUserByEmail server helper` — green resolver tests.
3. `feat(bullyproof): add GET /api/users/lookup` — green lookup tests.
4. `fix(bullyproof): use resolveAuthUserByEmail in POST /api/users/new` — fix `email_exists` 500; green create tests.
5. `fix(bullyproof): align users/new/* and bulk routes with resolver` — same helper, no behavior drift.
6. `feat(bullyproof): add useUserEmailLookup hook and API client` — client boundary.
7. `feat(bullyproof): email-first AddManualUserDialog` — school admin UX.
8. `feat(bullyproof): email-first AddUserSheet with prefill` — platform admin UX.
9. `fix(bullyproof): bulk/import user create uses resilient resolver` — CSV path.
10. `docs(bullyproof): mark school-add-user-existing complete` — flip status in this file.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| — | — | — | None in MVP |

Existing `[USER CREATE]` server logs remain the observability source.

## 10. Rollout

- **Feature flag:** none
- **Env vars:** none
- **Migration sequencing:** n/a (no DDL); deploy backend (commits 1–5) before UI (6–9)
- **Backout:** revert PR; no data migration to roll back

## 11. Open questions

- [ ] None — grill-me resolved 2026-05-19.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Related code: `app/api/users/new/route.ts`, `app/api/users/bulk/route.ts`, `add-manual-user-dialog.tsx`, `add-user-sheet.tsx`
