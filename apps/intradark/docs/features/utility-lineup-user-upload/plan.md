# Utility lineup — user upload (video + radar positions)

> **Product:** `apps/intradark`  
> **Slug:** `utility-lineup-user-upload`  
> **Status:** Planned  
> **Owner:** intradark maintainers  
> **Created:** 2026-05-06

## Related specs

- **Multi-step wizard + background upload queue:** [`multi-step-wizard/plan.md`](multi-step-wizard/plan.md) — segmented dialog flow, **Postgres per-user upload jobs** + **RLS**, header queue chrome, **local video preview** until enqueue, stricter **upload eligibility** (verified email + **Steam** + **Discord** linked). Use this doc for UI/queue sequencing; the sections below remain the base data/storage/moderation contract unless superseded inline there.

## 1. Summary

Signed-in users with a **`user_profiles`** row can submit **new utility lineups** from **`/utility/[mapSlug]`**: a control **to the left** of the filter bar opens a **sheet** to pick **throw** and **landing** positions on the map radar, fill lineup metadata (grenade type, side, movement, technique, margin, labels, description, optional trim times), and **upload a large video (about 50–250 MB)** to **Supabase Storage** (`intradark-media`). The row is stored in **`public.utility_lineups`** with **`status = 'pending'`** until a **developer** (or future moderator role) approves it to **`published`**. **Intradark official** quality is expressed separately via **`intradark_verified`** (and existing seed/admin flows); community uploads stay **`intradark_verified = false`** unless an operator explicitly marks them official.

**Live DB (Supabase intradark MCP, 2026-05-06):** `public.utility_lineups` exists (141 rows), RLS enabled, single policy **`utility_lineups_select_public`** — `SELECT` for **`anon`/`authenticated`** where **`status = 'published'`** only. **`status`** check constraint allows **`draft` | `published`** only; **`youtube_url`** is **NOT NULL**. **`maps`**, **`utility_map_spots`** present. Remote migration history ends at **`maps_map_screenshot_url`**; repo **`drizzle/`** may include additional files not yet applied remotely — implementation must **`apply_migration`** in the **same order** as under **`apps/intradark/drizzle/`** per **ARCHITECTURE.md §8.1**, then reconcile drift before relying on local-only tables.

## 2. Scope

### In scope (MVP)

- **Entry:** Button **left** of **`UtilityMapFiltersBar`** on **`/utility/[mapSlug]`** (wired from `app/(main)/utility/[mapSlug]/page.tsx` through **`UtilityMapRadarClient`** children layout).
- **Sheet UX:** Multi-step flow — metadata fields, **radar interaction** for throw + land **normalized 0–1** coordinates (reuse patterns from `utility-map-radar-client` / admin editors where sensible), **file picker** for video, **upload progress** (non-blocking UI + toast milestones), **submit** creates **`pending`** row **after** successful Storage upload (see **`flows.md`**).
- **Storage:** Object paths under the existing **`utility/`** prefix (`lib/media/storage-paths.ts`). **Layout (confirmed):** `utility/{mapSlug}/{grenadeFolder}/{uniqueFileName}` where **`mapSlug`** matches **`public.maps.slug`**, **`grenadeFolder`** is one of **`smoke` | `flashbang` | `hegrenade` | `molotov`** (storage-only names; DB column **`grenade_type`** still uses **`he`** for HE — implement a fixed map **`he` → `hegrenade`** for the folder segment). **`uniqueFileName`** MUST include a UUID (or server-issued id) so concurrent uploads never collide. Extend **bucket MIME allowlist** and **`MAX_UPLOAD_BYTES`** / Supabase **`file_size_limit`** for **video** and **≤ 262 144 000** bytes (250 MiB).
- **API:** Next.js **server actions** in **`entities/utility-lineups/actions/`** for: reserved path + **signed upload URL** (or token) for the authenticated submitter; **finalize** lineup insert/update. **No** multi-hundred-megabyte bodies through Next server actions — client **PUT**s (or Supabase-resumable client) **directly to Storage**.
- **Data:** Extend **`utility_lineups`** — add **`pending`** (and optionally **`rejected`** later) to **`status`** check; add nullable **`video_object_path`** (or equivalent) for bucket-relative object key; make **`youtube_url`** nullable with a table **CHECK** that at least one of **`youtube_url`** / **`video_object_path`** is set for **`published`** rows (exact rule in migration).
- **Auth:** **`getSessionUserId`** + resolve **`user_profiles.id`** for **`author_profile_id`**; reject if profile missing (clear message to complete profile / sign-in).
- **Telemetry:** Milestone **`track`** events only (aligned with existing **`utility_*`** admin events).
- **Admin:** Minimal **moderation** path — list **`pending`** lineups and **publish** (set **`status`**, optionally edit fields) under existing **developer** gate (extend **`/admin/utility`** or sibling admin route); **no** env-based feature flag (product decision: always on once shipped).

### Out of scope (deferred)

- **`rejected`** status + moderator reason text (unless implemented in the same migration slice as **`pending`** — optional).
- **Explicit “upload in background”** after closing sheet (optional follow-up; default remains **abort on sheet dismiss**).
- **Resumable/TUS** upload UX beyond what **`@supabase/supabase-js`** Storage supports out of the box (document if standard PUT is insufficient on slow networks).
- **Second consumer** extraction to **`packages/*`**.

### Non-goals

- **Not** importing Supabase or DB clients into **`@workspace/ui`** (**ARCHITECTURE.md §3.2**, checklist F).
- **Not** app-to-app imports (**§3.1**).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/utility-lineups/` (components, actions, zod schemas) | §7.1 |
| Shell vs domain | Thin route in `app/(main)/utility/`; sheet + button are **domain** | §7.1 |
| Auth dependency | Server-only: `entities/admin/lib/auth-session` + `utils/supabase/server` (existing intradark pattern); align with checklist F for secrets in server actions / route handlers only | §3.2 |
| New package edges | **None** | §3.2, §10 |

### Architecture compliance gate

Source: [`.cursor/skills/build-feature/checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md).

| ID | Item | Outcome |
|----|------|---------|
| A | No app↔app imports; packages↮apps; `@workspace/ui`↮Supabase; no new cycles | **yes** |
| B | Primitives from `@workspace/ui`; domain under `entities/`; root `components/` shell-only | **yes** |
| C | No premature package extraction | **yes** |
| D | Tokens from `@workspace/ui` | **yes** |
| E | Migrations + RLS in `apps/intradark/`; app-owned DDL (**§8.1**) | **yes** |
| F | Server-only secrets; UI does not import Supabase | **yes** |
| G | No **§10** trigger | **n/a** |
| H | `pnpm lint:architecture` clean after implementation | **yes** (target) |

## 4. Data model

### Tables / columns (delta on `public.utility_lineups`)

Illustrative DDL — final names and checks live in **`server/db/schema.ts`** + new **`apps/intradark/drizzle/0012_*.sql`** (next index after **`0011_maps_map_screenshot_url`** in **`drizzle/meta/_journal.json`**).

```sql
-- Extend status lifecycle
ALTER TABLE public.utility_lineups DROP CONSTRAINT IF EXISTS utility_lineups_status_check;
ALTER TABLE public.utility_lineups ADD CONSTRAINT utility_lineups_status_check
  CHECK (status IN ('draft', 'published', 'pending'));

-- User-uploaded video (bucket intradark-media, path without leading slash)
ALTER TABLE public.utility_lineups ADD COLUMN IF NOT EXISTS video_object_path text;

-- Allow YouTube-only OR storage-only OR both for transition period
ALTER TABLE public.utility_lineups ALTER COLUMN youtube_url DROP NOT NULL;
-- Add CHECK: at least one video source non-empty for published rows (refine in implementation)

-- Optional: index for admin queue
CREATE INDEX IF NOT EXISTS utility_lineups_status_created_idx
  ON public.utility_lineups (status, created_at DESC)
  WHERE status = 'pending';
```

### Timeline markers (migration `0013_utility_lineups_multi_timestamps`)

Nullable integer columns (milliseconds). **Zod** validates editorial/event markers as multiples of **100 ms** and enforces optional ordering (`grenade_release_ms` ≤ `grenade_bloom_ms` when both set; markers ≤ `video_end_ms` when trim end is set).

| Column | Role |
|--------|------|
| `video_start_ms` / `video_end_ms` | **Playback trim** — YouTube embed `start`/`end` and storage clip window (unchanged semantics). |
| `still_stand_ms`, `still_throw_ms`, `still_land_ms` | **Editorial stills** — stand POV, throw POV, land/bloom for hover/detail. |
| `grenade_release_ms`, `grenade_bloom_ms` | **Events** — release vs bloom in the clip. |

**UX:** [`UtilityLineupVideoTimelineScrubber`](../../../entities/utility-lineups/components/utility-lineup-video-timeline-scrubber.tsx) — single slider (100 ms steps) synced to a local `<video>` preview in the **upload sheet** and in **developer → Edit timeline** on the lineup detail sheet (storage video only). Hover card: **Stand / Throw / Land** toggles which still is shown when **Shift** is held.

### RLS

Current (**`0005_utility_maps_lineups.sql`**): **`utility_lineups_select_public`** — `USING (status = 'published')`.

Planned additions (exact SQL in migration):

| Policy | Role | Rule |
|--------|------|------|
| `utility_lineups_select_own_pending` | `authenticated` | `status = 'pending'` AND author’s `user_profiles.user_id = auth.uid()` via join on `author_profile_id` |
| `utility_lineups_insert_submitter` | `authenticated` | Insert allowed only when `status = 'pending'` and author matches session (if using Supabase client); **or** rely solely on server Drizzle + privileged `DATABASE_URL` and treat policies as defense-in-depth — **document actual DB role** for `DATABASE_URL` in implementation notes |

**Developer/admin writes** today use **Drizzle** with **`DATABASE_URL`** (typically bypasses RLS). Policies still matter for **future** user-scoped clients and **Supabase Studio** parity.

### Migration ownership

- **Path:** `apps/intradark/drizzle/0012_<name>.sql` (+ matching **`supabase/migrations/`** if the app maintains parallel copies — follow existing convention in this repo).
- **Pattern:** App-owned (**ARCHITECTURE.md §8.1**).
- **Remote apply:** **`apply_migration`** on the intradark Supabase project with the **same** SQL body and ordering as committed Drizzle migrations; then **`generate_typescript_types`** if regenerating Supabase client types is part of the workflow.

### Storage / bucket policy

- **`apps/intradark/app/api/media/upload-url/route.ts`** today is **developer-only** and **image MIME**-limited (`lib/media/constants.ts`, `upload-validation.ts`). User lineup video requires either **a new route** (e.g. `POST /api/media/utility-lineup-upload-url`) or **generalized** validation branch: **authenticated** user, path **`utility/{mapSlug}/{grenadeFolder}/{uniqueFileName}`** as above (server validates **`mapSlug`** against **`maps`**, **`grenadeFolder`** against the allowlist, and that **`uniqueFileName`** is safe + unique), **video/\*** MIME allowlist, size cap aligned with bucket.
- Supabase Storage: raise **`file_size_limit`** on **`intradark-media`** (or document a dedicated bucket if product prefers isolation).

### Generated types

Update **`apps/intradark/server/db/schema.ts`** (Drizzle) in lockstep with SQL; regenerate any app-level Supabase **`Database`** types if the team does so after migrations.

## 5. API surface

| Operation | Surface | Auth | Notes |
|-----------|---------|------|-------|
| Reserve path + signed upload URL | **Route handler** or **server action** returning JSON | Signed-in | Prefer **route handler** only if action response size / middleware needs justify it; otherwise **server action** matching admin style. **Not** the existing admin-only **`/api/media/upload-url`** without changes. |
| Finalize `pending` lineup | **Server action** | Signed-in | Validates zod payload, verifies Storage object exists / path prefix, inserts row with **`author_profile_id`**, **`status = 'pending'`** |
| Approve to `published` | **Server action** | **Developer** (`requireDeveloper`) | Sets **`published`**, optional field edits; **`intradark_verified`** only when intentionally official |
| List `pending` for admin | **Server Component query** or action | Developer | Filter `status = 'pending'` |

### Validation

- **Zod:** `entities/utility-lineups/lib/user-lineup-submit-schema.ts` (name indicative).
- **Errors:** Mapped in **`flows.md`** §2.

## 6. UI composition

| Area | Location |
|------|----------|
| Map page wiring | `app/(main)/utility/[mapSlug]/page.tsx` — pass props into client wrapper if needed |
| Upload button + sheet | `entities/utility-lineups/components/utility-lineup-upload-sheet.tsx` (name indicative) |
| Radar picking | Reuse / factor shared radar hit-test from `utility-map-radar-client` or small child component to avoid duplication |

### Component map

| Piece | Source |
|-------|--------|
| Sheet, Button, Form, Progress, Toast | `@workspace/ui` |
| Lineup-specific layout | `entities/utility-lineups/components/` |

## 7. Dependencies

### Existing

- `@workspace/ui` — sheet, button, form controls, progress, toast.
- `@vercel/analytics` / `track` — server and client milestones.
- `entities/admin/lib/auth-session`, RBAC helpers for admin paths.

### New external deps

- **None** required if Supabase JS client already in app for Storage from browser; otherwise add with justification.

### New package edges

- **None** (**§10** n/a).

## 8. Implementation order (commits)

1. `feat(intradark): utility lineups pending status and video column` — Drizzle + `0012_*.sql`, RLS policy additions, Supabase bucket limit / MIME migration.
2. `feat(intradark): signed upload URL for utility lineup videos` — path validation under `utility/{mapSlug}/{grenadeFolder}/…`, auth gate, video MIME + size.
3. `feat(intradark): finalize pending lineup server action` — zod + insert + telemetry.
4. `feat(intradark): utility lineup upload sheet UI` — button left of filters, radar steps, progress + cancel behavior.
5. `feat(intradark): admin pending lineup moderation` — minimal list + publish.
6. `test(intradark): user lineup submit schemas and RLS fixtures` — per **`tdd.md`**.
7. `docs(intradark): mark utility-lineup-user-upload complete` — status flip in this file when shipped.

## 9. Telemetry

| Event | Trigger | Payload (safe) |
|-------|---------|------------------|
| `utility_lineup_submit_open` | Sheet opened | `map_slug` |
| `utility_lineup_submit_upload_done` | Bytes committed to Storage | `map_slug`, `size_bucket`, `ok` |
| `utility_lineup_submit_finalize` | DB write result | `map_slug`, `ok`, `code` |

No per-percent progress events.

## 10. Rollout

- **Feature flag:** **None** (explicit product choice — always available post-deploy).
- **Env vars:** Existing **`DATABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_URL`**, keys for Storage signing; document any new optional vars only if truly needed.
- **Migration sequencing:** Deploy **bucket limit + MIME** migration **before** exposing upload UI to production traffic; then app deploy.
- **Backout:** Disable upload UI via **code deploy**; tighten Storage policies; **`pending`** rows remain in DB (no data loss). Avoid destructive DDL rollback in production.

## 11. Open questions

- [ ] **Profile bootstrap:** If `auth.users` exists but **`user_profiles`** does not, do we auto-create a stub profile or block with a dedicated onboarding link? — owner: intradark maintainers, due: implementation kickoff.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)  
- Flows: [`flows.md`](flows.md)  
- Prior read-only utility spec: [`../utility-lineups/plan.md`](../utility-lineups/plan.md)  
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
