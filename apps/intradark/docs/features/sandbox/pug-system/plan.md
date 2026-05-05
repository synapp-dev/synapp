# Sandbox / PUG system

> **Product:** `apps/intradark`
> **Parent slug:** `sandbox`
> **Sub-slug:** `pug-system`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

End-to-end PUG loop simulator at **`/admin/sandbox/pug-system`**: queue → match found → accept → team allocation reveal → Discord phase → veto phase → server phase → post-match summary. Driven by a scenario dock instead of real backend events. Mirrors the canonical flow in [`apps/intradark/docs/pug-system-spec.md`](../../../pug-system-spec.md) §1–§13 (minus live in-round telemetry).

This is where new PUG-loop UX is iterated. The real `/match/[id]/*` and `/play` routes stay as v0 mocks until backend integration lands; the sandbox is the design surface.

## 2. Scope

### In scope (MVP)

- 7-step span: `play-hub`, `searching`, `match-found`, `accept`, `lobby` (4 visible sub-phases: draft → discord → veto → server), `server`, `result`.
- 3 scenario presets:
  - `all-accept` — deterministic happy path (default).
  - `one-declines` — tests dodge UX + return-to-queue.
  - `server-fails` — tests server-start retry/cancel UX.
- Scenario controls (picker, step-jumper, "advance N Discord joins" slider, presets, automate) live in **`AppRightSidebar`** via the slot pattern — see [scenario-right-sidebar](../scenario-right-sidebar/plan.md); they drive [`MatchLobbyMockProvider`](../../../components/organisms/match-lobby/match-lobby-mock-context.tsx) programmatically.
- Synthetic match id (e.g. `"sandbox-1"`) so URL state is stable and shareable.

### Out of scope (deferred)

- Live in-round scoreboard / per-event simulation — not designed yet.
- Captain-driven draft (post-MVP per [`pug-system-spec.md`](../../../pug-system-spec.md) §5).
- Real Discord bot interaction — use [`/match/lab`](../../../app/(main)/match/lab/page.tsx) for that.
- Real CS2 events ingestion.

### Non-goals

- Not a replacement for the real `/match/[id]/*` routes — those continue to exist as the eventual destination once backend lands.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/sandbox/pug-system/` | §7.1 |
| Shell vs domain | Route-thin under **`app/(main)/admin/sandbox/pug-system/`**; domain in `entities/` | §7.1 |
| Auth dependency | None. No `@workspace/supabase` import | §3.2 |
| New package edges | None | §3.2, §10 |

## 4. Data model

None.

- No tables, no migrations, no RLS, no generated types.
- Mock fixtures: `apps/intradark/entities/sandbox/pug-system/fixtures.ts` re-exports [`MOCK_TEAM_NORTH` / `MOCK_TEAM_SOUTH`](../../../lib/match-lobby-mock-data.ts) and adds party / queue fixtures as needed.

## 5. API surface

None. Sandbox calls no endpoints.

## 6. UI composition

```
apps/intradark/
├── app/(main)/admin/sandbox/pug-system/page.tsx # Thin → <PugSystemSandbox />
├── entities/sandbox/pug-system/
│   ├── pug-system-sandbox.tsx                 # Root: SandboxShell + step switch
│   ├── steps/
│   │   ├── play-hub-step.tsx                  # Wraps faceit-play-mock
│   │   ├── searching-step.tsx
│   │   ├── match-found-step.tsx
│   │   ├── accept-phase-step.tsx
│   │   ├── lobby-step.tsx                     # 3-col grid + sub-phase switch
│   │   ├── server-step.tsx
│   │   └── result-step.tsx
│   ├── scenarios.ts                           # 3 presets
│   └── fixtures.ts
└── lib/sandbox/pug-system/                    # (only if shape adapters needed)
```

### Reuse policy

**Import directly** (pure display, no URL/router/Supabase coupling):

- [`components/organisms/match-lobby/lobby-team-column.tsx`](../../../components/organisms/match-lobby/lobby-team-column.tsx)
- [`components/organisms/match-lobby/match-lobby-concentric-rings.tsx`](../../../components/organisms/match-lobby/match-lobby-concentric-rings.tsx)
- [`components/organisms/match-lobby/lobby-player-card.tsx`](../../../components/organisms/match-lobby/lobby-player-card.tsx)
- [`components/organisms/match-lobby/discord-icon.tsx`](../../../components/organisms/match-lobby/discord-icon.tsx)
- [`components/organisms/faceit-play-mock.tsx`](../../../components/organisms/faceit-play-mock.tsx)
- [`lib/match-lobby-mock-data.ts`](../../../lib/match-lobby-mock-data.ts) (`MOCK_TEAM_NORTH` / `MOCK_TEAM_SOUTH`)
- [`components/organisms/match-lobby/match-lobby-mock-context.tsx`](../../../components/organisms/match-lobby/match-lobby-mock-context.tsx) — re-use the provider wrapping the `lobby-step` so existing display components keep working unchanged.

**Do NOT import** (URL/router-coupled — would force users out of **`/admin/sandbox`**):

- [`components/organisms/match-lobby/match-lobby-layout.tsx`](../../../components/organisms/match-lobby/match-lobby-layout.tsx) — hardcodes `MatchId` chrome string + ties to lobby route shape.
- [`components/organisms/match-lobby/match-lobby-phase-nav.tsx`](../../../components/organisms/match-lobby/match-lobby-phase-nav.tsx) — hardcoded `/match/${matchId}` prefix.
- [`app/(main)/match/[id]/discord/discord-phase-panel.tsx`](../../../app/(main)/match/[id]/discord/discord-phase-panel.tsx) — uses `useParams` and `router.replace('/match/...')`.
- [`app/(main)/match/[id]/veto/veto-phase-panel.tsx`](../../../app/(main)/match/[id]/veto/veto-phase-panel.tsx)
- [`app/(main)/match/[id]/server/server-phase-panel.tsx`](../../../app/(main)/match/[id]/server/server-phase-panel.tsx)

`lobby-step.tsx` reimplements thin chrome (3-column grid + in-step sub-phase nav driven by sandbox state, not URL) around the imported display organisms. Sandbox state drives rings/timer/buttons via the existing `MatchLobbyMockProvider` (the dock manipulates the same toggles a human would click).

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| `Card`, `Button`, `Badge`, `Avatar`, `Tabs` | `@workspace/ui` | Reuse |
| `SandboxShell` | `entities/sandbox/shell/` (parent triad) | Provider + dock + step-jumper |
| `PugSystemSandbox` + step components | `entities/sandbox/pug-system/` | NEW |
| Lobby chrome | reimplemented inside `lobby-step.tsx` | Composes imported display organisms |

### Theming

Tokens from `@workspace/ui`. No product override stylesheet.

## 7. Dependencies

### Existing packages used

- `@workspace/ui`
- `entities/sandbox/shell` (parent SandboxShell)

### New external deps

- None.

### New package edges

- None.

## 8. Implementation order (commits)

Granular commits per [commit-organizer](../../../../../../.cursor/skills/commit-organizer/SKILL.md). Parent triad's commits 1–3 must land first (route shell, SandboxShell, sidebar entry).

1. `feat(intradark): scaffold pug-system sandbox shell with empty steps` — `pug-system-sandbox.tsx`, all 7 step files as stubs, `scenarios.ts` skeleton.
2. `feat(intradark): wire play-hub + searching + match-found steps` — first 3 steps render.
3. `feat(intradark): wire accept-phase step + 3 scenario presets` — `all-accept`, `one-declines`, `server-fails` defined; accept-phase reads scenario.
4. `feat(intradark): wire lobby-step (4 sub-phases) reusing match-lobby organisms` — re-uses `MatchLobbyMockProvider` + display organisms; in-step sub-phase tabs (no URL change).
5. `feat(intradark): wire server-step + server-fails scenario` — connect string + 10/10 connected; failure path shows retry/cancel.
6. `feat(intradark): wire result-step (mock summary)` — final step shows mock score + "Queue again".
7. `test(intradark): per-step rendering tests for all 3 scenarios` — see [`tdd.md`](tdd.md).
8. `docs(intradark): mark pug-system sandbox feature complete` — flip status.

## 9. Telemetry

None.

## 10. Rollout

Inherits parent **RBAC** gate ([admin-panel](../../../admin-panel/plan.md)); requires **`sandbox.access`**. No additional env vars.

## 11. Open questions

- [ ] Should `all-accept` auto-advance steps with a 2s delay, or always require explicit Next? **Recommended:** explicit Next; auto-advance is a v2 nice-to-have. — owner: intradark maintainers, due: post-MVP
- [ ] Should `lobby-step` use in-step sub-phase tabs (recommended) OR map sub-phases to additional URL `?phase=...` segments for shareability? — owner: intradark maintainers, due: at implementation time

## 12. Cross-references

- Parent: [`../plan.md`](../plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Spec: [`apps/intradark/docs/pug-system-spec.md`](../../../pug-system-spec.md)
- Existing mock infrastructure: [`match-lobby-mock-context.tsx`](../../../components/organisms/match-lobby/match-lobby-mock-context.tsx), [`match-veto-mock-context.tsx`](../../../components/organisms/match-lobby/match-veto-mock-context.tsx)
- Architecture: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
