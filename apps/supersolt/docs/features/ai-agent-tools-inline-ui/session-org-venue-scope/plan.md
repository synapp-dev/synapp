# AI agent: session org / venue scope

> **Product:** `apps/supersolt`
> **Slug:** `ai-agent-tools-inline-ui/session-org-venue-scope` (child of [`../plan.md`](../plan.md))
> **Status:** Shipped
> **Owner:** TBD
> **Created:** 2026-05-12

## 1. Summary

On **`/agent`**, tenant-scoped tools (for example [`suggestAppNavigation`](../nav-link-cards/plan.md)) require **explicit `organisationSlug` and `venueSlug`**. When the user asks a natural question such as “what are my ingredients” **without** naming a venue, the model currently guesses or omits slugs and the user sees a **generic access error** instead of a recoverable flow.

This slice delivers **three cooperating layers**: (1) the **main app shell** already loads accessible orgs/venues (e.g. [`useAccessibleVenueGroupsQuery`](../../../../entities/venues/model/useAccessibleVenueGroupsQuery.ts) / same payload shape as **`GET /api/access/context`**); **`POST /api/agent/chat`** accepts an optional **client-supplied access snapshot** so the server **does not repeat the same read** on every turn when the shell has fresh data. (2) **Deterministic product UI** on or beside `/agent` can ask **non-LLM** questions (“Current venue only?”, “Which organisation?”, “All venues or one?”) and set **focus slugs** / scope mode before or after send—so the first clarification step does **not** depend on the model calling a tool. (3) A **read-only** `listAccessibleTenants` tool (plus optional `matchAccessibleTenants`) remains a **fallback** when no snapshot is sent, the client cache is empty, or the model still needs server-normalised data after the user types free text. **Server-side hint ranking** stays optional for fuzzy follow-ups. **Tool `execute` paths continue to re-validate membership**; the snapshot is **UX and prompt context only**, never an ACL bypass.

## 2. Scope

### In scope (MVP)

- **Shared server module** that builds the **access context payload** (organisations with nested venues, slugs, display names, light location fields already returned by the API) for reuse by **`app/api/access/context/route.ts`** and, when needed, **`POST /api/agent/chat`** — **no duplicate query logic** inside the server ([`app/api/access/context/route.ts`](../../../../app/api/access/context/route.ts)).
- **Chat request body: optional `accessContext` snapshot** — same **logical shape** as `GET /api/access/context`’s `data` object (Zod-validated on the server). **Source:** values the shell already holds from **`useAccessibleVenueGroupsQuery`** (or equivalent). When present and valid, the Route Handler **may skip calling the shared loader** for that request’s **prompt assembly only**; it **must not** skip membership checks inside tenant tool `execute` functions.
- **Chat request body: `focusOrganisationSlug` / `focusVenueSlug`** (same PR as snapshot)—set from **current shell context** (e.g. active org/venue in the main app). **Non-authoritative** for ACL; invalid pair **ignored silently**; valid pair **injected** into model context so the model does not guess. **Single-venue users** can auto-proceed without an extra LLM “list” step.
- **Deterministic scope clarification UI** on the `/agent` experience (in `entities/ai-agent-chat/` or route-colocated client): when the user’s message is **tenant-vague** and **multiple** venues exist, show a **small control** (copy can mirror [`venue-switcher`](../../../../components/organisms/venue-switcher.tsx) semantics) to choose **one org**, **one venue**, or explicitly **“current venue only”** / **“I need to pick another”**—**no LLM required** for that branch. “All orgs / all venues at once” for **navigation** remains **unsupported** for MVP (assistant explains one destination per card); cross-venue batch can be a later product call.
- **Read-only tool** `listAccessibleTenants`: **fallback** when `accessContext` is absent, stale, or failed client validation—returns Zod-normalised JSON for the model.
- **Optional tool** `matchAccessibleTenants` — bounded hints; **reloads** context server-side **or** ranks against snapshot+server merge (implementation choice); deterministic ranking tests.
- **System prompt rules** on [`app/api/agent/chat/route.ts`](../../../../app/api/agent/chat/route.ts): never call **`suggestAppNavigation`** without a resolved `(organisationSlug, venueSlug)` from **focus**, **user text**, **snapshot-informed disambiguation**, or **`listAccessibleTenants` / `matchAccessibleTenants`**—in priority order defined in implementation (document in [`flows.md`](flows.md)).

### Out of scope (deferred)

- **Persisted** “agent session scope” in Postgres or cross-device sync.
- **Full product analytics** on picker usage.
- **New `packages/*`** for access-context types until a second app consumes them ([ARCHITECTURE.md §5.1](../../../../../../ARCHITECTURE.md)).
- **Single navigation action** that opens **every** venue simultaneously (card explosion); defer unless product defines UX.

### Non-goals

- Replacing **`/access/context`** for the rest of the app or changing its JSON contract for existing clients (refactor **internal** extraction only unless a additive field is agreed).
- **Write** tools or changing org/venue membership from the agent.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | `server/access/` (shared loader) + `entities/ai-agent-chat/lib/` (Zod, ranking helpers, tests) + `app/api/agent/chat/route.ts` (tool registration) | §7.1 |
| Shell vs domain | **`AgentChatPanel`** (or `/agent` client island) passes **snapshot + focus** into `POST /api/agent/chat`; optional **scope clarification** UI lives in **`entities/ai-agent-chat/`** per §7.1 | §7.1 |
| Auth dependency | `@/utils/supabase/server` in Route Handler / tool `execute` only (align with parent agent plan — **not** `@workspace/supabase` in this app today) | §3.2 |
| New package edges | None | §3.2, §10 |

### Architecture compliance (pre-ship gate)

Walk [build-feature checklists/architecture.md](../../../../../../.cursor/skills/build-feature/checklists/architecture.md). **Checklist F (workspace supabase):** for Supersolt this feature remains **`@/utils/supabase/server`** — treat checklist item as **n/a** with same rationale as parent [`../plan.md`](../plan.md) gate note. Run **`pnpm lint:architecture`** from the monorepo root after implementation ([ARCHITECTURE.md §4.2](../../../../../../ARCHITECTURE.md)).

## 4. Data model

### Tables / columns

**MVP:** none (reads existing membership + venue tables via shared loader).

```sql
-- Intentionally empty — no DDL for session scope MVP.
```

### RLS

No new tables. Loader uses the **same** Supabase queries as today’s **`/api/access/context`**; RLS unchanged.

### Migration ownership

- **Path:** n/a for MVP.
- **Pattern:** App-owned ([ARCHITECTURE.md §8.1](../../../../../../ARCHITECTURE.md)) if persistence is added later.
- **Backfill:** n/a.

### Generated types

No change to **[`utils/supabase/types.ts`](../../../../utils/supabase/types.ts)** unless the loader introduces new selects (prefer **no** new columns in MVP).

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Access context (existing) | Route Handler | **`GET /api/access/context`** | Session | Body unchanged for clients; implementation **delegates** to shared loader |
| Agent chat (extended body) | Route Handler | **`POST /api/agent/chat`** | Session | Optional **`accessContext`**, **`focusOrganisationSlug`**, **`focusVenueSlug`** (see §2); Zod bounds on array sizes / string lengths |
| List tenants (new) | Tool on **`POST /api/agent/chat`** | **`listAccessibleTenants`** | Session | Fallback when snapshot missing; returns same logical shape; Zod-normalised |
| Match hints (new, optional in same PR) | Tool | **`matchAccessibleTenants`** | Session | Input: bounded hints; output: ranked candidates or `noMatch` |

### Validation

- **Tool args/results:** Zod under `entities/ai-agent-chat/lib/` (e.g. `accessible-tenants-tool-schema.ts`).
- **Ranking:** pure functions under `entities/ai-agent-chat/lib/` with Vitest tables.
- **Error mapping:** every failure maps to a row in [`flows.md`](flows.md) §2.

## 6. UI composition

**Primary:** deterministic **scope clarification** (org/venue / current-only / pick another) using **`@workspace/ui`** primitives, fed by the **same data** the shell already loaded (passed into `AgentChatPanel` props or read from existing store/query where appropriate). **Secondary:** assistant prose when the user over-specifies or contradicts the picker.

| Component | Source | Notes |
|-----------|--------|-------|
| Scope strip / modal / inline step | `entities/ai-agent-chat/components/` (name TBD) | Shown when tenant-vague + multi-venue; sets **focus** before `sendMessage` or opens picker without sending |
| Chat thread | `agent-chat-panel.tsx` | Forwards **`accessContext` + focus** on each `POST`; shows `tool-listAccessibleTenants` loading only in **fallback** path |
| Copy reference | [`venue-switcher.tsx`](../../../../components/organisms/venue-switcher.tsx) | Labels / grouping patterns only — no forced dependency |

## 7. Dependencies

### Existing packages used

- **`ai`**, **`@ai-sdk/openai`** — tool streaming ([parent plan](../plan.md)).
- `@/utils/supabase/server` — session in tools.

### New external deps

- None.

### New package edges

- None ([ARCHITECTURE.md §10](../../../../../../ARCHITECTURE.md)).

## 8. Implementation order (commits)

Per [commit-organizer](../../../../../../.cursor/skills/commit-organizer/SKILL.md); each commit leaves the tree green.

1. `refactor(supersolt): extract access context loader for API and agent` — shared module + `GET /api/access/context` delegates; behaviour parity tests or snapshot of shape.
2. `test(supersolt): add tenant hint ranking unit tests` — pure ranking from fixtures.
3. `feat(supersolt): add listAccessibleTenants (+ optional match) tools to agent chat` — Zod + logging.
4. `feat(supersolt): agent chat body accessContext + focus + scope UI` — wire [`useAccessibleVenueGroupsQuery`](../../../../entities/venues/model/useAccessibleVenueGroupsQuery.ts) (or parent props) into `AgentChatPanel`; system prompt + [`flows.md`](flows.md).
5. `docs(supersolt): mark session-org-venue-scope ready` — flip **Status** here when shipped.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `agent.tool.access_context_started` | `listAccessibleTenants` execute begins | `{ request_id?, org_count }` — no email | Server logs |
| `agent.tool.access_context_finished` | Success | `{ request_id?, org_count, venue_count }` | Server logs |
| `agent.chat.access_context_injected` | Request used **client snapshot** (loader skipped for prompt) | `{ request_id?, org_count, venue_count }` | Server logs |
| `agent.tool.access_context_denied` | Auth / unexpected failure | `{ request_id?, reason_code }` | Server logs |
| `agent.tool.tenant_match_started` | `matchAccessibleTenants` begins | `{ request_id? }` — no raw user message in logs by default | Server logs |

**MVP:** log **counts** and **reason codes**, not full user prompts ([parent §9](../plan.md)).

## 10. Rollout

- **Feature flag:** none — ships with agent; backout via revert.
- **Env vars:** none new.
- **Migration sequencing:** n/a.
- **Backout:** revert PR; restore inline handler in `access/context` if refactor must be isolated.

## 11. Open questions

- [ ] **Single-tool vs two-tool** UX for the model (list-only fallback vs list + match in v1) — owner: engineering; default: **both** if ranking is low effort.
- [x] **Client snapshot + `focus*` hints** — **same PR** as agent scope work; sourced from main shell query/store ([§2](#2-scope)).
- [ ] **Scope UI pattern** — inline strip vs modal vs first-send blocker — owner: product + design.

## 12. Cross-references

- Parent: [`../plan.md`](../plan.md) — §12 links this sub-feature.
- Navigation cards: [`../nav-link-cards/plan.md`](../nav-link-cards/plan.md)
- Access context implementation: [`app/api/access/context/route.ts`](../../../../app/api/access/context/route.ts)
- Architecture: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
