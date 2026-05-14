# Contextual agent right sidebar

> **Product:** `apps/supersolt`
> **Slug:** `contextual-agent-right-sidebar`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-12

## 1. Summary

Add a **global right sidebar** on signed-in **`(main)`** routes—using the same **`@workspace/ui`** sidebar primitives used elsewhere in the monorepo (e.g. intradark’s shell)—so the **same in-tab agent conversation** as **`/agent`** can continue after **in-app navigation** (for example via **navigation link cards** from [`ai-agent-tools-inline-ui/nav-link-cards`](../ai-agent-tools-inline-ui/nav-link-cards/plan.md)). On **`/agent`**, the shell **does not** render the right sidebar (full-width dedicated chat). When the user **leaves `/agent`** with an active thread, the sidebar **auto-opens and stays expanded** (MVP). Conversation state remains **ephemeral per browser tab** (lifted **`useChat`**); **optional pathname / page label** is sent on each request to **`POST /api/agent/chat`** for contextual grounding. **No** new Postgres tables, **no** feature flag, **no** new product analytics SDK in this slice.

## 2. Scope

### In scope (MVP)

- **`RightSidebarProvider`** + **`AppRightSidebar`** (new) + **`RightSidebarTrigger`** in **`AppHeader`**, wired from **`app/(main)/layout.tsx`** (client layout, consistent with today).
- **Shared client provider** under **`entities/ai-agent-chat/`** holding **one `useChat`** instance + transport; **`AgentChatPanel`** consumes context and supports at least **`variant: "full" | "sidebar"`** (or equivalent layout props) for density.
- **Hide** right chrome on **`pathname === "/agent"`** (exact match for MVP unless product asks for nested routes).
- **Auto-open + expanded** right sidebar when navigating from **`/agent`** to any other **`(main)`** route while the session has a **non-empty** message list (MVP heuristic; refine “tool-originated only” later if needed).
- **Extend `POST /api/agent/chat`** JSON body with optional **`pathname`** / **`pageLabel`**; **Zod** parse + **sanitize**; **omit from prompt** if invalid—**never** 4xx solely for bad page context ([`flows.md`](flows.md) §2).
- **Tests** per [`tdd.md`](tdd.md) (**Vitest + RTL**); **`pnpm lint:architecture`** clean after implementation ([ARCHITECTURE.md §4.2](../../../../../ARCHITECTURE.md)).

### Out of scope (deferred)

- **Persisted threads** (`chat_threads` / `chat_messages`) and cross-device history.
- **`sessionStorage` / `localStorage`** replay of messages after refresh.
- **Playwright E2E** in-repo (no harness today); manual smoke steps live in [`flows.md`](flows.md).
- **New `packages/*`** or **app-to-app** reuse of intradark implementation files ([ARCHITECTURE.md §3.1](../../../../../ARCHITECTURE.md), §5.1).
- **Telemetry pipeline** (Posthog, etc.)—backlog only (§9).

### Non-goals

- Replacing the **dedicated `/agent`** experience; it remains the primary full-screen workspace.
- **Automatic page summarization** or scraping DOM content beyond **pathname / label** the client chooses to send.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | `entities/ai-agent-chat/` — provider, `AgentChatPanel`, Zod for page context, transport `prepareSendMessagesRequest` | §7.1 |
| Shell vs domain | `components/organisms/` — `AppRightSidebar`, header trigger only; **no** second atomic library in `components/` | §7.1 |
| Auth dependency | Unchanged: server **`/api/agent/chat`** uses existing Supersolt server Supabase helpers; **no** new `@supabase/*` imports in client chat code | §3.2 |
| New package edges | None | §3.2, §10 |

> **Pattern reference:** intradark’s **`(main)/layout.tsx`** + **`AppRightSidebar`** + **`RightSidebarProvider`** is a **behavioral template only**—do **not** import across `apps/*`.

### Architecture compliance (pre-ship gate)

Walk [build-feature checklists/architecture.md](../../../../../.cursor/skills/build-feature/checklists/architecture.md). This slice: **§8 migrations n/a** (no DDL). When persistence is added later, follow app-owned migrations under **`apps/supersolt/supabase/migrations/`** (see sibling feature [§4 in `ai-agent-tools-inline-ui/plan.md`](../ai-agent-tools-inline-ui/plan.md)).

## 4. Data model

### Tables / columns

**MVP:** none.

```sql
-- Intentionally empty for MVP (shared useChat in layout provider only).
```

### RLS

**MVP:** n/a.

### Migration ownership

- **Path:** n/a for MVP.
- **Pattern:** App-owned ([ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)) when persistence ships.
- **Backfill:** n/a.

### Generated types

No schema change in MVP.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Stream chat (extended) | Route Handler | `POST /api/agent/chat` | Session user (existing) | Add optional `pathname`, `pageLabel`; validate; append safe line to system context; strip on failure |

### Validation

- **Input schema:** new Zod module under `entities/ai-agent-chat/lib/` (e.g. `agent-chat-page-context-schema.ts`) — max lengths, string types, optional empty → undefined.
- **Error mapping:** invalid page context **does not** surface as user-visible chat failure; see [`flows.md`](flows.md) §2 row “Invalid page context”.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/
│   ├── layout.tsx              # SidebarProvider + RightSidebarProvider + AgentChatProvider + chrome order
│   └── agent/page.tsx          # Full-width AgentChatPanel only (no right shell)
├── components/organisms/
│   ├── app-header.tsx          # + RightSidebarTrigger (hidden on /agent if trigger would noop)
│   └── app-right-sidebar.tsx   # NEW: RightSidebar + AgentChatPanel variant="sidebar"
└── entities/ai-agent-chat/
    ├── components/agent-chat-panel.tsx   # Refactor to consume shared chat context
    └── components/ (or lib/)    # NEW: agent-chat-provider.tsx, page context helpers
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| `RightSidebar`, `RightSidebarProvider`, `RightSidebarTrigger` | `@workspace/ui` | Reuse; do not fork |
| `AppRightSidebar` | `components/organisms/` | Shell only |
| `AgentChatProvider`, `AgentChatPanel` | `entities/ai-agent-chat/` | Domain |

### Theming

Tokens from **`@workspace/ui`** (§6). No new global override required unless visual QA gaps appear.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — sidebar + triggers + layout primitives used by chat UI today.
- `@ai-sdk/react`, `ai` — existing `useChat` / transport.

### New external deps

- None planned.

### New package edges

- None.

## 8. Implementation order (commits)

Granular conventional commits; each leaves the tree green.

1. `feat(supersolt): add agent chat layout provider` — extract **`useChat`** to **`AgentChatProvider`**; **`AgentChatPanel`** reads context; **`/agent`** unchanged visually.
2. `feat(supersolt): wire right sidebar shell in main layout` — **`RightSidebarProvider`**, **`AppRightSidebar`**, header trigger; hide sidebar on **`/agent`**.
3. `feat(supersolt): agent sidebar auto-open on leave agent route` — pathname effect + **`useRightSidebar().setOpen`** (or equivalent API on provider).
4. `feat(supersolt): pass page context in agent chat API` — Zod + system append in **`route.ts`**.
5. `test(supersolt): cover page context schema and shell rules` — files from [`tdd.md`](tdd.md).
6. `chore(supersolt): lint architecture` — fix any boundary warnings from new imports.

## 9. Telemetry

**MVP:** none wired.

| Event (backlog) | Trigger | Payload (sketch) | Destination |
|-----------------|---------|------------------|-------------|
| `agent.sidebar.opened` | User opens via trigger | `{ pathname }` | TBD provider |
| `agent.sidebar.auto_opened` | Auto-open after `/agent` | `{ from: "/agent", to: pathname }` | TBD |
| `agent.message.sent` | Send | `{ source: "sidebar" \| "agent_page" }` | TBD |

## 10. Rollout

- **Feature flag:** none — **always on** for `(main)` after merge.
- **Env vars:** none new for this slice.
- **Migration sequencing:** n/a (no DDL).
- **Backout:** revert PR; users lose only in-flight sidebar session state.

## 11. Open questions

- [ ] **Nested routes under `/agent`** — if added later, widen “hide chrome” pathname rule — owner: TBD, due: when `/agent/*` ships.
- [ ] **Mobile UX** — confirm **`RightSidebar`** breakpoint behavior matches product expectations; owner: TBD, due: first QA pass.

## 12. Cross-references

- Parent agent feature: [`ai-agent-tools-inline-ui/plan.md`](../ai-agent-tools-inline-ui/plan.md)
- Navigation cards: [`ai-agent-tools-inline-ui/nav-link-cards/plan.md`](../ai-agent-tools-inline-ui/nav-link-cards/plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
