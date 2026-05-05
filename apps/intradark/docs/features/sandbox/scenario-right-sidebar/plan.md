# Sandbox scenario right sidebar

> **Product:** `apps/intradark`
> **Slug:** `scenario-right-sidebar` (child of [sandbox](../plan.md))
> **Status:** Complete
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

Move **all admin sandbox scenario controls** from the fixed **bottom `SandboxShell` card** into the **main app right sidebar** (`AppRightSidebar`), using a **register/unregister slot** so non-sandbox routes keep today’s empty (or future party/player) chrome. **Pug-system** ships the full experience: **step switcher**, **templatized per-step phase tree** (ordered phases, accordion sections, step-specific mock levers), **`preset` query ids** for shareable multi-control bundles, and **Milestone 1 automate sequences** with **cancel on manual override** and **hard teardown on unmount**. **Onboarding** registers the **minimum** equivalent (scenario, step, former `dockExtra` controls) in the **same change set** so removing the bottom dock does not regress **`/admin/sandbox/onboarding`**.

## 2. Scope

### In scope (MVP)

- **Shell slot API** (React context or equivalent) mounted from **`app/(main)/layout.tsx`** so **`AppRightSidebar`** can render **registered** sandbox UI while **`entities/sandbox/*`** modules own registration lifecycle (mount = register, unmount = clear).
- **`SandboxShell`:** remove the fixed bottom **Scenario dock** `Card`; retain **title**, **step readout**, **sandbox warning**, and **main** `children` render pipeline.
- **URL contract:** extend beyond `?scenario=&step=` with **`preset`** (and small set of flags such as automate **armed/running** if encoded in URL—exact keys in implementation) backed by **TypeScript registries**; invalid values **normalize** (clamp, strip, safe defaults) per [flows.md](flows.md) §2.
- **Pug-system:** phase tree UI + mock wiring + named presets + automate runner (**dev-cancel** rules in [flows.md](flows.md)).
- **Onboarding:** sidebar registration covering **scenario**, **step**, and **eligibility / extra** controls currently passed via `dockExtra` so parity remains after bottom dock removal.
- **Telemetry:** **dev-only** (`NODE_ENV === 'development'` logging); **no** production analytics events from this chrome in M1.

### Out of scope (deferred)

- **Playwright E2E** for this slice (Vitest + Testing Library only in M1; see [tdd.md](tdd.md)).
- **Full URL serialization** of every accordion field (prefer **`preset`** ids; optional sparse params later).
- **Production analytics** for preset/automate usage.
- **Second consumer app** or extraction to `packages/*` (promote on second consumer per [ARCHITECTURE.md §5.1](../../../../../../ARCHITECTURE.md)).

### Non-goals

- Not a replacement for **`/match/lab`** or real Discord/CS2 integration.
- Not persisting sandbox configuration to **Postgres** (no new tables).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `entities/sandbox/<child>/` for flow-specific panels + registries; shell wiring under `components/` | §7.1 |
| Shell vs domain | Slot provider + `AppRightSidebar` in **`components/`**; no second atomic library in `components/` | §7.1 |
| Auth dependency | **None in client sidebar modules.** Route access remains **`sandbox.access`** via [`app/(main)/admin/sandbox/layout.tsx`](../../../../app/(main)/admin/sandbox/layout.tsx) (server). Do **not** import `@workspace/supabase` into new client-only sidebar panels. | §3.2 |
| New package edges | None | §3.2, §10 |

> Architecture compliance gate ([`checklists/architecture.md`](../../../../../../.cursor/skills/build-feature/checklists/architecture.md)): **yes** / **n/a** for this triad.

## 4. Data model

**No new sandbox tables, migrations, or RLS.** Mock and URL state only.

**Live intradark project snapshot** (for drift awareness; implementation does not add DDL):

| Schema | Tables (compact) |
|--------|------------------|
| `public` | `steam_profiles`, `user_profiles`, `roles`, `user_roles` (all RLS enabled) |

**Recent migrations on project** (ordering reference only): `add_discord_user_id_to_user_profiles`, `roles_user_roles_rbac`, `user_roles_profile_fk`, `developer_role`.

### Migration ownership

- **Path:** none for this feature.
- **Pattern:** [§8.1](../../../../../../ARCHITECTURE.md) app-owned migrations apply only when schema changes; this feature adds **none**.
- **Implementation note:** Any future schema work remains **`apps/intradark/drizzle/`** in lockstep with **`apply_migration`** on the intradark Supabase project, per [ARCHITECTURE.md §8.1](../../../../../../ARCHITECTURE.md); **`generate_typescript_types`** after DDL when types regeneration is part of the workflow.

### Generated types

N/A for this feature (no DDL).

## 5. API surface

| Operation | Surface | Auth | Notes |
|-----------|---------|------|-------|
| — | — | — | **No** server actions, route handlers, or RPC for sandbox scenario chrome in M1. |

## 6. UI composition

```
apps/intradark/
├── app/(main)/layout.tsx                    # Wrap with right-sidebar slot provider (client boundary as needed)
├── components/organisms/
│   ├── app-right-sidebar.tsx                # Renders registered slot OR default empty chrome
│   └── sandbox-right-sidebar-provider.tsx   # (suggested name) register API + default null
├── entities/sandbox/
│   ├── shell/sandbox-shell.tsx              # Slim: no bottom Card; keeps header + warning + children
│   ├── pug-system/                          # Registers rich scenario panel + registries
│   └── onboarding/                          # Registers minimal scenario panel (parity)
└── lib/sandbox/
    ├── use-sandbox-url-state.ts             # Extend or complement for preset / automate flags
    └── scenario-url/                        # (optional) pure normalize/parse helpers + tests
```

### Component map

| Piece | Source | Notes |
|-------|--------|-------|
| Primitives (`Button`, `Select`, `Accordion`, …) | `@workspace/ui` | Presentation only; no Supabase imports in `@workspace/ui` consumers that are workspace primitives |
| Slot provider + `AppRightSidebar` glue | `components/organisms/` | Shell only per §7.1 |
| Pug phase tree, presets, automate | `entities/sandbox/pug-system/` | Domain composition |

### Theming

- Tokens from `@workspace/ui` ([§6](../../../../../../ARCHITECTURE.md)). Product overrides stay in `apps/intradark/app/globals.css` ordering rules unchanged.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — layout primitives for sidebar, forms, accordions.
- **Not used in new client panels:** `@workspace/supabase` (RBAC gate stays server-side on admin sandbox layout).

### New external deps

- None anticipated.

### New package edges

- None.

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../../.cursor/skills/commit-organizer/SKILL.md). Each commit should leave the tree green.

1. `feat(intradark): add sandbox right-sidebar slot provider` — provider + `AppRightSidebar` render path; default **null** slot (no behavior change elsewhere).
2. `test(intradark): add red tests for scenario URL + preset normalize` — see [tdd.md](tdd.md).
3. `feat(intradark): extend sandbox URL state for preset flags` — pure helpers + `router.replace` hygiene.
4. `feat(intradark): slim SandboxShell remove bottom dock` — **land together with** onboarding + pug **registration stubs** so `/admin/sandbox/*` never loses controls.
5. `feat(intradark): pug-system scenario sidebar panel` — phase tree, presets, mocks, automate.
6. `feat(intradark): onboarding scenario sidebar panel` — scenario/step + former `dockExtra` parity.
7. `test(intradark): green tests for url + automate cancel` — close [tdd.md](tdd.md) M1 list.
8. `docs(intradark): mark scenario-right-sidebar planned → complete` — status flip in this file when shipped.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| — | — | — | **None** for production. Optional `console.debug` in development only (see §2). |

## 10. Rollout

- **Feature flag:** **none** beyond existing **`sandbox.access`** RBAC on [`app/(main)/admin/sandbox/layout.tsx`](../../../../app/(main)/admin/sandbox/layout.tsx).
- **Env vars:** **none** new for M1 (timing constants live in TS registries).
- **Migration sequencing:** **N/A** (no DDL).
- **Backout:** revert commits in §8; restore bottom `Card` in `SandboxShell` if needed; remove provider wrap from layout.

## 11. Open questions

- [ ] **Mobile / collapsed right sidebar:** if `RightSidebar` is icon-only or hidden on small breakpoints, confirm whether a **compact fallback** (e.g. sheet or minimal step chip) is required in M1 or deferred — owner: intradark maintainers, due: first UX review after shell wire-up.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Parent: [`../plan.md`](../plan.md)
- Flow children: [`../pug-system/plan.md`](../pug-system/plan.md), [`../onboarding/plan.md`](../onboarding/plan.md)
- Architecture: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
- URL state today: [`../../../../lib/sandbox/use-sandbox-url-state.ts`](../../../../lib/sandbox/use-sandbox-url-state.ts)
