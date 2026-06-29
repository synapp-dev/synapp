# Tournament / Competition Module — Build Decisions (grilling outcome)

> Decision record from a design grilling on **2026-06-28**, grounded against the live repo
> (drizzle migrations 0000–0038, the scrims entity + `accept_challenge` RPCs, the `matches`
> state machine + `game_servers`/redline provisioning, `player_ratings`, `news_articles` +
> forums, RBAC, and the existing `/tournaments` + `/admin/tournaments` shells).
> Where this doc and any earlier note disagree, **this doc wins**.
>
> Companion reading: `docs/pug-match-loop-build-decisions.md` (the PUG engine this builds on),
> `docs/pug-system-spec.md`, `docs/roadmap.md`.

---

## 0. Headline strategy

Build **one unified competition system** that every competitive format flows through — brackets,
leagues, the open ladder, **and the existing PUG queue** (Champions / Stellaris / Genesis). The
PUG `league` enum stops being hardcoded and becomes rows in this system, so points, seasons and
standings are computed by **one engine** regardless of how matches are born.

**No active users** → we build the new thing cleanly and cut over the PUG enum directly (no
dual-write ceremony), sequenced so existing PUG / scrim / queue code keeps working as each piece
is swapped.

**Vertical-slice-first** (same philosophy as the PUG loop): build the foundation, then drive the
**positional ladder** end-to-end before enriching. Phasing in §10.

The north star: a tournament-organisation system **better than FACEIT** — demo-backed dispute
resolution, live-data news embeds, server spin-up integrated into the match flow, and a format
model open enough to add Swiss / GSL / group-stage-into-playoffs as the platform matures.

---

## 1. The three orthogonal axes (NOT one "tournament type" enum)

The brainstormed list (`open / challenge / invite-only / recurring`) conflated three independent
things. They are modelled separately:

| Axis | Values | Meaning |
|---|---|---|
| **`format`** | `bracket` · `league` · `ladder` · `queue` (text slug, extensible) | How matches are *born* + how standings are computed. Backed by a **driver** (§3). |
| **`entry_type`** | `open` · `approval` · `invite_only` | How an entrant gets *in*. `open` = instant on eligibility; `approval` = apply→organizer approves; `invite_only` = organizer adds directly. |
| **`recurrence`** | `one_shot` · `recurring` | One Major vs auto-rolling seasons (weekly ladder reset, monthly PUG season). |

`challenge` was **not** an entry type — it's how the **ladder** format generates matches.
`recurring` was **not** an entry type — it's the recurrence axis.

Any combination is legal with no special-casing: an `invite_only` `bracket` `one_shot` (a Major),
an `open` `ladder` `recurring` (the open ladder), an `open` `queue` `recurring` (Champions League).

**Eligibility** is separate again — `eligibility_rules` JSONB on the season, checked at
join/apply: min/max tier, region, roster size, verified-account-required, Elo range, no-VAC-ban,
min trust factor, min account age/hours.

---

## 2. Core hierarchy

```
competitions            -- persistent series/brand (Champions League, Summer Major, Open Ladder)
  └─ competition_seasons -- time-boxed instance; owns prizepool, rosters, registration window
       └─ competition_stages  -- ordered phases; each runs its OWN format driver; owns standings
            └─ matches    -- the universal "two opposing lineups" record (shared engine)
```

- **`competitions`** = config + identity (format defaults, entry_type, recurrence, game mode
  1v1/2v2/5v5, branding, sponsors, news linkage). Long-lived.
- **`competition_seasons`** = the resettable unit. Owns prizepool, registration window, roster
  lock rules, eligibility. Season 1 → Season 2 resets. A one-shot event = a competition with one
  season.
- **`competition_stages`** = a season has **one or more** stages, each with its own `format` +
  `format_config` + `advancement_rule`. **Standings live per stage**; the season aggregates a
  final placement. A simple event = one stage (zero added complexity). A composite event =
  groups (`league`) → playoffs (`bracket`), top-N advancing. This is what makes Swiss→bracket,
  GSL groups, etc. *just configuration*.

---

## 3. Formats as pluggable drivers (the extensibility backbone)

The **schema is format-agnostic**. Format-specific knobs live in **`format_config` JSONB** on the
stage. Each format is a **driver** implementing one interface; a **registry** maps slug → driver.
Adding a format = a new driver + registration. **No migration, no new tables.**

```ts
// entities/tournament/lib/formats/types.ts
export interface FormatDriver {
  slug: string;                       // 'bracket' | 'league' | 'ladder' | 'queue' | future...
  configSchema: ZodSchema;            // validates format_config

  // create fixtures / bracket slots (no-op for ladder & queue)
  generateSchedule(stage: StageCtx): Promise<void>;

  // advance bracket / update fixture / recompute standings on a finished match
  onMatchCompleted(match: MatchCtx, stage: StageCtx): Promise<void>;

  // ordered standings rows for the stage
  computeStandings(stage: StageCtx): Promise<StandingRow[]>;

  // gate match creation (ladder ±3 range, illegal-pairing rejection, etc.)
  canCreateMatch(a: EntrantCtx, b: EntrantCtx, stage: StageCtx): Promise<GateResult>;
}
```

- **`format` is a text slug, not a PG enum** (PG enums are painful to extend; the registry is the
  real source of truth).
- **Standings are stored** (`competition_standings`) and **recomputed by the driver** on each
  match completion — cheap reads, historical snapshots, format-uniform.

### 3.1 Driver behaviours (v1)

| Driver | `generateSchedule` | matches born via | `computeStandings` |
|---|---|---|---|
| **`bracket`** | seed → build single/double-elim tree (byes to top seeds) | auto-advance winner into next slot on result | final placement (where eliminated); optional 3rd-place, optional GF bracket reset |
| **`league`** | round-robin fixtures (single/double), scheduled via capacity-aware scheduler | from fixtures | `pointsWin`/`Draw`/`Loss` (default 3/1/0) + **ordered tiebreaker chain** `[head_to_head, round_diff, rounds_won, maps_won]` |
| **`ladder`** | no-op | direct **±3 challenge-up**, mandatory accept | **positional** — rank *is* the standing |
| **`queue`** | no-op | matchmaker forms 10-player matches (existing PUG engine) | **steal points** (PUG-only), per-season |

### 3.2 The positional ladder (CyberGamer-style) — locked mechanics

- **Rank position IS the standing.** Entrants occupy ranks 1..N. No points race for rank. New
  entrants join at the **bottom**. Season prizes pay the **top N** at close.
- **Challenge up only, up to 3 ranks higher.** Range enforced in `canCreateMatch` and in the UI.
- **Defending is mandatory** — being challenged means play or forfeit; forfeit = automatic loss.
- **Swap on win** — winner & loser trade positions (rank 10 beats rank 7 → they swap; 8 & 9
  untouched).
- **Forfeit/no-show** — challenger wins by forfeit and takes the position; defender drops.
  Repeated forfeits → optional auto-removal from the ladder.
- **Anti-spam** — rematch cooldown (no re-challenge same entrant for X h) + one active challenge
  at a time per entrant (can't be dogpiled). All in `format_config`.
- An **Elo-ladder** variant (points scale by rank-gap) is a *future driver* — the pattern allows
  both without disruption.

---

## 4. Competitors & rosters

- **`competition_entrants`** is the universal competitor — **1..N members**, optional `team_id`
  (branding/provenance), **owns its own roster snapshot** via `competition_entrant_members`.
  - **1v1** = entrant of exactly one member, rendered as a player.
  - **League team** = entrant created from a persistent `team`; at lock, snapshot current
    `player_teams` into `entrant_members` + `locked_at`. The real team can shuffle afterward; the
    entrant's locked roster doesn't move. **Roster-lock = snapshot, not a mutation.**
  - **Open-ladder crew** = persistent entrant with a lasting ladder rank; fluid roster between
    matches; `team_id` NULL.
- **Players-vs-entrants split**: pre-formed competitions (league/bracket/ladder) rank **entrants**;
  **queue** seasons rank **individual players** (`player_ratings` + steal points). The stage's
  format decides the subject.
- **Roster size** — `min_roster`/`max_roster` on stage config (5v5 league min 5/max 7; 1v1 1/1).
  The **per-match lineup** is a subset of the locked roster.
- **Transfer windows** (leagues) — organizer-approved add/drop between gameweeks, audit-logged,
  gated by a `transfer_window_open` flag.
- **Integrity rule** — a player belongs to **only one entrant per season**: unique
  `(season_id, steamid64)` across `entrant_members`. **Enforced for league/bracket, relaxed for
  ladder** (people pug casually with different crews) via `format_config`. Stops ringers/mercs.
- **Min-to-start** — a match needs N connected (= team size) or it goes to forfeit handling.

---

## 5. The unified match engine

**One `matches` table is the universal "two opposing lineups" record.** A bracket match, league
fixture, ladder challenge, PUG match, **and a scrim** are all the same kind of record once they're
"a scheduled CS2 game that spins up a server, gets played, and produces a result + stats."

Extensions to the existing `matches` table:
- `season_id` (nullable FK) — attributes a match to a season for points. NULL = casual, no points.
- `stage_id` (nullable FK) — which stage the match belongs to.
- `match_source` (text) — `queue` · `fixture` · `bracket` · `ladder_challenge` · `scrim`. Tells
  you how it was born + which front-of-lifecycle rules apply.
- `home_entrant_id` / `away_entrant_id` (nullable FK) — for pre-formed entrant matches. Queue
  PUGs leave these NULL and use the existing individual-balance path.

**Front of lifecycle varies by source** (who's in it, accept/balance vs pre-set sides);
**back of lifecycle is one shared path** (server config → connect → live → results → stats →
points → Elo). The existing PUG state machine *is* the back half.

### 5.1 Scrim refactor

A scrim becomes a match with `match_source='scrim'`, `season_id=NULL`, no points. The scrim
**finder/listing** UI stays; when a scrim is *played*, it resolves through the `matches` engine.
The **ladder challenge and the scrim challenge are the same mechanic** — differentiated only by
whether a season is attached + decline/forfeit rules. Display routes by source:
`scrim → /scrims/[id]`, PUG → `/matches/[seq]`, tournament → the tournament match view.

---

## 6. Scoring & ratings

- **One global hidden Elo per player** (`player_ratings`, already exists) — updated by **every**
  competitive match (PUG, league, bracket, ladder). Drives **seeding** (`by_rating` = aggregate of
  member Elos) + **win-probability** displays. **Hidden by default**, with an **admin platform
  setting** to toggle visibility (room to override per-competition later). Team matches update each
  participating player's Elo via team-vs-team expectation from aggregate team rating.
- **Steal points** — **PUG/queue only**, **separate from Elo**, per-season, drives the PUG season
  leaderboard + prizes. (Ported mechanics live in `docs/pug-match-loop-build-decisions.md §2.1`.)
- **League** — configurable points + ordered tiebreaker chain (§3.1).
- **Bracket** — final placement.
- **Ladder** — positional (§3.2).

---

## 7. Operations

### 7.1 Servers & scheduling
- Reuse the existing engine: `configuring → game_server assignment → MatchZy config push →
  awaiting_connect → live`. Tournament matches reuse this exact path.
- **Capacity wall**: Redline account is currently **2 concurrent servers (testing only — we can
  raise it freely later)**. The orchestrator is designed around an **expandable pool** — scale
  concurrency by adding accounts/`redline_deploy_targets`/`game_servers` rows, not code.
- **Overflow handling, both modes, configurable per competition**: **queue-and-wait** (match sits
  in `configuring` until a server frees) and **hard-stagger** (scheduler never books more
  concurrent matches than pool size). BYO/community servers (`team_servers`) as an optional
  per-competition fallback.

### 7.2 Per-match settings ("set all the variables")
- **Map pool** per competition (subset of `maps`).
- **`best_of`** configurable, **overridable per round** (bo1 groups, bo3 playoffs, bo5 GF).
- **Veto sequence** — preset-but-editable templates keyed to `best_of` (bo1 ban-to-1; bo3
  ban-ban/pick-pick/ban-ban/decider; bo5 ban-ban/4×pick/decider). **Reuse + extend the existing
  `/match/veto` UI** for multi-map series, with per-step timer + auto-action on timeout.
- **MatchZy rules** generated from competition settings: knife-for-sides, OT (MR3/MR6 + max OT),
  rounds (MR12/MR15), pause/tech-pause allowances.

### 7.3 Results, disputes, anti-cheat
- **MatchZy authoritative** — central matches auto-report via `match_events → match_results →
  match_player_stats`; **final on server report**, no confirmation.
- **Manual fallback** — BYO/failed MatchZy: one side reports, other confirms/disputes;
  unconfirmed after a window auto-confirms or escalates.
- **No-show/forfeit** — reuse `connect_deadline` + check-in; deadline miss → forfeit, opponent
  advances. Configurable timer + partial-team rules.
- **`match_disputes`** — `(match_id, raised_by_entrant, type, description, evidence_urls, status,
  resolution, resolved_by)`, **linked to demos** (reuse the devtools `.dem` parser) for organizer
  review. Demo-backed resolution > FACEIT screenshot tickets.
- **Anti-cheat** — VAC/trust gates (`player_cs2_gc_snapshots`) in `eligibility_rules`; in-event
  cheating → dispute + demo review + organizer DQ (audit-logged, Elo/standings reversal).

### 7.4 Organizer tooling & integrity
- **`tournament.admin`** capability (platform-wide, in existing RBAC) + **`competition_organizers`**
  delegation table `(competition_id, user_id, role ∈ owner/admin/moderator)` for per-competition
  organizers (the "community organizer" axis; just you on day one, no refactor later).
- **Console** at `/admin/tournaments`: create **wizard** (format → entry_type → recurrence →
  eligibility → rosters → maps/veto → prizes → schedule), then per-competition management
  (entrants approve/invite/seed/DQ, schedule generation, match grid with force-result / reschedule
  / forfeit / void, manual standings adjust, prizes mark-paid, server-pool view).
- **`competition_audit_log`** — `(competition_id, actor_user_id, action, target, before, after,
  reason, at)` on every sensitive action. Non-negotiable for integrity.

### 7.5 Registration logistics
- **Window-driven status**: `draft → announced → registration_open → registration_closed →
  seeding → live → completed → archived`. Ladders/queue sit in `live` indefinitely.
- **Capacity** — `max_entrants` (nullable = unlimited; ladders/queue unlimited). **Waitlist** for
  overflow, promoted on drops before lock. **Auto-byes** for non-power-of-2 brackets.
- **Seeding** — `seed` int per entrant: **manual / by_rating / random** (driver, `seeding` phase).
- **Check-in** — `check_in_required` + `check_in_opens_at` window; no check-in → dropped +
  waitlist promotion. **In v1.**

---

## 8. Prizepool

- **`competition_prizes`** — `(placement_range, prize_type, amount, currency, description,
  recipient_entrant_id, payout_status, paid_at)`. `placement_range` supports single ranks and
  ranges (1st/2nd/3rd, or "5–8 get $X each"). `prize_type ∈ cash / in_game_item / platform_points
  / physical / custom`.
- **Distribution** — fixed amounts *or* percentage-of-declared-pool (enter pool + 50/30/20 →
  system computes). Displayed as a breakdown on the competition page.
- **Payout tracking** — `payout_status` (`pending → paid`); recipient = the entrant (pay the
  captain); per-member split deferred.
- **Funding** — `funding_source ∈ internal / sponsor / entry_fees` + optional sponsor logo/link.
- **Entry fees** — **schema only** (`entry_fee` on season + payment status on entrant); actual
  payment processing (Stripe, refunds, paid-before-lock gating) **deferred**.

---

## 9. News, public views, realtime, notifications

- **News linkage** — `news_article_competitions` join `(article_id, season_id, relation_type ∈
  announcement/preview/recap/result/general)`. Season-level link; competition page surfaces its
  feed.
- **Live TipTap embeds** (the differentiator) — custom nodes the author drops into `body_json`:
  **standings table**, **bracket**, **match result card**, **prizepool breakdown**, **register
  CTA** — rendering live module data. **Auto-draft** on season start/end/notable result =
  scaffolded hook, deferred.
- **Routes** — `/tournaments` hub (active/upcoming/past, filter by format / game mode / region /
  prizepool); `/tournaments/[slug]` season page (overview, prizepool, entrants, format-appropriate
  main view, linked news, status-aware register/check-in CTA); **match view reuses existing match
  pages** routed by `match_source`.
- **Viz** — interactive bracket tree, sortable league table, ladder ranking with ±3 challenge
  buttons, PUG points leaderboard. Each = read-rendering of `competition_standings`.
- **Realtime** — extend existing Supabase Realtime to `competition_standings`,
  `competition_fixtures`, ladder `challenges` so brackets advance, tables re-sort, ladder positions
  swap, and challenges arrive live.
- **Notifications** — new **`tournament` category** across the existing Steam DM bot
  (`steam_dm_jobs` + `notify_tournament` toggle in `steam_notification_prefs`) and Discord bot:
  ladder **challenge received** (+ mandatory-accept clock), **match scheduled**, **check-in
  reminder**, **server ready / connect**, **result**, **you advanced**, **season ending**. Fan-out
  to entrant members.

---

## 10. Build order (phased)

| Phase | Scope |
|---|---|
| **P1 — Foundation** | Core schema (§11) + `matches` extensions + **format-driver framework + registry** + organizer **create-wizard** + read-only competition/season pages. Skeleton stands; no format end-to-end yet. |
| **P2 — Positional ladder (vertical slice)** | Marquee + most self-contained. ±3 challenge, mandatory-accept clock, swap-on-win, server spin-up, MatchZy result, live standings, realtime, notifications. **Reuses scrim challenge plumbing + matches engine** — mostly wiring. |
| **P3 — Queue attribution** | Clean cutover: `queue_entries.league`/`matches.league` enum → `season_id` FK; backfill `champions`/`stellaris`/`genesis` as competitions + current season; route **steal points** into `competition_standings`. Drop enum after code is cut over. |
| **P4 — League** | Round-robin fixtures, capacity-aware scheduler, table + tiebreakers, transfer windows, check-in. |
| **P5 — Brackets & stages** | Single/double-elim, bracket viz, auto-advance; then composite multi-stage (groups → playoffs) via `advancement_rule`. |
| **P6 — Polish / monetize** | Prize payouts UI, disputes UI + demo review, news TipTap embeds, entry-fee payments, community-organizer delegation. |

---

## 11. Schema (P1 DDL sketch)

> New drizzle migration (next free number — 0039–0041 are taken by reactions/anticheat/users-admin,
> so this lands at ~0042+; confirm `drizzle/` at build time). `format` / `entry_type` / `recurrence` / `match_source`
> as **text + CHECK** (extensible), not PG enums. JSONB for `format_config` / `eligibility_rules`.
> All competitor/match references go through **`entrant_id`**, never `team_id` directly.

```sql
-- 00XX_tournaments_foundation.sql  (sketch — use next free migration number)

create table competitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  game text not null default 'cs2',
  game_mode text not null,                       -- '1v1' | '2v2' | '5v5' ...
  format text not null,                          -- driver slug; validated app-side
  entry_type text not null default 'open'
    check (entry_type in ('open','approval','invite_only')),
  recurrence text not null default 'one_shot'
    check (recurrence in ('one_shot','recurring')),
  description text,
  branding jsonb default '{}'::jsonb,            -- colors, logos, sponsors
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table competition_seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  season_number int not null,
  name text,
  status text not null default 'draft',          -- draft..archived (see §7.5)
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  roster_lock_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  max_entrants int,                              -- null = unlimited
  min_roster int not null default 1,
  max_roster int not null default 1,
  check_in_required boolean not null default false,
  check_in_opens_at timestamptz,
  eligibility_rules jsonb not null default '{}'::jsonb,
  map_pool jsonb not null default '[]'::jsonb,   -- map ids
  match_defaults jsonb not null default '{}'::jsonb, -- best_of, veto, matchzy rules
  entry_fee numeric,                             -- schema-only for now
  funding_source text default 'internal'
    check (funding_source in ('internal','sponsor','entry_fees')),
  prize_pool numeric,
  prize_currency text default 'AUD',
  unique (competition_id, season_number)
);

create table competition_stages (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references competition_seasons(id) on delete cascade,
  sort_order int not null,
  name text not null,
  format text not null,                          -- driver slug for THIS stage
  format_config jsonb not null default '{}'::jsonb,
  advancement_rule jsonb default '{}'::jsonb,    -- e.g. { topN: 8 } into next stage
  status text not null default 'pending',
  unique (season_id, sort_order)
);

create table competition_entrants (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references competition_seasons(id) on delete cascade,
  team_id uuid references teams(id),             -- optional provenance/branding
  display_name text not null,
  seed int,
  ladder_rank int,                               -- positional ladder only
  status text not null default 'registered',     -- registered/approved/checked_in/active/dq/withdrawn
  locked_at timestamptz,
  entry_payment_status text,                     -- schema-only
  created_at timestamptz not null default now()
);

create table competition_entrant_members (
  entrant_id uuid not null references competition_entrants(id) on delete cascade,
  steamid64 bigint not null references players(steamid64),
  role text not null default 'member',           -- captain/member/sub
  is_captain boolean not null default false,
  primary key (entrant_id, steamid64)
);
-- integrity: one player per entrant per season (league/bracket). Enforced via
-- a partial unique index keyed on season; relaxed for ladder via app-level gate.

create table competition_fixtures (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references competition_stages(id) on delete cascade,
  round int,
  bracket_slot text,                             -- bracket position label
  home_entrant_id uuid references competition_entrants(id),
  away_entrant_id uuid references competition_entrants(id),
  best_of int,
  scheduled_at timestamptz,
  match_id uuid references matches(id),          -- null until the match exists
  next_fixture_id uuid references competition_fixtures(id), -- bracket advancement
  status text not null default 'pending'
);

create table competition_standings (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references competition_stages(id) on delete cascade,
  entrant_id uuid references competition_entrants(id),
  steamid64 bigint references players(steamid64), -- queue seasons rank players
  rank int,
  points numeric default 0,                       -- league points / steal points
  wins int default 0, losses int default 0, draws int default 0,
  rounds_for int default 0, rounds_against int default 0,
  tiebreak jsonb default '{}'::jsonb,
  final_placement int,                            -- bracket placement
  updated_at timestamptz not null default now()
);

create table competition_prizes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references competition_seasons(id) on delete cascade,
  placement_low int not null,
  placement_high int not null,
  prize_type text not null
    check (prize_type in ('cash','in_game_item','platform_points','physical','custom')),
  amount numeric, currency text, description text,
  recipient_entrant_id uuid references competition_entrants(id),
  payout_status text not null default 'pending',
  paid_at timestamptz
);

create table competition_organizers (
  competition_id uuid not null references competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','admin','moderator')),
  primary key (competition_id, user_id)
);

create table competition_audit_log (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null, target text,
  before jsonb, after jsonb, reason text,
  at timestamptz not null default now()
);

create table match_disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  raised_by_entrant uuid references competition_entrants(id),
  type text not null, description text,
  evidence_urls jsonb default '[]'::jsonb,
  demo_object_path text,
  status text not null default 'open',            -- open/reviewing/resolved/rejected
  resolution text, resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table news_article_competitions (
  article_id uuid not null references news_articles(id) on delete cascade,
  season_id uuid not null references competition_seasons(id) on delete cascade,
  relation_type text not null default 'general'
    check (relation_type in ('announcement','preview','recap','result','general')),
  primary key (article_id, season_id)
);

-- matches engine extensions
alter table matches add column season_id uuid references competition_seasons(id);
alter table matches add column stage_id uuid references competition_stages(id);
alter table matches add column match_source text;  -- queue/fixture/bracket/ladder_challenge/scrim
alter table matches add column home_entrant_id uuid references competition_entrants(id);
alter table matches add column away_entrant_id uuid references competition_entrants(id);

-- notifications
alter table steam_notification_prefs add column notify_tournament boolean not null default true;
```

> RLS: public-read for competitions/seasons/stages/standings/prizes/entrants (the shop window);
> writes gated to `tournament.admin` / `competition_organizers`. `competition_audit_log`,
> `match_disputes` writes service-role / organizer only. Realtime on `competition_standings`,
> `competition_fixtures`, and the ladder challenge table.

---

## 12. Code layout (follows the existing entity convention)

```
entities/tournament/
  lib/
    formats/           -- driver framework
      types.ts         -- FormatDriver interface
      registry.ts      -- slug -> driver
      ladder.ts        -- positional ladder driver (P2)
      queue.ts         -- PUG attribution driver (P3)
      league.ts        -- round-robin driver (P4)
      bracket.ts       -- single/double elim driver (P5)
    queries.ts         -- drizzle reads
    service.ts         -- writes / orchestration
    scheduler.ts       -- capacity-aware fixture scheduling
    standings.ts       -- stored-standings recompute helpers
    schemas.ts         -- zod
  components/          -- hub, season page, bracket viz, league table, ladder, prize, wizard
  hooks/              -- realtime + react-query wrappers
  types.ts

app/(main)/tournaments/                 -- hub + [slug] season page (fills the shell)
app/(main)/admin/tournaments/           -- organizer console (fills the shell)
app/api/tournament/                     -- challenge, accept, report, dispute, organizer ops
```

Reuse: scrim challenge RPC pattern (`accept_challenge` → competition challenge), the `matches`
state machine + redline provisioning, the `/match/veto` UI, the demo parser (devtools), RBAC
capability checks, the Steam/Discord notification bots.
