# Player Anthem — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## 1. Test list

| # | Layer | Behavior | File | Status |
|---|-------|----------|------|--------|
| 1 | unit | `parseSpotifyTrack` parses plain/`?si=`/locale/URI forms → `{ id, canonicalUrl }` | `entities/players/lib/spotify.test.ts` | green |
| 2 | unit | `parseSpotifyTrack` rejects non-track types, bad host/protocol/id, garbage | same | green |
| 3 | unit | `trackIdFromCanonical` derives id from canonical, null otherwise | same | green |
| 4 | unit | `parseSoundcloudTrack` normalizes `/{user}/{track}`, strips query, www/m hosts | `entities/players/lib/anthem.test.ts` | green |
| 5 | unit | `parseSoundcloudTrack` rejects sets, user-only, too-deep, short links, non-https | same | green |
| 6 | unit | `parseAnthem` detects spotify vs soundcloud; rejects unsupported/garbage/non-string | same | green |
| 7 | unit | `anthemProvider` derives provider from a stored canonical URL | same | green |
| 8 | integration | `PATCH /api/me/anthem` persists normalized canonical (both providers) to caller row | `app/api/me/anthem/route.int.test.ts` | todo |
| 9 | integration | `PATCH { url: null }`/empty clears the column | same | todo |
| 10 | integration | unauthenticated → 401, no write | same | todo |
| 11 | integration | only caller's row is written (RLS) | same | todo |
| 12 | integration | DB `CHECK` rejects non-canonical / disallowed-provider values | same | todo |
| 13 | component | spotify anthem + visitor → Spotify embed, no editor | `entities/players/components/panels/anthem-panel.test.tsx` | todo |
| 14 | component | soundcloud anthem + visitor → SoundCloud iframe with correct `?url=` src | same | todo |
| 15 | component | no anthem + owner → empty editor; + visitor → renders nothing | same | todo |
| 16 | component | invalid link in editor → inline error, no PATCH fired | same | todo |
| 17 | e2e | owner pastes a SoundCloud link → saves → widget appears; reload persists | `e2e/player-anthem.spec.ts` | todo |

Unit tests (#1–#7) are implemented and green (21 assertions across the two spec files). Integration/component/e2e (#8–#17) require local Supabase + RTL/Playwright harness and are the documented follow-up.

## 2. Unit detail

- **Spotify:** see `spotify.test.ts` — 12 cases.
- **SoundCloud / anthem:** see `anthem.test.ts` — 9 cases covering normalization, set rejection, provider detection, and bad input.
- Pure functions, no mocks. The parsers are the security boundary (only their canonical output reaches an iframe `src`), so reject branches are covered exhaustively.

## 3. Integration (DB + RLS)

Run against local Supabase (`supabase start`). Seed two members (ownerA acting, ownerB other).

| Case | Acting role | Expected |
|------|-------------|----------|
| Set valid Spotify anthem | authenticated (ownerA) | `anthem_url` = spotify canonical |
| Set valid SoundCloud anthem | authenticated (ownerA) | `anthem_url` = soundcloud canonical |
| Clear (`null`) | authenticated (ownerA) | column NULL |
| Unauthenticated PATCH | anon | 401, no write |
| Cross-row write attempt | authenticated (ownerA) | ownerB untouched (RLS) |
| Direct non-canonical insert | service_role | `CHECK` violation |

## 4. E2E / manual smoke

`pnpm dev` (3004) → sign in → open own `/players/@you` → paste a SoundCloud track link (optionally with a `#t=` timestamp) → Save → player renders, autoplays from the `#t=` offset with volume easing 1→10 over 5s (browser permitting) → reload persists → Remove clears.

## 5. Coverage gates

| Gate | Threshold |
|------|-----------|
| Unit branch coverage on `spotify.ts` + `anthem.ts` | ≥90% |
| `pnpm typecheck` | clean |
| `pnpm lint:architecture` | clean |

## 6. Refactor checklist (done)

- [x] Validation in one place (`spotify.ts` + `anthem.ts`), reused by the route.
- [x] No `any`; regenerated DB types flow through `anthem_url`.
- [x] Raw input never reaches an iframe `src` (only canonical-derived values).
- [x] No new app-to-app imports; no `@workspace/ui` → Supabase edge.
- [x] `AnthemPanel` split into `SpotifyEmbed` / `SoundcloudEmbed` helpers.
