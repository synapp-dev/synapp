# Content Types (Multi-Curriculum)

> **Product:** `apps/bullyproof`
> **Slug:** `content-types`
> **Status:** Planned (scaffold)
> **Owner:** Engineering (Module M1 of the change-request program)
> **Created:** 2026-07-06
> **Branch:** `module/m1-content-type` (merge to master = production deploy, on payment)
> **Quote:** [`M1-Content-Type.docx`](../../change-request/quote-2026-06-29/reply-2026-07-05/M1-Content-Type.docx) ($19,112.50 core + $1,900 companion, ex-GST; reconciled 5 Jul 2026)

## 1. Summary

Today Bullyproof has exactly two hardcoded content trees: the K-12 **Curriculum** (`curriculum_stages` -> `topics` -> `topic_slides`) and the AP **Certification** (`certification_courses` -> `course_topics`). M1 introduces a configurable **Content Type** entity so platform admins can define new curricula (name, how many levels, level names), author and upload lessons per type, assign a type to each school at creation, and scope resources per type. In Glenn's words (22 Jun 2026):

> "This facility will allow us to select other Content Types (Lessons) other than the current default lessons. These Content Types will need to firstly be added (name of Content Type, how many levels and names of levels) and once added, we would then need to create and upload the lessons."

Immediate driver: the **Thursday Island** rollout cannot start until this is operational (client advice, 22 Jun).

Two commissioning slices plus free work, priced independently:

| Slice | What | Billing |
|-------|------|---------|
| **M1 core** | Content Type entity, per-type authoring, Add-School dropdown, per-type resources | $19,112.50 (178 h) |
| **M1b companion** | Mixed-level class-selection guidance panel ("never a blank screen") | $1,900.00 (18 h), optional |
| **Warranty** | Teach Lessons blank-state + back-to-lesson loop; mixed-level resolution + list cap | Free, ships regardless of payment |

## 2. Traceability

| Source item | Where it lands here |
|-------------|---------------------|
| Tracker item 18 (add content types: name, level count, level names) | §4 data model, §5 API, §6 admin sheets |
| Tracker item 19 (per-content-type lesson creation / upload) | §6 tree switcher + authoring rewire |
| Tracker item 20 (Content Type dropdown on Add New School) | §5 school create, §6 school wizard |
| Tracker item 21 (per-content-type resources) | §5 resources scoping |
| Glenn: "We should NEVER get a blank screen..." | M1b guidance panel (§6.1) |
| Tracker items 51 / 53 defect parts | Warranty fixes (§8 step 0) |
| Duplicate-from-template (Aaron, 6 Jul 2026; not in Glenn's doc or the quote) | §5 copy API, §6 start-from selector, §11 billing |

## 3. Scope

### In scope (M1 core)

- `content_types` table + Drizzle schema, RLS, backfill migration seeding the two existing trees under a protected **Default** type
- `content_type_id` on `curriculum_stages`, `certification_courses`, `schools` (backfilled, uniqueness re-scoped per type)
- Admin CRUD: repo / service / validators / route handlers with in-use delete guard (409) and Default protection
- **Duplicate-from-template** (addition, 6 Jul, not in the quoted task list - see §11 billing note): Add Content Type can start from a copy of an existing type; deep-copies levels, topics, slides and resource links so a new curriculum starts as a full clone and gets selectively replaced
- Admin UI: Add / Edit Content Type sheets with dynamic level-name rows; type switcher on the content section; stage/topic detail generalised off the hardcoded tree
- Per-type lesson authoring: add-stage / add-topic / topic-slides-drawer accept a `contentTypeId`; bulk-save resolves topics within the active type
- Add-School wizard dropdown (defaults to Default) + schools table column and filter
- Resources scoped to the school's content type via the tree endpoint
- Lesson recommendation stage-loading filtered to the school's content type (pure engine unchanged; the repo/orchestrator filters what it feeds in)
- `useStages` cache keyed by `contentTypeId`; skeletons, empty and error states; vitest coverage; seed script

### In scope (M1b companion, separately commissionable)

- Mixed-level detection from class `yearCodes` in the lesson wizard selection state
- Never-blank guidance panel: message + three actions (Back / pick one class / compromise lesson)
- Compromise-lesson query on `app/api/lessons/recommendations` and prefill wire-through

### Out of scope (deferred)

- MFA on content edits, sole-editor lock, audit log, versioning (module M5)
- Per-type AP certification trees: certification stays attached to Default in v1 (open question §11)
- Per-level year-code mapping UI for custom types (v1 rule in §4; revisit with Glenn)
- Renames of school-portal pages, reports, dashboards (modules M3, M4, M7)

### Non-goals

- No second authoring pipeline: custom types reuse the existing stages/topics/slides machinery
- No changes to lesson lifecycle, feedback, or delivery surfaces
- No data migration of existing lessons: `lessons.topic_id` keeps pointing at the same topics

## 4. Data model

### New table

```sql
-- apps/bullyproof/drizzle/NNNN_content_types.sql  (generate number at merge time; head was 0027 on 2026-07-06)
CREATE TABLE content_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  level_count smallint NOT NULL CHECK (level_count >= 1),
  level_names jsonb NOT NULL,          -- ordered array; length must equal level_count (zod + service)
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_content_types_single_default ON content_types (is_default) WHERE is_default;
```

### Altered tables (same migration, additive + backfill)

| Table | Change | Backfill |
|-------|--------|----------|
| `curriculum_stages` | add `content_type_id uuid NOT NULL REFERENCES content_types` (nullable during backfill, then set) | all existing rows -> Default |
| `curriculum_stages` | uniques `name` / `sort_index` / `slug` / `code` become composite with `content_type_id`; keep `code ~ '^S[0-9]+$'` check (codes are S1..Sn *within* a type) | n/a |
| `certification_courses` | add `content_type_id uuid REFERENCES content_types` (nullable) | existing rows -> Default |
| `schools` | add `content_type_id uuid NOT NULL REFERENCES content_types` | all existing rows -> Default |

### Canonical-tree rule (avoids a dual source of truth)

`content_types.level_names` is the **authoring input** captured by the sheet. The service **materialises one `curriculum_stages` row per level** on create, and syncs on edit (rename level -> rename stage; add level -> append stage; removing a level with topics is blocked). Every tree read (admin tree, wizard, recommendations, resources) comes from `curriculum_stages` only. A content type's "Level" IS a stage row scoped to that type.

> Vocabulary collision, add to CONTEXT.md: **Content Type Level** (a `curriculum_stages` row under a type) is distinct from **School Level** (`school_levels`: primary/secondary) and **School Year** (`school_years`: Year 7 etc.).

### Copy semantics (duplicate-from-template)

Copy is exact, then edit: the sheet locks the level rows when a source is selected (structure prefills from the source), the service clones the whole tree with new IDs, and all reshaping happens afterwards with the normal editing tools. No pre-copy remapping UI (removing a level *before* copy would need a "where do its topics go" answer; after copy the existing guards handle it). Topic statuses copy as-is: a clone is invisible until a school is assigned to the type, and a mostly-identical curriculum going live is precisely the intended workflow. Certification trees do not copy (they stay on Default in v1). Copies get no `stage_year_links` (custom-type rule below applies).

### Class matching rule for custom types (v1)

The Default type's stages keep their `stage_year_links` year-code mapping; the recommendation engine behaves exactly as today. Custom types start with **no year links**: every class at such a school resolves via the engine's existing fallback (start at the type's first level, advance by completion). Optional per-level year mapping is deferred (§11).

### Invariants (service-enforced)

- Exactly one `is_default` row; Default cannot be deleted or have `is_default` removed
- Delete blocked (409) when any school references the type or any of its stages has topics
- `level_names.length === level_count` on every write
- Unique name, case-insensitive

### RLS

| Policy | Role | Rule |
|--------|------|------|
| `content_types_select` | `authenticated` | `true` (reference data) |
| writes | admin-gated route handlers only | mutation routes check `checkFeatureAccess` (§5); no direct client writes |

### Migration ownership

- **Path:** `apps/bullyproof/drizzle/` (app-owned, ARCHITECTURE.md §8.1) + `schema.ts` / `types/db` sync
- **Numbering:** do NOT `drizzle-kit generate` until the branch is rebased on latest master right before merge (shared migration log across module branches)
- **Seed:** `scripts/seed-content-types.ts` registers Default and the client's types (Thursday Island) with level names from Glenn

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| List / create types | GET / POST | `app/api/admin/content-types/route.ts` | `/admin/content` feature | create returns materialised levels; optional `sourceContentTypeId` triggers the deep copy (single transaction: stages -> topics -> topic_slides -> resource_file_topics links; source untouched; rollback on any failure, no partial type) |
| Update / delete type | PATCH / DELETE | `app/api/admin/content-types/[id]/route.ts` | `/admin/content` feature | 409 `{ code: "in_use" }` when guarded |
| Stages by type | GET (extend) | `app/api/curriculum/stages` | existing | new `contentTypeId` query param; omitted = Default (back-compat) |
| Topics by type | GET (extend) | `app/api/curriculum/topics` | existing | same param pass-through |
| School create | POST (extend) | `app/api/schools` | existing | optional `contentTypeId` in `school.validators.ts`; default = Default |
| Resources tree | GET (extend) | resources tree endpoint | existing | `contentTypeId` param; school pages pass their school's type |
| Slide bulk-save | POST (extend) | `app/api/topic-slides/bulk-save` | existing | ownership check resolves topics within the active type (via `server/slides/slide-editing.service.ts`) |
| Recommendations | GET (extend, M1b) | `app/api/lessons/recommendations` | existing | compromise-lesson query for mixed-level class sets |

New server domain: `server/content-types/` with `content-types.repo.ts`, `content-types.service.ts`, `content-types.validators.ts` (zod: level count must match level names).

## 6. UI composition

```
apps/bullyproof/
├── app/api/admin/content-types/{route.ts,[id]/route.ts}
├── server/content-types/{repo,service,validators}.ts
├── entities/content-types/
│   ├── api/endpoints.ts                 # TanStack Query hooks (list/create/update/delete)
│   └── model/keys.ts                    # query keys + invalidation on mutations
├── entities/dashboard/ui/admin/sections/content/
│   ├── content-section.tsx              # + Content Type switcher; tree renders per selected type
│   ├── add-content-type-sheet.tsx       # NEW: "Start from" selector (Blank / copy of {type}) + dynamic level-name rows (add/remove/reorder, count-match)
│   ├── edit-content-type-sheet.tsx      # NEW: rename flow + in-use warning states
│   ├── stage-detail-section.tsx         # refactor off hardcoded stage tree -> type levels
│   ├── topic-detail-section.tsx         # same
│   ├── add-stage-sheet.tsx              # accepts contentTypeId
│   ├── add-topic-drawer.tsx             # accepts contentTypeId
│   └── topic-slides-drawer.tsx          # authoring/upload rewired to per-type topics
├── entities/dashboard/ui/admin/sections/schools/
│   ├── components/add-school-wizard.tsx # Content Type dropdown (defaults 'Default') beside state/sector
│   └── schools-section.tsx              # content type column + filter
└── entities/stages/model/store.ts       # useStages keyed ["stages", contentTypeId]
```

Empty state for a type with no levels/topics yet ("Add your first level"), loading skeletons and error states across all new screens, dark-mode + responsive pass. Content Types management lives inside `/admin/content` behind the existing `PAGE_FEATURES.ADMIN_CONTENT` gate; no new sidebar entry.

### 6.1 M1b: class-selection guidance (companion)

- Mixed-level detection from selected classes' `yearCodes` in `lesson-wizard-classes.tsx` selection state
- Guidance panel (never blank): explains why the selection cannot be one combined lesson + actions **Back** / **pick one class** / **compromise lesson**
- Compromise action prefills wizard state through `lesson-wizard-recommendation.tsx`

Baseline note: the engine already returns `kind: "incompatible"` with a per-class payload and `stage_complete` (see `server/lessons/recommendation-engine.ts`); M1b is mostly the panel UI plus the compromise-lesson query.

## 7. Dependencies

- `@workspace/ui` sheets, field arrays, table, skeletons; no new external deps; no new package edges
- Existing `checkFeatureAccess`, `server/slides/slide-editing.service.ts`, recommendation orchestrator seam
- **Build dependency:** none on other modules; fully standalone (M2 -> M3 is the only cross-module edge in the program)
- **Client dependency:** Thursday Island lesson content from Glenn, loaded once operational; content-type rules confirmation (§11)

## 8. Implementation order (commits)

0. `fix(lessons): ...` warranty fixes (blank-state, back-to-lesson loop, mixed-level resolution, list cap) - commit and ship from master **before** branching; parts already exist uncommitted in the working tree
1. `docs(bullyproof): plan content-types feature` - this triad (**this change**)
2. `feat(bullyproof): content_types schema, backfill and seed` - table + columns + Default seed + re-scoped uniques
3. `test(bullyproof): red tests for content-types service` - per [`tdd.md`](tdd.md)
4. `feat(bullyproof): content-types repo, service, validators, routes` - green
5. `feat(bullyproof): curriculum repo/service filter by contentTypeId` - stages/topics routes take the param
6. `feat(bullyproof): admin content-type sheets and tree switcher`
7. `feat(bullyproof): duplicate content type from template` - deep-copy service + start-from selector (addition, §11 billing)
8. `feat(bullyproof): per-type authoring rewire` - add-stage/add-topic/slides-drawer/bulk-save
9. `feat(bullyproof): school create content type + table column/filter`
10. `feat(bullyproof): scope resources and recommendations to school content type`
11. `feat(bullyproof): content-types empty/loading/error states + dark-mode pass`
12. `chore(bullyproof): seed-content-types script + CONTEXT.md glossary`
13. M1b (only if commissioned, own commit range): `feat(lessons): mixed-level guidance panel + compromise recommendation`

## 9. Telemetry

| Event | Trigger | Payload |
|-------|---------|---------|
| `content_types.created` / `updated` / `delete_blocked` | service | `{ content_type_id, level_count }` / `{ reason }` |
| `lesson_wizard.mixed_level_guidance_shown` | M1b panel mount | `{ class_count, level_codes }` |
| `lesson_wizard.compromise_selected` | M1b action | `{ topic_id }` |

Server log only, matching existing pattern (no analytics SDK).

## 10. Rollout

- **Branch/deploy:** build on `module/m1-content-type`; Vercel preview URL is Glenn's UAT surface; merge to master (= production) on payment
- **Migration sequencing:** apply migration + backfill to staging first, verify row counts, then production before the deploy that reads the new columns (DevOps tasks in the quote)
- **Back-compat:** every extended endpoint defaults to the Default type when `contentTypeId` is omitted, so existing clients are unaffected mid-rollout
- **Backout:** UI switcher hidden for a single-type system is near-invisible; columns are additive and harmless if unused; revert = point reads back at unfiltered queries
- **Post-deploy:** smoke-check `content_types` RLS, watch new API routes for error spikes
- **UAT script (PM tasks):** add a school with a type, author per-type lessons, trigger mixed-class guidance; acceptance sign-off + release notes

## 11. Open questions

- [ ] **Seed data** - owner: Glenn. Thursday Island's content type: name, level count, level names, lesson list. Blocks final seeding, not the build.
- [ ] **Class matching for custom types** - owner: Glenn, recommended default in §4 (ordered progression from level 1, no year mapping in v1). Confirm this suits Thursday Island's class structure.
- [ ] **Certification per type** - v1 keeps AP certification on Default only. Confirm no custom type needs its own cert tree yet.
- [ ] **Changing a school's type after creation** - recommended: allowed via admin school drawer with a warning when lessons exist (history retained; recommendations switch trees). Confirm.
- [ ] **Billing the duplicate-from-template** - owner: Aaron. Not in Glenn's doc or the sold task list (~1 day of work). Options: absorb quietly (it also halves the effort of loading Thursday Island content, which benefits delivery), or quote it as a small addition. Decide before invoicing M1; do not silently expand the fixed-price scope without recording the choice.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows: [`flows.md`](flows.md)
- Quote (task-level breakdown this plan mirrors): [`reply-2026-07-05/M1-Content-Type.docx`](../../change-request/quote-2026-06-29/reply-2026-07-05/M1-Content-Type.docx)
- Gap analysis items 18-21: [`_Bullyproof-Change-Request-Gap-Analysis.txt`](../../change-request/_Bullyproof-Change-Request-Gap-Analysis.txt)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Domain glossary: [CONTEXT.md](../../../CONTEXT.md)
