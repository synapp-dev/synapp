# cs2-overlay

Files dropped here are baked into the root of every plugin zip by
`scripts/package-cs2-plugins.mjs`, so they overlay onto the server's
`game/csgo/` directory.

## `gameinfo.gi`

Drop the **server's current** `game/csgo/gameinfo.gi` here (pull it via SFTP).
The packager applies the Metamod loader patch automatically — it inserts

```
		Game	csgo/addons/metamod
```

as the first entry in the `SearchPaths` block (idempotent; safe to re-run). The
patched copy ships in both zips so Metamod loads on a fresh install with no
manual step.

**Why the server's own file, not a generic one:** `gameinfo.gi` is specific to
the installed CS2 build. Shipping a stale copy would overwrite a newer one and
could break the server. **After a major CS2 update, re-pull the current file
here and repackage.** If Metamod stops loading post-update, this is the first
thing to refresh.

Skip baking for a build with `--no-gameinfo`.
