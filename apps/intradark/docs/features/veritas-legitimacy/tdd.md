# Veritas player legitimacy score — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Phase 1 only; karma and platform behavior have separate triads.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `normalizeAccountAge` maps 0→10yr to 0–1 with diminishing returns | `entities/players/lib/legitimacy/normalize.test.ts` | red |
| 2 | unit | `normalizeCount` (friends, hours, matches) uses log/sqrt diminishing returns | same | red |
| 3 | unit | `estimateSkill` aggregates Leetify/FACEIT/Premier into S | `entities/players/lib/legitimacy/coherence.test.ts` | red |
| 4 | unit | `estimateEarned` rises with tenure + volume + corroboration into E | same | red |
| 5 | unit | `coherenceSuspicion` = `max(0, S − E)` per sub-check | same | red |
| 6 | unit | Skill-profile balance flags aim ≫ utility/positioning/opening | `entities/players/lib/legitimacy/axes/plausibility.test.ts` | red |
| 7 | unit | Temporal anomaly detects rating jump across `games[]` fixture | same | red |
| 8 | unit | VAC penalty applied with ban-age decay | `entities/players/lib/legitimacy/penalties.test.ts` | red |
| 9 | unit | Private profile penalty + coverage reduction | same | red |
| 10 | unit | Confidence shrink pulls thin profile toward prior 50 | `entities/players/lib/legitimacy/score.test.ts` | red |
| 11 | unit | **Edge:** new low-skill player → tier `unverified`, not `suspicious` | `score.test.ts` | red |
| 12 | unit | **Edge:** private veteran → mid score + `confidence: low` | `score.test.ts` | red |
| 13 | unit | **Edge:** high skill + thin support → `suspicious` | `score.test.ts` | red |
| 14 | unit | Karma axis contributes 0 with `phase_2` note in breakdown | `score.test.ts` | red |
| 15 | unit | `mapTier` boundary cases at threshold edges | `entities/players/lib/legitimacy/tier.test.ts` | red |
| 16 | integration | `recomputeLegitimacy` upserts row from seeded snapshots | `test/legitimacy-recompute.int.test.ts` | red |
| 17 | integration | RLS: `anon` SELECT `player_legitimacy_scores` succeeds | `test/legitimacy-rls.int.test.ts` | red |
| 18 | integration | RLS: `anon` INSERT denied | same | red |
| 19 | integration | `LEGITIMACY_SCORING_ENABLED=false` skips upsert | `test/legitimacy-recompute.int.test.ts` | red |
| 20 | integration | `GET /api/players/[id]/legitimacy` returns row / null | `test/legitimacy-api.int.test.ts` | red |
| 21 | manual | Profile header shows tier + drivers; Sheet shows axes | [`flows.md`](flows.md) §5 | red |

Component tests and Playwright are **out of scope** for Phase 1 (grill branch 11 = A).

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Fixtures

- `entities/players/test/fixtures/legitimacy-new-player.json` — thin everything, low S, low E
- `entities/players/test/fixtures/legitimacy-suspicious-aimbot.json` — high aim, low util, low FACEIT (from user example 1)
- `entities/players/test/fixtures/legitimacy-veteran.json` — high S, high E, no bans (user example 3)
- `entities/players/test/fixtures/legitimacy-private-veteran.json` — strong stats, `communityvisibilitystate: 1`
- `entities/players/test/fixtures/legitimacy-vac-banned.json` — Steam bans payload
- Reuse `entities/players/test/fixtures/leetify-profile-seasons.json` for `games[]` temporal tests

### Pure functions

- **Subject:** `computeLegitimacy` in `entities/players/lib/legitimacy/score.ts`
- **Runner:** Vitest (`pnpm --filter intradark test`)
- **No mocks** inside pure lib tests
- **Assertions:** `score` 0–100, `tier` enum, `confidence`, `breakdown.axes.*.score`, `flags.positive` / `flags.risk` non-empty when expected

### `buildLegitimacyInput` (integration helper)

- Unit-test with injected DB row shapes (plain objects), not live DB
- File: `entities/players/lib/server/build-legitimacy-input.test.ts` (optional if covered by integration #16)

## 3. Integration tests (DB + RLS)

Run against intradark local Supabase (`supabase start` in `apps/intradark`).

### Setup

```ts
// test/setup-legitimacy.ts
// Insert players row + steam_profiles + one snapshot per source + call recomputeLegitimacy
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Anon reads legitimacy row | `anon` | row returned |
| Anon inserts legitimacy row | `anon` | denied (RLS) |
| Service role upsert | `service_role` | success |
| Recompute after steam enrichment columns populated | `service_role` | `breakdown.inputsPresent` includes `steam` |
| Kill-switch off | server env | no row change / no insert |

> Per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md), migrations and RLS live with the owning app.

## 4. End-to-end (happy path)

**Tool:** Manual smoke (no `apps/intradark/e2e/` today).

### Scenario (mirrors [`flows.md`](flows.md) §1)

1. Seed or visit a player with Leetify + Steam data (`/players/{steamid64}`).
2. Wait for legitimacy card to leave skeleton state.
3. Assert tier label visible (not dummy 82/71/88 rings).
4. Open breakdown Sheet → per-axis scores visible.
5. Click Refresh → snapshots refresh → legitimacy query invalidates → updated `computed_at` in Sheet footer.
6. Verify Vercel Analytics receives `player_legitimacy_breakdown_opened` (dashboard spot-check).

## 5. Backtest (calibration — post-green)

Not blocking CI, run ad-hoc before tuning weights:

- Input set A: known VAC-banned `steamid64` list (≥10) → majority `suspicious`
- Input set B: known legit veterans with public histories (≥10) → majority `established` or `trusted`

Document results in a comment in `score.ts` or a calibration note in `veritas-algorithm.md`.

## 6. Coverage map → flows.md

| flows.md §2 row | Test ref |
|-----------------|----------|
| No row yet | manual §5 + integration #20 null |
| Partial snapshots | unit #10, #11 |
| API 500 | manual |
| Recompute failure | integration — archive still succeeds (assert snapshot count) |
| Kill-switch | integration #19 |

## 7. Cross-references

- Plan: [`plan.md`](plan.md)
- Flows: [`flows.md`](flows.md)
- Algorithm edge cases: [`docs/veritas-algorithm.md`](../../veritas-algorithm.md) §Validation
