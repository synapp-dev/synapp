# Intradark domain glossary

Product vocabulary for `apps/intradark/`. Use these terms when naming modules, seams, and docs.

## Platform & access

- **Capability** — Atomic RBAC slug (e.g. `nav.utility`, `sandbox.access`). Checked via `hasCapability(effectiveSlugs, slug)`.
- **Role template** — Grouped capabilities (e.g. `member`) expanded at read time into individual slugs.
- **Developer** — Staff superuser role (`developer`); implies every capability.
- **Effective slugs** — Direct `user_roles` ∪ template-expanded slugs for a session (or anonymous catalog slugs when signed out).

## Player profiles

- **Player profile** — Aggregated external stats (Steam, Faceit, Leetify, CSStats) keyed by Steam ID64; owned by `entities/players/`.

## Match / PUG

- **PUG** — Pick-up game matchmaking: queue → accept → lobby → server → result.
- **Match phase** — Lobby sub-phases: draft, Discord voice, map veto, server connect.
- **Match lobby** — Phase UI, mock providers, and fixtures for the lobby spine (owned by `entities/match-lobby/`).
- **Playout** — Sandbox-controlled branch flags (e.g. accept decline, server stall).

## Sandbox

- **Sandbox child** — Registered dev flow (`pug-system`, `onboarding`) at `/admin/sandbox/*`.
- **Scenario / step / preset** — URL-synced sandbox state (`?scenario=&step=&preset=`).
- **Sandbox URL state** — Canonical read/repair via `readSandboxUrlState` (single seam for hook + tests).
- **Automate** — Scripted step advancement via `createAutomateController`.

## Onboarding

- **Eligibility** — Composite gate: profile, email verified, Steam linked, Discord linked.
- **Profile state** — Mock `CurrentUserProfiles` fixtures driving onboarding steps.

## Utility lineups

- **Lineup** — Grenade throw/land coords, movement/technique metadata, video or YouTube.
- **Enemy POV** — Secondary video upload kind under `utility/enemy-pov/...`.
- **Upload job** — Async TUS upload pipeline with server-side finalize.
- **Upload path contract** — Canonical storage key layout (`buildUploadObjectPath` + `uploadObjectPathMatchesSubmit`) tying client paths to server validation.
- **Upload wizard** — Multi-step lineup submission UI; orchestrated by `useUploadWizardState()` (video, radar, stills, enqueue submodules under `upload-wizard/state/`); exposed via `UploadWizardProvider` / `useUploadWizard()`; step UI under `upload-wizard/steps/`.
- **Map pool / radar** — Map-scoped lineup browsing with clustering and radar layout.

## Content

- **News article** — TipTap JSON body, slug, draft/publish lifecycle.
- **Forum thread / reply** — Category-scoped threads with max reply depth and reply tree.
- **Content slug** — Shared URL slug allocation and validation in `entities/content/lib/` (news + forums).
