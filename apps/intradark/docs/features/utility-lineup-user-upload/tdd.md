# Utility lineup — user upload — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File (indicative) | Status |
|---|-------|---------------------|-------------------|--------|
| 1 | unit | Zod schema accepts valid normalized coords and enums | `entities/utility-lineups/lib/user-lineup-submit-schema.test.ts` | red |
| 2 | unit | Zod schema rejects out-of-range radar coords, bad MIME, oversize byte claims | same | red |
| 3 | unit | Path builder emits only `utility/{mapSlug}/{grenadeFolder}/…` with allowed folders (`smoke`, `flashbang`, `hegrenade`, `molotov`) and DB `he` → `hegrenade` | `entities/utility-lineups/lib/utility-lineup-upload-path.test.ts` | red |
| 4 | integration | `pending` row insert with `author_profile_id` set; owner can read via policy (if tested with Supabase JWT role) | `entities/utility-lineups/__tests__/utility-lineups-rls.int.test.ts` | red |
| 5 | integration | Anonymous / other user cannot `SELECT` foreign `pending` row under RLS | same | red |
| 6 | unit | Server action returns `VALIDATION` / `UNAUTHORIZED` / `FORBIDDEN` codes for mapped inputs | `entities/utility-lineups/actions/user-lineup-submit-actions.test.ts` | red |
| 7 | component | Sheet: disabled submit until required fields + both pins set; shows validation messages | `entities/utility-lineups/components/utility-lineup-upload-sheet.test.tsx` | red |
| 8 | component | Mocked upload client: progress callback updates UI; dismiss sheet aborts in-flight upload | same | red |
| 9 | e2e (optional) | Signed-in smoke: open sheet, stub upload, see success message | `apps/intradark/e2e/utility-lineup-user-upload.spec.ts` | red |

**Note:** Large real files are **manual QA** only; CI uses **mocks** for Storage and **fixtures** for DB/RLS.

## 2. Unit tests

### Validators / path helpers

- **Runner:** Vitest (app already uses Vitest for utility helpers per sibling feature docs).
- **Cases:** grenade/side/movement/technique/margin enums match **`utility_lineups_*_check`** in **`server/db/schema.ts`**; **`video_start_ms`** / **`video_end_ms`** ordering; description length bounds.

## 3. Integration tests (DB + RLS)

Run against **local Supabase** (`supabase start` from `apps/intradark` when available) or documented test project.

| Case | Acting role | Expected |
|------|-------------|----------|
| Owner reads own `pending` | `authenticated` JWT matching `author_profile_id` | row visible |
| Stranger reads `pending` | other `authenticated` | no row |
| Anon reads `pending` | `anon` | no row |
| Published row | `anon` | visible per existing policy |

> If **`DATABASE_URL`** bypasses RLS, still run these against **Supabase pooler + authenticated role** or document **RLS verification** as a **manual SQL checklist** in the PR template.

## 4. End-to-end

- **Tool:** Playwright if `playwright.config.ts` exists under `apps/intradark`; else document manual steps in **`flows.md`** §1.
- **Stub:** Intercept network to Storage or inject a test double so no real 250 MB upload runs in CI.

## 5. Fixtures and seed data

- **Location:** `apps/intradark/test/fixtures/utility-lineup-user-upload.ts` (indicative).
- **Determinism:** Fixed UUIDs for `maps.id`, `user_profiles.id`, and lineup id when asserting queries.

## 6. Coverage gates

| Gate | Target |
|------|--------|
| Unit tests for new zod + path helpers | present before merge |
| RLS cases in §3 | 100% scripted **or** explicitly waived with manual sign-off |
| `pnpm lint:architecture` | clean from monorepo root |

## 7. What NOT to test here

- `@workspace/ui` internals.
- Supabase Storage multi-part edge cases beyond one mocked success/failure.

## 8. Refactor checklist (after green)

- [ ] Single zod schema shared by finalize action and client preview validation.
- [ ] No `any` on new columns; Drizzle schema matches migration.
- [ ] Upload signing and finalize logic not duplicated between route and action.
