# Intradark roadmap

## Summary

Intradark is an **all-in-one Counter-Strike 2 platform**: competitive play, stats, news, media, practice, **PUGs (pickup matchmaking)**, scrims, tournaments, knowledge, and tooling—in one product surface with shared identity and navigation. **PUGs are one module** among several, not the sole definition of the product. The repo today is richest around **Steam + Supabase auth**, **Discord linking and voice automation**, **match lobby UX (mostly mock state)**, and the **PUG product spec** in [pug-system-spec.md](pug-system-spec.md).

## Execution MVP vs platform vision

- **Implementation MVP (ship first):** End-to-end **core PUG loop**—sign up / sign in → **Steam** + **Discord** connected → **queue** → **match lobby** (draft → Discord voice phase → map veto → **game server connect** and live match) → **post-lobby** (match result, scoreboard, and stats surfaced from authoritative match data). Status labels stay **honest to the repo** (`Shipped` / `Partial` / `Planned`); capabilities on this path are also marked **MVP execution: yes** below.
- **Platform vision (same roadmap):** All other sidebar destinations are **planned modules** with stated intent and **relationship to the PUG loop** (e.g. stats and profiles fed by match history, news and media as distribution, teams and scrims as on-ramps to organized play). High-level behavior is described here; **build-feature** triads own implementation detail.

## Phased delivery (post-MVP, loose — edit freely)

Rough ordering by **impact on the PUG ecosystem** vs **implementation cost**; not commitments.

| Phase | Focus | Relationship to PUGs |
|-------|--------|----------------------|
| **1** | Durable **match results**, **ELO / skill**, history that closes the loop | Feeds trust, queue quality, and post-game UX |
| **2** | **Player profiles** and **watchlist** depth (stats pipelines, external data where allowed) | Identity and reputation around matches |
| **3** | **Teams** workspace, **scrims** scheduling (lighter weight first) | On-ramp from PUGs to stable squads |
| **4** | **Tournaments** and competitive calendar | Brackets and registration after core match infra is stable |
| **5** | **News**, **forums**, **media** at production depth (CMS, moderation, UGC policy) | Reach and community; depends on ops readiness |
| **6** | **Theory**, **utility**, **positions**, **crew** as deep product | Long-tail retention and education |

## In scope

- Full-platform modules listed under **Platform modules** (routes and shells exist for many; behavior matures over phases above).
- **Core PUG loop** per [pug-system-spec.md](pug-system-spec.md): web owns matchmaking and readiness; **MatchZy** on the server is the match engine; **SteamID** is canonical in-game identity.
- **Product-owned data** (Postgres / Supabase, Drizzle schema in `drizzle/schema.ts`).
- **Discord bot** as a separate long-lived process coordinating voice and match channels where configured.

## Core PUG loop (MVP execution order)

Capabilities are listed in **rough build order** for the implementation MVP. **MVP execution: yes** marks the agreed spine.

#### Steam sign-in and session

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `app/api/auth/steam/route.ts`, `app/api/auth/steam/callback/route.ts`, `app/api/auth/steam/complete-signin/route.ts`, `app/api/auth/steam/create-account/route.ts`, `app/api/auth/steam/pending-data/route.ts`, `app/api/auth/signout/route.ts`; `app/(main)/dashboard/page.tsx` + `lib/get-current-user-profiles.ts`.
- **How it should work:** Primary login; Supabase session backs gated routes and `/api/me`.
- **Drill-down:** *Run **build-feature** with slug `steam-supabase-auth`.*

#### Discord account linking

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `app/api/auth/discord/route.ts`, `app/api/auth/discord/callback/route.ts`, `components/molecules/discord-link-dialog.tsx`, `env.example` (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`); dashboard when `discord_user_id` is missing.
- **How it should work:** One-time link for eligibility and bot-driven voice flows per product spec.
- **Drill-down:** *Run **build-feature** with slug `discord-account-linking`.*

#### Profile and “me” API

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `app/api/me/route.ts`; `app/steam-username-email/page.tsx`.
- **How it should work:** Consistent display and linkage fields for shell UI and gating.
- **Drill-down:** *Run **build-feature** with slug `user-profile-api`.*

#### Play hub (queue UX)

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `app/(main)/play/page.tsx` → `components/organisms/faceit-play-mock.tsx`.
- **How it should work:** Join queue, see pool / accept state, transition into a pending match per `pug-system-spec.md`.
- **Drill-down:** *Run **build-feature** with slug `play-queue-ux`.*

#### Match lobby (draft → Discord → veto → server)

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `app/(main)/match/[id]/layout.tsx`, `page.tsx` (redirect to draft), `draft/page.tsx`, `veto/` + `match-veto-mock-context`, `discord/` + `match-lobby-mock-context`, `server/` + mock connect string in `server-phase-panel.tsx`.
- **How it should work:** Phase UI driven by **backend-owned match state**; Discord phase coordinated with bot; server phase shows real connect string and join readiness when wired.
- **Drill-down:** *Parent triad:* `match-lobby-phases` — *optional child triads* per monorepo **build-feature** skill (`docs/features/match-lobby-phases/discord-phase/` for Discord-only substeps).*

#### Discord bot runtime + Next.js bot HTTP API

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `discord-bot/index.ts`, `http-server.ts`, `match-session.ts`; `package.json` script `discord-bot`; `app/api/discord/bot/health/route.ts`, `match/start/route.ts`, `match/end/route.ts`; `env.example` (`DISCORD_BOT_*`, `DISCORD_BOT_HTTP_SECRET`).
- **How it should work:** Bot process handles voice/channel lifecycle; Next.js calls localhost HTTP with shared secret for match transitions.
- **Drill-down:** *Run **build-feature** with slug `discord-bot-runtime` (parent `plan.md` should link HTTP API behavior; split `discord-bot-http-api` child triad only if ownership diverges).*

#### CS2 event ingestion and post-match stats

- **Status:** Partial
- **MVP execution:** yes (ingestion and persistence path; “stats depth” grows in Phase 1–2)
- **Evidence:** `app/api/cs2/events/route.ts` (Bearer `dev-secret`, logs only today); `app/(main)/server/page.tsx` (dev POST UI); `app/(main)/matches/page.tsx` (history shell).
- **How it should work:** Secured, durable ingestion from server/forwarder; match documents feed **post-lobby scoreboard** and roll up into history and stats modules.
- **Drill-down:** *Run **build-feature** with slugs `cs2-events-ingestion` and `post-match-results` (or merge post-match into `matches-history` if one triad is preferred).*

#### Match lab (sandbox)

- **Status:** Partial
- **MVP execution:** (omit — operator/dev acceleration, not player-facing MVP)
- **Evidence:** `app/(main)/match/lab/page.tsx`, `components/organisms/match-sandbox-panel.tsx`.
- **How it should work:** Exercise bot and match transitions without a full queue.
- **Drill-down:** *Run **build-feature** with slug `match-lab-sandbox`.*

## Platform modules (planning / post-MVP)

Each item **relates to the core loop** as noted. **Status** reflects current repo wiring.

#### Application shell (navigation, header, layout)

- **Status:** Partial
- **MVP execution:** yes
- **Evidence:** `components/organisms/app-sidebar.tsx`, `app/(main)/layout.tsx`, `components/organisms/app-header.tsx`, `components/organisms/app-right-sidebar.tsx`.
- **How it should work:** Information architecture spans all modules; auth-aware nav and future role-gates.
- **Relationship:** Entry to every module; must not block PUG MVP paths.
- **Drill-down:** *Run **build-feature** with slug `app-shell-navigation`.*

#### Teams workspace

- **Status:** Partial
- **Evidence:** `app/(main)/teams/page.tsx` (hardcoded `TEAMS` per `team-switcher`); `teams/[slug]/home`, `upcoming`.
- **How it should work:** Org identity, roster, schedule—**Phase 3** target.
- **Relationship:** Converts PUG players into stable squads and scrim partners.
- **Drill-down:** *Run **build-feature** with slug `teams-workspace`.*

#### Players directory and profiles

- **Status:** Partial
- **Evidence:** `app/(main)/players/page.tsx`, `players/[id]/page.tsx`, `app/api/players/route.ts`, `components/organisms/player-profile/`.
- **How it should work:** Directory search + rich profiles—**Phase 2** with match-backed stats.
- **Relationship:** Public face of skill and history from PUG and later modes.
- **Drill-down:** *Run **build-feature** with slug `players-directory-profiles`.*

#### Scrims and tournaments

- **Status:** Partial
- **Evidence:** `app/(main)/scrims/page.tsx`, `app/(main)/tournaments/page.tsx`.
- **How it should work:** Scheduling and brackets—**Phase 3–4**.
- **Relationship:** Uses same identity and eventually shared match infra where sensible.
- **Drill-down:** *Run **build-feature** with slug `scrims-tournaments`.*

#### Community: news, forums, media

- **Status:** Partial
- **Evidence:** `app/(main)/news/page.tsx`, `forums/page.tsx`, `media/page.tsx`.
- **How it should work:** Editorial and UGC—**Phase 5–6** with clear moderation and CMS choices.
- **Relationship:** Distribution and discussion around competitive storylines (including PUG highlights).
- **Drill-down:** *Run **build-feature** with slug `community-content-surfaces`.*

#### Knowledge: theory and utility

- **Status:** Partial
- **Evidence:** `app/(main)/theory/page.tsx`, `utility/page.tsx`.
- **How it should work:** Guides and tools—deepen in **Phase 6**.
- **Relationship:** Improves player quality feeding back into queue experience.
- **Drill-down:** *Run **build-feature** with slug `knowledge-utility-pages`.*

#### Insight: stats, watchlist, positions, crew

- **Status:** Partial
- **Evidence:** `app/(main)/stats/page.tsx`, `watchlist/page.tsx`, `positions/page.tsx`, `crew/page.tsx`.
- **How it should work:** Aggregates and personal lists—**Phase 1–2** for stats/watchlist tied to matches; positions/crew deepen with data volume.
- **Relationship:** Retention and analysis layer on top of match telemetry.
- **Drill-down:** *Run **build-feature** with slugs `stats-watchlist` and `positions-crew-insight` (or one parent `insight-surfaces` with sub-triads).*

## Integrations and dependencies

| Integration | Role | Evidence |
|-------------|------|----------|
| **Supabase** | Auth session, `user_profiles`, generated types | `utils/supabase/*`, `app/api/me/route.ts`, `env.example` |
| **Steam OpenID** | Primary login | `app/api/auth/steam/*` |
| **Discord OAuth** | Account link | `app/api/auth/discord/*` |
| **Discord.js bot** | Voice / match channels | `discord-bot/*`, `DISCORD_BOT_*` in `env.example` |
| **Postgres (Drizzle)** | Schema / migrations | `drizzle/schema.ts`, `DATABASE_URL` in `env.example` |
| **Next.js** | App Router host | `package.json`, `app/` |

Document **integration names and file paths** only; never copy live secrets into this file (see **Security & documentation hygiene**).

## Runtime and deployables

| Deployable | Role | Notes |
|------------|------|--------|
| **Next.js (intradark)** | Web UI, API routes, auth callbacks | Default `pnpm dev` on port **3004** (`package.json`) |
| **Discord bot** | Long-lived gateway + voice automation | `pnpm discord-bot`; HTTP control plane documented in `env.example` (`DISCORD_BOT_HTTP_SECRET`, optional port) |

These are **two processes** in local dev; production layout (same host vs split) is an ops decision but the **contract** (HTTP + shared secret) should stay explicit in feature specs.

## Monorepo and code placement

- Boundaries and migration ownership: [ARCHITECTURE.md](../../../ARCHITECTURE.md) (especially §3 imports, §7 layout, §8 data ownership).
- **No imports** from `apps/intradark` into other `apps/*`. Shared UI only via **`@workspace/ui`**; do not introduce `@workspace/ui` → Supabase dependencies.
- **Layout target (§7):** product shell in `components/`; domain-heavy compositions may move toward `entities/` over time—**build-feature** plans should name where new UI lives.
- **Promotion to `packages/*`:** only when a **second real consumer** exists (§5.1), unless architecture is explicitly updated.
- **CI / merge discipline:** root command `pnpm lint:architecture` enforces boundary rules without the IDE’s warn-only downgrade (`ARCHITECTURE.md` §4.2).

## Security and documentation hygiene

- Treat **Steam identifiers**, Discord IDs, and emails as **sensitive**; enforce **RLS** and least-privilege in migrations (feature specs, not this roadmap, own table-by-table decisions).
- **Do not** paste API keys, bot tokens, or database passwords into `roadmap.md` or feature markdown—reference **`env.example`** keys only.
- Bot and CS2 ingest routes must move beyond **dev-only** secrets (`dev-secret`) before production (track in `cs2-events-ingestion` / bot specs).

## Constraints

- Product vision detail for PUG flows: [pug-system-spec.md](pug-system-spec.md) — this roadmap **indexes** that spec; it does not replace phase-by-phase requirements.
- Discord bot assumes **guild-scoped** configuration (`DISCORD_GUILD_ID`, voice channel IDs) as in `env.example`.

## Architecture decisions (ADR)

Durable **intradark-only** architecture choices (not ephemeral deferrals) are recorded under [docs/adr/](adr/). Naming, status, and section shape: [adr/README.md](adr/README.md). **Monorepo-wide** import, package, and migration rules remain in [ARCHITECTURE.md](../../../ARCHITECTURE.md).

## Feature index

| Capability | Status | MVP execution | Spec |
|------------|--------|----------------|------|
| Steam sign-in and session | Partial | yes | *Suggested slug:* `steam-supabase-auth` — run build-feature |
| Discord linking | Partial | yes | *Suggested slug:* `discord-account-linking` — run build-feature |
| Profile / me API | Partial | yes | *Suggested slug:* `user-profile-api` — run build-feature |
| Play queue UX | Partial | yes | *Suggested slug:* `play-queue-ux` — run build-feature |
| Match lobby phases | Partial | yes | *Suggested slug:* `match-lobby-phases` (+ optional `.../discord-phase/` child triad) |
| Discord bot + HTTP | Partial | yes | *Suggested slug:* `discord-bot-runtime` |
| CS2 events ingestion | Partial | yes | *Suggested slug:* `cs2-events-ingestion` |
| Post-match / match history | Partial | yes | *Suggested slug:* `post-match-results` and/or `matches-history` |
| Match lab | Partial | | *Suggested slug:* `match-lab-sandbox` |
| App shell and navigation | Partial | yes | *Suggested slug:* `app-shell-navigation` |
| Teams workspace | Partial | | *Suggested slug:* `teams-workspace` |
| Players directory and profiles | Partial | | *Suggested slug:* `players-directory-profiles` |
| Scrims and tournaments | Partial | | *Suggested slug:* `scrims-tournaments` |
| Community surfaces | Partial | | *Suggested slug:* `community-content-surfaces` |
| Knowledge pages | Partial | | *Suggested slug:* `knowledge-utility-pages` |
| Insight (stats, watchlist, positions, crew) | Partial | | *Suggested slug:* `stats-watchlist`, `positions-crew-insight` |
| PUG system (vision and flows) | Partial (spec) | | [pug-system-spec.md](pug-system-spec.md) |
| Product ADRs | Partial (scaffold) | | [adr/README.md](adr/README.md) — add `NNNN-title.md` files as decisions land |

## Open questions

- (None tracked—add as product decisions surface.)

---

*Last reviewed: 2026-05-04.*
