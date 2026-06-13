# Onboarding

> **Product:** `apps/supersolt`  
> **Slug:** `onboarding`  
> **Status:** Planned  
> **Route:** `/setup`  
> **Owner:** TBD  
> **Created:** 2026-06-01  
> **Updated:** 2026-06-01

## 1. Summary

Onboarding moves a **whitelisted**, sales-qualified customer from first login to a **live** multi-venue workspace: org and venues exist, **Square** is connected, and optional procurement/workforce steps are either completed or consciously skipped with visible consequences.

**Notion** defines an **agent-driven** `/setup` (chat owns the screen, full sidebar visible but blurred, modules **unblur** as steps complete). The repo today ships a **six-step card wizard** (`setup-wizard-client.tsx`) with the same broad integrations (Square, Xero, invites) but **no** progressive module unlock and **no** early Sales access before finalize.

**Phased delivery (accelerated grill-me — locked):**

| Phase | Ships | UX |
|-------|--------|-----|
| **1a (v1 launch)** | Mandatory gates + module unlock matrix + Square→Sales before finalize | Keep wizard; add gating, skip UX, `data_starts_from` on venues |
| **1b** | Agent-owned `/setup` with inline OAuth/upload widgets | Replace wizard body with agent panel; reuse 1a APIs + gates |

**Instant-value (Notion):** After Square OAuth succeeds, **Sales Insights** must be reachable **before** finalize — even if purchasing/workforce stay blurred.

**Personas:** Owner or ops lead; 1–multi venue; non-technical; pre-sold (no self-serve sign-up).

**Notion:** [Onboarding (Module Overview)](https://www.notion.so/35064094bde680d6b29dc1ed7165b412)

### Current code (baseline)

| Area | Location | Notes |
|------|----------|-------|
| Route | `app/(main)/setup/page.tsx` | Renders wizard client |
| Wizard | `setup/_components/setup-wizard-client.tsx` | Steps 1–6: org, venues, Square, Xero, team, review |
| APIs | `app/api/onboarding/{state,organisation,venue,invite,finalize}` | `requireRequestAuth` |
| Service | `server/onboarding/onboarding.service.ts` | Org/venue upsert, `markSetupCompleted` |
| Gate (global) | `user_profiles.setup_completed_at` + `middleware.ts` | Redirect to `/setup` when incomplete |
| Nav (setup-only) | `app-sidebar.tsx` `needsSetupNav` | Hides full nav until finalize — **not** per-module blur |
| Square | `entities/square/`, venue connection query | Step 3 OAuth |
| Xero | `entities/xero/` | Step 4 |

### Gaps vs Notion (1a closes)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Agent-owned `/setup` | **Missing** | Phase 1b |
| Per-module blur/unblur | **Missing** | Phase 1a — `module-gates` + sidebar |
| Sales unlock on Square only (pre-finalize) | **Missing** | Phase 1a — middleware/sidebar exception |
| Finalize requires Square (mandatory) | **Missing** | Today: org + venues only |
| Optional skip + consequence copy | **Missing** | Steps 4–5 skippable in UI |
| `data_starts_from` on Add Venues | **Missing** | Column exists on `venues`; not in onboarding API/DTO |
| Suppliers / recipes steps | **Missing** | Not in 6-step wizard; defer in-module wizards per Notion |
| Multi-venue copy-from-venue-1 | **Missing** | Phase 2 |
| Multi-org migration checklist | **Missing** | Phase 2 |
| Per-venue inbox at supplier step | **Partial** | [`email-infrastructure`](../invoices-module/email-infrastructure/plan.md) |

## 2. Scope

### In scope (Phase 1a — MVP)

- Whitelisted auth handoff → `/setup` ([`supersolt-authentication`](../supersolt-authentication/plan.md))
- **Mandatory:** Create Organisation, Add Venues (incl. **`data_starts_from`**), Connect Square
- **Optional (skippable):** Xero, Invite Team; in-module wizards later for suppliers/recipes/import items
- **Module gating** per matrix below (read-only nav to unlocked routes)
- **Early Sales:** navigate to `…/insights/sales` when Square connected, even if `needsSetup`
- **Finalize:** sets `setup_completed_at`; requires mandatory steps complete (incl. Square)
- Resume via `GET /api/onboarding/state` + `?step=` URL
- Multi-venue: add multiple venues in step 2 (copy-forward deferred)

### In scope (Phase 1b)

- Agent panel as primary `/setup` surface
- Inline tool widgets: OAuth buttons, file upload, confirmation lists
- Same backend contracts as 1a

### Out of scope

- Public sign-up; in-app billing; marketing site
- Re-onboarding new venue via Settings (future)
- Payment collection; trial conversion UI
- Full supplier/recipe/onboarding substeps in wizard (Notion: optional → first open of module)

### Non-goals

- Replacing Settings → Integrations for long-term OAuth management

### Onboarding substeps (Notion — product sections in this plan)

| Step | Notion page |
|------|-------------|
| Create Organisation | [link](https://www.notion.so/35064094bde6808093b6c7773a75b38a) |
| Add Venues | [link](https://www.notion.so/35064094bde6808e9e8bf3accd047480) |
| Connect POS | [link](https://www.notion.so/35064094bde680b1bd80e797465d515d) |
| Setup Accounting | [link](https://www.notion.so/35064094bde680b690b9c2e885f6d053) |
| Invite Team | [link](https://www.notion.so/35064094bde68069a7b2c6c215268d31) |
| Import Item List | [link](https://www.notion.so/35064094bde680b89474f93fd67f9381) |
| Create Supplier List | [link](https://www.notion.so/35064094bde6805c811bd75e20127eaf) |
| Build Recipes | [link](https://www.notion.so/35564094bde68161b051cdefbcc70ee7) |

## Notion specification

### User flows (target)

1. **First login** — `/setup`, agent welcome + Get Started (1b); wizard intro (1a).
2. **Mandatory sequence** — org → venues → Square; cannot finalize without Square.
3. **Instant value** — Sales unblurs on Square success; agent surfaces weekly revenue (1b).
4. **Optional chain** — accounting, suppliers, recipes, team — skip with explicit lock messaging.
5. **Complete** — mandatory done → all modules unblur (or skipped locks documented) → dashboard.

### Module gating matrix (implement in 1a)

| Step completes | Unlocks (nav routes) |
|----------------|----------------------|
| Connect POS (Square) | `insights/sales` only |
| Import item list (POS) | `settings/recipes`, stock/catalog prep |
| Create supplier list | `purchasing/suppliers`, `purchasing/orders`, `purchasing/invoices` |
| Build recipes | `insights/inventory`, `stock-management/*` |
| Setup accounting | `insights/p-and-l` (Phase 2 depth) |
| Invite team | `workforce/*` |

Until a row’s step is satisfied (or explicitly skipped with ack), child routes show **locked** overlay / disabled nav.

### Data + integrations

- **Square:** blocking for finalize; failure → retry, no skip.
- **Xero:** optional; enables supplier/team import when connected.
- **Per-venue inbox:** provision on supplier onboarding ([`email-infrastructure`](../invoices-module/email-infrastructure/plan.md)).
- **Whitelist:** auth layer.

### Other modules

Authentication, Agent (1b driver), Settings, Sales, Purchasing, Workforce, Forecast (backfill respects `data_starts_from`).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | Section |
|----------|--------|---------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain | `entities/onboarding/`, `server/onboarding/` | §7.1 |
| Shell | `app/(main)/setup/`, `components/organisms/app-sidebar.tsx` (gate consumer) | §7.1 |
| Auth | `@/lib/api/route-auth` → Drizzle RLS; Supabase auth only for session | §3.2, AGENTS.md |
| UI primitives | `@workspace/ui` | §6, §7.1 |
| New package edges | None | §3.2 |

> **Checklist F:** Supersolt uses `@/utils/supabase/server` for auth session, not `@workspace/supabase` in app — **n/a** with rationale in [`supersolt-authentication`](../supersolt-authentication/plan.md).

## 4. Data model

### Existing

- `user_profiles.setup_completed_at` — global onboarding complete ([`20260424120000_user_setup_onboarding.sql`](../../../supabase/migrations/20260424120000_user_setup_onboarding.sql))
- `organisations`, `venues`, `user_organisations`, `user_venues`
- `venues.data_starts_from` — **must** be written from onboarding venue step

### Phase 1a addition — organisation setup progress

Track optional-step completion and skips for gating (org-scoped).

```sql
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS setup_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organisations.setup_progress IS
  'Onboarding flags: squareConnectedAt, xeroSkipped, teamSkipped, suppliersSkipped, recipesSkipped, itemsImportedAt, etc.';
```

**RLS:** same as `organisations` update — org admins only.

**Alternative (smaller diff):** derive gates only from live integration tables (`venue_square_connections`, Xero, etc.) + skip flags in JSON; no new table.

### Generated types

`pnpm drizzle:pull` in `apps/supersolt` after migration.

## 5. API surface

| Operation | Method | Path | Auth | Notes |
|-----------|--------|------|------|-------|
| State | GET | `/api/onboarding/state` | session | Include `setupProgress`, square connected per venue |
| Organisation | POST | `/api/onboarding/organisation` | session | name, abn, gst |
| Venue | POST | `/api/onboarding/venue` | session | **add** `dataStartsFrom` ISO date |
| Invite | POST | `/api/onboarding/invite` | session | email, role slug |
| Finalize | POST | `/api/onboarding/finalize` | session | **Require** org, ≥1 venue, Square on primary venue |
| Progress patch | PATCH | `/api/onboarding/progress` | session | **New** — record skip/complete for optional steps |

Zod schemas: `entities/onboarding/model/schemas.ts` (new).

Validation errors map to [`flows.md`](flows.md).

## 6. UI composition

```
apps/supersolt/
├── app/(main)/setup/
│   ├── page.tsx
│   └── _components/
│       ├── setup-wizard-client.tsx      # 1a
│       └── setup-agent-client.tsx       # 1b (future)
├── entities/onboarding/
│   ├── api/endpoints.ts
│   ├── lib/module-gates.ts              # NEW — gate keys + copy
│   └── model/
├── components/organisms/app-sidebar.tsx # consume gates when needsSetup
└── server/onboarding/
```

### Component map

| Piece | Source |
|-------|--------|
| Wizard cards, sidebar | `@workspace/ui` |
| Gate hook | `useOnboardingGates()` from state + progress |

## 7. Dependencies

- [`supersolt-authentication`](../supersolt-authentication/plan.md) — whitelist, session
- [`tenancy-access`](../tenancy-access/plan.md) — post-finalize routing
- `server/square/` — OAuth + connection probe
- `server/xero/` — optional
- [`insights-platform/sales`](../insights-platform/sales/plan.md) — instant-value destination
- [`invoices-module/email-infrastructure`](../invoices-module/email-infrastructure/plan.md) — inbox provisioning

## 8. Implementation order (commits)

1. `docs(supersolt): expand onboarding feature triad` — this change.
2. `feat(supersolt): onboarding setup_progress migration + types`
3. `feat(supersolt): venue data_starts_from in onboarding API`
4. `feat(supersolt): module-gates constants + gate hook`
5. `feat(supersolt): sidebar progressive unlock during setup`
6. `feat(supersolt): allow insights/sales route when Square connected pre-finalize`
7. `feat(supersolt): finalize requires Square; optional step skip API`
8. `test(supersolt): onboarding integration + gate tests` — [`tdd.md`](tdd.md)
9. `feat(supersolt): setup wizard skip UX + consequence copy`
10. `feat(supersolt): setup agent shell` — Phase 1b only

## 9. Telemetry

| Event | Trigger | Payload |
|-------|---------|---------|
| `onboarding.viewed` | `/setup` mount | `{ step }` |
| `onboarding.step_completed` | Step save | `{ step_id }` |
| `onboarding.square_connected` | OAuth success | `{ venue_id }` |
| `onboarding.step_skipped` | Skip optional | `{ step_id, locks[] }` |
| `onboarding.sales_early_access` | First Sales open pre-finalize | `{ venue_id }` |
| `onboarding.finalized` | Finalize OK | `{ organisation_id, venue_count }` |
| `onboarding.failed` | API error | `{ code }` |

## 10. Rollout

- **Feature flag:** `ONBOARDING_REQUIRE_SQUARE=true` (default on in prod) — allows staging without Square.
- **Env:** existing Square/Xero vars; no new secrets for 1a.
- **Migrations:** apply `setup_progress` before deploy of gate logic.
- **Backout:** disable flag; revert sidebar gate hook; finalize works as today.

## 11. Open questions

- [ ] **Square multi-venue:** one OAuth per merchant vs per venue — owner: PM + eng (Notion open).
- [ ] **1b timeline:** agent panel in v1 vs fast-follow — owner: product (default: fast-follow after 1a).

## 12. Grill-me summary (accelerated, 2026-06-01)

1. **Product/slug:** `apps/supersolt` / `onboarding`.
2. **Scope:** 1a = wizard + gates + Square-first; 1b = Notion agent UX.
3. **Data:** `setup_progress` jsonb + `data_starts_from` on venue POST.
4. **API:** extend existing routes + `PATCH progress`.
5. **UI:** sidebar gating + wizard skips; agent later.
6. **Packages:** app-only.
7. **Auth:** route-auth + RLS; no UI→supabase.
8. **Errors:** Square fail, finalize without square, skip locks — in flows.md.
9. **Alternates:** resume, multi-org deferred, skip optional.
10. **Telemetry:** table §9.
11. **TDD:** [`tdd.md`](tdd.md) ordered list.
12. **Rollout:** env flag for Square requirement.

## 13. Cross-references

- [`tdd.md`](tdd.md), [`flows.md`](flows.md)
- [`module-overview-program.md`](../../module-overview-program.md)
- [`production-readiness-checklist.md`](../../production-readiness-checklist.md) § Onboarding
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

## Compliance audit (program 2026-06-01)

Superseded by this build-feature pass — gaps above are the source of truth for implementation.

**Updated:** 2026-06-01
