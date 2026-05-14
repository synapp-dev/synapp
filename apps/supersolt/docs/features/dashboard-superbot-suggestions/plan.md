# Dashboard Superbot suggestions card

> **Product:** `apps/supersolt`
> **Slug:** `dashboard-superbot-suggestions`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-13

## 1. Summary

Add a **full-width** “**Superbot suggestions**” card on the signed-in **`/dashboard`** page, **immediately after** the **KPI grid** and **before** the **Revenue trend** row. The card cycles through **dummy** operational suggestions (headline, insight-style body, primary CTA). A **header icon strip** (right) jumps to a specific suggestion; **hovering the card pauses** the **10-second** auto-advance. A **progress indicator** at the bottom reflects time until the next slide. **`prefers-reduced-motion: reduce`** disables auto-advance and animated progress; users navigate with icons only. **No backend**, **no persistence**, **no telemetry** in MVP—implementation is a client component plus static model data under **`entities/dashboard/`**, composed from **`@workspace/ui`** primitives.

## 2. Scope

### In scope (MVP)

- New **`entities/dashboard/model/`** module exporting a **typed non-empty** list of suggestions (title, description, CTA label, target path **suffix** or full path strategy—see §6).
- New **`entities/dashboard/components/superbot-suggestions-card.tsx`** (name may vary): **`Card`** layout, header (**title** + optional Superbot subtitle + **icon buttons** aligned end), body (**description**), **`Button` asChild + `Link`** for CTA, **bottom progress** tied to the 10s timer.
- **Auto-advance** every **10s** with **reset on manual icon selection**; **pause** while pointer is over the card (`mouseenter` / `mouseleave` on a single hover root—document touch behavior: no hover on mobile ⇒ timer does not pause unless a follow-up adds long-press or explicit pause control).
- **`usePrefersReducedMotion`** (or equivalent hook under `apps/supersolt`, added if missing): **no interval**, **no CSS progress animation**; icons still switch slides.
- **`app/(main)/dashboard/page.tsx`**: insert card **between** KPI `</div>` and the **Revenue trend** `lg:grid-cols-3` block; wrap with existing **`StaggeredAnimation`** using the next slot index after KPIs (see current `dashboardCardDelay` pattern).
- **Vitest + RTL** tests per [`tdd.md`](tdd.md); **`pnpm lint:architecture`** clean from repo root after implementation ([ARCHITECTURE.md §4.2](../../../../../ARCHITECTURE.md)).

### Out of scope (deferred)

- **Server** fetching, ranking, or personalization of suggestions; **Supabase** tables and **migrations**.
- **Telemetry** / product analytics (document future events in §9 only).
- **Playwright** E2E (no harness in `apps/supersolt/package.json`); manual smoke bullets in [`flows.md`](flows.md).
- **Role-based** filtering of suggestions; **dismiss / snooze / “done”** persistence.
- **Promotion** to **`packages/*`** or **`@workspace/ui`** until a second consumer exists ([ARCHITECTURE.md §5.1](../../../../../ARCHITECTURE.md)).

### Non-goals

- Replacing or merging with the existing **Alerts** / **Quick Actions** cards—those remain separate UX surfaces.
- **Guaranteed correct deep links** from `/dashboard` without venue context—MVP may **disable** the CTA or show a clear message when **`useScopedNavigation().resolvedScope`** is **null** (see §6).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | `entities/dashboard/components/` + `entities/dashboard/model/` | §7.1 |
| Shell vs domain | `components/` unchanged (shell only); domain stays in `entities/dashboard/` | §7.1 |
| Auth dependency | **None** in the card module—no `@workspace/supabase` imports; CTAs are plain **`next/link`** targets | §3.2 |
| New package edges | None | §3.2, §10 |

### Architecture compliance (pre-ship gate)

Walk [build-feature checklists/architecture.md](../../../../../.cursor/skills/build-feature/checklists/architecture.md). This slice: **§8 migrations n/a** (no DDL). If suggestions become persistent later, follow **app-owned** migrations under the app’s existing Supabase/Drizzle conventions ([ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)).

## 4. Data model

### Tables / columns

**MVP:** none.

```sql
-- Intentionally empty: static TypeScript module only.
```

### RLS

**MVP:** n/a.

### Migration ownership

- **Path:** n/a for MVP.
- **Pattern:** App-owned ([ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)) when/if suggestions are stored server-side.
- **Backfill:** n/a.

### Generated types

No schema change in MVP.

## 5. API surface

**MVP:** none—no Server Actions, no Route Handlers, no RPC for this feature.

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| — | — | — | — | Future: e.g. `GET` suggestions or Server Component load |

### Validation

- **MVP:** optional **Zod** schema for exported dummy array in dev-only tests or CI guard—not required if a simple `satisfies` + unit test on length is enough.
- **Error mapping:** n/a (no server errors); client edge cases live in [`flows.md`](flows.md).

## 6. UI composition

```
apps/supersolt/
├── app/(main)/
│   └── dashboard/
│       └── page.tsx            # Compose Superbot card between KPI row and revenue trend
└── entities/dashboard/
    ├── components/
    │   ├── … (existing)
    │   └── superbot-suggestions-card.tsx   # NEW (filename may vary)
    └── model/
        ├── dummy-dashboard-data.ts         # existing
        └── dummy-superbot-suggestions.ts   # NEW — typed list + stable ids
```

### Component map

| Piece | Source | Notes |
|-------|--------|-------|
| `Card`, `CardHeader`, `CardContent`, `Button` | `@workspace/ui` | Reuse; do not duplicate primitives under `components/atoms` |
| `SuperbotSuggestionsCard` | `entities/dashboard/components/` | Domain composition; may use `lucide-react` icons per suggestion |
| `Link` | `next/link` | CTA navigation |

### CTA href strategy (MVP)

Most venue routes live under **`/{organisationSlug}/{venueSlug}/…`** ([`scoped-navigation-context.tsx`](../../../entities/access/scoped-navigation-context.tsx)). **`/dashboard`** does not include those segments in the URL; **`resolvedScope`** may still be **non-null** if the user previously selected org/venue in the shell.

- **Preferred:** Model stores **path suffixes** (e.g. `workforce/timesheets`, `inventory/order-guide`). Component builds `/${resolvedScope.organisationSlug}/${resolvedScope.venueSlug}/${suffix}` when **`resolvedScope`** is set.
- **When `resolvedScope` is null:** **Disable** the CTA (and optionally show short helper copy: e.g. “Open a venue from the sidebar to jump there”)—avoids broken links. Alternative (explicit product approval only): link to **`/setup`**.

### Theming

Tokens from **`@workspace/ui`** ([ARCHITECTURE.md §6](../../../../../ARCHITECTURE.md)). Progress bar uses existing **`bg-muted` / `bg-primary`** patterns consistent with the Channel Mix card on the same page.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — `Card`, `Button`, typography utilities as needed.
- `next/link` — CTA navigation.
- `lucide-react` — header icons (per suggestion or shared set).

### New external deps

- **None** expected (`usePrefersReducedMotion` can live in `apps/supersolt/hooks/` mirroring other apps if not present).

### New package edges

- None.

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../.cursor/skills/commit-organizer/SKILL.md). Adjust if the team prefers a single docs commit.

1. `docs(supersolt): plan dashboard superbot suggestions` — this triad (if not landed yet).
2. `feat(supersolt): add dummy superbot suggestions model` — typed export + unit test **non-empty**.
3. `test(supersolt): add superbot suggestions card tests` — RTL + fake timers (**red** first per [`tdd.md`](tdd.md)).
4. `feat(supersolt): add superbot suggestions dashboard card` — component + hook behavior.
5. `feat(supersolt): wire superbot card on dashboard page` — placement + `StaggeredAnimation` delay slot.

## 9. Telemetry

**MVP:** none emitted.

| Event (future) | Trigger | Payload sketch | Destination |
|----------------|---------|----------------|---------------|
| `dashboard_superbot.viewed` | Card mount / slide change | `{ suggestion_id, index }` | TBD provider |
| `dashboard_superbot.cta_clicked` | CTA click | `{ suggestion_id, href }` | TBD |
| `dashboard_superbot.icon_selected` | Header icon jump | `{ suggestion_id }` | TBD |

## 10. Rollout

- **Feature flag:** none.
- **Env vars:** none new.
- **Migration sequencing:** n/a.
- **Backout:** Remove the card from `dashboard/page.tsx` and delete the new `entities/dashboard` files; no DB rollback.

## 11. Open questions

- [ ] **Exact dummy path suffixes** and copy for each suggestion (timesheets, roster, order guide, menu insights)—owner: product/design, due: before implementation PR.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
