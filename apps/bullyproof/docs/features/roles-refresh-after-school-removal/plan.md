# Roles refresh after school removal

> **Product:** `apps/bullyproof`
> **Slug:** `roles-refresh-after-school-removal`
> **Status:** Implemented
> **Owner:** TBD
> **Created:** 2026-05-19

## 1. Summary

When a platform or school admin removes a user from a school via **Edit Roles** (unchecking Staff and saving, or the new footer action), the mutation succeeds but the **Roles** tab in `UserDetailDrawer` often still shows that school. Root cause: parents refresh only a **school-scoped** user list; after removal the user drops off that list, so `selectedUser` state is never updated. This feature fixes refresh by re-fetching the user via `GET /users/:id` after role mutations, adds an explicit **Remove from school** control in edit mode, and tightens the confirmation dialog layout.

## 2. Scope

### In scope (MVP)

- Shared `parseUserWithRoles` (and optional optimistic helper) under `entities/users/lib/`.
- Shared refresh helper used by all `UserDetailDrawer` parents after `onUserUpdate`:
  - `school-detail-drawer.tsx` (Admin → Schools)
  - `admin/users/page.tsx` (Admin → Users)
  - `settings-users-card.tsx` (school settings — replace local `rawToUserWithRoles` duplicate)
- After successful school removal or role save: `refetch` list queries **and** `meApi.get.userById` → `setSelectedUser`.
- Optimistic removal of the school block from `selectedUser.schoolRoles` when `userById` fails (with toast).
- **Edit Roles** dialog (`SchoolRoleAssignmentDialog`, edit mode only):
  - Footer left: destructive text button **Remove from school** → same `AlertDialog` as unchecking Staff.
  - Narrower confirmation dialog (`max-w-md` on `AlertDialogContent`).
- Manual regression on Admin → Schools and Admin → Users (see [`flows.md`](flows.md)).

### Out of scope (deferred)

- Playwright E2E (no harness today).
- Product analytics / telemetry events.
- New API route for “remove from school” (reuse `rolesApi.delete.removeRole` loop).
- Auto-closing the user drawer when the user leaves the current school’s user list.
- `school-settings-user-detail-drawer.tsx` unless it already wires `UserDetailDrawer` + `onUserUpdate` the same way (verify during impl; likely inherits fix via shared helper).

### Non-goals

- Changing RBAC, `user_roles` schema, or who may remove users.
- Bulk remove from school (existing bulk dialog in school drawer is separate).
- Redesigning the Roles tab layout.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/bullyproof` only | §3.2, §5.1 |
| Domain code location | `entities/users/lib/`, `entities/users/hooks/`; UI in existing `user-detail-drawer/` | §7.1 |
| Shell vs domain | `UserDetailDrawer` stays in `app/(main)/admin/users/components/`; school dashboard imports it (existing pattern) | §7.1 |
| Auth dependency | Existing route handlers + client `apiFetch`; no new Supabase client usage in UI | §3.2 |
| New package edges | None | §3.2, §10 |

> No `ARCHITECTURE.md` update required.

## 4. Data model

### Tables / columns

No schema changes. Uses existing:

- `user_roles` (school-scoped rows removed via `rolesApi.delete.removeRole`)
- `v_user_profile_expanded` / list views returning `schoolRoles` JSON on `GET /users/:id`

### RLS

| Policy | Role | Rule |
|--------|------|------|
| n/a | — | Existing policies on `user_roles`; no DDL |

### Migration ownership

- **Path:** n/a
- **Pattern:** App-owned (§8.1); no migration
- **Backfill:** None

### Generated types

No regeneration required.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Remove school roles | Route Handler (existing) | `DELETE` via `rolesApi.delete.removeRole` | Unchanged (`user-roles` API) | One call per role at school; same as `applyEditSchoolRolesChanges` today |
| Refresh user profile | Route Handler (existing) | `GET /users/:id` (`meApi.get.userById`) | Same as viewing user in admin | Returns updated `schoolRoles` |
| List users (school-scoped) | Route Handler (existing) | `meApi.get.listAllUsers({ schoolId })` | Unchanged | Refetch after mutation; row may disappear |

### Validation

- Input: existing payloads on role delete/assign.
- Error mapping: see [`flows.md`](flows.md) §2.

## 6. UI composition

```
apps/bullyproof/
├── entities/users/
│   ├── lib/parse-user-with-roles.ts      # NEW: shared mapper
│   └── lib/remove-school-from-user.ts    # NEW: optimistic filter (optional)
├── app/(main)/admin/users/components/
│   ├── user-detail-drawer.tsx            # applyEditSchoolRolesChanges (unchanged API calls)
│   └── user-detail-drawer/
│       └── school-role-assignment-dialog.tsx  # footer + AlertDialog width
├── entities/dashboard/.../school-detail-drawer.tsx  # onUserUpdate → refresh helper
├── app/(main)/admin/users/page.tsx                 # onUserUpdate → refresh helper
└── app/(main)/schools/.../settings-users-card.tsx # use shared mapper
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| `AlertDialog`, `Dialog`, `Button` | `@workspace/ui` | Edit footer + confirmation |
| `SchoolRoleAssignmentDialog` | App admin user-detail-drawer | Edit-mode footer layout |
| `UserDetailDrawer` | App admin users | Roles tab reads `user.schoolRoles` prop |

### Theming

- Destructive button: `variant` / `className` destructive text on left footer (match existing red confirm button tokens).
- Confirmation dialog: `AlertDialogContent className="max-w-md"` (slightly narrower than default).

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — Dialog, AlertDialog, Button
- App `apiFetch` / `meApi` / `rolesApi` — no new packages

### New external deps

None.

### New package edges

None.

## 8. Implementation order (commits)

1. `feat(bullyproof): add parseUserWithRoles helper` — unit tests green.
2. `feat(bullyproof): refresh selectedUser after role mutations` — wire parents + optimistic fallback.
3. `feat(bullyproof): add Remove from school footer in edit roles dialog` — UX + narrower confirm dialog.
4. `test(bullyproof): unit tests for roles refresh helpers` — vitest.
5. `docs(bullyproof): mark roles-refresh-after-school-removal complete` — flip status in plan.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| n/a | — | — | Deferred; rely on server role logs |

## 10. Rollout

- **Feature flag:** none
- **Env vars:** none
- **Migration sequencing:** n/a (client-only)
- **Backout:** revert PR

## 11. Open questions

None — grill-me resolved 2026-05-19.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Related (add user, not removal): [`../school-add-user-existing/plan.md`](../school-add-user-existing/plan.md)
