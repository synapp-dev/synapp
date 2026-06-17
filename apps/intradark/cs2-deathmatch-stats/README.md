# IntradarkDmStats — deathmatch stats plugin

A small [CounterStrikeSharp](https://docs.cssharp.dev/) plugin that ships raw
deathmatch events from a CS2 server to Intradark's leaderboard. It runs **alongside**
your gameplay deathmatch mod (CS2-Deathmatch etc.) and only *listens* — it never
changes gameplay (`!guns`, Quake voiceovers, respawns all keep working).

This is the **step 4** piece of the feature designed in
[`docs/cs2-stats-leaderboard.md`](../docs/cs2-stats-leaderboard.md). The web side
(DB, ingest route, leaderboard page) is already built and live.

## How it works

```
game event (death/hurt/connect) → SQLite buffer (durable, survives restarts)
   every FlushIntervalSeconds + on map end:
      POST unsent rows → /api/cs2/deathmatch/events  (Bearer Secret)  → mark sent
```

- **Durable:** events are written to a local SQLite file (`dm-stats.db` next to the
  DLL) the instant they happen, so a crash/restart/map change loses nothing.
- **Idempotent:** each event gets a GUID `eventId`; the API upserts on it, so a
  retried batch (e.g. after a timeout) never double-counts.
- **Bot-safe:** bot/HLTV events are stored with `null` steamids — captured in `raw`
  but ignored by the leaderboard view, so bots never pollute the board.

## Build

Requires the .NET 8 SDK and the CounterStrikeSharp API package.

```bash
cd apps/intradark/cs2-deathmatch-stats
dotnet build -c Release
```

Output lands in `bin/Release/net8.0/`. Bump the `CounterStrikeSharp.API` version in
[`IntradarkDmStats.csproj`](./IntradarkDmStats.csproj) to match the CSS build on your
server if the API surface differs.

## Install

1. Copy the build output into the server's plugin folder:
   `game/csgo/addons/counterstrikesharp/plugins/IntradarkDmStats/`
   (the `.dll` plus the copied dependencies like `Microsoft.Data.Sqlite`).
2. Start the server once. CSS generates the config at
   `addons/counterstrikesharp/configs/plugins/IntradarkDmStats/IntradarkDmStats.json`.
3. Edit that JSON (see below), then reload: `css_plugins reload IntradarkDmStats`.

## Config

| Key | Default | Notes |
|---|---|---|
| `ApiBaseUrl` | `http://127.0.0.1:3004` | Intradark base URL (prod: `https://intradark.com`). |
| `IngestPath` | `/api/cs2/deathmatch/events` | Leave as-is. |
| `Secret` | `dev-secret` | **Must equal `CS2_DM_EVENTS_SECRET`** on the web app. |
| `ServerId` | `dm-unnamed` | Stable id for this server, e.g. `dm-syd-01`. Prefixes every event id. |
| `FlushIntervalSeconds` | `900` | How often to POST buffered events (15 min). |
| `MaxBatch` | `500` | Max events per POST. |
| `CaptureHurtEvents` | `false` | Also log `player_hurt` (very high volume — off by default). |

## Networking

The server must be able to reach `ApiBaseUrl`. For local dev against a laptop, use a
tunnel (cloudflared / ngrok) or point at the deployed URL. Same requirement MatchZy
has.

## Notes / TODO

- Captured events: `player_death` (core), `player_connect_full`, `player_disconnect`,
  and optionally `player_hurt`. Deathmatch is roundless, so no round/bomb events.
- The plugin has **not** been compiled/tested in CI — it's a starting point meant to
  be built and run on the CS2 server. Verify event field names against your installed
  CSS version (`EventPlayerDeath.Distance`/`Noscope`/`Penetrated` etc. are
  version-sensitive).
