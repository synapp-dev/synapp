# IntradarkDeathmatch — our own deathmatch game mode

A from-scratch CS2 deathmatch game mode (CounterStrikeSharp, C#), inspired by
[CS2-Deathmatch](https://github.com/NockyCZ/CS2-Deathmatch) but written so we own
it and can bake in Intradark website integration. Runs **alongside** the
`IntradarkDmStats` stats plugin — play DM here, and your frags flow to the
[leaderboard](../docs/cs2-stats-leaderboard.md) automatically.

## Roadmap

- **Phase 1 (done):** core loop — auto-respawn, default loadout on spawn, DM-friendly
  cvars (no round-win, FFA, no buy/freeze), Intradark-branded chat + welcome message.
- **Phase 2:** `!guns` weapon-selection menu + per-player persistence.
- **Phase 3:** spawn protection, multi-kill/streak announcer (built-in sounds),
  refill ammo/health on kill.
- **Phase 4 (the Intradark magic):** website integration via `IntradarkApi` —
  `!rank` / `!top`, "Welcome back, you're #N on intradark.com" on spawn, reading the
  stats DB we already built.

## Build & deploy

```bash
cd apps/intradark/cs2-deathmatch-mode
dotnet build -c Release
# copy bin/Release/net8.0/* → game/csgo/addons/counterstrikesharp/plugins/IntradarkDeathmatch/
```

## Config

`configs/plugins/IntradarkDeathmatch/IntradarkDeathmatch.json`:

| Key | Default | Notes |
|---|---|---|
| `ChatPrefix` | `{purple}[INTRADARK]{default}` | `{tag}` color placeholders supported. |
| `RespawnDelaySeconds` | `2.0` | Death → respawn delay. |
| `FreeForAll` | `true` | `true` = everyone's an enemy; `false` = team DM. |
| `DefaultPrimary` | `weapon_ak47` | Primary given on spawn. |
| `DefaultSecondary` | `weapon_deagle` | Secondary given on spawn. |
| `GiveArmor` | `true` | Armor + helmet on spawn. |
| `WelcomeMessage` | `true` | Branded welcome on connect. |
| `ApiBaseUrl` | `https://intradark.com` | Reserved for Phase 4 (`IntradarkApi`). Unused now. |

## Testing note

MatchZy manages game state (warmup/live/rounds) and will fight a DM mode. For DM
testing, stop it first: `css_plugins stop MatchZy` (re-enable later with
`css_plugins start MatchZy`). The plugin applies its DM cvars + `mp_restartgame` on
load and on every map start.
