# Supersolt domain vocabulary

Terms for architectural seams and bounded contexts in `apps/supersolt`.

## Invoice intake pipeline

Stages for operator-facing invoice management: **listing** (list/detail), **intake** (upload/parse), **linking** (PO match, duplicate detection), **review** (confirm/dispute/approve), **inbox** (venue email setup). Orchestrated via `server/invoices/invoices.service.ts` barrel.

## Agent tool scope

Adapter at `server/agent/agent-tool-scope.ts` for tenant/venue access in agent chat tools (`loadAgentAccessContext`, `resolveAgentVenueScopeForNavigation`).

## Onboarding module gates

Rules in `lib/onboarding/module-gates.ts` for which route suffixes unlock before setup finalize (server computes `unlockedRouteSuffixes` in onboarding state).

## Venue readiness gates

Per-venue prerequisite graph in `server/readiness/` — unlocks purchasing, stock counts, and roster for managers/admins after setup finalize. Surfaces blockers via dashboard Superbot, locked sidebar modal, and server route guards.

## Sales insights payload

Primary service seam: `loadSalesInsightsOrders` / `getSalesInsightsOrders` in `server/sales/sales-insights.service.ts` — Square + demo orders for a venue date range.

## Roster orchestration

Workforce roster split into week assembly, shift CRUD, publish (timesheet handoff), and autofill modules under `server/workforce/roster-*.service.ts`, barrelled by `roster.service.ts`.
