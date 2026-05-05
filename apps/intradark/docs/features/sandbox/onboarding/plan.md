# Sandbox / Onboarding

> **Product:** `apps/intradark`
> **Parent slug:** `sandbox`
> **Sub-slug:** `onboarding`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

Identity flow simulator at **`/admin/sandbox/onboarding`**: landing → click "Sign in with Steam" → simulated Steam OpenID return → username/email completion screen → dashboard with Discord-link prompt → simulated Discord OAuth return → eligibility badge "ready to queue". Stubs all OAuth callbacks client-side; no real network.

Covers 6 distinct **eligibility states** (per [`pug-system-spec.md`](../../../pug-system-spec.md) §2) so downstream UI gating can be previewed without coordinating real Steam/Discord accounts.

## 2. Scope

### In scope (MVP)

- 6-step span: `landing`, `steam-signin`, `username-email`, `dashboard`, `discord-link`, `eligible`.
- 3 scenario presets:
  - `happy-onboarding` — deterministic happy path (default).
  - `discord-declines-then-relinks` — tests the decline + retry sub-flow.
  - `steam-already-linked-conflict` — surfaces conflict screen between signin and username-email.
- 6 eligibility states selectable in the **right sidebar** (same slot as [scenario-right-sidebar](../scenario-right-sidebar/plan.md); replaces former `dockExtra` bottom dock) — drives `dashboard-step` rendering: `not-signed-in`, `steam-only`, `discord-only`, `both-linked-not-banned`, `banned`, `cooldown-active`.
- Each state maps to a fake `getCurrentUserProfiles`-shaped object via `profilesForEligibility` in [`fixtures.ts`](../../../entities/sandbox/onboarding/fixtures.ts), exposed through `OnboardingSandboxProvider` / `useOnboardingSandbox`, so dashboard / eligibility gating can be previewed without DB.

### Out of scope (deferred)

- Real Steam OpenID round-trip — already implemented at [`app/api/auth/steam/*`](../../../app/api/auth/steam/route.ts).
- Real Discord OAuth round-trip — already implemented at [`app/api/auth/discord/*`](../../../app/api/auth/discord/route.ts).
- Real Supabase session writes.
- Email verification / password recovery — `intradark` uses Steam SSO; out of scope.
- Account deletion.

### Non-goals

- Not a replacement for the real `/api/auth/steam/*` and `/api/auth/discord/*` routes — those continue to be the truth.
- Not a tool for testing real OAuth end-to-end (use a real account in dev).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/sandbox/onboarding/` | §7.1 |
| Shell vs domain | Route-thin under **`app/(main)/admin/sandbox/onboarding/`**; domain in `entities/` | §7.1 |
| Auth dependency | None. Sandbox does NOT import `@workspace/supabase`. Fake profile via `OnboardingSandboxProvider` + `fixtures.ts` | §3.2 |
| New package edges | None | §3.2, §10 |

## 4. Data model

None.

- Fake profile shapes live in [`apps/intradark/entities/sandbox/onboarding/fixtures.ts`](../../../entities/sandbox/onboarding/fixtures.ts) and match the return type of [`getCurrentUserProfiles`](../../../lib/get-current-user-profiles.ts) (shared via type import — sandbox does not invoke the function).

## 5. API surface

None.

## 6. UI composition

```
apps/intradark/
├── app/(main)/admin/sandbox/onboarding/page.tsx       # Thin → <OnboardingSandbox />
├── entities/sandbox/onboarding/
│   ├── onboarding-sandbox.tsx                       # Root: SandboxShell + step switch
│   ├── onboarding-sandbox-context.tsx                 # React context + hook
│   ├── eligibility-dock.tsx                           # Dock extra: eligibility select
│   ├── fixtures.ts                                    # EligibilityState, profilesForEligibility, flags
│   ├── steps/
│   │   ├── landing-step.tsx
│   │   ├── steam-signin-step.tsx
│   │   ├── steam-conflict-step.tsx
│   │   ├── username-email-step.tsx                    # Wraps SteamEmailDialog (sandbox prop)
│   │   ├── dashboard-step.tsx                         # Reimplements dashboard chrome (mock)
│   │   ├── discord-link-step.tsx
│   │   └── eligible-step.tsx
└── components/molecules/steam-email-dialog.tsx      # Extended: `sandbox` + `onSandboxComplete` (real route unchanged)
```

### Reuse policy

**Import directly:**

- [`components/molecules/discord-link-dialog.tsx`](../../../components/molecules/discord-link-dialog.tsx) — already client-only and self-contained.
- [`components/molecules/steam-email-dialog.tsx`](../../../components/molecules/steam-email-dialog.tsx) — `username-email-step` passes `sandbox` + `onSandboxComplete` so no network calls; the real [`app/steam-username-email/page.tsx`](../../../app/steam-username-email/page.tsx) route is unchanged.
- `@workspace/ui` primitives.

**Do NOT import:**

- [`app/(main)/dashboard/page.tsx`](../../../app/(main)/dashboard/page.tsx) — server component, calls Supabase via `getCurrentUserProfiles`. `dashboard-step.tsx` reimplements the visual structure with fake profile data from `useOnboardingSandbox()`.
- [`lib/get-current-user-profiles.ts`](../../../lib/get-current-user-profiles.ts) — Supabase. Sandbox imports the **type** (compile-time) but never invokes the function.

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| `Card`, `Button`, `Avatar`, `Badge`, `Dialog` | `@workspace/ui` | Reuse |
| `SandboxShell` | `entities/sandbox/shell/` (parent triad) | Framing + step readout; scenario UI in right sidebar per [scenario-right-sidebar](../scenario-right-sidebar/plan.md) |
| `SteamEmailDialog` | [`components/molecules/steam-email-dialog.tsx`](../../../components/molecules/steam-email-dialog.tsx) | Sandbox mode for username/email step |
| `DiscordLinkDialog` | [`components/molecules/discord-link-dialog.tsx`](../../../components/molecules/discord-link-dialog.tsx) | Reused as-is |
| `OnboardingSandbox` + step components | `entities/sandbox/onboarding/` | NEW |
| Dashboard chrome | reimplemented inside `dashboard-step.tsx` | Composes `@workspace/ui` primitives + fake profile data |

### Theming

Tokens from `@workspace/ui`. No product override stylesheet.

## 7. Dependencies

### Existing packages used

- `@workspace/ui`
- `entities/sandbox/shell` (parent SandboxShell)
- [`components/molecules/discord-link-dialog.tsx`](../../../components/molecules/discord-link-dialog.tsx)

### New external deps

- None.

### New package edges

- None.

## 8. Implementation order (commits)

Granular commits per [commit-organizer](../../../../../../.cursor/skills/commit-organizer/SKILL.md). Parent triad's commits 1–3 must land first.

1. `feat(intradark): extend SteamEmailDialog with sandbox mode` — optional `sandbox` / `onSandboxComplete`; real route unchanged.
2. `feat(intradark): scaffold onboarding sandbox` — `onboarding-sandbox.tsx`, context, `fixtures.ts`, `eligibility-dock.tsx`, all step components.
3. `feat(intradark): wire onboarding steps + scenarios` — 6 steps, 3 URL scenarios, 6 eligibility dock states.
4. `test(intradark): step rendering + eligibility state coverage` — see [`tdd.md`](tdd.md) (when Vitest is added).
5. `docs(intradark): mark onboarding sandbox feature complete` — flip status.

## 9. Telemetry

None.

## 10. Rollout

Inherits parent **RBAC** gate ([admin-panel](../../../admin-panel/plan.md)); requires **`sandbox.access`**. No additional env vars.

## 11. Open questions

- [x] `eligible-step` CTA: implemented both **Open PUG sandbox** (`/admin/sandbox/pug-system`) and **Open real Play page** (`/play`).
- [x] `discord-only` eligibility: informational banner on `dashboard-step` (placeholder; production UI TBD).

## 12. Cross-references

- Parent: [`../plan.md`](../plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Spec: [`apps/intradark/docs/pug-system-spec.md`](../../../pug-system-spec.md) §1–§2 (Onboarding, Queue entry / eligibility)
- Real routes referenced (untouched except optional `SteamEmailDialog` sandbox props): [`app/api/auth/steam/`](../../../app/api/auth/steam/), [`app/api/auth/discord/`](../../../app/api/auth/discord/), [`app/steam-username-email/page.tsx`](../../../app/steam-username-email/page.tsx), [`app/(main)/dashboard/page.tsx`](../../../app/(main)/dashboard/page.tsx)
- Architecture: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
