# Player Legitimacy Score — Algorithm Design

> Design document only. No code in this pass. Goal: agree on the model, the signals, and the
> build phasing before any implementation.

## Context

`apps/intradark` aggregates external player data (Steam, FACEIT, Leetify, CSStats) on a player
profile keyed by SteamID64 (`entities/players/lib/types.ts`). Today that data is only _displayed_
(much of it via mocks; the `/api/steam|faceit|leetify|csstats/*` routes the hooks call don't exist
yet). We want a single **legitimacy score** — a one-glance read of how likely a player is a real,
non-cheating human — computed from every data point we have, broken into categories, and
recomputed as data refreshes.

**Decisions locked with the user:**

- **Primary axis = "not a cheater"**, with established-human, community-karma, and skill as
  secondary contributors.
- **Stats feed plausibility, not raw skill.** Skill that isn't backed by tenure/volume/balance/
  corroboration is _suspicious_, not rewarded.
- **Red flags are negative points** (weighted), not hard caps.
- **Full vision, phased** — design all categories incl. ones needing new data plumbing; mark
  buildable-now vs later.

---

## Core concept: legitimacy ≠ skill → "earned skill" coherence

The central insight: **a high stat is only legitimate if the supporting evidence that should
accompany it is also present.** Cheaters and smurfs produce _unearned skill_ — performance with no
matching history, tenure, balance, or cross-platform footprint.

Formalize as two estimates per player:

- **S = Skill estimate** from stats: Leetify aim/rating/clutch/opening, ADR, K/D, FACEIT elo,
  Premier ELO.
- **E = Earned/support estimate** from: account age, CS2 hours, games/matches volume, FACEIT level
  & match count, Premier seasons, **skill-profile balance** (util/positioning/gamesense vs aim),
  and cross-platform corroboration.

**Suspicion is driven by the gap:** `suspicion ∝ max(0, S − E)`.

| Scenario                                    | S    | E    | Result                                              |
| ------------------------------------------- | ---- | ---- | --------------------------------------------------- |
| Inhuman aim+clutch, low util, no/low FACEIT | high | low  | **Suspicious** (user example 1)                     |
| Great stats, brand-new account              | high | low  | **Suspicious** (user example 2)                     |
| High K/D + 2–3k hrs + deep FACEIT history   | high | high | **Legit, skilled** (user example 3)                 |
| Average new player, thin everything         | low  | low  | **Not suspicious** — just low-confidence/Unverified |

That last row matters: a new _bad_ player must not be flagged as a cheater. The gap model handles
this for free — low skill never produces suspicion regardless of thin support.

---

## The model

```
legitimacyScore =
    clamp(
        Σ ( weight_axis × axisScore_axis )      // positive axes, each 0–100
      − Σ ( penalty_i )                          // red flags as weighted negatives
    , 0, 100)
   then annotated with a confidence band (data coverage)
```

### Axes and starting weights (tune in calibration)

| Axis                                         | Weight   | What it is                                                                                                                    |
| -------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **A. Integrity & plausibility** (anti-cheat) | **~45%** | Ban-free + earned-skill coherence (the `max(0, S−E)` engine inverted into a 0–100 "plausibility" score). The dominant axis.   |
| **B. Establishment** (real human)            | ~22%     | Steam tenure, level, years-of-service badges/coins, friends, profile public + complete.                                       |
| **C. Corroboration & footprint**             | ~15%     | Independent linked accounts + depth/volume of trackable history.                                                              |
| **D. Community karma**                       | ~13%     | Score-weighted vouches (+) / reports (−).                                                                                     |
| **E. Skill (standalone)**                    | ~5%      | Small bonus so a _legit_ strong player edges a legit average one. Most of skill's effect is via axis A's coherence, not here. |

Penalties (subtracted, per user's "negative points" choice — sized so a strong red flag dominates
without being an absolute cap):

| Flag                                   | Indicative penalty                        | Source                            |
| -------------------------------------- | ----------------------------------------- | --------------------------------- |
| VAC ban                                | −35 to −45 (decays slightly with ban age) | Steam GetPlayerBans\*             |
| Game ban / community ban / economy ban | −10 to −20                                | Steam GetPlayerBans\*             |
| Fully private profile                  | −12 (also lowers confidence)              | `communityvisibilitystate`        |
| Repeatedly matched with banned players | small, capped                             | Leetify `games[].hasBannedPlayer` |

\* not currently captured — see Phase 0.

---

## Signals & normalization (per category)

Each raw metric → 0–1, then composed into its axis sub-score. Normalization shape matters as much
as the metric:

- **Clamp/linear** for natural ranges: account age 0→10yr, profile completeness.
- **Diminishing returns (log/sqrt)** for counts: friends, hours, match volume (0→500 friends is
  meaningful; 5000→5500 isn't).
- **Sigmoid / population percentile** for stats (S term).
- **Thresholds** for binary-ish gates: FACEIT level ≥ N, has ≥1 Premier season.

| Axis                 | Signals available now (`types.ts`)                                                                                                                                                                      | Signals needing plumbing (Phase 0)                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **A. Plausibility**  | Leetify `recentGameRatings` (aim/positioning/utility/clutch/opening/leetify), per-match `games[]` (rating variance, timestamps, `hasBannedPlayer`, `partySize`), FACEIT elo/level, Premier current/peak | VAC/ban status, CS2 hours (GetOwnedGames), reaction/time-to-damage if exposed |
| **B. Establishment** | `timecreated`, `player_level`, `friends_count`, `communityvisibilitystate`, `realname`, custom `avatarfull`                                                                                             | Years-of-service badges & coins, Steam badge count (GetBadges/GetSteamLevel)  |
| **C. Corroboration** | FACEIT present+elo, Leetify present (`isProPlan`), CSStats seasons + `total_wins`, Discord linked (`user_profiles.discordUserId`), email verified (`isVerified`)                                        | FACEIT match count / account age, deeper history pulls                        |
| **D. Karma**         | — (no voting tables exist; blank slate)                                                                                                                                                                 | `player_trust_events` table (Phase 2)                                         |
| **E. Skill**         | Leetify `leetify` rating, FACEIT elo, Premier ELO                                                                                                                                                       | —                                                                             |

### The plausibility/coherence engine (axis A detail — the user's main concern)

Four sub-checks, each producing a suspicion contribution; axis A score = `100 − normalized(total
suspicion) − ban penalties`:

1. **Skill–tenure/volume coherence** — `max(0, S − E_tenure)` where `E_tenure` rises with account
   age + CS2 hours + total games. (Covers "great stats, new account" and "high K/D should mean
   2–3k hrs".)
2. **Skill-profile balance** — flag when aim ≫ {utility, positioning, opening, gamesense}. The
   classic "inhuman aim, no brain" aimbot signature. (Covers user example 1, first half.)
3. **Skill–corroboration coherence** — high in-game skill but no/low FACEIT, no Leetify history,
   or private profile = unverifiable skill. (Covers user example 1, second half.)
4. **Temporal anomaly** — sudden jumps in per-match rating across `games[]`, or stark recent-vs-
   lifetime divergence = possible cheat on/off. Bonus: exposure to `hasBannedPlayer`.

---

## Confidence (coverage)

`coverage = present, usable data sources / total`. Effects:

- Display a **confidence chip** (Low/Med/High) next to the score.
- Low coverage **shrinks the score toward a neutral prior** (~50) so a thin-but-clean profile
  isn't auto-promoted to "Trusted," and a thin profile isn't auto-condemned.
- Private profiles and missing links lower coverage _and_ (for the explicit red flags) apply
  penalty — these are distinct effects.

---

## Output (the "one-glance" UX)

- **0–100 score + tier**: e.g. `Suspicious` / `Unverified` / `Established` / `Trusted`
  (color-coded badge on the profile header).
- **Top 2–3 positive drivers** and **top 2–3 risk flags**, e.g.
  `✓ 8-yr account · 2,100 FACEIT matches    ✗ private profile · aim≫gamesense`.
- **Confidence chip**.
- Expandable **per-axis breakdown** (each axis 0–100 + its contributing signals) for transparency
  and dispute handling.

---

## Karma — anti-gaming requirements (Phase 2)

The only purely platform-native axis, and the easiest to abuse:

- **Sybil resistance:** weight each vouch/report by the _voucher's own_ legitimacy score.
- **Caps & decay:** cap vouches per voucher; decay influence over time.
- **Min eligibility to vouch:** account age + minimum own score.
- **Reports are typed** (reason category); reports corroborated by a demo/match weigh more.
- **Collusion detection:** watch for reciprocal/clustered vouch rings.

---

## Codebase placement (grounded in current structure)

- **Pure scoring lib (deterministic, Vitest-colocated):**
  `entities/players/lib/legitimacy/` — `normalize.ts`, `coherence.ts`, `axes/*.ts`, `score.ts`,
  `types.ts` (`LegitimacyInput` = normalized `PlayerData`, `LegitimacyBreakdown` output). Matches
  the repo convention "lib/ = pure helpers, tests here."
- **Persistence (`drizzle/` → mirror in `server/db/schema.ts`, apply via Supabase MCP in order):**
  - `player_external_stats` — cache blob per source + `updated_at` TTL (the schema gap flagged in
    module-expansion-recommendations.md; avoids hammering external APIs on every score).
  - `player_legitimacy_scores` — `steam_id64`, `score`, `tier`, `breakdown` (jsonb), `confidence`,
    `computed_at`.
  - `player_trust_events` (Phase 2) — vouches/reports; reuse audit columns (`grantedBy`/`grantedAt`
    style) and soft-delete pattern from forums.
- **API routes (currently missing — hooks call dead endpoints):**
  `app/api/steam/*`, `app/api/faceit/*`, `app/api/leetify/*`, `app/api/csstats/*` (server-only API
  keys, rate-limited, cached).
- **Server actions** (vouch/report) follow the forums `{ ok: true, data } | { ok: false, code,
message }` convention (`entities/forums/actions.ts`).
- **Display** in `components/organisms/player-profile/` (or migrate toward
  `entities/players/components/`).
- **Recompute triggers:** on stats refresh, on karma event, on ban detection.

---

## Phasing (full vision, phased)

- **Phase 0 — Data plumbing (prerequisite).** Build the missing `/api/steam|faceit|leetify|
csstats/*` routes; add `player_external_stats` cache. Capture the extra Steam fields the score
  needs: **GetPlayerBans** (VAC/game/community bans), **GetBadges/GetSteamLevel** (years-of-service
  coins, badge count), **GetOwnedGames** (CS2 hours). Without this, axes A/B are starved.
- **Phase 1 — Core score.** Implement the pure scoring lib over **Establishment + Corroboration +
  Plausibility (coherence) + Integrity penalties + Confidence**. Persist `player_legitimacy_scores`.
  Render tier + drivers + confidence on the profile. Vitest on every pure function.
- **Phase 2 — Community karma.** `player_trust_events` + vouch/report server actions + score-
  weighted aggregation + anti-gaming. Wire karma axis into the score.
- **Phase 3 — In-platform behavior (after PUG loop + CS2 ingest ship).** Add ground-truth signals:
  PUG completion vs dodges/abandons, reports-received-per-match, platform account age/activity.
  Recalibrate weights.

---

## Calibration & the ML upgrade path (deferred, not now)

- Start with **hand-set weights** above; sanity-check tiers against a hand-labeled set of obvious
  legit / smurf / cheater profiles.
- Once enough of your own users accumulate **ban outcomes**, fit weights with a simple **logistic
  regression** using "later VAC/game-banned" as the negative label — turns the heuristic into a
  calibrated probability. Keep the breakdown explainable (per-axis contributions) either way.

---

## Validation of the design (how we'll know it's right)

- **Backtest:** run the Phase-1 scorer against a set of known VAC-banned SteamID64s and a set of
  known-legit veterans; confirm clear tier separation.
- **Edge cases to assert in tests:** new legit player → `Unverified` (not `Suspicious`); private-
  but-linked veteran → mid score + low confidence, not condemned; pro/streamer smurf → recoverable
  via karma vouch or an admin `verified.player` override (manual floor).
- **Unit tests:** each normalization curve and each coherence sub-check is a pure function with
  fixture-driven Vitest cases.

---

## Open questions for later (not blocking)

- Exact tier thresholds and axis weights (set in calibration).
- Admin override mechanism — a `verified.player` RBAC role that floors the score for vetted
  pros/staff?
- Whether the score is public to all members or staff/self-only (affects gaming incentives).
