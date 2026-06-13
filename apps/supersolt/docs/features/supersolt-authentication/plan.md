# Supersolt authentication

> **Product:** `apps/supersolt`
> **Slug:** `supersolt-authentication`
> **Status:** Implemented (MVP)
> **Owner:** TBD
> **Created:** 2026-05-11
> **Updated:** 2026-05-22
> **Route:** `/auth`

## 1. Summary

Authentication gates access to the Supersolt platform. For manually vetted customers (first 10), authentication has a single job: ensure only emails explicitly whitelisted can log in, with no friction once they are on the list.

Three design choices shape this:

1. **Passwordless.** No customer creates or types a password. Login is via a one-time code sent to email.
2. **Whitelist-gated.** Even with the magic link, only whitelisted emails authenticate. The platform is not public.
3. **30-day trial enforced at the auth layer.** When a customer's trial expires, login is rejected with a clear "trial expired — get in touch" message.

**Personas:** The owner / ops lead receiving the welcome email — not technical; expects login to "just work."

**Notion:** [Authentication (Module Overview)](https://www.notion.so/35064094bde6800280dcd3feb827b30c)

> **Conflict (human review):** Repo §3+ below describes **password sign-in**, **forgot password**, and **sign-up** from an earlier implementation pass. Notion product truth is **passwordless OTP + whitelist**. Reconcile engineering plan with Notion before further auth work.

## 2. Scope

### In scope

- Welcome email containing the login link
- Email-entry screen at `/auth`
- One-time code generation, delivery, and verification
- Whitelist enforcement (non-list emails rejected with a clear, non-revealing message)
- Session creation post-verification
- 30-day trial expiry enforcement at the auth layer
- Re-login flow (OTP every time, or remembered device — see Open questions)
- Logout
- Multi-organisation users: org selector post-OTP when more than one accessible org

### Out of scope

- Self-serve sign-up — no "create account" path in MVP
- Password creation or password recovery
- Multi-factor authentication beyond the OTP itself
- SSO / Google / SAML — not in MVP
- Whitelist admin UI — for first 10 customers, emails added via Supabase admin (minimal admin tool TBD)

### Non-goals

- Organisation / venue creation at auth (onboarding owns `/setup`)
- Square OAuth as end-user identity (product integration only)

## Notion specification

### User flows

1. **First login from welcome email** — land on `/auth` with email pre-filled, Send Code, 6-digit OTP; single whitelist row → `/setup`; multiple rows → org selector.
2. **Email entered manually** — generic rejection if not whitelisted; multi-org → org selector after OTP.
3. **Returning user** — same OTP flow (subject to remembered-device decision).
4. **Trial expired** — reject with "Your trial has ended — contact us to continue"; no code sent.
5. **Logout** — session terminated → `/auth`.
6. **Second org whitelisted** — org selector shows active vs setup-required orgs; Org 2 → `/setup`.

### Intended functionality

- **Welcome email:** personalised greeting, 30-day access line, Log In → `/auth?email=…`, help contact.
- **`/auth` screen:** single email field + Send Code; pre-fill from link when present.
- **Whitelist check** before OTP: `email` → `org_id` → `trial_expires_at`; not found → generic error, no code sent.
- **OTP:** 6-digit, 10-minute expiry; new code invalidates prior; 3 failed attempts → 15-minute block.
- **Session:** after OTP → `/setup` if onboarding incomplete, else `/dashboard`.
- **Trial:** per-org `trial_expires_at`; all expired → block login; mixed → selector shows only active orgs.
- **Multi-org:** one whitelist row per email-per-org; fully separate workspaces.

### Data + integrations

- **Whitelist table:** `email`, `org_id`, `trial_expires_at`, `added_by`, `added_at`, `status` (active / expired / revoked)
- **Email delivery:** transactional provider (Resend, Postmark, or similar)
- **Session storage:** existing auth layer
- **No external auth providers** in MVP

### Other modules this touches

- **Onboarding** — gate before `/setup`
- **Dashboard** — post-onboarding redirect
- **Settings → Permissions/User** — invited users use same auth; whitelist updated on invite
- **Free Growth Consultation** sales process — triggers whitelist add (outside platform)

## Open questions

- **Remembered devices:** skip OTP on known browser within 30 days? Lean: yes.
- **Trial extension UI:** Supabase update vs minimal admin screen? Lean: Supabase for first 10.
- **Whitelist admin UI:** same lean as trial extension.
- **Email sender domain:** `hello@` vs `noreply@` — product call.
- **Failed-OTP lockout duration:** proposed 15 minutes after 3 failures.
- **Org selector UX:** card per org with status badge and CTA (Enter / Continue setup / Trial expired).

### Engineering

- [ ] **Recovery redirect URL** — confirm Supabase allowlist for local, preview, prod if password-recovery paths remain during transition — owner: TBD, due: TBD

## Decision log

- *29 Apr 2026* — Passwordless only; no password create/reset.
- *29 Apr 2026* — Whitelist-gated; generic message for unknown emails.
- *29 Apr 2026* — 30-day trial enforced at auth layer.
- *3 May 2026* — Multi-org supported in MVP; one row per email-per-org; per-org trial clock.
- *3 May 2026* — Org selector post-OTP for multi-org; single-org skips selector.

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

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Program context: [`../../roadmap.md`](../../roadmap.md)
- Program index: [`module-overview-program.md`](../../module-overview-program.md)

## Compliance audit (program 2026-06-01)

| Notion (passwordless OTP + whitelist) | Repo today | Status |
|---------------------------------------|------------|--------|
| Email OTP login | Password + forgot password paths in code | **Drift** — reconcile toward Notion |
| Whitelist gate | `api/auth/whitelist-check` | **Partial** |
| Trial expiry at auth | Per plan §2 | **Verify** |
| Magic link callback | `auth/callback` page route | **Shipped** |

**Updated:** 2026-06-01
