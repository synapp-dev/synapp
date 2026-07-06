# Content Types - TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Mirrors the vitest tasks sold in the M1 quote (service tests, curriculum-filter tests, mixed-level helper tests, sheet validation tests).

## 1. Test list (red -> green -> refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | validators: level_names length must equal level_count; name required, trimmed, unique-intent | `server/content-types/content-types.validators.test.ts` | red |
| 2 | unit | service: create materialises one stage row per level, in order | `server/content-types/content-types.service.test.ts` | red |
| 3 | unit | service: Default protection (no delete, no is_default removal) | same | red |
| 4 | unit | service: delete guard when schools reference type or stages have topics -> `in_use` | same | red |
| 5 | unit | service: edit sync (rename level -> rename stage; append level; block level removal with topics) | same | red |
| 5b | unit | service: duplicate-from-template deep copy (counts match, new IDs, source untouched, transactional rollback) | same | red |
| 6 | unit | curriculum repo: stages/topics filtered by `contentTypeId`; omitted = Default (legacy back-compat) | `server/curriculum/curriculum.repo.test.ts` | red |
| 7 | unit | recommendation orchestrator feeds only the school's type's stages to the engine | `server/lessons/recommendation-orchestrator.test.ts` (extend existing) | red |
| 8 | integration | POST /api/admin/content-types: 401 anon, 403 without `/admin/content`, 201 admin | `app/api/admin/content-types/route.test.ts` | red |
| 9 | integration | DELETE in-use type returns 409 `{ code: "in_use" }` | `app/api/admin/content-types/[id]/route.test.ts` | red |
| 10 | integration | school create accepts `contentTypeId`, defaults to Default when omitted | extend school create tests | red |
| 11 | unit (helper) | mixed-level detection from class yearCodes (M1b) | `lib/lesson-wizard/mixed-level.test.ts` (or `types/lesson-wizard`) | red |
| 12 | component | add-content-type-sheet level-name validation states (count mismatch, empty name, reorder) | `add-content-type-sheet.test.tsx` | red |
| 13 | component | content-section switcher: tree re-renders for selected type; empty state "Add your first level" | `content-section.test.tsx` | red |
| 14 | manual | happy paths + UAT script (see flows §1, §6) | - | red |

Order: schema first (no tests), then #1-5, then #6-7, then routes #8-10, then UI #11-13. M1b (#11 plus panel wiring) only if commissioned.

## 2. Unit tests

### `content-types.service`

- Mock repo; assert stage materialisation calls: `create({ name: "Thursday Island", levelCount: 3, levelNames: ["Level 1","Level 2","Level 3"] })` -> 3 stage inserts with per-type codes S1..S3 and sortIndex 1..3
- Default fallback: resolve type by id `undefined` -> Default row
- Delete guard matrix: referenced by school / stage has topics / clean -> `in_use` / `in_use` / deleted
- Case-insensitive duplicate name rejected
- Duplicate-from-template: given a source with 2 stages / 3 topics / 5 slides + resource links, the copy has identical counts and content with all-new IDs; slide ordering preserved; source rows byte-identical after; a forced mid-copy failure leaves no `content_types` row (transaction)

### `curriculum.repo` filtering

- Seed two types (Default + custom); stages query with `contentTypeId` returns only that type's stages
- Legacy call without param returns Default's stages (identical to pre-migration behavior)
- Topics follow their stage's type

### Recommendation orchestrator

- School on custom type: engine receives only custom stages; class with year codes that match Default stages does NOT leak Default topics
- Custom type with no year links: engine falls back to first level (existing `final_fallback` path), not `no_match` blank

### Mixed-level helper (M1b)

- Two classes same level -> not mixed; different levels -> mixed with level codes surfaced
- Composite class (multiple yearCodes) uses lowest matching stage, consistent with `resolvePrimaryStageForClass`

## 3. Integration tests (route level)

Match house style: `vi.mock` on service (unit-heavy app, same as `recommendation-engine.test.ts` family).

| Case | Acting role | Expected |
|------|-------------|----------|
| POST no cookie | anon | 401 |
| POST teacher | authenticated | 403 |
| POST admin, valid body | admin + `/admin/content` | 201 + type with levels |
| POST with `sourceContentTypeId` | admin | 201 + cloned tree counts |
| POST with unknown `sourceContentTypeId` | admin | 404, no row created |
| POST level mismatch | admin | 400 zod detail |
| PATCH rename Default | admin | 200 (rename allowed) / is_default flip rejected 400 |
| DELETE in-use | admin | 409 `{ code: "in_use" }` |
| DELETE clean | admin | 200 |

## 4. Fixtures

- `apps/bullyproof/test/fixtures/content-types.ts`: `FIXTURE_TYPE_DEFAULT`, `FIXTURE_TYPE_CUSTOM` (3 levels, no year links), deterministic UUIDs
- Seed path exercised by `scripts/seed-content-types.ts` against local Supabase for manual verification

## 5. Coverage gates

| Gate | Threshold |
|------|-----------|
| content-types.service branches | >=80% |
| curriculum repo type filtering | both param states covered |
| Architecture lint | clean (`pnpm lint:architecture`) |

## 6. What NOT to test

- Drizzle query internals beyond the filter predicate
- `@workspace/ui` sheet/field-array internals
- Slide editing order-resolution (already covered by `lib/slide-editing/` tests); only the type-scoped ownership check is new

## 7. Refactor checklist

- [ ] All type resolution goes through `server/content-types/` (no inline `is_default` queries elsewhere)
- [ ] Single zod schema shared by create and update
- [ ] `useStages` consumers all pass `contentTypeId` (no bare `["stages"]` key left)
- [ ] Pure engine (`recommendation-engine.ts`) untouched; filtering stays in repo/orchestrator
