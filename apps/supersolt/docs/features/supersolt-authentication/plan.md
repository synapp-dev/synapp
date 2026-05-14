# Supersolt authentication

> **Product:** `apps/supersolt`
> **Slug:** `supersolt-authentication`
> **Status:** Implemented (MVP)
> **Owner:** TBD
> **Created:** 2026-05-11

## 1. Summary

Harden **sign-in**, **email confirmation**, and **sign-up** (Supabase identity + `user_profiles` via existing trigger) for hospitality operators, then add **forgot password / recovery** and a dedicated **set-new-password** route. **Org and venue creation** stay in **onboarding** (later triads), including **AI-guided** completion when the user has not finished setup. This work **refactors and extends** existing surfaces (`app/(auth)/`, `components/organisms/auth-form.tsx`, `app/(auth)/auth/callback/route.ts`, `utils/supabase/middleware.ts`) rather than replacing the auth stack.

## 2. Scope

### In scope (MVP)

- **Sign-in:** email + password, session refresh via middleware, safe `next` handling after `exchangeCodeForSession` on `/auth/callback`.
- **Sign-up (user-only):** existing `AuthForm` signup path; metadata for names; email confirmation UX (resend, OTP paths already in UI where present).
- **Forgot password:** client `resetPasswordForEmail` with redirect URLs pointing at existing **`/auth/callback`** (or Supabase-configured equivalent); **curated** error copy for common failures.
- **Set new password:** dedicated route (e.g. `/auth/update-password`) after recovery session is established; post-success navigation **`/setup` if `needsSetup`, else `/dashboard`** (same outcome shape as successful callback).
- **Middleware alignment:** authenticated users on new auth routes follow the same rules as `/auth` (no stranded states).
- **Operator-facing errors:** curated messages for high-traffic cases + generic fallback (no raw Supabase strings as default).

### Out of scope (deferred)

- **Organisation / venue at signup** — belongs to **`supersolt-onboarding`** and Notion onboarding steps.
- **Social / OAuth identity providers** for end-user login (unless already present); Square OAuth remains product integration, not this triad.
- **Migrating Supersolt to `@workspace/supabase`** — separate cross-app initiative; this triad keeps **`@/utils/supabase/*`** as canonical.
- **Product analytics SDK** — telemetry table documents **future** events only.
- **Playwright (or other) E2E harness** for this app — Vitest + manual smoke only.

### Non-goals

- Re-implementing Supabase Auth or replacing PKCE callback semantics.
- New shared packages without a second real consumer ([ARCHITECTURE.md §5.1](../../../../../ARCHITECTURE.md)).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | Route-colocated under `app/(auth)/` + existing `components/organisms/auth-form.tsx` (shell-level auth UI); optional thin helpers under `apps/supersolt/lib/auth/` if extraction reduces duplication | §7.1 |
| Shell vs domain | Auth chrome and cross-route forms stay in `components/organisms/`; primitives from `@workspace/ui` | §7.1 |
| Auth dependency | **`@/utils/supabase/client`**, **`@/utils/supabase/server`**, **`@/utils/supabase/middleware`** — not `@workspace/supabase` in this product today | §3.2 (no secrets in client; publishable keys only) |
| New package edges | None | §3.2, §10 |

> **Checklist note (gate F):** Monorepo checklist references `@workspace/supabase`; **Supersolt** does not import that package yet. This feature **does not** introduce `@workspace/ui` → Supabase coupling and **does not** import **service role** into client components.

## 4. Data model

### Tables / columns

No **new** tables or columns for MVP unless a security review finds a gap (grill-me: allow targeted DDL if absolutely required).

Existing persistence relevant to auth:

- **`auth.users`** — Supabase-managed.
- **`public.user_profiles`** — `id` aligns with `auth.users.id`; created by trigger **`on_auth_user_created_user_profiles`** (see `apps/supersolt/supabase/migrations/20260207120000_auth_user_profiles_trigger.sql`).

```sql
-- No new DDL in the default MVP path; reference only:
-- public.user_profiles + RLS policies from prior migrations
-- auth trigger on_auth_user_created_user_profiles
```

### RLS

Reuse existing **`user_profiles`** policies from app migrations (e.g. `user_profiles_select_own`, `user_profiles_update_own`, org-peer select if applicable). **Only** add or change policies if recovery / email-confirm flows expose a concrete hole.

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/` (new file **only** if DDL/RLS change is required).
- **Pattern:** App-owned migrations ([ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)); not a packaged module template ([§8.2](../../../../../ARCHITECTURE.md)).
- **Backfill:** None for default path.

### Generated types

Regenerate or update `apps/supersolt/utils/supabase/types.ts` **if** schema changes; otherwise unchanged.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Email link / PKCE exchange | Route Handler | `GET app/(auth)/auth/callback/route.ts` | Public; `code` exchanged for session | Already exists; extend only if recovery redirect needs different `next` defaults |
| Sign-in / sign-up / OTP / resend | Client | `AuthForm` + `createBrowserClient()` | Public | Uses `@supabase/ssr` browser client via `@/utils/supabase/client` |
| Forgot password email | Client | `supabase.auth.resetPasswordForEmail` | Public | No dedicated `POST` route in MVP (grill-me: client-only) |
| Update password | Client | `supabase.auth.updateUser({ password })` on dedicated page | Session from recovery link | After success, navigate per §2 |

### Validation

- **Input:** trim/lowercase email where applicable; password length rules aligned with Supabase project settings (document minimum).
- **Open redirect:** `next` query only through **`safeRelativeNextPath`** ([`server/square/safe-next-path.ts`](../../../server/square/safe-next-path.ts)) on callback (already imported).
- **Error mapping:** every user-visible error maps to a row in [`flows.md`](flows.md) §2.

## 6. UI composition

```
apps/supersolt/
├── app/(auth)/
│   ├── auth/page.tsx              # existing — hosts AuthForm
│   ├── auth/callback/route.ts     # existing — PKCE exchange
│   └── auth/update-password/      # new — set password after recovery
│       └── page.tsx               # client or minimal server + client island
├── components/organisms/
│   └── auth-form.tsx              # extend: forgot password entry; link to update-password help text
└── utils/supabase/
    ├── client.ts
    ├── server.ts
    └── middleware.ts              # extend matcher / auth-route rules for new path
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Button, Input, Card, Label, OTP | `@workspace/ui` | Reuse; do not duplicate primitives ([§5.2, §7.1](../../../../../ARCHITECTURE.md)) |
| Auth layout chrome | `app/(auth)/layout.tsx` | Existing |

### Theming

- Tokens from `@workspace/ui` ([ARCHITECTURE.md §6](../../../../../ARCHITECTURE.md)).
- Product overrides only via existing `apps/supersolt/app/globals.css` pattern if needed.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — form primitives, feedback UI.
- `@supabase/ssr`, `@supabase/supabase-js` — via **`@/utils/supabase/*`** wrappers.
- **`@workspace/supabase`** — **not used** in Supersolt for this feature (see §3).

### New external deps

- None expected.

### New package edges

- None.

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../.cursor/skills/commit-organizer/SKILL.md). Each commit should leave the tree green.

1. `test(supersolt): cover safeRelativeNextPath for auth callback` — Vitest beside or colocated with `safe-next-path` (or new `lib/auth/` extraction if moved).
2. `feat(supersolt): add forgot-password flow to AuthForm` — client `resetPasswordForEmail`, curated errors, link to recovery email guidance.
3. `feat(supersolt): add /auth/update-password page` — set new password + redirect to `/setup` or `/dashboard` per `needsSetup`.
4. `feat(supersolt): extend middleware for /auth/update-password` — matcher + same redirect rules as `/auth` for authenticated users where applicable.
5. `fix(supersolt): align auth error copy and callback edge cases` — maps to [`flows.md`](flows.md).
6. `docs(supersolt): mark supersolt-authentication plan status` — flip **Status** to Complete when shipped.

Adjust ordering if tests prefer extraction of redirect helpers first.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| _(future)_ `auth.sign_in_success` | Successful password sign-in | `{ method: 'password' }` — **no email in third-party tools without policy review** | TBD provider |
| _(future)_ `auth.password_reset_requested` | Forgot password submitted | `{}` or aggregate count only | TBD provider |
| _(future)_ `auth.password_reset_completed` | Successful `updateUser` password | `{}` | TBD provider |

**MVP:** No implementation of the above rows — document names and **PII minimisation** only (grill-me: **n/a** product analytics).

## 10. Rollout

- **Feature flag:** None — recovery is **on** per environment once Supabase templates and URLs are correct (grill-me).
- **Env vars:** Document in `apps/supersolt/env.example` if any new public vars are introduced (default: reuse existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`).
- **Supabase Dashboard:** Site URL, Redirect URLs (e.g. `http://localhost:3005/auth/callback`, production host), **Confirm email**, **Magic link** / OTP templates per comments in `auth/callback/route.ts`.
- **Migration sequencing:** No migration in default path; if a security migration is added, apply **`apps/supersolt/supabase/migrations/`** in timestamp order before or with deploy ([ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)).
- **Backout:** Revert application commit; rollback Supabase email template edits if copy was wrong; no forward-only data migration in default path.

## 11. Open questions

Only items grill-me could not resolve. Each must have an owner and due date.

- [ ] **Recovery redirect URL** — confirm exact Supabase “Redirect to” URL list for **local**, **preview**, and **prod** match the new update-password route if Supabase requires a separate allowlist entry — owner: TBD, due: TBD.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Program context: [`../../roadmap.md`](../../roadmap.md)
