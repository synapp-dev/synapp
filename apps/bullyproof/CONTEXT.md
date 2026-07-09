# Bullyproof domain glossary

Shared vocabulary for Bullyproof modules, seams, and documentation. See also [`docs/code-reference/00-overview.md`](docs/code-reference/00-overview.md) for stack and folder layout.

## School

A **tenant** in Bullyproof — the organisation teachers and admins belong to. Owns Classes, Lessons, licences, culture ratings, and school-scoped roles.

- **Contrasts with:** Platform (global admin scope spanning all schools).
- **Owns:** Users (via school roles), Classes, Lessons, school settings, feature permissions at school scope.

## SchoolSlug

The URL-safe identifier in routes (`/schools/{school_id}/…`). The `[school_id]` route param is **always a slug**, never a UUID — despite the param name.

- **Source:** `v_schools_readable.slug`
- **Not:** The school primary key; do not pass to DB columns named `school_id` without resolving first.

## SchoolId

The school primary key (UUID). Used in database foreign keys, feature-permission checks, and most API query bodies.

- **Source:** `schools.id`
- **Not:** The value in browser URLs under `/schools/`.

## SchoolRef

A resolved pair `{ id: SchoolId, slug: SchoolSlug }`. Callers that receive ambiguous input (slug or UUID) should resolve once via `resolveSchoolRef` (server) rather than guessing.

## Client type seam

UI and `entities/` code import row shapes from `@/types/db`, not `@/server/db/schema`. Shared pure helpers (e.g. slide ordering) live under `@/lib/`.

## Class

A teaching group at a School (year level + name). Teachers assign Classes to Lessons; year codes on Classes drive curriculum stage matching and recommendations.

## Lesson

A teacher-delivered session tied to a **Topic** and one or more **Classes**. Created through the lesson wizard; progresses through lifecycle states below.

- **Owns:** Class assignments, live delivery state, feedback, completion.

## Lesson lifecycle

Persisted statuses on `lessons.status` (DB check constraint):

| Status | Meaning |
|--------|---------|
| `preparing` | Created; teacher preparing materials (default on create) |
| `ready` | Prepared and scheduled or ready to run |
| `in_progress` | Actively being delivered |
| `feedback` | Delivery complete; collecting teacher feedback |
| `completed` | Fully closed |
| `cancelled` | Abandoned |

**Display-only statuses** (derived in UI, not stored): `scheduled` and `overdue` when `ready` + `scheduledFor` is future/past (`utils/lesson-status.ts`).

**Typical flow:** `preparing` → `ready` → `in_progress` → `feedback` → `completed`

Redirect targets, query invalidation keys, live-store side effects, and the update rules (who may change status, and how event history is built) are centralized in `lib/lesson-lifecycle/`; the update service applies the pure verdicts from `update-rules.ts`. Realtime status updates flow through `hooks/use-lesson-status-realtime.ts`; the lesson layout wraps pages with `components/organisms/lesson-status-redirect.tsx`.

| Status | Default page |
|--------|----------------|
| `preparing`, `cancelled` | `/prepare` |
| `ready`, `in_progress` | `/run-lesson` |
| `feedback`, `completed` | `/feedback` |

When status becomes `feedback` or `completed` while on another lesson page, clients redirect to `/feedback` (see `resolveRealtimeStatusRedirect`).

## Topic

A unit of curriculum content within a **Stage** — slides, metadata, and ordering. Lessons reference a Topic.

- **Contrasts with:** **Course topic** (certification/AP content tree — parallel model, different tables).

## Curriculum

The main K–12 content hierarchy: **Stages** → **Topics** → **Topic slides**. Used for lesson delivery and the lesson wizard recommendation engine.

## Certification (AP)

Parallel content and progress model for accreditation courses: courses, course topics, quizzes, attempts, and per-user progress. Shares slide-editing patterns with Curriculum but separate persistence.

## Stage

A curriculum band (e.g. primary, junior secondary) containing Topics matched to school **year codes** on Classes.

## Content Type

A configurable curriculum family (module M1): a `content_types` row with a name, a level count, and ordered level names. Every **Curriculum** Stage, **Certification** course, and **School** belongs to exactly one content type. A protected **Default** type holds the original K–12 curriculum; existing data was backfilled to it so reads that omit a content type behave as before.

- **Owns:** its Stages (materialised one per level), and the Schools assigned to it.
- **Gate:** managed behind the `/admin/content-types` feature, dark-launched to `INTRADARK_DEV` only until commissioned.

## Content Type Level

One level of a Content Type, materialised as a **`curriculum_stages`** row scoped to that type (code `S1..Sn` within the type). `content_types.level_names` is authoring input only; every tree read comes from `curriculum_stages`.

- **Distinct from:** **School Level** (`school_levels`: primary/secondary) and **School Year** (`school_years`: Year 7 etc.).

## Feature permission

Fine-grained access keyed by path-like strings (e.g. `/school/lessons`, `/admin/schools`). Resolved hierarchically: User → School Role → School → Role → Global (`checkFeatureAccess`).

## Lesson access policy

Rules for who can view, manage, and create Lessons — including admin-on-behalf create and feedback-lesson conflict filtering. Server callers use `server/lessons/lesson-access-policy.ts`; client UI uses `hooks/use-lesson-access.ts` with the same pure rules in `lib/lesson-access-policy.ts`.

## Lesson creation

End-to-end flow from the lesson wizard through `POST /api/lessons`. Client navigation and proceed guards live in `entities/lessons/lesson-creation/`; server create orchestration lives in `server/lessons/create-lesson.ts`. Shared request/response types: `types/lesson-create.ts`, `types/lesson-recommendations.ts`.

## Slide editing

Bulk slide reorder during admin topic editing is shared between curriculum and certification via `lib/slide-editing/` (pure order resolution) and `server/slides/slide-editing.service.ts` (ownership validation + apply order). Both bulk-save routes delegate reorder to this module.

## School detail drawer

Admin school drawer is split under `entities/dashboard/ui/admin/sections/schools/school-detail/`. `components/school-detail-drawer.tsx` is a thin Suspense shell (~35 lines). Shared tab IDs and context: `school-detail/types.ts`, `school-detail-context.tsx`. Shell pieces: `school-detail-drawer-content.tsx`, `school-detail-tab-content.tsx`, `school-detail-mobile-header.tsx`, `school-delete-school-dialogs.tsx`. Panels: onboarding, activation, details, users, classes, activity, culture, licence, features — each owns its tab UI and URL dialog sync where applicable.

## Role

Platform or school-scoped identity (e.g. TEACHER, school admin). School roles carry a `school_id`; platform roles do not.

## Role catalog

The single module owning role-key knowledge: membership groups, the platform vs school scope split, and the one display priority order. Lives in `lib/role-keys.ts`; property tests in `lib/role-keys.test.ts` keep the groups consistent. Consumers (rbac, roles repo, role badges, admin feature pages) import groups from it and do not restate role keys. Intentional differences between groups are documented on the group itself, including the historic assignment-exclusivity trio that omits INTRADARK_DEV and PLATFORM_MODERATOR.
