# Utility lineup upload — multi-step wizard + background queue

> **Product:** `apps/intradark`  
> **Slug:** `utility-lineup-user-upload/multi-step-wizard` (child of `utility-lineup-user-upload`)  
> **Status:** Planned  
> **Owner:** intradark maintainers  
> **Created:** 2026-05-07

## 1. Summary

Replace the single **`utility-lineup-upload-sheet`** experience on **`/utility/[mapSlug]`** with a **segmented multi-step dialog** (wizard) implemented under **`entities/utility-lineups/`**. Users work from **local video** (`File` / **`blob:`** preview) through **radar** steps and **metadata/timestamp** scrubbing; **Storage upload** starts only when they **enqueue** a job. Multiple jobs stack per user in **`public` Postgres** with **RLS**, driven by **server actions**; upload bytes still go **directly to Storage** via the existing signed URL route pattern (**`/api/media/utility-lineup-upload-url`**). **Shell chrome** in **`apps/intradark/components/`** shows **aggregate queue progress** without importing Supabase in the client (**ARCHITECTURE.md §3.2**).

**Upload eligibility (product rule):** utility lineup upload is allowed only for users who are **authenticated**, have a **`user_profiles`** row, have a **verified email** on the auth account (**`auth.users.email_confirmed_at`**, or equivalent exposed by the session helper), and have **both** **Steam** and **Discord** linked (**`user_profiles.steam_profile_id IS NOT NULL`** and **`user_profiles.discord_user_id`** present/non-empty). Enforce in **every** server entrypoint (job create, signed URL, finalize).

**Live DB (Supabase intradark MCP, 2026-05-07):** migrations include **`utility_lineups_user_upload`**; **`public.utility_lineups`** already carries **`video_object_path`**, nullable **`youtube_url`**, and ms marker columns (`still_*`, `grenade_*`). **Implementation** applies any **new** DDL through **`apply_migration`** on the intradark project in the **same order** as under **`apps/intradark/drizzle/`** (**ARCHITECTURE.md §8.1**); **`generate_typescript_types`** may follow when regenerating client **`Database`** types is part of the workflow.

## 2. Scope

### In scope (MVP)

- **Wizard steps (ordered):** (1) **Choose map** — default **`mapSlug`** from the current route; allow change via controlled list. (2) **Attach video** — file picker + **local preview** only until enqueue (no required Storage round-trip for scrubbing). (3) **Throw position** — radar hit-test + **throw label**. (4) **Land position** — radar + **land label**. (5) **Meta** — grenade type, side, movement, technique, margin. (6) **Timestamps** — **`UtilityLineupVideoTimelineScrubber`** for trim/editorial/event markers as today’s schema supports (`video_*`, `still_*`, `grenade_release_ms`, `grenade_bloom_ms`), plus **`lineup_image_url`** capture UX if already specified in parent feature (otherwise URL field / upload follows parent **`plan.md`**).
- **Enqueue:** Final control creates a **`utility_lineup_upload_jobs`** (name indicative) row + reserves **`video_object_path`** server-side; client starts **TUS / signed upload** in the **background** (reuse **`uploadUtilityLineupVideoTusSigned`** pattern from **`utility-lineup-upload-sheet.tsx`**).
- **Queue UX:** **Stacked** uploads per user; **header** (shell) shows active jobs + aggregate progress; user may **navigate** while uploads continue.
- **Completion path:** After Storage success, server **finalizes** into **`utility_lineups`** with **`status = 'pending'`** (same moderation story as parent feature); job row transitions **`completed`** and **does not** duplicate listing forever.
- **Failures:** **`failed`** jobs remain visible with **Retry** / **Dismiss** (**`cancelled`**); see **`flows.md`**.
- **Close guard:** Dismiss wizard with **dirty** state → **confirm** dialog; confirm → discard local wizard state (no server draft before enqueue).
- **Telemetry:** Events listed in §9 (aligned with grill-me).
- **Tests:** Unit + integration (schemas, actions, **RLS**); **no** full Playwright E2E in MVP unless a harness appears (**`apps/intradark`** has no **`playwright.config`** at authoring time).

### Out of scope (deferred)

- **Cross-product** reuse or **`packages/*`** extraction (**§5.1**).
- **Supabase RPC** for job transitions (use server actions + Drizzle unless profiling proves otherwise).
- **Optional env kill switch** — product chose **full production** readiness without a separate **`UTILITY_*_ENABLED`** flag; backout remains **deploy revert** + Storage policy tightening (same as parent **`plan.md`** §10).

### Non-goals

- Weakening **ARCHITECTURE.md** import rules or moving secrets into client bundles.
- Letting **`@workspace/ui`** depend on **`@workspace/supabase`**.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | Section |
|----------|--------|---------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `entities/utility-lineups/` — wizard steps, radar reuse, job hooks/presenters | §7.1 |
| Shell vs domain | **`apps/intradark/components/`** — header queue chrome only; wizard stays in **`entities/`** | §7.1 |
| Auth dependency | Server-only: session + profile eligibility checks; Storage signing in route handler | §3.2 |
| New package edges | **None** | §3.2, §10 |

### Architecture compliance gate

Source: [`.cursor/skills/build-feature/checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md).

| ID | Item | Outcome |
|----|------|---------|
| A | No app↔app imports; packages↮apps; `@workspace/ui`↮Supabase | **yes** |
| B | Primitives from `@workspace/ui`; domain under `entities/`; shell-only root `components/` | **yes** |
| C | No premature package extraction | **yes** |
| D | Tokens from `@workspace/ui` | **yes** |
| E | Migrations + RLS in `apps/intradark/` | **yes** |
| F | Server-only secrets; UI does not import Supabase | **yes** |
| G | No **§10** trigger | **n/a** |
| H | `pnpm lint:architecture` clean after implementation | **yes** (target) |

## 4. Data model

### New table (illustrative — final names in Drizzle + migration)

```sql
-- public.utility_lineup_upload_jobs (name indicative)
CREATE TABLE public.utility_lineup_upload_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN (
    'queued', 'uploading', 'finalizing', 'completed', 'failed', 'cancelled'
  )),
  -- Serialized finalize payload (or normalized columns); must satisfy finalize Zod at finalize time
  payload_json jsonb NOT NULL,
  video_object_path text,
  error_message text,
  lineup_id uuid REFERENCES public.utility_lineups(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX utility_lineup_upload_jobs_profile_status_idx
  ON public.utility_lineup_upload_jobs (author_profile_id, status, created_at DESC);
```

**Notes**

- **`payload_json`** holds the **wizard completion snapshot** (map id/slug, coords, labels, grenade meta, ms markers, optional **`lineup_image_url`**, etc.) validated again on **finalize**.
- **`video_object_path`** set when the server **reserves** the object key (aligned with **`buildUtilityLineupVideoObjectPath`**).
- **`lineup_id`** populated after successful **`utility_lineups`** insert.

### RLS

| Policy | Role | Rule |
|--------|------|------|
| `utility_lineup_upload_jobs_select_own` | `authenticated` | Row visible if **`author_profile_id`** belongs to **`auth.uid()`** via **`user_profiles`** |
| `utility_lineup_upload_jobs_insert_own` | `authenticated` | Insert allowed only when **`author_profile_id`** matches session owner |
| `utility_lineup_upload_jobs_update_own` | `authenticated` | Update allowed only for owner rows (**status** transitions — narrow **`WITH CHECK`** if needed) |

**Privileged writes:** Admin **`DATABASE_URL`** path bypasses RLS as today; policies remain defense-in-depth for future user-scoped clients.

### Migration ownership

- **Path:** next sequential files under **`apps/intradark/drizzle/`** and mirrored **`apps/intradark/supabase/migrations/`** per repo convention.
- **Pattern:** App-owned (**§8.1**).
- **Remote apply:** **`apply_migration`** (`name` + `query`) on intradark Supabase **in journal order**.

### Generated types

Update **`apps/intradark/server/db/schema.ts`** in lockstep; regenerate Supabase **`Database`** types if the team does so post-migration.

## 5. API surface

| Operation | Surface | Path / name | Auth / eligibility | Notes |
|-----------|---------|-------------|----------------------|-------|
| Reserve path + signed upload URL | **Route handler** | `POST /api/media/utility-lineup-upload-url` (extend or sibling) | Session + **upload eligibility** | Existing pattern; optionally accept **`job_id`** to bind reserved path |
| Create upload job | **Server action** | `entities/utility-lineups/actions/*` | Eligibility + profile id | Persists row **`queued`**, returns **`job_id`** + **`video_object_path`** |
| List my jobs | **Server action** | same | Eligibility | Header polling / RSC refresh |
| Cancel / dismiss job | **Server action** | same | Owner only | Sets **`cancelled`**, optional Storage orphan cleanup policy (document) |
| Record upload progress / transition | **Client-local** + **Server action** optional | — | — | Bytes progress local; **`uploading`**/**`finalizing`** may be set via action callbacks or finalize-only transition |
| Finalize pending lineup | **Server action** | extend **`finalizeUserUtilityLineupAction`** or job-specific finalize | Eligibility | Validates payload + verifies Storage object; inserts **`utility_lineups`** **`pending`**; marks job **`completed`** |

### Validation

- Reuse / extend **`user-lineup-submit-schema.ts`** for finalize payloads.
- Add **`jobPayloadSchema`** (or extend existing) for **`payload_json`** insertion.
- Errors map to **`flows.md`** §2.

## 6. UI composition

| Area | Location |
|------|----------|
| Entry control | **`UtilityMapRadarClient`** / map page — opens wizard dialog |
| Multi-step wizard | **`entities/utility-lineups/components/`** (e.g. `utility-lineup-upload-wizard-dialog.tsx`) |
| Radar steps | Reuse hit-test/layout from **`utility-map-radar-client`** via extracted child or shared hook (**avoid** mega-file growth — **ARCHITECTURE.md** checklist H / **`tdd.md`** refactor note) |
| Header queue | **`apps/intradark/components/`** — imports **`entities`** presenter only |

### Component map

| Piece | Source |
|-------|--------|
| Dialog, steps, buttons, progress | `@workspace/ui` |
| Wizard orchestration, radar, scrubber | `entities/utility-lineups/` |

## 7. Dependencies

### Existing

- `@workspace/ui` — dialog, button, form, progress.
- **`@vercel/analytics` `track`** — telemetry.
- **`lib/media/utility-lineup-tus-upload.ts`**, **`utility-lineup-upload-url`** route.

### New external deps

- **None** unless queue polling motivates **`@tanstack/react-query`** already in app — prefer existing patterns.

### New package edges

- **None**.

## 8. Implementation order (commits)

1. `feat(intradark): add utility_lineup_upload_jobs migration + RLS` — Drizzle schema + **`apply_migration`**.
2. `feat(intradark): upload eligibility helper + enforce on upload URL + actions` — Steam + Discord + **`email_confirmed_at`**.
3. `feat(intradark): upload job server actions` — create, list, cancel, finalize bridge.
4. `feat(intradark): multi-step upload wizard dialog` — local video preview + steps.
5. `feat(intradark): header upload queue shell` — wire presenter + polling/RSC.
6. `feat(intradark): background upload orchestration` — stack jobs, retries, error UX.
7. `test(intradark): job RLS + schemas` — per **`tdd.md`**.
8. `chore(intradark): wizard + queue telemetry` — §9 events.

## 9. Telemetry

| Event | Trigger | Payload (safe) |
|-------|---------|----------------|
| `utility_upload_wizard_opened` | Wizard opens | `map_slug` |
| `utility_upload_wizard_abandoned` | User confirms unsaved close | `step_index`, `map_slug` |
| `utility_upload_job_enqueued` | Job row created | `job_id`, `map_slug` |
| `utility_upload_job_completed` | Finalize success | `job_id`, `lineup_id` |
| `utility_upload_job_failed` | Terminal failure | `job_id`, `error_code` |
| `utility_upload_job_retry_clicked` | User retries | `job_id` |

No per-percent telemetry spam; optional coarse milestones only if needed.

## 10. Rollout

- **Feature flag:** **None** — ship to production when migrations + Storage limits + eligibility checks are live (product choice).
- **Env vars:** No new required vars beyond parent feature (**`DATABASE_URL`**, Supabase keys).
- **Migration sequencing:** **Jobs table + RLS** before enabling wizard that persists jobs; Storage limits already aligned with parent **`plan.md`**.
- **Backout:** Revert deploy; tighten Storage; **`pending`** lineups + job rows remain (non-destructive).

## 11. Open questions

- [ ] **Email “active” definition:** Confirm product uses **`auth.users.email_confirmed_at IS NOT NULL`** only, or also requires non-empty **`user_profiles.email`** — owner: intradark maintainers, due: implementation kickoff.
- [ ] **Orphan Storage objects:** Policy when user **Dismiss**es after **`video_object_path`** reserved — delete best-effort vs leave for GC — owner: intradark maintainers, due: implementation.

## 12. Cross-references

- Parent feature: [`../plan.md`](../plan.md)  
- TDD: [`tdd.md`](tdd.md)  
- Flows: [`flows.md`](flows.md)  
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
