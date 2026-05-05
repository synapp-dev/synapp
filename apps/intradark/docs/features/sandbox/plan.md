# Sandbox

> **Product:** `apps/intradark`
> **Slug:** `sandbox`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

A **staff-only** route family at **`/admin/sandbox/*`** that lets one operator drive end-to-end UX flows by simulating the actions of other players, the Discord bot, and the game server. Each child triad covers one flow (`pug-system`, `onboarding`, …). Sandbox writes nothing real and calls no real APIs; its purpose is to iterate UX without coordinating real users.

**Access control** is defined by [Admin panel + RBAC](../admin-panel/plan.md): capability **`sandbox.access`** (or the slug chosen there) replaces the retired **`NEXT_PUBLIC_INTRADARK_SANDBOX_ENABLED`** env gate. This parent triad defines the **URL contract** and **`SandboxShell`** framing for children; **scenario controls** live in the **app right sidebar** when a sandbox module is active (see [scenario-right-sidebar](scenario-right-sidebar/plan.md)). Children inherit and own flow content.

## 2. Scope

### In scope (MVP)

- Parent route shell under **`/admin/sandbox`**: index page listing registered children.
- `SandboxShell` (framing + step readout + warning) reused by every child; **no fixed bottom scenario dock** — controls register into **`AppRightSidebar`** per [scenario-right-sidebar](scenario-right-sidebar/plan.md).
- URL ↔ state sync (`?scenario=...&step=...`, plus **`preset`** / automate flags per child) for shareable previews (paths under **`/admin/sandbox/...`**).
- **RBAC gate** inherited from `app/(main)/admin/sandbox/layout.tsx` (see [admin-panel](../admin-panel/plan.md)); **no** separate env-flag gate.
- Sidebar entry under **Admin** (or equivalent), visible only when the user has **`sandbox.access`**.
- Two children at MVP: [pug-system](pug-system/plan.md), [onboarding](onboarding/plan.md) (own triads).

### Out of scope (deferred)

- Real backend writes (no DB for sandbox content), no real APIs for simulators.
- Real OAuth round-trips, real Discord bot HTTP, real CS2 events — separate real routes / triads.
- Recording / playback / scripted demo videos.
- Multi-window / multi-tab co-simulation.

### Non-goals

- NOT a replacement for `/match/lab` (operator tool driving **real** Discord bot HTTP in dev — see [match-sandbox-panel.tsx](../../../components/organisms/match-sandbox-panel.tsx)).
- NOT for anonymous or general authenticated users without **`sandbox.access`**.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/sandbox/` | §7.1 |
| Shell vs domain | Routes thin under **`app/(main)/admin/sandbox/`**; domain in `entities/sandbox/` | §7.1 |
| Auth dependency | **Session + `sandbox.access`** via admin RBAC stack ([admin-panel](../admin-panel/plan.md)); server-only Supabase/Drizzle | §3.2 |
| New package edges | None (uses shared **`roles` / `user_roles`** from admin-panel) | §3.2, §10 |

> Architecture compliance gate ([`checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md)): **yes** / **n/a**. **`ARCHITECTURE.md`** may be updated by [admin-panel](../admin-panel/plan.md) for **`@workspace/rbac-contract`** only.

## 4. Data model

None for sandbox content.

- **Platform RBAC** tables: see [admin-panel §4](../admin-panel/plan.md#4-data-model).
- Mock fixtures live under `apps/intradark/lib/sandbox/<child>/` or `entities/sandbox/<child>/` per child triads.

## 5. API surface

None. Sandbox calls no real endpoints.

## 6. UI composition

```
apps/intradark/
├── app/(main)/admin/sandbox/
│   ├── layout.tsx                 # Inherits admin sandbox gate from parent admin layout chain
│   ├── page.tsx                   # Index; lists children with descriptions
│   ├── pug-system/page.tsx      # Thin → <PugSystemSandbox />
│   └── onboarding/page.tsx      # Thin → <OnboardingSandbox />
├── entities/sandbox/
│   └── shell/
│       └── sandbox-shell.tsx              # Framing only; scenario UI in right sidebar (see scenario-right-sidebar triad)
├── components/organisms/
│   ├── app-right-sidebar.tsx              # Renders slot when sandbox (or future) registers
│   └── (sandbox-right-sidebar-provider) # See scenario-right-sidebar/plan.md
└── lib/sandbox/use-sandbox-url-state.ts  # Extended per scenario-right-sidebar for preset / flags
```

**`entities/sandbox/registry.ts`:** child `href` values must be **`/admin/sandbox/...`**.

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| `Card`, `Button`, … | `@workspace/ui` | Reuse |
| `AppSidebar` entry | [`app-sidebar.tsx`](../../../components/organisms/app-sidebar.tsx) | Shown only with `sandbox.access` (see admin-panel) |
| `SandboxShell` | `entities/sandbox/shell/` | Layout framing; **scenario dock** removed in favor of [scenario-right-sidebar](scenario-right-sidebar/plan.md) |

### Theming

- Tokens from `@workspace/ui` (§6).

## 7. Dependencies

### Existing packages used

- `@workspace/ui`

### New external deps

- None.

### New package edges

- None.

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../.cursor/skills/commit-organizer/SKILL.md). **Route move and RBAC** land with [admin-panel §8](../admin-panel/plan.md#8-implementation-order-commits); this triad tracks **sandbox-specific** follow-ups.

1. (Handled by admin-panel) Move routes to **`/admin/sandbox`**, update **registry** hrefs, remove env gate, wire sidebar.
2. `test(intradark): update sandbox shell / URL tests` — paths under `/admin/sandbox` ([`tdd.md`](tdd.md)).
3. (Children — see child triads.)
4. `docs(intradark): mark sandbox parent feature complete` — flip status here.

## 9. Telemetry

None for MVP beyond default analytics if enabled globally. `console.debug` on scenario/step change allowed in dev.

## 10. Rollout

- **Feature flag:** **none** — capability **`sandbox.access`** only.
- **Env vars:** **`NEXT_PUBLIC_INTRADARK_SANDBOX_ENABLED` removed** (see admin-panel).
- **Optional redirect:** `/sandbox/*` → `/admin/sandbox/*` for one release.
- **Migration sequencing:** N/A for sandbox tables; depends on admin-panel RBAC migration first.

## 11. Open questions

- [ ] Parent index “last visited” shortcuts — defer until pain is felt.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- **RBAC + routes:** [`../admin-panel/plan.md`](../admin-panel/plan.md)
- **Right sidebar scenario chrome:** [`scenario-right-sidebar/plan.md`](scenario-right-sidebar/plan.md) · [`tdd.md`](scenario-right-sidebar/tdd.md) · [`flows.md`](scenario-right-sidebar/flows.md)
- Children: [`pug-system/plan.md`](pug-system/plan.md), [`onboarding/plan.md`](onboarding/plan.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Spec: [`apps/intradark/docs/pug-system-spec.md`](../../pug-system-spec.md)
- Roadmap: [`apps/intradark/docs/roadmap.md`](../../roadmap.md)
