# AI agent: tools + inline UI widgets

> **Product:** `apps/supersolt`
> **Slug:** `ai-agent-tools-inline-ui`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-12

## 1. Summary

Add an **LLM-backed assistant** for hospitality operators that lives on a **dedicated `/agent` route**—**above** the usual org/venue shell—so one session can answer questions that may span **multiple organisations and venues** the user legitimately has access to. The assistant understands **natural-language** questions, calls a **fixed allowlist** of **read-only server tools** (for example listing **Square payments / transactions** via existing server modules such as `server/square/list-payments.ts`), and renders **structured inline widgets** in the chat thread (tables, KPI-style summaries, empty and error states). The model **never** emits executable JSX or arbitrary layout; the **client maps** tool results to a **small, typed widget registry**. **Every tool** that reads tenant data **must** take explicit org/venue identifiers (or resolve them server-side) and **re-validate membership** before calling existing domain code—**no** implicit “current URL venue” trust. Conversation state is **ephemeral** for MVP (no new Postgres tables). Shipping is **straight to production** when the feature merges—**backout** is **revert deploy**; provider credentials stay **server-only**.

## 2. Scope

### In scope (MVP)

- **Streaming chat** from a **`POST` Route Handler** with **authenticated user**; tenant scope is **not** implied by `/agent` URL alone—tools enforce **per-org / per-venue** access on each invocation (same membership rules as the rest of Supersolt).
- **Read-only tools** with strict **Zod** validation of arguments and results; tools call **existing server code** or internal APIs—no open-ended HTTP from the model.
- **Inline widgets:** a **small fixed set** (e.g. data table, summary metrics row, empty state, tool-error card) driven by **tool name + JSON payload** (or equivalent structured parts in the streaming protocol).
- **Error and alternate flows** per [`flows.md`](flows.md) (session, scope, provider, tool, validation, cancel, offline).
- **Server-side structured logging** for request lifecycle and tool invocations (no PII, no full prompts by default).
- **Navigation link cards** (typed in-app destinations from a catalog tool)—see [§12 Sub-features](#12-sub-features) · [`nav-link-cards/plan.md`](nav-link-cards/plan.md).

### Out of scope (deferred)

- **Write tools** (refunds, edits, inventory adjustments) and **non-read-only** side effects.
- **Persisted** `chat_threads` / `chat_messages` / `tool_invocations` tables and cross-device history.
- **Voice**, **arbitrary HTML/JSX** from the model, **user-defined plugins**, and **“run any code”** agents.
- **Client product analytics SDK** and Playwright E2E (see [`tdd.md`](tdd.md)); optional manual smoke only.
- **New `packages/*`** until a **second app** consumes the same contract ([ARCHITECTURE.md §5.1](../../../../../ARCHITECTURE.md)).

### Non-goals

- Building a **general copilot** that can perform every action in the product.
- **Cross-product** reuse or imports between `apps/*` ([ARCHITECTURE.md §3.1](../../../../../ARCHITECTURE.md)).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | **`/agent` route tree** under `app/(main)/agent/` (page + route-colocated client island) + `entities/ai-agent-chat/` for thread, composer, widget registry, tool schemas | §7.1 |
| Shell vs domain | Product shell stays in `components/` only if needed for nav entry; **chat compositions** live in `entities/` | §7.1 |
| Auth dependency | `@/utils/supabase/server` (and related app helpers)—**not** `@workspace/supabase` today; **no** service role or secrets in client components | §3.2 |
| New package edges | None | §3.2, §10 |

### Architecture compliance (pre-ship gate)

Walk [build-feature checklists/architecture.md](../../../../../.cursor/skills/build-feature/checklists/architecture.md). For this feature: **§8 migrations n/a** for MVP (no DDL); when persistence is added later, use **`apps/supersolt/supabase/migrations/`** ([ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)). Run **`pnpm lint:architecture`** from the monorepo root after implementation ([ARCHITECTURE.md §4.2](../../../../../ARCHITECTURE.md)).

> **Checklist note (gate F):** Monorepo checklist references `@workspace/supabase`; Supersolt uses **`@/utils/supabase/*`**. This feature must **not** introduce `@workspace/ui` → Supabase coupling ([ARCHITECTURE.md §3.2](../../../../../ARCHITECTURE.md)).

## 4. Data model

### Tables / columns

**MVP:** none. No new Supabase tables, columns, or RLS policies for this slice.

```sql
-- Intentionally empty for MVP (ephemeral chat only).
-- Future persistence (deferred): chat_threads, chat_messages, tool_invocations
-- with venue-scoped RLS — see Rollout / Open questions.
```

### RLS

**MVP:** n/a (no new tables).

### Migration ownership

- **Path (future only):** `apps/supersolt/supabase/migrations/`
- **Pattern:** App-owned ([ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)).
- **Backfill:** n/a for MVP.

### Generated types

No schema change in MVP; **`utils/supabase/types.ts`** unchanged unless a later phase adds persistence.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Stream chat + tool loop | Route Handler | e.g. **`app/api/agent/chat/route.ts`** (single entry; no org/venue in URL) | **Session required**; tools receive explicit tenant ids/slugs in args where needed and **each** tool asserts the user may read that org/venue before calling domain code | Validates body (messages, optional client request id, optional UI “focus” hints); runs model; executes tools **only** on server; streams tokens + tool parts |
| (Existing) domain reads | Server modules / internal routes | e.g. `server/square/list-payments.ts`, `app/api/organisations/.../insights/...` | Already enforced | Tools **wrap** these—do not duplicate business rules |

### Validation

- **Input:** Zod schema for the chat request body (message list bounds, optional client request id, optional **default org/venue focus** for the UI only—**never** a substitute for tool-level authz).
- **Tools:** per-tool Zod for args and normalized results before the model sees them and before the client maps widgets.
- **Error mapping:** every failure maps to a row in [`flows.md`](flows.md) §2.

## 6. UI composition

The **agent** is a **first-class top route** (`/agent`), not nested under `[organisation]/[venue]/`, so navigation and layout can treat it as **platform-wide** while tools still respect **tenant ACLs**.

```
apps/supersolt/
├── app/(main)/agent/
│   ├── page.tsx                      # Server shell: auth gate; no tenant in path
│   ├── agent-chat-client.tsx         # Client island: stream + composer + message list (name TBD)
│   └── loading.tsx
├── app/api/agent/
│   └── chat/route.ts                 # Streaming POST (see §5)
├── entities/ai-agent-chat/
│   ├── components/                   # ChatThread, MessageBubble, ToolResultWidgets, registry
│   ├── lib/                          # schemas, redaction, tool-name → widget mapping
│   └── hooks/                        # useAgentChat, etc.
└── components/                       # Shell only — global nav link to `/agent` if needed
```

Optional: colocate small pieces under `app/(main)/agent/_components/` if that matches other `(main)` routes in this app; keep **domain** logic in `entities/ai-agent-chat/` per [ARCHITECTURE.md §7.1](../../../../../ARCHITECTURE.md).

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Button, Card, ScrollArea, Table, Skeleton, Alert | `@workspace/ui` | Reuse; do not fork primitives ([§5.2, §7.1](../../../../../ARCHITECTURE.md)) |
| `ChatThread`, `ToolResultRenderer`, registry | `entities/ai-agent-chat/components/` | Maps **known** tool outputs to widgets; unknown → safe fallback |

### Theming

- Tokens from `@workspace/ui` ([ARCHITECTURE.md §6](../../../../../ARCHITECTURE.md)).
- Product overrides only via existing `apps/supersolt/app/globals.css` import order if needed.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — layout, buttons, tables, feedback.
- `@supabase/ssr`, `@supabase/supabase-js` — via **`@/utils/supabase/*`** (session in Route Handler).

### New external deps

- **`ai`** (Vercel AI SDK) **and** a provider package (e.g. **`@ai-sdk/openai`** or Vercel AI Gateway client)—**justification:** streaming responses, tool calling, and structured parts with a supported pattern. Pin versions in `apps/supersolt/package.json`; keep API keys **server-only**.

### New package edges

- None ([ARCHITECTURE.md §10](../../../../../ARCHITECTURE.md)).

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../.cursor/skills/commit-organizer/SKILL.md). Each commit should leave the tree green.

1. `test(supersolt): add ai-agent chat schemas and widget registry tests` — Zod + mapping from [`tdd.md`](tdd.md).
2. `feat(supersolt): add /api/agent/chat Route Handler` — session gate + streaming stub (no tools yet).
3. `feat(supersolt): wire read-only tools to server modules` — each tool asserts org/venue access; structured results.
4. `feat(supersolt): add /agent page and client stream UI` — `entities/ai-agent-chat` + route-colocated client island.
5. `feat(supersolt): handle agent error and alternate flows` — maps to [`flows.md`](flows.md).
6. `chore(supersolt): structured server logs for agent chat` — durations, tool success/failure (no PII).
7. `docs(supersolt): mark ai-agent-tools-inline-ui complete` — flip **Status** in this file when shipped.

Optional later: open `/agent` from a **sheet** launched elsewhere; the **canonical route** remains **`/agent`** with the same API and auth rules.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `agent.chat.request_started` | Valid POST received | `{ request_id }` — **no** email, **no** prompt text | Server logs / observability |
| `agent.chat.request_finished` | Stream completes | `{ duration_ms, finish_reason }` | Server logs |
| `agent.tool.invoked` | Tool execution starts | `{ tool_name, organisation_id?, venue_id? }` — ids only if tool is tenant-scoped | Server logs |
| `agent.tool.failed` | Tool throws or returns error shape | `{ tool_name, error_code }` — **no** raw upstream bodies | Server logs |

**MVP:** no client analytics SDK events—names above are **implementation suggestions** for log lines, not a third-party product contract.

## 10. Rollout

- **Feature flag:** **None** (grill-me: ship when code is in production; disable by **revert deploy**).
- **Env vars:** Document in the app’s env template when one exists (e.g. `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY`)—**server-only**, never `NEXT_PUBLIC_*` for secrets. Add entries when `env.example` (or equivalent) is introduced for Supersolt.
- **Migration sequencing:** n/a for MVP (no DDL).
- **Backout:** Revert the PR or redeploy the previous artifact; no DB rollback required.

## 11. Open questions

- [ ] **Exact provider** (OpenAI direct vs Vercel AI Gateway vs other)—owner: engineering, due: before first merge.
- [ ] **Default org/venue “focus”** for `/agent` — **resolved in** [`session-org-venue-scope/plan.md`](session-org-venue-scope/plan.md): same PR ships **`accessContext` snapshot** from shell + **`focusOrganisationSlug` / `focusVenueSlug`** + deterministic **scope clarification UI**; tools still enforce ACLs on `execute`.
- [ ] **First tool catalog** beyond payments (e.g. sales insights)—owner: product, due: post-MVP prioritisation.

## 12. Sub-features

Phased work that **extends** the same `/agent` + `/api/agent/chat` stack without forking product rules. Each child folder has its own **plan / TDD / flows** triad; implementation should stay compatible with the parent widget registry and tool allowlist.

| Sub-feature | Spec | Ships |
|-------------|------|--------|
| **Navigation link cards** | [`nav-link-cards/plan.md`](nav-link-cards/plan.md) · [`tdd.md`](nav-link-cards/tdd.md) · [`flows.md`](nav-link-cards/flows.md) | In-app **destination cards** (catalog keys → `Link`) after membership check; first destination **ingredients**. |
| **Session org / venue scope** | [`session-org-venue-scope/plan.md`](session-org-venue-scope/plan.md) · [`tdd.md`](session-org-venue-scope/tdd.md) · [`flows.md`](session-org-venue-scope/flows.md) | **Shipped:** `accessContext` + `focus*` on chat POST; scope bar; `listAccessibleTenants` tool; server loader shared with `/api/access/context`. |

**Future (not specced yet):** optional siblings such as **DB-backed catalog**, **role-filtered destinations**, or **client click analytics**—add a new row + folder when groomed.

## 13. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Prior art (auth placement tone): [`../supersolt-authentication/plan.md`](../supersolt-authentication/plan.md)
- Notion Agent row: [Module Overview](https://www.notion.so/34f64094bde68003a437faeae06a6bf5)
- Program: [`module-overview-program.md`](../../module-overview-program.md)

## Compliance audit (program 2026-06-01)

| Notion Agent | Status | Notes |
|--------------|--------|-------|
| `/agent` multi-tenant chat | **Partial** | Plan + route exist |
| Tool allowlist + widgets | **Partial** | Square payments; nav cards sub-feature |
| Onboarding-driven agent on `/setup` | **Missing** | See [`onboarding/plan.md`](../onboarding/plan.md) |
| Nav targets `purchasing/*` | **Verify** | [`app-navigation-catalog.ts`](../../../entities/ai-agent-chat/lib/app-navigation-catalog.ts) |

**Updated:** 2026-06-01
