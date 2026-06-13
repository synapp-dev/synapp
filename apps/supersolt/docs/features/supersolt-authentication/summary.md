# Authentication — Launch summary

> Passwordless, whitelist-gated access: OTP email login, 30-day trial enforcement, multi-org selector — no public sign-up. [Authentication (Notion)](https://www.notion.so/35064094bde6800280dcd3feb827b30c)

**Legend:** `[Blocker]` = launch gate · `[Post-launch]` = can follow · `(UI)` = demo/seeded OK · `(Live)` = real data required

> **Note:** Current codebase implements password sign-in/sign-up. Notion product truth is OTP + whitelist — criteria below reflect Notion targets.

## Login flow

- [ ] **[Blocker] (UI)** `/auth` screen: single email field + Send Code (no password field)
- [ ] **[Blocker] (UI)** Pre-fill email from welcome link (`/auth?email=…`)
- [ ] **[Blocker] (Live)** Whitelist check before OTP: reject non-listed emails with generic message (no code sent)
- [ ] **[Blocker] (Live)** 6-digit OTP; 10-minute expiry; new code invalidates prior
- [ ] **[Blocker] (Live)** 3 failed OTP attempts → 15-minute block
- [ ] **[Blocker] (Live)** Session created post-verification; redirect to `/setup` or `/dashboard`

## Trial enforcement

- [ ] **[Blocker] (Live)** Per-org `trial_expires_at` on whitelist row
- [ ] **[Blocker] (Live)** All orgs expired → "Your trial has ended — contact us to continue" (no code sent)
- [ ] **[Blocker] (Live)** Mixed orgs → selector shows only active (non-expired) orgs

## Multi-organisation

- [ ] **[Blocker] (UI)** Single whitelist row → direct to `/setup` or app home
- [ ] **[Blocker] (UI)** Multiple orgs → org selector with status badge (Enter / Continue setup / Trial expired)
- [ ] **[Blocker] (Live)** One whitelist row per email-per-org; separate workspaces

## Welcome email

- [ ] **[Blocker] (Live)** Personalised greeting, 30-day access line, Log In link → `/auth?email=…`
- [ ] **[Blocker] (Live)** Transactional email delivery (Resend / Postmark or similar)

## Logout & session

- [ ] **[Blocker] (UI)** Logout terminates session → `/auth`
- [ ] **[Blocker] (UI)** Authenticated user visiting `/auth` redirected away
- [ ] **[Blocker] (UI)** Safe `next` redirect: same-origin relative paths only

## Out of scope (verify absent)

- [ ] **[Blocker] (UI)** No self-serve sign-up / create account path
- [ ] **[Blocker] (UI)** No password creation or password recovery flows (remove if present)
- [ ] **[Post-launch] (Live)** Remembered device: skip OTP on known browser within 30 days

## Integrations

- [ ] **[Blocker] (Live)** Whitelist table: email, org_id, trial_expires_at, status (active/expired/revoked)
- [ ] **[Blocker] (Live)** Onboarding gate before `/setup`; Dashboard after onboarding complete
- [ ] **[Post-launch] (UI)** Minimal admin tool for whitelist management (Supabase admin OK for first 10)
