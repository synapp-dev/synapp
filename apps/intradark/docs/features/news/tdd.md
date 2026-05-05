# News — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code where practical. Order matters.

| # | Layer | Behavior under test | File (proposed) | Status |
|---|-------|---------------------|-----------------|--------|
| 1 | unit | Slug from title: ASCII downcase, hyphenation, max length, collision suffix | `apps/intradark/entities/news/lib/slug.test.ts` | red |
| 2 | unit | Slug validation rejects empty, reserved segments (`admin`), invalid chars | same or `validate-slug.test.ts` | red |
| 3 | unit | `hasNewsEditorRole(userId, rolesRows)` (or DB-free helper) — true/false from fixture rows | `apps/intradark/entities/news/lib/roles.test.ts` | red |
| 4 | unit | Article payload guard: rejects oversize `body_json`, non-object JSON | `apps/intradark/entities/news/lib/article-payload.test.ts` | red |
| 5 | unit | Zod schema for create/update: required title, slug rules, status enum | `apps/intradark/entities/news/lib/schemas.test.ts` | red |
| 6 | integration | *(follow-up)* Insert draft as user with `news.editor`; RLS allows read in editor context | `apps/intradark/entities/news/news.int.test.ts` | deferred |
| 7 | integration | *(follow-up)* Anonymous select published only; draft invisible | same | deferred |
| 8 | e2e | *(follow-up)* Playwright not in app today — manual smoke in [`flows.md`](flows.md) §1 until harness exists | `apps/intradark/e2e/news.spec.ts` | deferred |

After each **unit** item turns green, refactor before moving on. Integration rows require a **test DB + RLS harness** (document setup in `apps/intradark/test/` when introduced).

## 2. Unit tests

### Pure functions / validators

- **Subject:** slug + payload helpers under `apps/intradark/entities/news/lib/`
- **Cases:**
  - Happy path: `"  Major  Win!  "` → stable slug
  - Boundary: unicode title (slug fallback), max length truncation
  - Invalid: reserved words, empty title for publish
- **Runner:** **Vitest** — add `vitest`, `vitest.config.ts` (or `vite.config` with test), `"test": "vitest run"` in `apps/intradark/package.json`
- **No mocks** for pure functions.

### Server Actions (optional mid-term)

- Prefer testing **extracted pure validators** from actions in §1 first.
- If testing actions directly: mock Drizzle client or use integration suite (**§3**).

## 3. Integration tests (DB + RLS)

**Deferred** until `apps/intradark` has a documented pattern (local Postgres URL, migrate, seed roles). When added:

### Setup

- Script or `vitest` globalSetup runs migrations against disposable DB.
- Seed: `roles` includes `news.editor`; `user_roles` assigns test UUIDs.

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Anon reads published | anon | row returned |
| Anon reads draft by slug | anon | no row (RLS) |
| Editor reads own draft | authenticated + `news.editor` | row returned per policy |
| Editor publish sets `published_at` | authenticated + `news.editor` | success |
| User without role inserts article | authenticated | denied |

## 4. End-to-end (happy path)

- **Tool:** Playwright **not** configured in `apps/intradark` today — **manual smoke** required for merge until E2E exists.
- **Manual scenario:** mirrors [`flows.md`](flows.md) §1 (public list → article; editor create draft → publish → visible on list).

## 5. Fixtures and seed data

- **Location (when integration exists):** `apps/intradark/test/fixtures/news.ts`
- **Determinism:** fixed UUIDs for `roles.id`, test users.
- **Auth:** use service-role or SQL seed consistent with intradark Supabase project — never embed secrets in fixtures committed to repo.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit tests in §1 rows 1–5 | all green before merge | MVP bar |
| Integration §3 | deferred | Enable when harness lands |
| E2E | manual per [`flows.md`](flows.md) | Until Playwright added |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- TipTap extension internals — smoke only in browser.
- `@workspace/ui` components — upstream responsibility.

## 8. Refactor checklist (after green)

- [ ] Validation in one module imported by all actions.
- [ ] No `any` on article rows — use Drizzle inferred types.
- [ ] No app-to-app imports (**§3.1**).
- [ ] No `@workspace/ui` → Supabase (**§3.2**).
- [ ] Editor/client components stay thin; actions stay server-only.
