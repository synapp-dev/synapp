# Contextual agent right sidebar — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code. Each item is a single behavior. Order matters: earlier items unblock later ones.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `parseAgentChatPageContext` (or equivalent) accepts normal pathname + label and returns trimmed safe strings | `apps/supersolt/entities/ai-agent-chat/lib/agent-chat-page-context-schema.test.ts` | red |
| 2 | unit | Oversized / wrong-type / non-string inputs yield **undefined** (or empty) fields — never throw | same | red |
| 3 | unit | `shouldShowAgentRightShell(pathname)` (or equivalent) is **false** for `/agent`, **true** for representative `/(org)/(venue)/...` paths | `apps/supersolt/entities/ai-agent-chat/lib/agent-right-shell-pathname.test.ts` | red |
| 4 | unit (route) | Chat route handler: when body contains garbage `pathname`, stream path still accepts request (no 400 solely from page context) — mock auth + minimal `streamText` deps as needed | `apps/supersolt/app/api/agent/chat/route.page-context.test.ts` (or colocated `.test.ts` next to a tiny extracted parser re-export) | red |
| 5 | component (RTL) | With providers: on a mocked **`/agent`** pathname, **right sidebar trigger absent or inert** and main chat mounts once (no duplicate full panels) | `apps/supersolt/entities/ai-agent-chat/components/agent-chat-shell.test.tsx` (new) | red |
| 6 | component (RTL) | With providers: when simulating transition from **`/agent`** to another route with messages, **`useRightSidebar` open state** becomes **true** (auto-open contract) | same or `app-right-sidebar.test.tsx` in `components/organisms/` | red |

**Deferred (no Playwright in app today):**

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 7 | e2e (future) | Sign in → `/agent` → send message → open nav card destination → land on target page → sidebar expanded → send continues same thread | `apps/supersolt/e2e/contextual-agent-right-sidebar.spec.ts` | backlog |

After each MVP item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions / validators

- **Subject:** page context Zod helper in `entities/ai-agent-chat/lib/agent-chat-page-context-schema.ts`
- **Cases:**
  - Happy path: `/acme/richmond/inventory` + short label → trimmed strings within caps.
  - Boundary: empty strings → treated as absent; unicode pathname allowed if length OK.
  - Invalid: absurd length → fields stripped to undefined.
- **Runner:** `pnpm --filter supersolt test` (Vitest).
- **No mocks** for pure parsing.

### Pathname shell rules

- **Subject:** pure helper used by layout or provider to decide **show right shell** vs **agent-only page**.
- **Cases:** `/agent`, `/agent/` (normalize policy in one place), non-agent main routes.

## 3. Integration tests (DB + RLS)

**n/a** for this feature — no new tables or RLS. Chat route tests in §1 row 4 are **handler-level** with mocks, not Supabase integration.

## 4. End-to-end (happy path)

- **Tool:** Playwright **not** configured for `apps/supersolt` today.
- **MVP:** follow **manual smoke** steps in [`flows.md`](flows.md) §1 final row / §5.
- **Future:** add `apps/supersolt/e2e/contextual-agent-right-sidebar.spec.ts` when a Playwright harness lands.

## 5. Fixtures and seed data

**n/a** — no DB fixtures for this slice.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit / RTL rows in §1 | 100% implemented before merge | Rows 1–6 |
| Integration (DB) | n/a | — |
| E2E | Manual smoke until Playwright exists | flows.md |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- Internals of `@workspace/ui` **`RightSidebar`** layout math — trust upstream.
- Full OpenAI streaming integration in CI — keep route tests behind mocks / stubbed model if needed.

## 8. Refactor checklist (after green)

- [ ] Single Zod schema for page context shared by client `prepareSendMessagesRequest` typing and server parse.
- [ ] No `any`. No app-to-app imports.
- [ ] No `@workspace/ui` → Supabase edge introduced.
- [ ] `AgentChatPanel` split if it grows past ~300 lines after provider extraction.
