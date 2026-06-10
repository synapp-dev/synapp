# Player Anthem (Spotify + SoundCloud)

> **Product:** `apps/intradark`
> **Slug:** `player-anthem`
> **Status:** Implemented (MVP)
> **Owner:** @jourdain
> **Created:** 2026-06-09

> Supersedes the original `player-spotify-track` plan. The feature was generalized from a Spotify-only embed to a dual-provider "anthem" after it became clear that Spotify's embed exposes no volume or programmatic playback control, while SoundCloud's Widget API does.

## 1. Summary

Members attach a single track — from **Spotify** or **SoundCloud** — to their account; it renders as an embedded player on their public profile (`/players/@username`). Set inline on your own profile: paste a track link, save. Visitors see it read-only; profiles without an anthem (or non-member/steam-only profiles) show nothing.

Provider behavior differs by what each platform's embed allows:
- **Spotify** → standard click-to-play iframe embed in the profile **body** panel. No volume/seek control (Spotify exposes neither), and it can't be driven headlessly (cross-origin), so it stays an inline embed.
- **SoundCloud** → a **minimal custom player in the profile's anthem card** (the grid below the header): a spinning CD-style artwork disc with a static brand-blue play/pause button, and the track title + artist to the right. A single hidden SoundCloud iframe is owned by an app-shell `AnthemPlayerProvider` and controlled via the Widget API (`getCurrentSound` for artwork/title/artist, `toggle`/`setVolume`/`seekTo` for control). When playback starts the volume eases in from 1 → 10 (0-100 scale) over 5s so it doesn't slam in, and, when the shared link carried a `#t=` timestamp, playback starts at that offset. The disc spins only while playing. A **second compact controller in the app header** drives the same player, so playback can be paused/resumed once the card scrolls out of view. Autoplay uses SoundCloud's native `auto_play=true`; if the browser blocks it, the visitor's click on a play button starts it. No login/API key required.

## 2. Scope

### In scope (MVP)

- `anthem_url` column on `user_profiles` storing a normalized canonical track URL (Spotify **or** SoundCloud), guarded by a `CHECK`.
- Inline editor on the owner's profile body panel (paste → validate → save) + remove/clear.
- For visitors: SoundCloud anthems play from the anthem card (with a duplicate compact control in the app header); Spotify anthems show the inline card embed. Provider auto-detected from the stored URL.
- Strict server-side parsing: Spotify **track** links and SoundCloud **track** links only (with an optional `#t=<seconds>` start offset), normalized before persisting.
- SoundCloud: shared hidden player (one per shell) — volume fade-in (1→10 over 5s) + native autoplay + optional `#t=` start offset via the Widget API; controlled from the card and the app header.
- Owner-gated visibility computed server-side; RLS enforces the write.

### Out of scope (deferred)

- Spotify albums/playlists/artists/episodes; SoundCloud sets/playlists and short `on.soundcloud.com` links.
- Apple Music / YouTube Music / other providers.
- A dedicated `/settings` page (inline editor is the surface).
- Editing other profile fields.
- Persisting a per-user volume preference (fixed fade-in 1→10).
- Spotify start timestamps (Spotify's track embed has no seek/start param).

### Non-goals

- **Guaranteed autoplay-with-sound.** Browsers (Chrome/Safari) block autoplay with audio without a user gesture — this is a platform limit for *every* provider, not something we can override. SoundCloud honors the volume fade-in + `#t=` start once playing.
- **Spotify volume/snippet control.** Impossible: Spotify's embed and iFrame API expose no volume API; the Web Playback SDK needs per-viewer Premium + OAuth (rejected as unworkable for a public profile). Documented in §11.
- **Telemetry** — no analytics provider in intradark.
- Re-streaming/proxying audio (DRM + ToS).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | Section |
|----------|--------|---------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `entities/players/` (panel + pure parsers); route under `app/api/me/` | §7.1 |
| Auth dependency | Server-side via `@/utils/supabase/server` + `/admin` | §3.2 |
| New package edges | None | §3.2, §10 |
| External script | SoundCloud Widget API loaded client-side from `w.soundcloud.com/player/api.js` (no key) | n/a |

> No new package edge / shared package / migration-default change → `ARCHITECTURE.md` not modified.

## 4. Data model

```sql
-- public.user_profiles (additive, nullable). 0019 added spotify_track_url;
-- 0020 renamed it to anthem_url and widened the CHECK to both providers.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS anthem_url text;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_anthem_url_format
  CHECK (
    anthem_url IS NULL
    OR anthem_url ~ '^https://open\.spotify\.com/track/[A-Za-z0-9]{22}$'
    OR anthem_url ~ '^https://soundcloud\.com/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+(#t=[0-9]+)?$'
  );
```

- **Provider** is derived from the URL prefix at render time (no separate column).
- **RLS:** unchanged. Existing owner `UPDATE` (`auth.uid() = user_id`) + public read cover the column.
- **Migrations (app-owned, §8.1):**
  - `apps/intradark/drizzle/0019_user_profiles_spotify_track.sql` (+ supabase mirror `20260609000000_…`) — applied.
  - `apps/intradark/drizzle/0020_user_profiles_anthem_url.sql` (+ supabase mirror `20260609010000_…`) — applied via the `user-supabase-intradark` MCP.
  - `apps/intradark/drizzle/0021_anthem_url_start_timestamp.sql` (+ supabase mirror `20260609020000_…`) — widens the SoundCloud CHECK to allow an optional `#t=<seconds>` suffix; applied via MCP.
- **Generated types:** `types/supabase.ts` Row/Insert/Update + `drizzle/schema.ts` updated to `anthem_url` / `anthemUrl`.

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| Set/clear anthem | Route Handler `PATCH` | `app/api/me/anthem/route.ts` | Authenticated; RLS owner-only | Body `{ url: string \| null }`. `parseAnthem` validates+normalizes; `422` on unsupported links; `null`/empty clears. Returns `{ anthemUrl }`. |
| Read anthem | Server resolve | `entities/players/lib/server/resolve-server.ts` | Public | `ResolvedProfile.anthemUrl` → prop into `PlayerProfile`. |

### Validation (pure, unit-tested)

- `entities/players/lib/spotify.ts` — `parseSpotifyTrack`, `trackIdFromCanonical`.
- `entities/players/lib/anthem.ts` — `parseAnthem` (delegates to Spotify, then SoundCloud), `parseSoundcloudTrack`, `soundcloudEmbedParts`, `anthemProvider`.
  - SoundCloud: host ∈ {soundcloud.com, www., m.}; exactly `/{user}/{track}`; rejects `/sets/`, short links, non-https; canonical `https://soundcloud.com/{user}/{track}` with an optional `#t=<seconds>` start offset (parsed from `#t=`/`?t=`, accepting `H:MM:SS`/`M:SS`/`159`/`159s`, re-emitted as a strict integer). The CHECK constraint allows `(#t=[0-9]+)?`.
- Only the regex-guarded canonical URL is ever turned into an iframe `src`.

## 6. UI composition

```
apps/intradark/
├── app/(main)/layout.tsx                # wraps shell in AnthemPlayerProvider
├── app/(main)/players/[id]/page.tsx     # resolve + isOwner, pass props
├── app/api/me/anthem/route.ts           # PATCH set/clear
├── components/organisms/app-header.tsx  # mounts <AnthemPlayerControl variant="compact" />
├── entities/players/
│   ├── components/
│   │   ├── player-profile.tsx           # accepts anthemUrl + isOwner
│   │   ├── panels/anthem-panel.tsx      # owner editor + SpotifyEmbed + AnthemCardPlayer
│   │   ├── anthem-player-provider.tsx   # owns the single hidden iframe + Widget; context
│   │   ├── anthem-player-control.tsx    # presentational card/compact controllers
│   │   └── anthem-card-player.tsx       # registers the anthem + renders the card control
│   └── lib/
│       ├── spotify.ts (+ .test.ts)
│       ├── anthem.ts  (+ .test.ts)
│       └── soundcloud-widget.ts         # shared Widget API loader + types
```

- `AnthemPanel` reuses `@workspace/ui` `Card`/`Button`/`Input`; it renders the inline Spotify embed, the SoundCloud `AnthemCardPlayer`, and the owner's set/replace/remove editor.
- `AnthemPlayerProvider` (in `MainLayout`, wrapping the header + page) owns one hidden `w.soundcloud.com/player` iframe and drives it via `loadSoundcloudApi()`: on `READY` it sets the volume to 1, `seekTo(startMs)` (when a `#t=` offset is present), and `getCurrentSound` to pull artwork/title/artist; on the first `PLAY` it eases volume 1→10 over 5s (interval-based); `PLAY`/`PAUSE`/`FINISH` track state. It exposes `{ hasAnthem, isPlaying, artwork, title, artist, toggle, setAnthem }` via `useAnthemPlayer()`.
- `AnthemCardPlayer` calls `setAnthem(url)` on mount / `setAnthem(null)` on unmount (tearing the player down on navigation) and renders the card controller.
- `AnthemPlayerControl` is presentational: a background-less play/pause control, then a spinning vinyl disc (artwork rotates; a static centre label carries the SoundCloud logo on an orange chip and does **not** spin), then the title + artist. The control is wrapped in a `group`: while playing it shows a faux animated equalizer (`animate-equalize-bar`, 5 staggered bars) by default and swaps to a Pause icon on `group-hover`; when paused it shows a Play icon. (A real frequency visualiser isn't possible — the audio is inside a cross-origin SoundCloud iframe, so there's no `MediaStream`/`AnalyserNode` to feed a lib like `@audiowave/react`.) `card` and `compact` (centred in the app header) variants differ only in size. The disc is paused via `[animation-play-state:paused]` when not playing. Both read the shared context, so toggling in one place updates the other. Returns `null` when no controllable anthem is registered.

## 7. Dependencies

- `@workspace/ui`, `@/utils/supabase/*`, `zod` — existing.
- **External:** SoundCloud Widget API JS (CDN, no key, loaded on demand). No npm dep, no env var, no new package edge.

## 8. Implementation order (commits)

1. `feat(intradark): add user_profiles anthem_url migration + types`
2. `feat(intradark): add spotify + soundcloud anthem parsers (+ tests)`
3. `feat(intradark): add PATCH /api/me/anthem`
4. `feat(intradark): surface anthem_url via resolve-server + isOwner`
5. `feat(intradark): add AnthemPanel (spotify embed + soundcloud widget)`
6. `docs(intradark): player-anthem dual-provider plan/tdd/flows`

## 9. Telemetry

None (non-goal; no analytics provider).

## 10. Rollout

- **Feature flag / env vars:** none.
- **Migration sequencing:** migrate before deploy (additive, then rename — both idempotent/backwards-safe; old code ignored the column).
- **Backout:** stop rendering `AnthemPanel`; nullable column can remain. Reversible.

## 11. Open questions / known limits

- **Autoplay-with-sound is browser-gated** for both providers; SoundCloud reliably applies the volume fade-in + `#t=` start once playback starts (after a gesture if the browser blocks it).
- **SoundCloud catalog** differs from Spotify — many mainstream label tracks aren't on SoundCloud or have API streaming disabled; those links are rejected by `parseSoundcloudTrack` or simply have no audio.
- **iOS** ignores `setVolume` (Apple forces device volume); SoundCloud plays at system volume there.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
