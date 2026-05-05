# Media storage, canonical maps, and utility admin — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## 1. Test list (red → green → refactor)

Author tests before production code where practical. Order matters.

| # | Layer | Behavior under test | File (proposed) | Status |
|---|-------|---------------------|-----------------|--------|
| 1 | unit | `buildStorageObjectPath` / prefix helpers reject invalid slugs or path traversal | `apps/intradark/lib/media/storage-paths.test.ts` | red |
| 2 | unit | Allowed MIME + max size validation matches migration `allowed_mime_types` / limit | `apps/intradark/lib/media/upload-validation.test.ts` | red |
| 3 | unit | Zod schema for map admin payload accepts known pools, rejects unknown `pool_id` / `pool` slug | `apps/intradark/entities/utility-lineups/lib/admin-map-schema.test.ts` | red |
| 4 | unit | `GET`/`POST` handler for upload-url returns **401** when no session; **403** when session lacks `developer` | `apps/intradark/app/api/media/upload-url/route.test.ts` | red |
| 5 | unit | Map update handler returns **403** for authenticated non-developer (mock `getRoleSlugsForUser`) | `apps/intradark/app/api/admin/maps/.../route.test.ts` | red |
| 6 | unit | `getPublicMediaUrl` (or equivalent) builds stable public URL for `intradark-media` + object key | `apps/intradark/lib/media/public-url.test.ts` | red |
| 7 | integration | *(optional / deferred)* RLS: anon can `SELECT` active `maps`; developer can `UPDATE` — **only if** repo adds local Supabase test harness | `*.int.test.ts` | deferred |
| 8 | e2e | Admin opens `/admin/utility`, edits map, saves — **documented manual smoke** until Playwright + auth exist | manual / future `e2e/` | deferred |

After each green item, refactor only touched code before the next.

## 2. Unit tests — pure functions / validators

- **Subject:** `lib/media/storage-paths.ts` — prefix enums, `{mapSlug}`, `{profileId}` interpolation, rejection of `..`, empty segments, wrong extension.
- **Subject:** `lib/media/upload-validation.ts` — max bytes, MIME allowlist.
- **Cases:** Happy path, boundary (max size − 1 / + 1), invalid UTF-8 in slug if applicable.

## 3. Integration tests (DB + RLS)

The app **does not** currently standardize on **`supabase start`** + CI for RLS (**same posture as** [`../utility-lineups/tdd.md`](../utility-lineups/tdd.md)).

| Case | When enabled | Expected |
|------|----------------|----------|
| Anon `SELECT` active `maps` | Local DB + seed | Rows with `is_active = true` |
| Developer `UPDATE maps` | Local DB + seed roles | Success |
| Non-developer `UPDATE` denied | Local DB | RLS blocks |

Until a harness exists: **manual verification** after **`apply_migration`** + optional **`get_advisors`**.

## 4. End-to-end

- **Tool:** **No** `playwright.config.ts` under `apps/intradark` today — **do not** block MVP on E2E.
- **Future file:** `apps/intradark/e2e/admin-utility.spec.ts` once auth fixtures exist.
- **Scenario:** mirrors [`flows.md`](flows.md) §1.

## 5. Fixtures and seed data

- **Location:** `apps/intradark/test/fixtures/media-storage-maps.ts` (optional) — fixed UUIDs for `map_pools` if tests need DB later.
- **Migrations:** Seed **`map_pools`** in SQL migration (not test-only) so prod/staging always have the three pools.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| New unit files in §1 | ≥80% branch on changed paths | Target; enforce in CI if configured |
| Integration §3 | 100% when harness lands | Until then: checklist in PR |
| E2E | **not** merge-blocking for this feature | Manual smoke in `flows.md` §1 |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- Supabase Storage implementation internals.
- Large snapshot tests of admin page layout.

## 8. Refactor checklist (after green)

- [ ] Validation in one Zod module reused by handler + any Server Action.
- [ ] No `any`; Drizzle types for `maps` / `map_pools`.
- [ ] No app↔app imports; no `@workspace/ui` → Supabase.
- [ ] `track` payloads contain **no** emails, file names with PII, or full URLs with tokens.
