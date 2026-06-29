# Steam Friends Notification Bot — build decisions

A dedicated Steam account (`intradarkbot`) that friends Intradark users and DMs them
match-pop alerts (with two-way accept), published news, scrim activity, and admin
broadcasts. Decisions below were locked in a grilling session (2026-06-28).

It mirrors the existing bot pattern: a standalone long-lived `tsx` worker that logs
into Steam, exposes a localhost Bearer-guarded HTTP control API, and drains a Supabase
job queue. See `discord-bot/` and `cs2-gc-bot/` for the template.

---

## 1. Core architecture

- **Separate Steam account** (`intradarkbot`), **not** the `cs2-gc-bot` account.
  Different failure domains (GC bot churns its GC connection), ban-risk isolation
  (friend/chat automation is the riskiest surface), a recognizable identity users add
  deliberately, and `steam-user` is single-session per account.
- **New worker dir** `steam-friends-bot/` reusing the `cs2-gc-bot` login code verbatim
  (refresh-token persistence → `shared_secret` auto-2FA → interactive Steam Guard
  fallback). Run via `pnpm steam-friends-bot` on the same always-on host as the other
  bots (long-lived; cannot live on Vercel).
- **Env** (in `.env.local`, gitignored):
  - `STEAM_FRIENDS_BOT_USERNAME`, `STEAM_FRIENDS_BOT_PASSWORD`, `STEAM_FRIENDS_BOT_SHARED_SECRET`
  - `STEAM_FRIENDS_BOT_HTTP_SECRET`, `STEAM_FRIENDS_BOT_HTTP_PORT` (default `3849`),
    `STEAM_FRIENDS_BOT_HTTP_URL` (default `http://127.0.0.1:3849`)
- **Transport:** Next enqueues a `steam_dm_jobs` row → best-effort HTTP **poke** for
  latency-sensitive jobs (match pop) → bot drains. Bot **also polls every ~5s** as the
  offline/recovery backstop (covers DB-trigger-sourced scrim jobs that have no poke).

## 2. Delivery queue

`steam_dm_jobs` — one unified queue, two kinds:

- `kind = 'direct'` — explicit `steamid64`, one row per recipient. Used for **match pops**.
- `kind = 'broadcast'` — one row carrying an audience filter + payload. The bot
  **expands the audience at send time** (current prefs/friendships), throttles, and
  records each send in **`steam_dm_deliveries`** (job_id, steamid64, sent_at). Used for
  **news, scrim, admin broadcast**.

Columns (sketch): `id, kind, category, steamid64 (nullable), payload jsonb, dedup_key
(unique), status (queued|running|done|error), attempts, error, created_at, started_at,
finished_at`.

- **Idempotency:** `dedup_key` is unique per logical event (`match:{id}:accept:{steamid64}`,
  `news:{article_id}`, `scrim_listing:{id}`, `scrim_challenge:{id}`, `scrim_accepted:{id}`,
  `broadcast:{uuid}`). Enqueues are `onConflictDoNothing`. The deliveries ledger prevents
  re-DMing a user when a broadcast job is retried.

## 3. Notification preferences

`steam_notification_prefs` keyed by `user_id` (→ `auth.users`):
`notify_match`, `notify_news`, `notify_scrim`, `notify_broadcast` — all `bool default true`.

- The **master switch is implicit**: being friends with the bot. Category toggles layer
  on top. Category-level granularity only (no per-event toggles) for v1.
- Row created (all-true) when a linked friend is detected, or lazily on first settings read.
- RLS: a user reads/updates only their own row. The bot resolves `user_id → steamid64`
  via `user_profiles`/`steam_profiles` at send time.
- `notify_broadcast` **is** user-disableable (better retention than forcing blasts).

## 4. Friendship & onboarding

`steam_friends` roster: `steamid64 (pk), user_id (nullable), friend_status, added_at,
last_dm_at`. Independent of the live Steam friends-list so we can re-link later.

- Bot **auto-accepts all** incoming friend requests (on a short randomized delay).
- On accept, look up `steamid64`:
  - **Linked** (resolves to a `user_profiles` row) → set `user_id`, ensure a prefs row,
    send welcome DM.
  - **Not linked** (known player or total stranger) → accept anyway, send one
    "link your account at `…/settings`" DM, then silent until they link.
- When a user later links Steam on-site, back-fill `steam_friends.user_id` and welcome.

## 5. Match pop (flagship, two-way)

Accept window is **30s** (`ACCEPT_WINDOW_SECONDS`), and `/api/cron/resolve` is 60s — so
DMs **must** enqueue at formation time, not via cron.

- **Enqueue:** in `tryFormMatch` (match → `pending_accept`), insert a `direct` job per
  eligible roster player (linked + bot-friend + `notify_match`), dedup
  `match:{id}:accept:{steamid64}`, then **poke** the bot.
- **No presence gate** for v1 — DM every eligible roster player at the pop. (Presence
  suppression is a clean later refinement once the Realtime P1 layer lands.)
- **Countdown:** Steam friend DMs cannot be edited, so the countdown is a few repeated
  pings, not an updating message. Cadence: **pop → ~15s left → ~5s left** (3 pings),
  driven locally from the `acceptDeadline` in the payload. **Stops immediately** when the
  player is no longer `pending` or the match leaves `pending_accept`; sends one final line
  (`✅ You're in` / `❌ Cancelled` / `⌛ Expired`).
- **Reads vs writes (asymmetric):** before each countdown tick the bot **reads
  `match_players.accept_status` directly from Supabase** (service role) to drive/stop.
  **Writes go through Next:** `POST /api/match/accept-by-bot` (Bearer
  `STEAM_FRIENDS_BOT_HTTP_SECRET`, body `{steamid64, decision}`) finds the player's active
  `pending_accept` match and calls the existing `setAcceptDecision` (no logic duplicated).
- **Two-way replies:** `accept`/`a`/`yes`/`y` → accept; `decline`/`no`/`n` → decline
  (a real dodge → cooldown, which is correct). Bot replies with the outcome; graceful
  "no pending match / too late" when the window has closed.

## 6. News

- **Trigger:** only from `publishNewsArticleAction` (human editor publishes). Auto-ingested
  external CS2 news inserts directly and bypasses this action, so it **never** DMs — by
  design (no spam). Enqueue a `broadcast` job dedup `news:{article_id}`.
- **Audience:** all bot-friends with `notify_news`. Link → `/news/{slug}`.

## 7. Scrim activity

Scrim writes are **pure Supabase RPCs from the browser** (`insert_scrim_and_maps`,
`insert_challenge_and_maps`, `accept_challenge`) — no server seam. So enqueue from the DB:

- **`AFTER INSERT` Postgres triggers** on `scrim_listings`, `scrim_challenges`, `scrims`
  write `broadcast` jobs. Drained by the bot's **5s poll** (no poke; not latency-sensitive).
- Audiences (all `notify_scrim`, resolve-at-send):
  | Event | Trigger | Audience | Dedup |
  |---|---|---|---|
  | New listing | `scrim_listings` | members of **other** teams matching the listing tier/region | `scrim_listing:{id}` |
  | Challenge received | `scrim_challenges` | the **listing owner team's** members | `scrim_challenge:{id}` |
  | Challenge accepted | `scrims` | the **challenging team's** members | `scrim_accepted:{id}` |
- **Caveat:** new-listing is the spammiest send; per-event for v1, digest/coalesce later
  if noisy.

## 8. Admin broadcasts

- **Who:** gated behind `developer`/admin RBAC (no new role for v1).
- **Where:** a small admin page — message text + optional link + audience selector.
- **Audience:** all opted-in friends (`notify_broadcast`) for v1; tier/cohort later.
- **Safeguards:** confirm dialog with **live recipient count**, a **"send test to myself"**
  button, single `broadcast` job + deliveries ledger so a double-click can't double-send.

## 9. Cross-cutting

- **Throttling (top ban-risk lever):** a single global send queue in the bot, **~1 msg/sec
  with jitter**, strictly sequential, never bursts. Broadcasts drain slowly in the
  background (fine — not urgent). Friend-accepts on a short randomized delay.
- **Message format:** plaintext + full URLs (Steam unfurls). Deep links from
  `NEXT_PUBLIC_APP_URL`.
- **Security:** bot↔Next over localhost Bearer; bot↔DB via service role (reads + ledger);
  `accept-by-bot` trusts the bot-vouched `steamid64` (Steam sender identity is authoritative
  and on-site linking already proved ownership via Steam OpenID).
- **Settings UI:** four toggles on the user settings page + an "Add the notification bot on
  Steam" card (bot profile link + friend/connection status).

## 10. Build order (proposed)

1. Migration: `steam_dm_jobs`, `steam_dm_deliveries`, `steam_notification_prefs`,
   `steam_friends` (+ RLS) and the three scrim `AFTER INSERT` triggers.
2. Worker `steam-friends-bot/` (login reuse, HTTP control server, drain loop, friend
   auto-accept + onboarding, send throttle, countdown engine, reply parser).
3. Next seams: enqueue in `tryFormMatch`; enqueue in `publishNewsArticleAction`;
   `POST /api/match/accept-by-bot`; poke helper (mirror `entities/players/lib/server/gc.ts`).
4. Settings UI (toggles + add-bot card) and prefs read/write actions.
5. Admin broadcast page + enqueue.
6. `pnpm steam-friends-bot` script, `env.example` entries, README.
