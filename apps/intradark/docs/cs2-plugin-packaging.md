# CS2 plugin packaging (Redline `ZIP_URL`)

Builds the two overlay zips Redline downloads and unzips onto a CS2 server's file
tree, delivered via the cs2 egg's `ZIP_URL` variable.

| Zip | Contents | Use |
|---|---|---|
| `deathmatch-<ver>.zip` | Metamod + CounterStrikeSharp 1.0.367 + `IntradarkDeathmatch` + `IntradarkDmStats` | DM mode + frags → leaderboard |
| `pug-<ver>.zip` | Metamod + MatchZy 0.8.15 (with-cssharp bundle) | Competitive PUG match server |

## Build & upload

```bash
# from apps/intradark — builds both, no upload
node scripts/package-cs2-plugins.mjs

# build + upload to the Supabase `cs2-plugins` public bucket, print URLs
pnpm exec dotenv -e .env.local -- node scripts/package-cs2-plugins.mjs --upload
# (or: pnpm package:cs2-plugins -- --upload)
```

Flags: `--only deathmatch|pug`, `--root game/csgo` (overlay prefix), `--version <tag>`,
`--with-gameinfo`, `--upload`.

Requirements: **.NET 8 SDK** (`dotnet`) and a `tar` that handles zip — on Windows
the script calls bsdtar at `System32\tar.exe` directly (Git-Bash GNU tar can't do
zip and mis-parses `C:` paths).

### Pinned versions
- **CounterStrikeSharp 1.0.367** — must match `CounterStrikeSharp.API` in both `.csproj`.
- **MatchZy 0.8.15** (with-cssharp-linux bundle — its own compatible CSS).
- **Metamod:Source 2.0** — resolved at runtime from the `mmsource-latest-linux`
  pointer (AlliedMods prunes old dev builds, so a hard-pinned URL would 404).

### Why `dotnet publish`, not `build`
`build` only emits the build host's native libs, so DmStats would ship the Windows
`e_sqlite3.dll` and crash on the Linux server. `publish` lays down the full
`runtimes/` tree including `linux-x64/native/libe_sqlite3.so`.

## Hosting
Supabase Storage public bucket **`cs2-plugins`** (project `ujunmzeennmbbolmskdd`).
Public URL pattern:
`https://ujunmzeennmbbolmskdd.supabase.co/storage/v1/object/public/cs2-plugins/<file>.zip`

- **Version the filename every rebuild** — Redline caches the zip per node, so reusing
  a URL can serve a stale copy. The script stamps `-<YYYYMMDD-HHmm>` by default.
- **No secrets in the zip** — it's a public bucket. Inject `CS2_DM_EVENTS_SECRET` /
  MatchZy DB creds via env vars or an RCON config write, never baked into the overlay.
- Upload uses the new-style `sb_secret_` key in both `apikey` and `Authorization`.

## Overlay root (resolved)
Redline overlays the zip **into the server's `game/csgo` directory**, so the zip
must carry `addons/` (+ `cfg/`) at its **root** — no `game/csgo/` prefix (that
double-nests to `game/csgo/game/csgo/addons`). The packager defaults to this
(empty `--root`). Override `--root game/csgo` only for a host that overlays at the
server root instead.

## gameinfo.gi (baked in)
Metamod on CS2 only loads when `csgo/gameinfo.gi` has `Game csgo/addons/metamod`
in its `SearchPaths`. An overlay can't edit an existing file, so the packager
**bakes a patched `gameinfo.gi` at the zip root** — it lands at
`game/csgo/gameinfo.gi` and replaces the server's on install.

Source priority (so we never ship a stale copy):
1. `CS2_LOCAL_SERVER_DIR`'s `game/csgo/gameinfo.gi` — the live file from a
   known-good local server (set in `.env.local`).
2. the committed `scripts/cs2-overlay/gameinfo.gi` fallback.

The bake is idempotent (skips if the metamod line is already there) and only
`game/csgo/gameinfo.gi` needs it — `core` / `csgo_core` / etc. don't.

**After a major CS2 game update**, re-pull the current `gameinfo.gi` (update the
local server, or copy its file into `scripts/cs2-overlay/`) and repackage — a
stale baked copy could otherwise overwrite a newer one and break the server.
Build with `--no-gameinfo` to skip baking (e.g. if the egg patches it itself).
