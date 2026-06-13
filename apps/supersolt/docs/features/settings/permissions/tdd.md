# Settings → Permissions — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Aligned to [Notion Permissions/User](https://www.notion.so/34f64094bde680d09de7cfcebbafe4b0).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `normalizeInviteEmail` lowercases + trims | `server/organisations/members-policy.test.ts` | red |
| 2 | unit | `isAssignableRoleSlug` accepts admin/manager/crew; rejects owner/supervisor | `server/organisations/members-policy.test.ts` | red |
| 3 | unit | `mapRoleSlugToDisplayName` returns Notion tier labels | `server/organisations/members-policy.test.ts` | red |
| 4 | unit | `mergeMembersList` combines active uo rows + pending invites; sorts by name | `server/organisations/members-policy.test.ts` | red |
| 5 | unit | `canArchiveMember` blocks last owner | `server/organisations/members-policy.test.ts` | red |
| 6 | unit | `isInviteExpired` true when past expires_at and not accepted | `server/organisations/members-policy.test.ts` | red |
| 7 | unit | `parseBulkEmails` dedupes, rejects invalid lines with row errors | `server/organisations/members-policy.test.ts` | red |
| 8 | unit | `PermissionsErrorCode` maps to HTTP status in `members-errors.ts` | `server/organisations/members-errors.test.ts` | red |
| 9 | integration | Owner lists members sees active + pending | `server/organisations/members.int.test.ts` | red |
| 10 | integration | Area Manager (admin) GET members → 403 | `server/organisations/members-rls.int.test.ts` | red |
| 11 | integration | POST invite creates invite row + whitelist active + calls invite email (mocked) | `server/organisations/members-invite.int.test.ts` | red |
| 12 | integration | Duplicate active member invite → 409 `permissions.duplicate_member` | `server/organisations/members-invite.int.test.ts` | red |
| 13 | integration | Duplicate pending invite → 409 `permissions.duplicate_invite` | `server/organisations/members-invite.int.test.ts` | red |
| 14 | integration | Resend invite extends expires_at + re-sends email | `server/organisations/members-invite.int.test.ts` | red |
| 15 | integration | Revoke invite sets revoked_at + whitelist revoked | `server/organisations/members-invite.int.test.ts` | red |
| 16 | integration | acceptInvite creates uo + uv + People stub + marks accepted | `server/organisations/members-invite.int.test.ts` | red |
| 17 | integration | Bulk invite 5 emails → 5 invite rows | `server/organisations/members-invite.int.test.ts` | red |
| 18 | integration | PATCH role owner → admin succeeds | `server/organisations/members.int.test.ts` | red |
| 19 | integration | PATCH demote last owner → 400 `permissions.last_owner` | `server/organisations/members.int.test.ts` | red |
| 20 | integration | PATCH venues replaces user_venues set | `server/organisations/members.int.test.ts` | red |
| 21 | integration | Archive revokes whitelist + archives uo (signOut mocked) | `server/organisations/members.int.test.ts` | red |
| 22 | integration | Archive cascades People inactive | `server/organisations/members-people.int.test.ts` | red |
| 23 | integration | Reactivate restores whitelist + uo + People | `server/organisations/members.int.test.ts` | red |
| 24 | integration | Xero import without connection → 422 `permissions.xero_not_connected` | `server/organisations/members-import-xero.int.test.ts` | red |
| 25 | integration | Xero import returns employee emails (mock client) | `server/organisations/members-import-xero.int.test.ts` | red |
| 26 | integration | RLS: non-owner cannot SELECT organisation_member_invites | `server/organisations/members-rls.int.test.ts` | red |
| 27 | unit (hook) | `useMembersList` loading → data envelope | `entities/organisations/members/hooks/use-members-list.test.tsx` | red |
| 28 | unit (hook) | `useMemberMutations` maps `permissions.last_owner` to toast | `entities/organisations/members/hooks/use-member-mutations.test.tsx` | red |
| 29 | component | Members table renders active + pending badges | `entities/organisations/members/components/members-table.test.tsx` | red |
| 30 | component | Invite dialog validates email + requires ≥1 venue | `entities/organisations/members/components/invite-member-dialog.test.tsx` | red |
| 31 | component | Bulk invite shows parse errors per row | `entities/organisations/members/components/bulk-invite-dialog.test.tsx` | red |
| 32 | component | Member edit page disables email field; shows People link | `entities/organisations/members/components/member-edit-page.test.tsx` | red |
| 33 | component | Owner-only: non-owner gets Access denied card | `entities/organisations/members/components/members-list-page.test.tsx` | red |
| 34 | e2e | *(deferred)* — document manual smoke in [`flows.md`](flows.md) §5 | — | deferred |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### `members-policy.ts`

- **Subject:** email normalization, assignable roles, list merge, last-owner guard, bulk parse, invite expiry
- **Cases:**
  - Happy: merge 2 active + 1 pending → 3 rows with correct status badges
  - Boundary: empty bulk paste; 100-email bulk; unicode names in display
  - Invalid: supervisor slug rejected; archive last owner rejected
- **No mocks** for pure functions

### `members-errors.ts`

- **Subject:** stable code → HTTP status mapping
- **Cases:** every code in [`flows.md`](flows.md) §2 has a mapping test

### Hooks

- **Subject:** `useMembersList`, `useMemberDetail`, `useMemberMutations`
- **Setup:** MSW or fetch mock matching `{ data, error: { code, message, status } }` envelope
- **Assertions:** loading, empty, error code → toast copy

## 3. Integration tests (DB + RLS)

Run against local Supabase in `apps/supersolt` per [ARCHITECTURE.md §8.1](../../../../ARCHITECTURE.md).

### Setup

```ts
// apps/supersolt/test/fixtures/members.ts
// Seed: org with 2 venues, owner user, area manager (admin), venue manager, crew,
// one pending invite, auth_whitelist rows, optional Xero connection stub
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Owner lists members | owner | active + pending merged |
| Admin lists members | admin | 403 `permissions.forbidden` |
| Owner invites new email | owner | 201 invite + whitelist |
| Owner invites existing active member | owner | 409 duplicate_member |
| Owner resend expired invite | owner | new expires_at |
| Owner revoke pending | owner | whitelist revoked |
| acceptInvite (service) | service | uo + uv + People stub |
| Owner patches role | owner | role_id updated |
| Owner demotes sole owner | owner | 400 last_owner |
| Owner archives crew | owner | archived + whitelist revoked |
| Owner reactivates crew | owner | active again |
| Manager reads invites table via RLS | manager | empty / denied |

### Mocks at integration boundary

- **Supabase Admin** `inviteUserByEmail` and `signOut` — inject mock client in service tests
- **Xero payroll client** — mock employee list response

## 4. End-to-end (deferred)

**Grill-me decision:** No Playwright E2E until auth OTP + invite accept harness exists (same gap as [`supersolt-authentication`](../../supersolt-authentication/plan.md)).

Manual smoke steps live in [`flows.md`](flows.md) §5.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/test/fixtures/members.ts`
- **Reset:** truncate invite/whitelist test rows + reseed before each integration file
- **Determinism:** fixed UUIDs for org, venues, roles (platform role IDs from migration)
- **Auth:** use existing test user helpers; create owner vs admin memberships explicitly

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new `members-*` files | ≥80% | Changed paths only in CI |
| Integration cases §3 table | 100% present | Reviewed before merge |
| E2E happy path | **deferred** | Manual smoke §5 required for release |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` Table/Dialog internals
- Supabase email delivery content
- Full OTP auth flow (owned by authentication triad)
- Xero OAuth token refresh internals

## 8. Refactor checklist (after green)

- [ ] Invite + whitelist + member CRUD share one Zod schema source
- [ ] No duplicated owner check — `assertOrganisationOwner` only in service entry
- [ ] Generated DB types flow through repos
- [ ] No app-to-app imports
- [ ] List + edit components split before ~250 lines each
