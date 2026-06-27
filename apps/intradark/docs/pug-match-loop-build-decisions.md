# PUG Match Loop — Build Decisions (grilling outcome)

> Companion to `docs/PUG Match Loop - Build Plan.docx` and `docs/pug-system-spec.md`.
> This file is the **decision record** from a design grilling on 2026-06-27. Where this doc
> and the original build plan disagree, **this doc wins** — it reflects choices made with the
> owner after grounding against the live repo (migrations 0032–0034, the redline entity layer,
> the `/play` + `/api` surfaces, and the legacy `intradark-main` / `intradark-client-main` builds).

---

## 0. Headline strategy

**Build a vertical slice first.** Drive the thinnest possible path to *one real CS2 match
completing end-to-end on a real server* before enriching anything. Prove the unproven half
(servers / MatchZy / results) with ugly polling; make it pretty (Realtime, tiering, veto,
draft, the league layer) only after a real match has run server→results→history.

Critical path to a playable loop: **P0 → P3 → P4 → P5 → P6 → P7 → P8** (see §6). Realtime (P1),
tiering (P2), interactive veto (P9), and the whole league layer are deliberately *after* that.

---

## 1. The vertical slice — locked decisions

| # | Area | Decision |
|---|------|----------|
| 1 | **Target** | Vertical slice: one real match end-to-end before any enrichment. |
| 2 | **Provisioning model** | **On-demand spin-up per match** via Redline. Servers are **ephemeral** — created at match time, torn down after. No persistent pool, no idle cost. |
| 2b | **Provisioning timing** | Fire `provisionServer` in the background **the moment all 10 accept** (`pending_accept → accepted`), so install overlaps the human phases. **Install is ~10s (verified — overlay onto a CS2 base image), so it hides entirely inside staging; no pre-warm ever needed.** Spin-up **failure cancels the match without dodge penalties** (our fault) + tears down the half-built box. |
| 3 | **Config delivery** | **`matchzy_loadmatch_url`** — one RCON call pointing MatchZy at `GET /api/match/[id]/matchzy-config`, which returns rosters/map/team-names/`matchid` + the **per-match event token** + the **demo-upload URL**. **No per-match SFTP. No plugin reload** (MatchZy is resident from the pug zip). SFTP stays only for shipping the plugin bundle at provision time (Redline `ZIP_URL`). Fall back to SFTP-written config only if `loadmatch_url`+auth is flaky on MatchZy 0.8.15 (verify in the spike). |
| 4 | **Server record model** | Repurpose **`game_servers`** as a unified CS2 server registry with a **`kind` discriminator** (`'pug'` = ephemeral vs `'deathmatch'` = persistent). PUG rows are created at provision, hold `redline_server_id` + minted `rcon_password`, lifecycle via `status` (`provisioning → ready → in_use → tearing_down`), deleted at teardown. New columns: `kind`, `redline_server_id`, `rcon_password`. `matches.server_id` FKs in. **No booking lock** (dedicated per match — no contention). Stays service-role-only. |
| 5 | **Resolver / heartbeat** | Enable **`pg_cron` + `pg_net`** (both available, not yet installed). `pg_cron` ticks **~30s** → `pg_net` POSTs to **`/api/cron/resolve`** (shared-secret) → one idempotent resolver server action. It (a) closes overdue accept/staging/connect/veto deadlines (DB transitions + cooldowns + requeue) and (b) **tears down leaked/failed ephemeral servers** (cancelled/completed/abandoned matches, or provision-deadline exceeded). Lazy resolution stays as the latency optimization while browsers poll. |
| 6 | **Ingest contract** | Promote `/api/cs2/events` from stub to a real handler **mirroring** `/api/cs2/deathmatch/events`: zod-validate, dedupe on unique `event_id` with `onConflictDoNothing`, append to `match_events`, fire side-effects by event type. **Spike the real MatchZy 0.8.15 contract first** (see §5). |
| 6b | **Ingest security** | **Full set in the slice** (ELO moves day one → fabricated results are a real exploit): remove the `dev-secret` fallback (**fail closed**), constant-time bearer compare, **per-match token** (embedded in the served config, echoed back), and **correlate** `match_id` + steamids against the live roster. |
| 7 | **Connect → force-start** | **Connect proof = RCON `status` polling** during `awaiting_connect` (MatchZy emits *no* connect event — see §5.1); parse connected steamids → `markConnected`; **all 10 connected → auto force-start** (RCON) → `live`. Not-all-connected at `connect_deadline` → **(A) auto-cancel, penalize no-shows** (existing escalating cooldown matrix), **requeue the blameless**, teardown server **+ (B) a manual admin force-start** escape hatch for the shakeout period. **(C) backfill-from-queue is post-slice.** Auto path requires all 10; admin button is the only short-handed start. |
| 8 | **Rating (hidden Elo)** | **Classic team Elo**, pure win/loss. `E1 = 1/(1+10^((avgR2−avgR1)/400))`, `delta = round(K·(result−E1))`, K=32 with a **placement boost** (K=40 for first ~10 matches). Per-player `rating_delta` + `player_ratings` update (rating/peak/W/L). Round score & K/D are **display-only** (don't touch rating). Deterministic → unit-tested in the existing style. **Glicko-2 is the earmarked post-slice swap** (clean, since the schema is algorithm-agnostic). Elo is **hidden** — see §2. |
| 8b | **Stats** | **Now:** core line **K/D/A/HS/MVP+ADR** sourced from the **Get5 team-stats blocks** in `round_end`/`map_result`/`series_end` (`StatsTeam1`/`StatsTeam2` → players) — *not* from `player_death` (MatchZy doesn't stream it; see §5.1). Aggregated into `match_player_stats` once at `finalizeMatch` (idempotent on PK). **Rich stats (clutches/entries/multi-kills/HLTV-rating/utility/positions) = a separate later epic via a demo parser.** |
| 8c | **Demos** | **Capture + store demos from day one** (back-half, not deferred — a `.dem` never stored is lost forever). Configure MatchZy demo upload (in the served config) → POST to an endpoint storing in a Supabase Storage bucket (`match-demos`), correlated by `match_id`. **Parsing is the separate post-slice epic.** Note: `.dem` ~50–300MB/match → retention/cost policy later. |
| 8d | **History (P8)** | Feed `/matches` from `match_results`; build `/matches/[seq]` detail = score + map + rosters + **K/D/A/HS/MVP(+ADR)** scoreboard + demo download + (post-slice) the **'steal' breakdown/grades/quips**. **Hidden Elo delta never shown** (admin-only). **Public, shareable match pages + a public season leaderboard** (the league's shop window); verification/identity + Elo stay private. |
| 8e | **Admin (slice-minimum)** | Build admin controls **incrementally, co-located with each phase**. Slice trio: **manual force-start**, **server list + manual teardown**, **void/cancel a match**. |

---

## 2. The league layer (post-slice) — two axes

- **Visible / primary = "steal" points.** Per-cohort, per-season points ledger. The whole point
  is **winning and playing hard**; points drive the public ladder **and** prize money.
- **Hidden = Elo ("the halo").** Deliberately downplayed; used only for **in-match team
  balancing** and as the **initial Faceit-Elo proxy** + a Veritas/anomaly signal. **Never shown.**

### 2.1 The "steal" points system (ported from legacy `PugSteal`, never actually implemented before)
Base: **win = +6**, loss/draw = 0. Then **margin modifiers** on round differential — close losers
*steal* points back, blowout losers get demerited:

| Round margin | Winner bonus | Loser bonus | Winner demerit | Loser demerit | W grade | L grade | Quip |
|---|---|---|---|---|---|---|---|
| 2 | 0 | **+2** | 0 | 0 | C+ | C | "fighter" |
| 3–4 | 0 | **+1** | 0 | 0 | B | D+ | "some cigar" |
| 5–6 | 0 | 0 | 0 | 0 | B+ | D | — |
| 7–8 | **+2** | 0 | 0 | **−2** | A | E+ | "#ratioed" |
| 9–10 | **+4** | 0 | 0 | **−4** | A+ | E | "blindsided" |
| 11–16 | **+6** | 0 | 0 | **−6** | S | F | "de_Stroyed" |

- Modifier config lives in **`league_configs`** (per-tier formats possible; seeded identically for now).
- **Post-match dialog** rebuilt against real data using the legacy `postMatchModal` mockup as the
  visual reference (the legacy one is a static, mostly-commented-out mock — design only, no logic).
- Computed in `finalizeMatch` from the round score we already store.

### 2.2 Seasons & prizes
- **Seasons ≈ monthly, fixed calendar months, auto-rolled by the resolver** at month-end
  (finalize standings → compute prizes → apply promotions/relegations → open next season).
- Prizes **directly dictated by points**: **configurable top-N payout table per cohort**
  (e.g. 1st/2nd/3rd shares), ties broken by hidden Elo. Bigger pools for higher cohorts.
- **Money handling:** the app is the **system of record only** — computes + displays standings &
  prize owed, with **mark-as-paid**. **Payout happens off-platform / manually.** **No payment rails.**
- **Funding:** prize pool is a **configured number** (self/sponsor-funded). **No payment-in.**
  (Entry-fee funding is a deliberate later decision with legal/compliance homework — out of scope.)

### 2.3 Cohorts & movement
- **Cohorts = tiers:** Champions, Stellaris, Genesis (prize) + **Open** (free on-ramp).
- **Initial placement:** **manual, seeded from imported Faceit Elo** at launch.
- **Ongoing movement = points-based promotion/relegation by season finish** (sports-league style):
  - **Relegation:** bottom **10%** of a cohort for **2 consecutive seasons** → drop a league.
  - **Promotion:** top **10%** (or a fixed number) of the league below → move up next season.
- **Schema needs:** `seasons` (cohort, month, start/end, prize pool, payout table, status);
  per-player-per-season **points + final standing/percentile persisted** (the relegation streak
  rule needs history); cohort-membership history; `faceit_elo` import field; a season-rollover job.

---

## 3. Modes & per-league config (all `league_configs` toggles)

`league_configs` is the per-cohort parameter table. Knobs gathered during grilling:

| Knob | Values | Notes |
|---|---|---|
| `team_selection_mode` | `auto_balance` \| `captains_draft` | Draft = top-2 Elo captains, alternating picks via server action + Realtime, **before** veto. Adds a `draft` status (reserved in the state machine now). Slice ships `auto_balance`. |
| `veto_format` | (universal for now) | **All cohorts operate the same way.** Standard CS **BO1**: alternating bans A-B-A-B-A-B → decider. Sides via **in-game knife round** (MatchZy default). Slice ships temporary **auto-pick**; interactive veto replaces it for everyone at once post-slice. |
| veto actor | highest-Elo per team | Same rule names the **draft captains** *and* the **veto controller** — uniform across modes. |
| veto first ban | **server-side coin flip**, recorded as `match_veto_steps` step 0 (auditable). Not Elo-based (fits "equal opportunity"). |
| veto timeout | per-step `veto_deadline`; **timeout → random auto-ban** via the resolver. |
| `max_party_size` | `1` \| `2` \| `3` | Prize cohorts cap at **3** (solos/duos/trios — never 4/5-stacks, so a team is always ≥2 parties). Open may allow larger later. Slice ships **solo-only** (`1`). |
| `map_pool` | text[] | Active Duty 7 for now; per-tier pools possible later. |
| `elo_min/elo_max` | bands | For balance/eligibility assistance; **not** the cohort-movement driver (points are). |
| `cooldown_matrix` | jsonb | Per-tier dodge/no-show penalties; defaults from `accept.ts`. |
| `prize_pool` / payout table | per season/cohort | §2.2. |

**Party support is heavier than a toggle:** it needs (1) a **party/group system** (create/invite/
accept/queue-as-unit) before queueing, and (2) a **party-aware matchmaker** — partition queued
parties into two intact 5-player teams (a party never splits) + balance Elo, with **feasibility
logic** (10 queued players may not form a valid 5/5 if party sizes don't partition). Post-slice,
gated by the toggle; the slice's solo greedy balance is untouched.

---

## 4. Cross-cutting

- **Realtime transport (P1, post-slice):** **hybrid** — Supabase Realtime primary (re-read
  projections, never trust payloads; per-me `match_players` INSERT = "match found") **+ a ~20–30s
  slow-poll safety net** per live surface (self-heals dropped subscriptions). Add `match_veto_steps`
  to the publication. Not a hard dependency on P0 type-gen (we re-read, not trust payloads).
- **Admission & anti-abuse (post-slice):** **Curated, identity-verified, closed league.** Primary
  defense = **manual admission** (apply → link Steam→Faceit → **manual interview / identity
  verification** → admin approval → cohort placement seeded from Faceit Elo). **Tiered access:**
  **Open** = lighter on-ramp (Steam+Faceit link only, **no prizes**, doubles as scouting ground);
  **prize cohorts require full verification + `approved`.** Onboarding/verification is its **own
  dedicated phase** (application intake, interview tracking, approval state machine), not a small
  screen. Schema: account verification state (`pending → verified → approved`), verification record.
- **Veritas (post-slice, own phase):** the **Player Legitimacy Score** in `docs/veritas-algorithm.md`
  IS the automated secondary net (`suspicion ∝ max(0, S − E)`). **Prerequisite:** build the real
  external-data plumbing (`/api/steam|faceit|leetify|csstats/*` are currently mocks). Feeds
  onboarding (who to scrutinize) + ongoing monitoring. Manual verification stays primary.
- **Discord = access/identity backbone (post-slice):** voice teardown at finalize/cancel; **role
  sync** (`verified` + cohort roles, updated by the season-rollover job on promotion/relegation);
  result + end-of-season announcements; match-ready pings.
- **Regions:** modeled but unused → **future**, single region (Sydney) for now.

---

## 5. Task zero — de-risk the critical path

> **Update:** the `intradark-redline-provisioning` memory confirms the **create-502 was RESOLVED
> and verified on 2026-06-24** — `POST /v1/servers` returns 201 and install goes `installing →
> running` in **~10s** (overlay onto an existing CS2 base image, not a 30GB download). So spike #1
> below is largely already done: **live create works, install ≈10s.** That makes the provisioning
> mask (§1/2b) very comfortable — ~10s sits entirely inside staging, no pre-warm ever needed.
> Caveats from that memory to carry into P4: **account limit = 2 concurrent servers** (hard
> concurrency cap until raised — see GSLT note in §7), a **GSLT ref registry already exists**
> (`entities/redline/lib/gslt.ts`, named refs → env vars, never exposes the token), and a
> **test-host address off-by-one** quirk (subtract 1 from the last octet on the playground host;
> transient, don't bake in). MatchZy already exists locally as `MatchZy.disabled` on the known-good
> `S:/cs2-server`.

1. **(Mostly done) Re-confirm a live ephemeral create with the *pug* zip** (`scripts/redline-spinup.ts`
   pointed at the MatchZy `pug-<ver>.zip`, not the deathmatch zip) to confirm MatchZy auto-loads on a
   fresh box. Creates a billable server (auto-deletable via `--delete`).
2. **(RESOLVED 2026-06-27 — see §5.1)** MatchZy 0.8.15 contract pinned from source/docs.

---

### 5.1 MatchZy 0.8.15 contract — RESOLVED (2026-06-27)

Pinned from MatchZy docs + source (`Events.cs`, `RemoteLogConfig.cs`, `ConfigConvars.cs`,
`match_setup`/`commands`/`gotv` docs). MatchZy mirrors Get5.

**Match config (served via `loadmatch_url`).** JSON schema confirmed:
`{ matchid (int, optional/auto), team1/team2:{ name, players:{ "<steam64>":"<name>" } }, num_maps,
maplist[], map_sides[], players_per_team, clinch_series, cvars{} }`. For a PUG: `num_maps=1`,
`players_per_team=5`, `maplist=[<vetoed map>]`, `map_sides=["knife"]` (knife round picks sides).
**Note:** `matchid` is an **integer** — use `matches.seq` (bigint identity), not the UUID, as the
MatchZy matchid; carry our UUID/token separately (URL + token).

**Load command (configure step):**
`matchzy_loadmatch_url "<url>" "<header_name>" "<header_value>"` — HTTP **GET**, optional single auth
header. So: `rconExec(matchzy_loadmatch_url "https://intradark.com/api/match/<id>/matchzy-config"
"Authorization" "Bearer <per-match-token>")`. (Local-file fallback: `matchzy_loadmatch <file>`.)

**The cvars block is the key unlock** — the served config's `cvars{}` can set MatchZy's own convars,
so **events, demo upload, and their auth are all configured per-match through the one served JSON**:
- `matchzy_remote_log_url` = our `/api/cs2/events`, `matchzy_remote_log_header_key` = `Authorization`,
  `matchzy_remote_log_header_value` = `Bearer <per-match-token>`.
- `matchzy_demo_upload_url` = our demo endpoint.
- `hostname`, etc.

**Webhook events (POSTed as JSON to `matchzy_remote_log_url`).** Exact event-name strings emitted:
`series_start`, `going_live`, `round_end`, `map_result`, `series_end`, `map_picked`, `map_vetoed`,
`side_picked`, `demo_upload_ended`, `player_disconnect`.
- **Terminal event = `series_end`** (`MatchZySeriesResultEvent`) → triggers `finalizeMatch`. `map_result`
  fires per map (single-map → one `map_result` then `series_end`).
- **`round_end`** carries `StatsTeam1`/`StatsTeam2` (team score + per-player stat blocks).

**⚠️ Two findings that change earlier decisions:**

1. **No `player_connect` event, and no `player_death` event.** MatchZy's webhook emits
   `player_disconnect` but **not** a connect event, and does **not** stream per-kill `player_death`.
   Consequences:
   - **Connect proof = RCON `status` polling**, not events (revises Decision 7). During
     `awaiting_connect`, poll `rconExec("status")` and parse connected steamids → `markConnected`;
     all-10 present → force-start. (`player_disconnect` events can mark drop-offs, but the positive
     "they're here" signal is the RCON `status` parse.)
   - **Per-player stats come from the Get5 team-stats blocks** in `round_end`/`map_result`/`series_end`
     (`StatsTeam1`/`StatsTeam2` → players: kills/deaths/assists/HS/damage/MVP/ADR), **not** from
     `player_death` (revises Decision 8b's mechanism — same stat *line*, different *source*). The
     demo parser remains the path to the truly rich stuff (clutches/entries/positions).

2. **MatchZy webhook events have NO built-in unique `event_id`** ("no deduplication or retry-logic"
   per the docs). So our `match_events` idempotency **can't key on a provided `event_id`** like the DM
   route does — dedupe on a **composite** (`matchid` + `map_number` + `round_number` + `event`) or a
   content hash. Exactly-once **results/ELO** is still guarded by the `match_results` PK regardless.

**Force-start / ready bypass (the website is the ready system).** Admin commands exist:
`.start` (force start), `.forceready` (force-ready a team), `.readyrequired <n>` (`0` = everyone must
ready). Via RCON we force-start once RCON `status` confirms all 10 — the **exact RCON invocation**
(`css_forceready` / `matchzy_` command form) is the one small thing to confirm on the live box during
the practical run, but the capability is confirmed.

**Demos.** `matchzy_demo_upload_url` → MatchZy **POSTs the zipped `.dem` as the body** at map end,
with correlation headers **`MatchZy-FileName`**, **`MatchZy-MatchId`**, **`MatchZy-MapNumber`**.
**No custom auth-header cvar for demo upload** (unlike remote_log/backup) → secure our demo endpoint by
**validating `MatchZy-MatchId` against a live match + a secret token embedded in the upload URL path**.
A `demo_upload_ended` event fires after upload.

**Version note:** repo ships MatchZy **0.8.15** (`scripts/package-cs2-plugins.mjs`); contract pinned
against current docs/`dev`. Re-verify these exact strings if the bundled version is bumped.

---

## 6. Revised phased sequence

**Slice (critical path):**
- **P0 — Foundations & audit debt:** enable `pg_cron`+`pg_net`; build `/api/cron/resolve` resolver
  skeleton; remove `dev-secret` fallbacks (fail closed); generate real Supabase `Database` types
  (replace the three `= any`); stand up a route/action test harness. **+ Task-zero spikes (§5).**
- **P3 — Map auto-pick:** `autoPickMap` from a pool → `matches.map` (unblocks the loop without veto UI).
- **P4 — On-demand server + configure:** provision at `accepted` (ephemeral `game_servers` row);
  `waitForInstall`; `configureServer` via `matchzy_loadmatch_url`; store connect string; teardown.
- **P5 — Ingest hardening + MatchZy contract:** real `/api/cs2/events` (zod, idempotent, correlated,
  per-match token); `player_connect`/`round_end`/terminal events; **demo upload + storage**.
- **P6 — Connect tracking + force-start:** `markConnected`; auto force-start on all-10 + admin button;
  connect-timeout → auto-cancel/penalize/teardown via resolver.
- **P7 — Results + hidden Elo:** `finalizeMatch` (idempotent), `applyEloDeltas`, server release/teardown,
  core stats aggregation.
- **P8 — Match history UI:** feed `/matches`; `/matches/[seq]` (public, shareable, demo download, no Elo).

**Enrichment (post-slice, roughly in this order):**
- **P1 — Realtime transport swap** (hybrid).
- **P2 — `league_configs` + tiering** (move constants to per-tier; `open` defaults).
- **League layer:** seasons + "steal" points ledger + post-match dialog + prize standings/payout +
  cohort promotion/relegation + season-rollover job.
- **Onboarding/verification phase** (admission state machine, interview tracking, Faceit link).
- **Veritas** (external-data plumbing → legitimacy score → onboarding + monitoring).
- **Interactive map veto** (universal format) replacing auto-pick.
- **Captain draft** mode (`draft` status + picks).
- **Party system + party-aware matchmaker** (`max_party_size`, trios max in prize cohorts).
- **Discord backbone** (roles, announcements, pings).
- **Demo parser** (rich retro stats over the banked archive).
- **Live scoreboard** (optional).

---

## 7.5 Implementation status

**P0 — Foundations (mostly done, 2026-06-27):**
- ✅ **Fail-closed ingest auth.** `lib/cs2-ingest-auth.ts` (`checkBearer`: no `dev-secret` fallback →
  500 if secret unset; constant-time compare). Wired into `/api/cs2/events` + `/api/cs2/deathmatch/events`.
  `env.example` comments updated. Tests: `lib/cs2-ingest-auth.test.ts` (7).
- ✅ **Resolver skeleton.** `entities/match-queue/lib/resolver.ts` (`resolveDueMatches`: accept timeout,
  staging drive + timeout via existing idempotent actions; P4/P6 teardown TODOs marked). Route
  `/api/cron/resolve` (CRON_SECRET, trigger-agnostic).
- ✅ **Resolver trigger — REVISED from Decision 5.** Using the repo's existing **Vercel Cron** pattern
  (added `/api/cron/resolve` at `* * * * *` to `vercel.json`) instead of standing up `pg_cron`+`pg_net`.
  Consistent with the backstop rationale; the route is trigger-agnostic so pg_cron+pg_net can drive it
  later for sub-minute cadence if ever needed. `pg_cron`/`pg_net` remain un-installed.
- ⏸️ **Real Supabase `Database` types — DEFERRED** (non-blocking; we re-read projections, so Realtime
  doesn't need them). MCP gen returns an 81k single-line blob; do via the formatting CLI (`pnpm
  gen-types`, needs `SUPABASE_PROJECT_ID` + access token) in a focused follow-up, then wire the three
  `utils/supabase/*` `= any` aliases and typecheck-triage.
- 🟡 **Test harness:** vitest already present; added pure-logic tests. Route/action integration tests
  (formation race, finalize idempotency, etc.) still to come per phase.

**P3 — Map auto-pick (done):** `entities/match-queue/lib/map-pick.ts` (pure `selectMapSlug` +
`DEFAULT_MAP_POOL_SLUG="active_duty"`) + `auto-pick-map.ts` (`autoPickMap`, idempotent, writes
`matches.map`). Tests: `map-pick.test.ts` (6). Active-Duty pool confirmed in DB (8 maps, `de_*` slugs).

**Verification:** new tests 13/13 green; full suite 275 pass (2 failures pre-existing in an unrelated
faceit-parser test, not touched here); `tsc --noEmit` — 0 errors in new/changed files (50 pre-existing
repo errors, all in unrelated `scripts/`).

---

## 7. Still genuinely open / deferred (not blocking)
- Exact MatchZy command/event/demo-upload formats → **resolved by the §5 spike**.
- Real CS2 install time → **measured by the §5 spike** (decides if pre-warm/snapshot is ever needed).
- GSLT pool for concurrent matches (one GSLT per concurrent ephemeral server; Steam caps per account).
- Demo storage retention/cost policy.
- Entry-fee funding & integrated payouts (legal/compliance) — deliberately out of scope.
