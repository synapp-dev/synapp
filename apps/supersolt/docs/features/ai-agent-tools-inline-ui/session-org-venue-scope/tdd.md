# AI agent: session org / venue scope — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File (suggested) | Status |
|---|-------|---------------------|------------------|--------|
| 1 | unit | Access-context **mapper** normalises DB rows → API DTO shape (stable field names, sorted orgs/venues) | `apps/supersolt/server/access/access-context.mapper.test.ts` (or colocated with new module) | red |
| 2 | unit | `rankTenantCandidates` (or equivalent) — exact slug match beats name substring; ties broken deterministically | `apps/supersolt/entities/ai-agent-chat/lib/rank-accessible-tenant-hints.test.ts` | red |
| 3 | unit | Zod **list** tool output rejects malformed payloads (missing slug, empty org name) | `apps/supersolt/entities/ai-agent-chat/lib/accessible-tenants-tool-schema.test.ts` | red |
| 4 | unit | Zod **match** tool input rejects overlong hints / control characters | same | red |
| 5 | integration | `GET /api/access/context` response shape **unchanged** for a fixture user (golden JSON subset: keys + array lengths) after refactor | `apps/supersolt/app/api/access/context/route.test.ts` | red |
| 5b | unit | **Chat body** `accessContext` Zod: rejects oversized payload, unknown keys, empty org slug; accepts minimal valid tree | `apps/supersolt/entities/ai-agent-chat/lib/agent-chat-request-schema.test.ts` (name TBD) | red |
| 6 | integration | `listAccessibleTenants` execute with **mocked** loader returns org/venue counts; **401 path** not exposed in tool output | `apps/supersolt/app/api/agent/chat/list-accessible-tenants.test.ts` (name TBD) | red |
| 6b | integration | `POST /api/agent/chat` with **valid snapshot** does **not** invoke DB loader for prompt path (spy); with **invalid** snapshot falls back to loader or omits injection | `apps/supersolt/app/api/agent/chat/route.access-context.test.ts` (name TBD) | red |
| 7 | component | **Deferred** — optional tool loading line only if implemented | n/a | n/a |
| 8 | e2e | **Deferred** — manual smoke per [`flows.md`](flows.md) §1 | n/a | n/a |

## 2. Unit tests

### Loader + mapper

- **Subject:** extracted module from [`app/api/access/context/route.ts`](../../../../app/api/access/context/route.ts)
- **Cases:** zero memberships; multiple orgs; org with zero venues row; role join missing (skip row) — align with current route behaviour.
- **Runner:** Vitest (`apps/supersolt/package.json`).

### Ranking

- **Subject:** `rankAccessibleTenantHints` (pure)
- **Cases:** hint matches venue name; hint matches org slug; ambiguous two venues same score returns stable order; no match returns empty list.

## 3. Integration tests (DB + RLS)

**Optional:** only if CI has a seeded auth pattern; otherwise **mock** Supabase client at loader boundary ([`plan.md`](plan.md) §5).

## 4. End-to-end (happy path)

- **Playwright:** deferred (parent [`../tdd.md`](../tdd.md)).
- **Manual smoke:** [`flows.md`](flows.md) §1.

## 5. Fixtures and seed data

- **Unit fixtures:** static `organisations[]` trees in `*.test.ts`.
- **Golden file:** minimal JSON subset for `/api/access/context` if route test is used.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit rows §1–#4 + **#5b** | green before merge | |
| Integration #5, #6, **#6b** | green if mocks available | Else document skip in CI with manual gate |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- Whether the **LLM** chooses to call the tool on first turn (protocol and **server** behaviour only).
- OpenAI latency.

## 8. Refactor checklist (after green)

- [ ] `GET /api/access/context` and agent **tool** paths call the **same** loader; **optional** client `accessContext` skips loader **only** for vetted prompt assembly.
- [ ] No `any` on tool outputs consumed by the client.
- [ ] No `apps/supersolt` → other `apps/*` imports ([ARCHITECTURE.md §3.1](../../../../../../ARCHITECTURE.md)).
