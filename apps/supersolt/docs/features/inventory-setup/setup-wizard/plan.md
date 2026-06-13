# Inventory Setup Wizard

> **Product:** `apps/supersolt`
> **Parent feature:** [`inventory-setup`](../plan.md)
> **Slug:** `setup-wizard`
> **Status:** Planned
> **Route:** `/{organisation}/{venue}/settings/inventory-setup` (index)
> **Owner:** TBD
> **Created:** 2026-06-13

## 1. Summary

The Inventory Setup Wizard turns the bare inventory-setup index (today a sequential redirect into a six-item section nav) into a **single guided big card** that walks an operator through the four stages required to start using SuperSolt: **Suppliers → Inventory → Products → Storage Locations**. Each stage opens with a short, superbot-voiced **welcome**, explains **why it matters**, pitches **what the bot can do once it's done right**, then drops the operator into a **checklist** of sub-steps. The wizard is a **narration + orchestration shell**: every "Get started" action deep-links into the *existing* working pages (suppliers, normalise, POS catalog import, storage locations) — it does not rebuild those table/queue UIs.

This is a **presentation/orchestration layer** on top of the phased data and API work already specified in the [parent `inventory-setup` triad](../plan.md) and its sub-features ([`unit-normalisation`](../unit-normalisation/plan.md), [`pos-catalog-import`](../pos-catalog-import/plan.md), [`pos-recipe-inline-create`](../pos-recipe-inline-create/plan.md)). It adds no new domain data beyond UI acknowledgements.

**Personas:** Venue manager, owner, or org admin standing up a new venue (same gate as `canManageInventorySetup`).

**Narration voice:** scripted, deterministic superbot copy (e.g. *"Let's get your suppliers sorted. I can talk to Xero to make this easier — I found these items in your invoices, here's what I'd suggest. Does this look right? Change anything I've missed."*). **Not** wired to the live `ai-agent-chat` runtime.

## 2. Scope

### In scope (MVP)

- **Big-card wizard** on the inventory-setup index replacing the current `InventorySetupIndexClient` redirect.
- **Four narrated stages**, each with: mini-welcome, why-it-matters, bot-benefit pitch, and an ordered **sub-step checklist**.
- **Soft-linear sequencing:** stages render in order; the current stage auto-expands; later stages can be opened to read their intro/why/benefits but their actionable sub-steps are **gated** with a clear lock reason until prerequisites are met. The existing dev-unlock flag (`isInventorySetupSectionsUnlockedForDev`) bypasses gating.
- **Deep-link orchestration:** every "Get started" / per-sub-step CTA routes into the existing section page (`suppliers`, `normalise`, `master-inventory-list`, `pos-items`, `recipes`, `storage-locations`).
- **Derived completion** for data-backed sub-steps (reuses `evaluateInventorySetupProgress` counts) + **persisted acknowledgements** for confirmation-only sub-steps and intro-seen state.
- **Staleness nudge:** a confirmed stage stays green but shows a non-blocking *"N new since you confirmed — review"* nudge when derived data drifts after an ack (mirrors `hasNewPendingSinceComplete`).
- **Scripted superbot narration** component, copy from a static typed config.
- **Wizard-state persistence:** one additive venue-scoped jsonb column; one `PATCH` endpoint; `GET progress` extended with a `wizard` block.

### Stages & sub-steps

| Stage | Sub-step | Completion source | Deep-link target |
|-------|----------|-------------------|------------------|
| **Suppliers** | Add supplier contacts | derived `supplierCount >= 1` | `…/suppliers` |
| | Add supplier items (raw items) | derived `rawItemCount >= 1` | `…/suppliers` (detail → raw items) |
| | Filter out non-inventory items | **ack** `suppliers.nonInventoryFiltered` (guided by `classifyRawItemBucket`) | `…/normalise` (or suppliers raw-item review) |
| **Inventory** | Normalise raw items → trackable ingredients | derived `pendingRawItemCount === 0 && rawItemCount >= 1` | `…/normalise` |
| | Create batches (multi-ingredient → new ingredient) | **ack** `inventory.batchesDone` (optional; "no batches" also satisfies) | `…/recipes` (batch recipe) |
| | Review master inventory list | **ack** `inventory.masterListReviewed` | `…/master-inventory-list` |
| **Products** | Import POS items from Square | derived `posImportRan` | `…/pos-items` |
| | Confirm modifiers imported & correct | **ack** `products.modifiersConfirmed` | `…/pos-items` (modifiers) |
| | Map a recipe for every in-use item | derived `mappedInUseCount === inUseMenuItemCount` (`inUseMenuItemCount === 0` also satisfies) | `…/pos-items` |
| | Confirm products | **ack** `products.confirmed` | — |
| **Storage Locations** | Add storage locations holding stock | derived `storageLocationCount >= 1` (**new count**) | `…/storage-locations` |

A **stage** is complete when all of its sub-steps are satisfied (derived ✔ or acked ✔). Stage gating: a stage's actions unlock when the prior stage is complete (soft-linear).

### Out of scope (deferred)

- Rebuilding any section page UI inline inside the card (deep-link only).
- Driving narration through the live `ai-agent-chat` agent (scripted only this pass).
- DB-editable narration copy (copy is versioned in code).
- A standalone `/setup` onboarding rework — that's [`onboarding`](../../onboarding/plan.md); this wizard lives inside Settings → Inventory Setup.
- Client analytics provider.

### Non-goals

- Replacing the phased domain logic in the parent `inventory-setup` triad.
- Cross-product package extraction (no second consumer).
- Re-deriving or duplicating completion logic — extend `evaluateInventorySetupProgress`, don't fork it.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | `entities/inventory-setup/` (config + `components/wizard/`) | §7.1 |
| Shell vs domain | Route page renders `<InventorySetupWizard>`; domain in `entities/` | §7.1 |
| Narration | Scripted local `SuperbotStageMessage` in `entities/inventory-setup/components/wizard/`; **not** coupled to `entities/ai-agent-chat/` | §7.1 |
| Auth dependency | `requireRequestAuth` + Drizzle RLS; Supabase JS for session only (per `AGENTS.md`) | §3.2, §8.1 |
| New package edges | **None** | §3.2, §10 |

> **Checklist F note:** supersolt routes auth through `@/lib/api/route-auth` + `@/utils/supabase/server` for session, not `@workspace/supabase` in app code — **n/a** with the same rationale as [`onboarding`](../../onboarding/plan.md) and [`supersolt-authentication`](../../supersolt-authentication/plan.md). No `@workspace/ui` consumer is modified to require Supabase.

## 4. Data model

Verify live via **`user-supabase-supersolt-mvp`** MCP (`list_tables`, `list_migrations`) before applying. Real completion stays **derived** — the only persisted addition is UI acknowledgement state.

### New column: `venues.inventory_setup_wizard_state`

```sql
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS inventory_setup_wizard_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.venues.inventory_setup_wizard_state IS
  'Inventory Setup Wizard UI state (not source of truth for completion). Shape: '
  '{ introSeen: string[], stageAcks: Record<stage, { at: string, by: uuid }>, '
  'subStepAcks: Record<ackKey, { at: string, by: uuid }> }.';
```

Shape (application-validated with Zod, stored as jsonb):

```ts
type InventorySetupWizardState = {
  introSeen: string[];                                   // stage ids whose welcome was shown
  stageAcks: Record<string, { at: string; by: string }>; // explicit "stage done" confirmations
  subStepAcks: Record<string, { at: string; by: string }>; // ack keys from §2 table
};
```

`ackKey` values are the stable strings in §2 (`suppliers.nonInventoryFiltered`, `inventory.batchesDone`, `inventory.masterListReviewed`, `products.modifiersConfirmed`, `products.confirmed`).

### RLS

No new table → reuse existing `venues` RLS. Reads ride existing venue-member select policy. Writes are constrained at the **service layer** by `assertInventorySetupWriteAccess` (manager+); the column is only written through the wizard-state service inside `ctx.appDb.rls(...)`.

| Concern | Rule |
|---------|------|
| Read `inventory_setup_wizard_state` | Any venue member (existing `venues` select RLS) |
| Write `inventory_setup_wizard_state` | manager+ enforced in service via `assertInventorySetupWriteAccess` |

### New derived count: `storageLocationCount`

Add to `evaluateInventorySetupProgress` inputs and `counts`. Source via `storage-locations.repo.ts` (count active locations for the venue).

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260613130000_venue_inventory_setup_wizard_state.sql` (sequence after `20260613120000_pos_catalog_groups_modifiers.sql`).
- **Pattern:** App-owned (§8.1 default).
- **After apply:** `pnpm drizzle:pull` in `apps/supersolt` (never hand-edit `drizzle/schema.ts`).
- **Remote apply (implementation session):** `apply_migration` on **`user-supabase-supersolt-mvp`** with the same SQL body, in order alongside committed files; optionally `generate_typescript_types`.
- **Backfill:** none — column defaults to `'{}'`.

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| Get progress + wizard model | Route GET (extend) | `…/inventory-setup/progress` | Venue member | Adds a `wizard` block (4 stages, sub-steps, derived/ack status, lock reasons, staleness) and `storageLocationCount` |
| Patch wizard state | Route POST/PATCH (new) | `…/inventory-setup/wizard-state` | manager+ | Body: `{ markIntroSeen?: stageId, setStageAck?: { stage, value }, setSubStepAck?: { key, value } }`; idempotent upsert into the jsonb |

### `wizard` block shape (added to `InventorySetupProgress`)

```ts
type WizardSubStep = {
  key: string;                 // completionKey or ackKey
  label: string;
  kind: "derived" | "ack";
  complete: boolean;
  locked: boolean;
  lockReason: string | null;   // e.g. "Add at least one supplier first"
  deepLink: string | null;     // scoped path or null
  stale: boolean;              // derived drifted after an ack (Suppliers/Products)
  staleCount: number;          // e.g. new pending raw items / new modifiers
};
type WizardStage = {
  id: "suppliers" | "inventory" | "products" | "storage";
  status: "complete" | "current" | "locked";
  introSeen: boolean;
  subSteps: WizardSubStep[];
};
type InventorySetupWizardModel = { stages: WizardStage[]; currentStageId: WizardStage["id"] };
```

The model is **composed** from `evaluateInventorySetupProgress` (derived) + the jsonb acks. Keep derivation in one place — extend the existing pure function, then map the four `InventorySetupStepId` steps + new counts + acks onto the four wizard stages in a new pure mapper `buildWizardModel(progress, wizardState)`.

### Validation

- Zod: `server/inventory-setup/wizard-state.schemas.ts` (PATCH body), reused by the route handler and the service.
- Stage/ack keys validated against the static config's known keys; unknown key → 400.
- Errors map to [`flows.md`](flows.md) §2.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/settings/inventory-setup/
│   ├── page.tsx                                  # renders <InventorySetupWizard> (replaces redirect client)
│   └── _components/
│       └── inventory-setup-index-client.tsx      # becomes thin wrapper / removed (dev-unlock note preserved)
├── entities/inventory-setup/
│   ├── lib/wizard-stages.ts                       # NEW — static typed 4-stage config + narration copy + sub-steps
│   ├── api/endpoints.ts                           # + patchWizardState; progress type extended
│   ├── model/
│   │   ├── types.ts                               # + WizardStage/SubStep/Model types
│   │   ├── useInventorySetupProgressQuery.ts      # returns wizard block
│   │   └── useWizardStateMutation.ts              # NEW — optimistic ack/intro PATCH
│   └── components/wizard/                          # NEW
│       ├── inventory-setup-wizard.tsx             # big card; orchestrates stages
│       ├── wizard-stage.tsx                        # one stage: header + collapsible body
│       ├── wizard-stage-intro.tsx                  # welcome / why / benefits panel
│       ├── wizard-substep-list.tsx                 # checklist rows + CTAs + lock/stale
│       └── superbot-stage-message.tsx              # scripted narration bubble
└── server/inventory-setup/
    ├── inventory-setup-progress.ts                 # + storageLocationCount + buildWizardModel
    ├── wizard-state.schemas.ts                     # NEW — Zod
    └── wizard-state.service.ts                     # NEW — read/patch jsonb (manager+ guard)
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Card, Collapsible/Accordion, Button, Progress, Badge, Tooltip | `@workspace/ui` | Reuse; no Supabase imports |
| `InventorySetupWizard`, `WizardStage`, `WizardStageIntro`, `WizardSubStepList` | `entities/inventory-setup/components/wizard/` | Domain composition (§7.1) |
| `SuperbotStageMessage` | `entities/inventory-setup/components/wizard/` | Scripted bubble; avatar/voice styled to match dashboard superbot, not the live agent |
| Stage config + copy | `entities/inventory-setup/lib/wizard-stages.ts` | Single source of narration + sub-step definitions |

### Theming

Tokens from `@workspace/ui` (§6); superbot accent reuses existing `--brand-supersolt-primary`. No new product override stylesheet.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — card, collapsible, button, progress, badge, tooltip.
- `@/lib/api/client` / `@/lib/api/fetcher.client` — client fetch via `entities/*/api/endpoints.ts`.
- `@/lib/api/route-auth`, `@/server/inventory-setup/inventory-setup-auth.ts` — auth + manager+ guard.
- `@/lib/build-scoped-path` — deep-link path building.
- `@/lib/inventory-setup/dev-unlock-all-sections` — gating bypass.

### New external deps

None.

### New package edges

None — no `ARCHITECTURE.md` update required.

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../.cursor/skills/commit-organizer/SKILL.md). Each commit leaves the tree green.

1. `docs(supersolt): plan inventory-setup setup-wizard feature` — this triad.
2. `feat(supersolt): add venue inventory_setup_wizard_state column` — migration + `drizzle:pull`.
3. `test(supersolt): red tests for wizard model + storage count` — see [`tdd.md`](tdd.md).
4. `feat(supersolt): add storageLocationCount + buildWizardModel mapper` — extend `inventory-setup-progress.ts`.
5. `feat(supersolt): wizard-state schema + service (manager+)`.
6. `feat(supersolt): wizard-state PATCH route + extend progress GET`.
7. `feat(supersolt): wizard-stages static config + narration copy`.
8. `feat(supersolt): InventorySetupWizard card + stages + substeps`.
9. `feat(supersolt): superbot scripted narration + staleness nudge`.
10. `feat(supersolt): replace index redirect with wizard; gating + dev-unlock`.
11. `chore(supersolt): structured wizard telemetry logs`.
12. `docs(supersolt): mark setup-wizard complete`.

## 9. Telemetry

Structured **server logs** only (consistent with inventory-setup Phase 1; no client analytics provider).

| Log prefix | Trigger | Payload |
|------------|---------|---------|
| `[inventory-setup-wizard] intro_seen` | PATCH `markIntroSeen` | `{ venueId, userId, stageId }` |
| `[inventory-setup-wizard] substep_acked` | PATCH `setSubStepAck` | `{ venueId, userId, key, value }` |
| `[inventory-setup-wizard] stage_confirmed` | PATCH `setStageAck` | `{ venueId, userId, stage, value }` |
| `[inventory-setup-wizard] stage_completed` | Derived stage flips complete (computed in `buildWizardModel`, logged in progress GET when newly true) | `{ venueId, stage }` |

## 10. Rollout

- **Feature flag:** none — ship as the new default index experience (beta), consistent with inventory-setup Phase 1.
- **Env vars:** none new. `isInventorySetupSectionsUnlockedForDev` dev-unlock continues to bypass gating.
- **Migration sequencing:** apply `20260613130000_venue_inventory_setup_wizard_state.sql` **before** deploy (local + remote via supersolt MCP `apply_migration`).
- **Backout:** revert app deploy; the additive jsonb column is harmless and forward-only.

## 11. Open questions

- [ ] "Filter non-inventory items" deep-link target: dedicated suppliers raw-item review screen vs the existing normalise queue's non-inventory bucket — owner: product, due: implementation kickoff. (Lean: reuse normalise queue's `likely_non_inventory` bucket.)
- [ ] Batches sub-step: surface a "Skip — no batches" affordance that sets `inventory.batchesDone` vs always require an explicit recipe — owner: product, due: implementation kickoff. (Lean: provide the skip affordance.)

## 12. Cross-references

- Parent feature: [`../plan.md`](../plan.md), [`../flows.md`](../flows.md), [`../tdd.md`](../tdd.md)
- Phase deps: [`../unit-normalisation/plan.md`](../unit-normalisation/plan.md), [`../pos-catalog-import/plan.md`](../pos-catalog-import/plan.md), [`../pos-recipe-inline-create/plan.md`](../pos-recipe-inline-create/plan.md)
- Onboarding (separate surface): [`../../onboarding/plan.md`](../../onboarding/plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
