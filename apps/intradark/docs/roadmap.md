# Intradark roadmap

## Summary

Intradark is an **all-in-one Counter-Strike 2 platform**: competitive PUGs (pickup matchmaking), stats, player profiles, news, forums, media, practice/utility, teams, scrims, and tournaments — one product surface with shared identity and navigation.

**Honest state (reviewed 2026-06-20):** the platform's *breadth* is real and persisting to Postgres, but its *competitive core* — the Faceit-style PUG loop — is **not yet built at the data layer**. This is the inverse of what the old roadmap implied (everything "Partial"). The reality is sharper:

- **The supporting modules are real** — players directory + external-stat enrichment + legitimacy scoring, forums, news CMS, teams, utility lineups, and the **deathmatch leaderboard** (most recent work) all run on real schema, real APIs, and real persistence.
- **The headline PUG loop is mock end-to-end** — queue, match lobby phases, and CS2 match-event ingestion are UI/console-only with **no backing tables**. The Discord bot and Steam/Discord auth are the exceptions: those pieces are genuinely wired.

## Status legend

| Label | Meaning |
|-------|---------|
| **Shipped** | Real schema + API + UI; persists; usable. |
| **Partial** | Real in parts; named gaps remain before it's production-usable. |
| **Mock** | UI shell or stub only; no persistence/backend behind it. |
| **Planned** | Not started. |

## The critical path: Faceit-style PUG loop

This is the MVP spine per [pug-system-spec.md](pug-system-spec.md) (§1–§13). Build order below.

| # | Capability | Status | Evidence / gap |
|---|------------|--------|----------------|
| 0 | **Match & queue data layer** | **In progress** | Migration `0032_match_queue_system.sql` + `server/db/schema.ts` — the tables every step below depends on. **This is roadmap step 1.** |
| 1 | Steam sign-in + session | **Shipped** | `app/api/auth/steam/*`, `lib/get-current-user-profiles.ts` — real OpenID, persists to `user_profiles`/`steam_profiles`. |
| 2 | Discord account linking | **Shipped** | `app/api/auth/discord/*` — real OAuth, dedupe, CSRF, persists `discord_user_id`. |
| 3 | **Play queue UX** | **Mock** | `components/organisms/faceit-play-mock.tsx` is hardcoded dummy party + UI animation. Needs join/leave/status APIs + queue worker on the new `queue_entries` table. League tiers already in UI: Champions / Stellaris / Genesis / Open. |
| 4 | **Accept phase (30s ready)** | **Planned** | Needs `matches` + `match_players.accept_status` + realtime accept prompt + penalty/cooldown on dodge. |
| 5 | **Team allocation (ELO auto-balance)** | **Planned** | MVP = auto-balance by `player_ratings.rating`, no captains. Writes `match_players.team`. |
| 6 | **Match lobby phases** (discord → server) | **Mock** | `entities/match-lobby/*` is React `useState`, resets on refresh, hardcoded rosters. Must read backend-owned `matches.status` state machine. |
| 7 | Discord bot runtime | **Shipped** | `discord-bot/*` actually creates voice channels + moves members. Already has an HTTP control plane (`/match/start`, `/match/end`) to wire to step 6. Gap: roster override is volatile (not persisted). |
| 8 | **Server assignment + RCON force-start** | **Planned** | `game_servers` pool table (new) + assignment + connect string + RCON start when 10 connected (§8–§10). |
| 9 | **CS2 match-event ingestion** | **Mock** | `app/api/cs2/events/route.ts` logs to console with `dev-secret`. Needs to persist to `match_events` (new), correlate by `match_id`, dedupe. Mirror the working deathmatch pipeline. |
| 10 | **Match results + ELO update** | **Planned** | On `match_end`: write `match_results` + `match_player_stats`, apply rating delta to `player_ratings`. |
| 11 | Match history / detail | **Mock** | `app/(main)/matches/page.tsx` is a shell. Becomes real once `match_results` exists; add `/matches/[id]` shareable page. |

**Match lab (sandbox)** — `app/(main)/match/lab/page.tsx` — operator/dev tool, not player-facing; keep as-is.

## Platform modules

### Shipped (real schema + persistence)

| Module | Evidence | Remaining depth |
|--------|----------|-----------------|
| **Deathmatch leaderboard** | `entities/deathmatch/*`, `app/api/cs2/deathmatch/events`, realtime `dm_kill_events` → `dm_player_stats` view; two CS2 server plugins (`cs2-deathmatch-stats/`, `cs2-deathmatch-mode/`) | Seasonal resets, weapon/map breakdowns, in-game `!rank`/`!top` (plugin Phase 2–4) |
| **Players directory + profiles** | `entities/players/*`, `app/api/{steam,faceit,leetify,csstats}/profile`, GC bot for backfill, legitimacy scoring | `GET /api/players` index/search is a stub; comparison + stat trending |
| **Teams workspace** | `entities/teams/*`, `teams` + `player_teams` tables | Team analytics; scrim/tournament scheduling |
| **News (CMS)** | `entities/news/*`, `news_articles`, TipTap editor + draft/publish | Comments, RSS, per-article SEO |
| **Forums** | `entities/forums/*`, threads + nested replies + tags | Moderation UI, lock/pin, search |
| **Utility lineups** | `entities/utility-lineups/*`, full TUS upload pipeline + approval queue + map radar/callouts | Lineup comments/ratings, learning paths |

### Mock shells (sidebar link → title + description, no entity/table/API)

`stats`, `watchlist`, `positions`, `crew`, `theory` (+ `theory/callouts`), `media`, `scrims`, `tournaments`. Each is a full build from schema up. **`stats` and `watchlist` depend on the match pipeline existing first** — sequence them after the PUG loop.

## Cross-cutting hardening (before launch)

- **Generate Supabase types** — `utils/supabase/{client,server}.ts` still type `Database = any`; run `npx supabase gen types`.
- **Test coverage ~5%** (41 files) — deathmatch, all API routes, and server actions are untested.
- **Rotate dev secrets** — `cs2/events` `dev-secret`, bot HTTP secret; add rate limiting on profile-fetch routes.
- **RLS audit** — confirm least-privilege as match/queue tables land (this roadmap indexes the decisions; migrations own them).

## Phased delivery (post-MVP)

| Phase | Focus |
|-------|-------|
| **1** | Close the PUG loop (steps 0–11 above): durable matches, ELO, history. |
| **2** | `stats` + `watchlist` on real match telemetry; player-profile depth. |
| **3** | Teams depth + `scrims` scheduling. |
| **4** | `tournaments` / brackets on stable match infra. |
| **5** | News/forums/media at production depth (moderation, CMS polish). |
| **6** | `theory` / `positions` / `crew` as deep product. |

## Integrations and deployables

| Integration | Role | Evidence |
|-------------|------|----------|
| Supabase | Auth session, Postgres, Realtime | `utils/supabase/*` |
| Steam OpenID | Primary login | `app/api/auth/steam/*` |
| Discord OAuth + bot | Account link + match voice | `app/api/auth/discord/*`, `discord-bot/*` |
| Postgres (Drizzle) | Schema / migrations | `server/db/schema.ts`, `drizzle/*.sql` |
| MatchZy (CS2 server) | Match engine; emits events | target of `app/api/cs2/events` |

Two long-lived processes in dev: **Next.js** (`pnpm dev`, port 3004) and the **Discord bot** (`pnpm discord-bot`, HTTP control plane via shared secret). CS2 server plugins are deployed separately.

## Monorepo placement

No imports from `apps/intradark` into other `apps/*`; shared UI only via `@workspace/ui`. Boundaries: [ARCHITECTURE.md](../../../ARCHITECTURE.md). Architecture decisions: [docs/adr/](adr/).

---

*Last reviewed: 2026-06-20. Supersedes the 2026-05-04 revision, which predated the deathmatch pipeline and overstated PUG-loop readiness.*
