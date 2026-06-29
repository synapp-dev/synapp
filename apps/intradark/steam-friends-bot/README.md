# steam-friends-bot

A dedicated Steam account that friends Intradark users and DMs them notifications:

- **Match pops (two-way):** when a match forms, DMs every roster player "match found",
  counts down (3 pings), and lets them reply **accept** / **decline** straight from Steam
  (relayed to `POST /api/match/accept-by-bot` → `setAcceptDecision`).
- **News:** DMs opted-in friends when an editor publishes an article.
- **Scrims:** new listings (region match), challenges received, challenges accepted.
- **Admin broadcasts:** one-off announcements from `/admin/notifications`.

Design + decisions: [`../docs/steam-friends-bot/plan.md`](../docs/steam-friends-bot/plan.md).

## How it works

Long-lived worker (run on an always-on host, **not** Vercel) that:

1. Logs into Steam (saved refresh token → `shared_secret` 2FA → interactive Steam Guard).
2. Goes Online, auto-accepts incoming friend requests, and onboards them
   (`steam_friends` roster + `steam_notification_prefs`).
3. Drains the `steam_dm_jobs` queue: on an HTTP **poke** (latency-sensitive match pops +
   admin broadcasts) and a **5s backstop poll** (scrim jobs, recovery).
4. Sends through one global throttled queue (~1 msg/sec + jitter; match pings prioritized)
   — the main ban-risk lever. Fan-outs are recorded in `steam_dm_deliveries` (idempotent).

`direct` jobs = match pops (one per player). `broadcast` jobs = news / scrim / admin
(audience resolved at send time). Scrim jobs are enqueued by Postgres `AFTER INSERT`
triggers because scrim writes are browser→RPC with no server seam.

## Run

```bash
pnpm steam-friends-bot
```

### Required env (`.env.local`)

| Var | Purpose |
|---|---|
| `STEAM_FRIENDS_BOT_USERNAME` / `_PASSWORD` | the bot's Steam account |
| `STEAM_FRIENDS_BOT_SHARED_SECRET` | mobile authenticator secret → unattended restarts (optional) |
| `STEAM_FRIENDS_BOT_HTTP_SECRET` | shared secret: Next pokes the bot **and** the bot calls `/api/match/accept-by-bot` |
| `STEAM_FRIENDS_BOT_HTTP_PORT` | default `3849` |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_ADMIN_KEY` | service-role DB access |
| `NEXT_PUBLIC_APP_URL` | base for deep links + the accept-by-bot call |
| `NEXT_PUBLIC_STEAM_FRIENDS_BOT_PROFILE_URL` | shown on `/settings` as the "add the bot" link |

First run with no `SHARED_SECRET` prompts for a Steam Guard code, then writes
`.steam-session.json` (a refresh token) so subsequent restarts are unattended.

## Files

- `index.ts` — wiring + drain loop + friend/message handlers + accept-by-bot relay
- `steam-client.ts` — login, presence, friend-request auto-accept, send
- `sender.ts` — global throttled send queue (priority lane for match pings)
- `db.ts` — service-role data access (queue, ledger, friends, prefs, accept state)
- `audience.ts` — resolve a broadcast job → (recipients, message)
- `match-countdown.ts` — match-pop alert + countdown + terminal line
- `messages.ts` — message copy + reply parsing
- `http-server.ts` — localhost Bearer control API (`/health`, `/poke`)
