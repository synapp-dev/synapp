# Leetify snapshot ratings & season history — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `parseLeetify` stores flat `recentGameRatings.leetify` fraction (0.0102), not CT+T×100 | `entities/players/lib/parse.test.ts` | red |
| 2 | unit | `parseLeetify` legacy fallback when only `recentGameRatings.leetify` present | same | red |
| 3 | unit | `parseLeetifySeasons` on trimmed fixture → Season Four: ~260 matches, 66% WR, Premier 25404–29145 | `entities/players/lib/parse-leetify-seasons.test.ts` | red |
| 4 | unit | `parseLeetifySeasons` → `currentPremier` = latest Premier game skillLevel | same | red |
| 5 | unit | Competitive min/max per season (numeric); seasons with 0 CS2 matches omitted | same | red |
| 6 | unit | Empty/malformed `games[]` → null summary, no throw | same | red |
| 7 | unit | `normalizeLeetify` exposes `premierRating`, `seasonRanks`; `rating` = fraction×100 for UI | `entities/players/lib/parse.test.ts` | red |
| 8 | unit | On-read re-derive: when DB columns null, `normalizeLeetify(raw)` still returns season data | same | red |
| 9 | integration | `archiveLeetify` insert payload includes `premier_rating`, `season_ranks` (mock admin or local Supabase) | optional `archive.int.test.ts` | red |
| 10 | component | `LeetifySeasonHistoryCard` renders Season Four when `seasonRanks` present | `entities/players/components/leetify-season-history.test.tsx` | red |
| 11 | component | `LeetifyRatingsCard` overall tab uses flat rating, not ct+t | `entities/players/components/leetify-ratings-card.test.tsx` | red |
| 12 | e2e | Manual smoke only — see [`flows.md`](flows.md) §5 | — | manual |

Update existing test at `parse.test.ts` line ~55 that **incorrectly** expects `leetify_rating: 1.42` from CT+T sum.

## 2. Unit tests

### `parseLeetify` / `normalizeLeetify`

- **Subject:** `entities/players/lib/parse-leetify.ts`
- **Cases:**
  - v3 sample with `recentGameRatings.leetify: 0.0102` → `leetify_rating: 0.0102`
  - `normalizeLeetify` → `rating: 1.02` (percentage for UI)
  - Missing `recentGameRatings` → null rating, no throw
- **Runner:** Vitest (app root)
- **No mocks** for pure functions

### `parseLeetifySeasons`

- **Subject:** `entities/players/lib/parse-leetify-seasons.ts`
- **Fixture:** `entities/players/test/fixtures/leetify-profile-seasons.json` — trimmed subset (~50 games) extracted from `docs/leetify-profile.json`, deterministic timestamps
- **Cases:**
  - Full reference steamid `76561197998479808` subset asserts Season Four premier min/max within tolerance of screenshot values
  - `currentPremier` matches most recent `rankType: 11` game by `gameFinishedAt`
  - Game with `dataSource: 'faceit'` excluded from premier/competitive aggregates (not stored as faceit season row)
  - `games: []` → `{ currentPremier: null, seasons: [] }` or null
- **No mocks**

### Hooks

- Not required for MVP — `useGetLeetifyProfile` shape change is covered by `normalizeLeetify` unit tests.

## 3. Integration tests (DB + RLS)

Optional if local Supabase harness exists for intradark.

| Case | Acting role | Expected |
|------|-------------|----------|
| Anon reads snapshots with new columns | `anon` | row returned |
| Anon inserts snapshot | `anon` | denied |
| Service role insert with new columns | `service_role` | success |

## 4. End-to-end (happy path)

**Manual smoke** (no Playwright spec required):

1. Visit `/players/76561197998479808` (or linked member profile with Leetify data).
2. Confirm Leetify ratings card overall ≠ CT+T sum; matches ~1.02% for reference profile.
3. Confirm season history grid shows Beta → Season Four with Premier badges on seasons that have Premier games.
4. `POST /api/players/{id}/refresh` → new snapshot row with non-null `premier_rating` / `season_ranks` in DB.

## 5. Fixtures and seed data

- **Location:** `entities/players/test/fixtures/leetify-profile-seasons.json`
- **Source:** extract from `apps/intradark/docs/leetify-profile.json` — include enough games per season to assert counts/min/max, not the full 211k-line file
- **Determinism:** fixed `gameFinishedAt` ISO strings

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit tests #1–8 | green before merge | Required |
| Integration #9 | optional | Run if harness exists |
| Component #10–11 | green | Lightweight render tests |
| Architecture lint | clean | `pnpm lint:architecture` |

## 7. What NOT to test here

- `@workspace/ui` Card primitives
- Leetify upstream API correctness — stub at `fetchLeetify` boundary if integration added
- FACEIT season rows — explicitly out of scope
- Full 4k+ game parse performance — smoke timing only in manual QA

## 8. Refactor checklist (after green)

- [ ] Single source for `PREMIER_SEASONS` constant
- [ ] `parseLeetify` and `parseLeetifySeasons` share game-classification helpers
- [ ] Generated DB types used in `archiveLeetify` insert
- [ ] No app-to-app imports
- [ ] No `@workspace/ui` → Supabase edge
