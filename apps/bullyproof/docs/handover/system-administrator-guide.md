# Bullyproof Platform: System Administrator Guide

> Handover documentation for Bullyproof Australia (deliverable D6). This guide covers the technical operation of the Bullyproof platform: architecture, configuration, deployment, database, storage, backups, and incident basics. The companion Administrator User Guide covers the product itself.

## 1. Introduction

This guide is written for an IT administrator or developer taking operational responsibility for the platform. It assumes general familiarity with web applications, Git, and the command line, but no prior knowledge of this codebase.

The two systems you will operate are:

- Vercel: hosts and builds the Next.js application.
- Supabase: hosts the Postgres database, authentication, and file storage.

Everything else (roles, permissions, content, reporting) is application logic inside this repository.

## 2. Architecture overview

### 2.1 Stack summary

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) with React 19, TypeScript |
| Monorepo | pnpm workspaces + Turborepo; the app lives at apps/bullyproof |
| Database | Supabase Postgres (major version 17), accessed via Drizzle ORM over a direct postgres connection |
| Auth | Supabase Auth: email one-time codes (OTP), sessions refreshed via @supabase/ssr middleware |
| Storage | Supabase Storage, single bucket named "content" |
| Client data | TanStack Query for server data, Zustand for local UI state |
| UI kit | Shared shadcn-style package @workspace/ui plus app-local components |
| Hosting | Vercel (includes @vercel/analytics and @vercel/speed-insights) |

The repository is https://github.com/synapp-dev/synapp with the default branch master. Bullyproof is one app in the monorepo; do not assume other apps or shared packages are unused by it (apps/bullyproof depends on the workspace packages @workspace/ui, @workspace/eslint-config, and @workspace/typescript-config).

### 2.2 Request flow

1. middleware.ts runs on almost every request and refreshes the Supabase session cookie (utils/supabase/middleware.ts).
2. Route groups under app/ render the product: (auth) for sign-in and logout, (main) for the authenticated app, (present) for full-screen lesson delivery.
3. Client code calls REST-style handlers under app/api/.
4. API routes delegate to server/ (services for business rules, repos for database access), which talks to Postgres through Drizzle.
5. Feature-level authorization is enforced in this server layer through checkFeatureAccess and assertFeature (see section 6).

### 2.3 Repository layout (apps/bullyproof)

| Path | Purpose |
|---|---|
| app/ | Next.js routes: pages, layouts, and app/api handlers |
| server/ | Server-only services, repositories, validation, and auth helpers |
| entities/ | Client-side feature slices: API wrappers, UI, query keys per domain |
| components/, hooks/, stores/, providers/ | Shared client code |
| lib/, utils/, types/ | Shared helpers and types (lib/feature-keys.ts, lib/role-keys.ts) |
| drizzle/ | Database schema mirror (schema.ts) and numbered SQL migrations |
| supabase/ | Supabase CLI config for local development (config.toml) |
| scripts/ | Operational and one-off scripts (seeds, migration helpers, generators) |
| docs/ | Documentation, including docs/code-reference/ (per-file catalogue) and docs/handover/ |

Two orientation documents are worth reading first: CONTEXT.md (domain glossary: School, Lesson, Topic, Stage, roles, lesson lifecycle) and docs/code-reference/00-overview.md (stack and request flow). The rest of docs/code-reference/ is a generated per-file inventory; regenerate it after large refactors with pnpm docs:code-reference:generate.

## 3. Environments and configuration

### 3.1 Environment variables

env.example at the app root documents the expected variables. Copy it to .env.local for local development; in production the same variables are set in the Vercel project settings.

| Variable | Required | Purpose |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL (https://<ref>.supabase.co, or the custom domain) |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY | Yes | Supabase publishable (anon) key used by the browser client |
| SUPABASE_ADMIN_KEY | Yes | Supabase service-role key, server side only. Never expose to the browser |
| DATABASE_URL | Yes | Postgres connection string used by Drizzle (server/db/drizzle.ts). Note: it is commented out in env.example but the server will not start without it |
| SUPABASE_PROJECT_ID | For tooling | Project ref, required by pnpm gen-types and pnpm verify:supabase-cutover |
| NEXT_PUBLIC_SUPABASE_JWKS_URL | Optional | Explicit JWKS URL; derived from the Supabase URL if omitted |
| MAINTENANCE_BYPASS_DEV_KEY | Optional | Users whose metadata devKey matches this value bypass maintenance mode |
| NODE_ENV | Yes | development or production |

Treat SUPABASE_ADMIN_KEY and DATABASE_URL as secrets equivalent to full database access. The publishable key is safe to expose (it is shipped to browsers) but should still be rotated if the service key is rotated.

Production Supabase runs behind the custom domains api.bullyproofaustralia.org.au and db.bullyproofaustralia.org.au (both are allow-listed for images in next.config.mjs alongside the supabase.co host).

### 3.2 Configuration files

- next.config.mjs: transpiles @workspace/ui and allow-lists remote image hosts.
- supabase/config.toml: local Supabase stack settings, including the auth settings mirrored to production (section 5).
- drizzle.config.ts: points Drizzle at server/db/schema.ts with output to ./drizzle, filtering the public and auth schemas.
- turbo.json (repo root): declares which environment variables participate in build caching.

## 4. Local development

### 4.1 Prerequisites

- Node.js 20 or later (engines field requires >= 20)
- pnpm 10 (the repo pins packageManager pnpm@10)
- Git

### 4.2 Install and run

From the repository root:

1. pnpm install
2. Create apps/bullyproof/.env.local from env.example and fill in the values (section 3.1). You can point at the hosted Supabase project or a local stack.
3. pnpm --filter bullyproof dev

The dev server runs Next.js with Turbopack on http://localhost:3000.

### 4.3 Quality checks

Run these from apps/bullyproof (or with --filter bullyproof from the root):

| Command | What it does |
|---|---|
| pnpm typecheck | TypeScript check with no emit |
| pnpm lint / pnpm lint:fix | ESLint |
| pnpm test / pnpm test:watch | Vitest unit tests |
| pnpm build | Production build (catches build-only errors) |

### 4.4 Optional local Supabase stack

pnpm supabase-start launches a full local Supabase using supabase/config.toml: API on port 54321, Postgres on 54322, Studio on 54323, and Inbucket on 54324. Inbucket is a local mail catcher: sign-in code emails from the local stack are viewable there instead of being sent. The local storage file size limit is 50MiB.

## 5. Authentication

### 5.1 How sign-in works

Users sign in with an email one-time code: the client calls Supabase signInWithOtp, the user receives a 6 digit code by email, and verifyOtp establishes the session. There is no self-service sign-up flow in the product; accounts are created by administrators. A password mode also exists on the sign-in form (reachable via a mode=password query parameter) for accounts with a password set, but OTP is the standard path.

### 5.2 Session expiry position

The SOW describes an "approximately 60 day" expiry for school staff. The implemented position is documented in docs/handover/auth-session-expiry.md, which is the authoritative reference. In summary, sign-in codes are deliberately short-lived and the 60 day intent is met through session persistence. Quoting that document:

> "With no timebox or inactivity timeout, a signed-in user's session persists indefinitely, comfortably exceeding 60 days, refreshed automatically in the background whenever they use the platform. Signing out, changing password, or an administrator revoking sessions ends access immediately."

The relevant settings:

| Setting | Value | Effect |
|---|---|---|
| otp_expiry | 3600 seconds (1 hour) | Sign-in codes are short-lived |
| jwt_expiry | 3600 seconds (1 hour) | Access tokens rotate hourly, transparently |
| enable_refresh_token_rotation | true | Each refresh issues a new refresh token |
| auth.sessions timebox | not set | Sessions never hard-expire |
| auth.sessions inactivity_timeout | not set | Sessions survive any idle period |

### 5.3 Where these settings live

- Local development: apps/bullyproof/supabase/config.toml, sections [auth] and [auth.sessions].
- Production: Supabase Dashboard > Authentication > Sessions. Confirm that "Time-box user sessions" and "Inactivity timeout" remain disabled and that email OTP expiry remains 3600 seconds.

If the client ever prefers a hard 60 day cap instead, set timebox = "1440h" in config.toml and mirror it in the hosted dashboard; this forces re-login every 60 days regardless of activity.

## 6. Authorization model

Authorization has two layers: coarse roles and fine-grained feature permissions. Both live in the database.

### 6.1 Roles

Roles are rows in the roles table, assigned through user_roles with a role_scope of either platform (no school) or school (carries a school_id). Key role keys:

- Platform: PLATFORM_ADMIN, PLATFORM_STAFF, PLATFORM_MODERATOR, GOVERNMENT_VIEWER, INTRADARK_DEV (developer).
- School: SCHOOL_ADMIN, TEACHER, SCHOOL_STAFF, SCHOOL_LICENCE.

server/auth/rbac.ts resolves a user's scoped roles; ALL_PLATFORM_ADMIN_KEYS lists the platform keys that grant admin panel access. The UI presents roles as "Access Levels".

### 6.2 Feature permissions

Features are rows in the features table, keyed by path-like strings defined in lib/feature-keys.ts. The delimiter encodes the type: a leading slash is a page ("/admin/schools", "/school/lessons"), a colon is an action ("admin:delete-user") or system feature ("system:maintenance"), and a dot suffix is a component.

Grants live in feature_permissions with a level enum of global, role, school, school_role, or user, plus enabled and visible booleans. Resolution is hierarchical, most specific wins, implemented in server/features/features.service.ts (checkFeatureAccess):

1. User
2. School Role
3. School
4. Role
5. Global

If no row exists at any level the feature is denied (allow-list model). One special case: "/ap-certification" falls back to "/courses" when it has no explicit rows. Server code enforces access with assertFeature; client code mirrors it with the useFeaturesAccess hooks so navigation hides what a user cannot reach. "enabled" controls function, "visible" controls whether the UI element renders (visible-but-disabled renders locked).

Permission templates (migration 0022) store reusable bundles of these grants; admins apply or revoke them per school or per platform role from /admin/features/permission-templates. scripts/seed-features.ts seeds the base features and default grants on a fresh database.

### 6.3 Maintenance mode

Enabling the system:maintenance feature globally redirects users to /maintenance. When it is switched on, the service automatically writes a disable-override for the INTRADARK_DEV role so the technical team retains access; MAINTENANCE_BYPASS_DEV_KEY offers an additional metadata-based bypass.

## 7. Database

### 7.1 Schema and ORM

The live schema is mirrored in drizzle/schema.ts (introspected from the database; server/db/schema.ts re-exports it, and application code imports row types from types/db). Drizzle ORM connects through server/db/drizzle.ts using the postgres-js driver and DATABASE_URL, with prepared statements disabled for transaction-pooling compatibility.

### 7.2 Migrations workflow

Schema changes are hand-written, numbered SQL files in drizzle/ (0000 through 0027 at handover), for example 0026_school_culture_ratings.sql. The workflow is:

1. Write the next numbered SQL file in drizzle/.
2. Apply it to the Supabase project (Supabase Dashboard SQL editor, supabase CLI, or psql against the database).
3. Refresh the schema mirror so application queries match: pnpm pull-and-fix-schema (or fix:schema) regenerates and tidies drizzle/schema.ts.
4. If Supabase-generated types are used, refresh them with pnpm gen-types (writes types/supabase.ts; requires SUPABASE_PROJECT_ID).

Apply migrations to the database before deploying code that depends on them. The admin panel also has a Migrations page (/admin/migrations) but it only hosts one-off, idempotent data backfills (currently slide position normalisation), not schema changes.

The repository root has database dump and restore scripts under scripts/supabase/ (pnpm supabase:migrate:dump, supabase:migrate:restore and related) that were used for the hosting cutover; they remain useful for taking manual full dumps.

### 7.3 Row Level Security posture

Understand this before making any security decisions:

- The application server connects with DATABASE_URL (a privileged connection) and, for storage and auth admin calls, SUPABASE_ADMIN_KEY. These bypass RLS. Authorization for application behaviour is therefore enforced in the app layer (roles + feature permissions, section 6), not by RLS.
- RLS is still enabled on tables (and newer migrations create policies, generally permissive for the authenticated role) to protect the auto-generated Supabase REST endpoint used by the browser client. Several reporting views are created with security_invoker so they respect the caller's rights.
- Practical rule: never expose a new table to the browser-side Supabase client without thinking through its RLS policy, and never treat an RLS policy as the only guard for an admin action; the server-side feature check is the primary control.

## 8. Deployment

The application is deployed on Vercel:

- The Vercel project builds from this Git repository with the project root at apps/bullyproof.
- Production deploys track the master branch; every push to another branch produces a preview deployment with its own URL. Confirm both settings in the Vercel dashboard (Project > Settings > Git), as they live in Vercel rather than in the repository.
- Environment variables (section 3.1) are managed in Vercel Project > Settings > Environment Variables. After changing one, redeploy for it to take effect.
- Build command is the standard Next.js build (pnpm build via Turborepo). turbo.json's env list controls which variables invalidate the build cache.

Deployment checklist for a release: apply any new drizzle/ SQL to Supabase first (section 7.2), merge to master, verify the Vercel production deployment, then spot-check sign-in and one admin page.

## 9. Storage

All files live in a single Supabase Storage bucket named "content", organised by folder:

| Path prefix | Contents | Access pattern |
|---|---|---|
| slides/topics/{stageId}/{topicId}/{slideId}.{ext} | Curriculum and certification slide images | Public URLs, plus signed URLs (1 week expiry) cached on slide rows and refreshed when older than 30 minutes |
| schools/{schoolId}/images/avatar.{ext} and banner.{ext} | School avatar and banner images | Signed URLs (1 hour) via GET /api/storage/signed-url, which validates the path |
| Resources library paths | Documents in the admin Resources area | Uploads via createSignedUploadUrl (signed upload URLs); downloads via 1 hour signed URLs |
| Feedback ticket screenshots | Screenshots attached to tickets | Signed URLs (1 hour to 7 days) |
| Culture rating report PDFs | Completed culture reports uploaded by admins | Signed URLs (1 hour) |

Uploads happen either directly from the browser with the user's session (slides) or through server-issued signed upload URLs (resources). If the bucket's public/private configuration is ever changed, the slide public-URL path in utils/supabase/upload.ts is the first thing that will break; verify slides render after any storage policy change.

## 10. Backups and recovery

- Supabase takes automated backups of the database on hosted projects; view and restore them from the Supabase Dashboard (Database > Backups). Backup frequency and retention depend on the subscription plan. Point-in-time recovery (PITR) is a paid Supabase add-on: confirm the current plan tier and whether PITR is enabled, and enable it if the recovery point objective requires better than daily granularity.
- Storage objects (the "content" bucket) are not covered by database backups. For a full recovery capability, periodically export the bucket (Supabase CLI or S3-compatible tooling) alongside database dumps.
- Manual dumps: the root scripts (pnpm supabase:migrate:dump) or pg_dump with DATABASE_URL produce full logical backups; store them securely since they contain personal data.
- Code requires no backup beyond Git; Vercel retains previous deployments, so rolling back the application is a one-click "Promote to production" of an earlier deployment.

## 11. Monitoring and logs

- Vercel: Project > Logs shows runtime logs for every server request and API route (console output from route handlers appears here). Build logs live on each deployment. Vercel Analytics and Speed Insights are integrated in the app for traffic and performance signals.
- Supabase: the Dashboard exposes per-service logs (Postgres, Auth, Storage, API) under Logs, and the Advisors page flags security and performance issues such as missing indexes or policy problems.
- Application errors surface in Vercel function logs; there is no third-party error tracker configured at handover.
- Local development: dev server output in the terminal, and Inbucket (section 4.4) for locally sent email.

## 12. Open source bill of materials

The open source licence register (deliverable D7) is generated from the production dependency tree:

- Output: docs/handover/bill-of-materials.md and bill-of-materials.csv (package, versions, licence, homepage).
- Regenerate from apps/bullyproof with: node scripts/generate-bill-of-materials.mjs (it runs pnpm licenses list --prod --json internally).
- Regenerate at final delivery, and after any dependency upgrade you need to report on, so the register matches the shipped lockfile.

## 13. Incident basics

### 13.1 Rotating Supabase keys

If a key may have been exposed:

1. In the Supabase Dashboard, open Project Settings > API and rotate the affected keys (publishable/anon and service role). If the database password may be exposed, reset it under Project Settings > Database, which changes DATABASE_URL.
2. Update NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, SUPABASE_ADMIN_KEY, and DATABASE_URL in Vercel environment variables (and any developer .env.local files).
3. Redeploy the application. Old keys stop working as soon as rotation completes, so schedule a brief maintenance window.

### 13.2 Revoking a user's sessions

Sessions persist indefinitely by design (section 5.2), so revocation is the lever when someone leaves or a device is lost. In the Supabase Dashboard, open Authentication > Users, select the user, and sign them out of all sessions (or delete their sessions). Because access tokens live for one hour, assume up to an hour of residual access after revocation; for immediate lock-out combine this with 13.3.

### 13.3 Disabling a user

Options, from least to most severe:

1. Remove access in the product: in Admin > Users, remove the user's school assignments or platform role. They can still sign in but reach nothing role-gated.
2. Ban the account in Supabase: Authentication > Users > select user > ban. This blocks new sign-ins and token refreshes.
3. Delete the account: available in the product behind the "admin:delete-user" feature (restricted to the developer role by default), or from the Supabase dashboard. Prefer banning over deletion to preserve history.

### 13.4 Taking the platform offline gracefully

Enable the maintenance feature (system:maintenance) globally from /admin/features. All users are redirected to the /maintenance page; the developer role bypasses it automatically (section 6.3). Disable the feature to restore access. This is application-level maintenance and does not touch the database.

## 14. Handover document set

| Document | Location | Purpose |
|---|---|---|
| Administrator User Guide | docs/handover/admin-user-guide.md | Product administration (this guide's companion) |
| System Administrator Guide | docs/handover/system-administrator-guide.md | This document |
| Auth session expiry position | docs/handover/auth-session-expiry.md | ST4S / 60 day authentication position and settings |
| Bill of materials | docs/handover/bill-of-materials.md and .csv | Open source licence register (D7) |
| Phase 1 completion evidence | docs/handover/phase1-completion-evidence.md | SOW register items with closing commits and verification |
| Domain glossary | CONTEXT.md | Shared vocabulary: schools, lessons, topics, stages, roles |
| Code reference | docs/code-reference/ | Generated per-file catalogue of routes, server layer, entities, and scripts |
