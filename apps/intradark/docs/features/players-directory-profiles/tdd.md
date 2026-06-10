# Players directory & profiles — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code. Each item is a single behavior. Order matters.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `classifyIdentifier` tags `@niko`→username, 17-digit→steamid64, `https://steamcommunity.com/id/<x>`→vanity, bare word→ambiguous(vanity\|faceit) | `entities/players/lib/resolve.test.ts` | red |
| 2 | unit | `resolveToSteamId64` order: username (user_profiles) → steamid64 → steam vanity → faceit nickname; first hit wins; miss → `null` | `entities/players/lib/resolve.test.ts` | red |
| 3 | unit | `canonicalPath(steamid64, linkedUsername?)` → `/players/@username` when linked else `/players/<steamid64>` | `entities/players/lib/resolve.test.ts` | red |
| 4 | unit | `isStale(fetchedAt, ttlMs, now)` true past TTL, false within; per-source TTL constants (Steam 24h, Faceit/Leetify 6h, GC 24h) | `entities/players/lib/staleness.test.ts` | red |
| 5 | unit | `parseFaceit` / `parseLeetify` / `parseGcProfile` map raw → parsed columns and tolerate missing/extra fields (no throw) | `entities/players/lib/parse-*.test.ts` | red |
| 6 | integration | Steam route DB-first: fresh `steam_profiles` row within TTL → no upstream fetch; stale/missing → fetch + upsert | `app/api/steam/profile/[id]/route.int.test.ts` | red |
| 7 | integration | Faceit/Leetify routes append a new snapshot row (history grows, latest = newest `fetched_at`) | `app/api/(faceit\|leetify)/profile/[id]/route.int.test.ts` | red |
| 8 | integration | RLS: `anon` can SELECT players + all snapshots; `anon` INSERT denied; `service_role` write succeeds | `test/players-rls.int.test.ts` | red |
| 9 | integration | GC enqueue: stale/missing GC snapshot inserts a `player_cs2_gc_jobs` row (status `queued`) and POSTs bot control; fresh → returns cached, no job | `app/api/cs2/profile/[id]/route.int.test.ts` | red |
| 10 | unit (hook) | `use-gc-badges` enqueues on mount when stale, subscribes to Realtime, transitions pending → data on new snapshot | `entities/players/hooks/use-gc-badges.test.tsx` | red |
| 11 | component | `PlayerProfile` renders each panel's loading → data; one source failing shows a degraded panel without breaking others | `entities/players/components/player-profile.test.tsx` | red |
| 12 | component | `PlayerSearch` resolves input and routes to canonical path; invalid input shows inline "not found" | `entities/players/components/player-search.test.tsx` | red |
| 13 | unit | auto-map: observing a steamid64 matching `user_profiles.steam_profile_id` sets `players.user_profile_id` | `entities/players/lib/map-account.test.ts` | red |
| 14 | e2e | Visit `/players/<steamid64>` → cached render → panels fill → redirect to `@username` when linked | `e2e/players-directory-profiles.spec.ts` | red |

After each item turns green, refactor only the code touched by that item.

## 2. Unit tests

### Pure functions / validators

- **Subjects:** `classifyIdentifier`, `resolveToSteamId64` (DB lookups injected), `canonicalPath`, `isStale`, per-source `parse*`, `mapAccountBySteamId`.
- **Cases:**
  - Happy: each identifier type resolves; parsers map representative real payloads (fixtures).
  - Boundary: 16/18-digit numbers (not steamid64), `@` with empty name, unicode nicknames, missing optional fields, TTL exactly at boundary.
  - Invalid: unresolvable input → `null`/typed error; parser given `{}`/`null` → safe partial, never throws.
- **Runner:** vitest (app root config).
- **No mocks** for pure functions; for `resolveToSteamId64`, inject fake lookup fns rather than mocking the Supabase client.

### Hooks

- **Subject:** `use-gc-badges` (and the existing per-source RQ hooks pointed at the new routes).
- **Setup:** wrap with the app's React Query provider; mock `fetch` and the Supabase Realtime channel at the module boundary.
- **Assertions:** initial cache state, enqueue-once on stale, Realtime message advances state, unsubscribe on unmount, poll fallback when Realtime errors.

## 3. Integration tests (DB + RLS)

Run against the app's local Supabase (`supabase start` in `apps/intradark`) with the new migration applied.

### Setup

```ts
// apps/intradark/test/setup-integration.ts
// seed: one linked player (steamid64 + matching user_profiles.steam_profile_id + username)
// and one external-only player (steamid64, user_profile_id NULL); deterministic fixtures.
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Anon reads players + snapshots | `anon` | rows returned (public read) |
| Anon inserts snapshot | `anon` | denied (RLS) |
| Service role writes snapshot/job | `service_role` | success |
| GC jobs not publicly selectable | `anon` | empty/denied |
| Steam route within TTL | n/a | no upstream call (spy), returns cached |
| Faceit/Leetify route | `service_role` write path | new snapshot appended; previous retained |
| Auto-map on observe | `service_role` | `players.user_profile_id` set when steamid64 matches a `user_profiles.steam_profile_id` |

> Per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md), migrations and RLS live with the owning app; tests run against intradark's local DB.

## 4. End-to-end (happy path)

- **Tool:** Playwright if `apps/intradark/playwright.config.ts` exists; else document the manual smoke script in [`flows.md`](flows.md) §1.
- **File:** `apps/intradark/e2e/players-directory-profiles.spec.ts`
- **Scenario:** mirrors the happy path — external upstreams and the GC bot HTTP control are stubbed (MSW / mock server) so the test is deterministic.

```ts
test('players-directory-profiles happy path', async ({ page }) => {
  await page.goto('/players/76561198000000000'); // seeded external player
  // 1. Arrange: seeded archive rows + stubbed upstreams + stubbed GC bot.
  // 2. Act: page renders cached panels; RQ refetches; GC job → mock snapshot via Realtime.
  // 3. Assert: each panel shows data; badges panel live-updates; linked player 302s to /players/@handle.
});
```

## 5. Fixtures and seed data

- **Location:** `apps/intradark/test/fixtures/players.ts`.
- **Determinism:** fixed steamid64s (e.g. niko/s1mple test doubles), fixed `fetched_at`, fixed UUIDs.
- **Raw payloads:** committed sample JSON for Faceit, Leetify, and a GC `requestPlayersProfile` response to drive parser tests.
- **GC bot:** mocked at the module boundary (`gc-client`), never a real Steam login in tests.
- **Auth:** use existing `@workspace/supabase` test-user helper; never roll your own.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new `lib/` files | ≥80% | resolver, staleness, parsers, mapping |
| Integration cases in §3 | 100% present | reviewed before merge |
| E2E happy path | green on CI | required for the route |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` primitive internals — covered upstream.
- Supabase platform internals and Steam/Faceit/Leetify upstream correctness — trust + stub at boundaries.
- The real Steam GC protocol / live login — covered manually via the bot `/health` smoke, not in unit/CI tests.

## 8. Refactor checklist (after green)

- [ ] DB-first + TTL logic lives in one helper shared by all source routes (no per-route duplication).
- [ ] Validation/parse lives once per source (raw JSONB retained alongside parsed columns).
- [ ] No `any`; generated DB types flow through `entities/players/lib/types.ts`.
- [ ] No new app-to-app imports; `cs2-gc-bot/` imports no sibling app.
- [ ] No `@workspace/ui` → Supabase edge introduced.
- [ ] `PlayerProfile` and panels stay focused (<~250 lines each); split if larger.
