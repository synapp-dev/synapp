# AI agent: tools + inline UI widgets — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code. Each item is a single behavior. Order matters: earlier items unblock later ones.

| # | Layer | Behavior under test | File (suggested) | Status |
|---|-------|---------------------|------------------|--------|
| 1 | unit | Chat request body schema accepts valid message list and rejects oversize / malformed payloads | `apps/supersolt/entities/ai-agent-chat/lib/chat-request-schema.test.ts` | red |
| 2 | unit | Per-tool argument schema rejects invalid args for the first shipped tool (e.g. date range, pagination) | `apps/supersolt/entities/ai-agent-chat/lib/tools/*.test.ts` | red |
| 3 | unit | `toolName` + payload → widget key mapping returns expected component props; unknown tool → safe fallback | `apps/supersolt/entities/ai-agent-chat/lib/tool-result-widget-registry.test.ts` | red |
| 4 | unit | Redaction helper strips tokens / account ids from logged or surfaced tool errors (if any stringification) | `apps/supersolt/entities/ai-agent-chat/lib/redact-for-client.test.ts` | red |
| 5 | integration-style | Route Handler returns **401** when no session (mock `createServerClient` / cookies) | `apps/supersolt/app/api/agent/chat/route.test.ts` | red |
| 6 | integration-style | Tool guard (or handler) returns **403** / structured denial when the user requests an **org/venue** they **cannot** access (args exercised in test) | same | red |
| 7 | integration-style | Route Handler returns **400** for invalid body per Zod | `apps/supersolt/app/api/agent/chat/route.test.ts` | red |
| 8 | component (optional) | `ToolResultRenderer` renders table widget for a fixture tool result | `apps/supersolt/entities/ai-agent-chat/components/tool-result-renderer.test.tsx` | red |
| 9 | e2e | Deferred — document manual smoke in [`flows.md`](flows.md) §1 | n/a | n/a |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions / validators

- **Subject:** Zod schemas under `apps/supersolt/entities/ai-agent-chat/lib/`
- **Cases:**
  - Happy path: minimal valid request; single user turn.
  - Boundary: max messages, max message length, unicode content.
  - Invalid: wrong types, negative limits, missing required fields.
- **Runner:** Vitest (existing app setup).
- **No mocks** for pure functions.

### Widget registry

- **Subject:** `tool-result-widget-registry.ts` (name TBD)
- **Cases:** known tool → `{ widget, props }`; unknown tool → fallback alert; malformed JSON shape → fallback with code-safe message.

## 3. Integration tests (DB + RLS)

**MVP:** **n/a** — no new tables; no DB fixtures required for this feature slice.

When persistence is added later, reintroduce this section per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md): migrations under `apps/supersolt/supabase/migrations/`, tests against local `supabase start`, venue-scoped RLS.

## 4. End-to-end (happy path)

- **Tool:** Playwright **deferred** for Supersolt (align with [`../supersolt-authentication/tdd.md`](../supersolt-authentication/tdd.md)).
- **Manual smoke:** enumerated in [`flows.md`](flows.md) §1; run before release when E2E is absent.

## 5. Fixtures and seed data

- **Unit fixtures:** static JSON objects for tool results (payments empty, payments populated, upstream error shape)—colocated in `*.test.ts` or `entities/ai-agent-chat/test-fixtures.ts`.
- **Handler tests:** mock Supabase server factory or inject test doubles at the module boundary—avoid hitting real OpenAI in CI (mock the model provider or use recorded responses if the team adopts that pattern).

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit rows in §1 (#1–#4, #8 if used) | 100% implemented before merge | Core safety: validation + registry |
| Handler authz rows (#5–#7) | 100% implemented before merge | Prevents cross-tenant leaks |
| Integration DB cases (§3) | n/a MVP | Revisit with persistence |
| E2E | Deferred | Manual smoke required until Playwright exists |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- Third-party LLM output randomness — assert **protocol** and **widget mapping**, not prose quality.
- `@workspace/ui` primitive internals.
- Full streaming byte-by-byte snapshots — prefer behavior on **final message parts** or test doubles.

## 8. Refactor checklist (after green)

- [ ] Tool execution and HTTP entry live only in Route Handler (or shared **server-only** modules imported from it); **every** tenant-scoped tool re-checks org/venue membership (no URL-implied scope).
- [ ] Zod schemas are the single source of truth for request + tool args.
- [ ] No `any` on tool results crossing the client boundary.
- [ ] No `apps/supersolt` → other `apps/*` imports ([ARCHITECTURE.md §3.1](../../../../../ARCHITECTURE.md)).
- [ ] No `@workspace/ui` → Supabase imports ([ARCHITECTURE.md §3.2](../../../../../ARCHITECTURE.md)).
- [ ] Split files if any component or handler exceeds ~250 lines.
