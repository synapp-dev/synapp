# AI agent: navigation link cards — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives test-first order for this child slice.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File (suggested) | Status |
|---|-------|---------------------|------------------|--------|
| 1 | unit | Catalog resolves **known** destination keys to **path templates** containing org/venue placeholders (deterministic) | `apps/supersolt/entities/ai-agent-chat/lib/app-navigation-catalog.test.ts` | red |
| 2 | unit | Unknown keys are **dropped** or rejected per chosen API (document in implementation); never produce partial URLs | same or `resolve-app-navigation-cards.test.ts` | red |
| 3 | unit | Zod **input** schema rejects oversize key arrays, empty slugs, invalid slug shapes | `apps/supersolt/entities/ai-agent-chat/lib/app-navigation-tool-schema.test.ts` | red |
| 4 | unit | Zod **output** schema accepts valid card list; rejects malformed hrefs if output validation is used | same | red |
| 5 | unit | `resolveAppNavigationCards` (or equivalent) builds **full href strings** from slugs + filtered keys—snapshot or table-driven cases for at least **`ingredients`** | `apps/supersolt/entities/ai-agent-chat/lib/resolve-app-navigation-cards.test.ts` | red |
| 6 | unit | Membership helper (if extracted) returns **denied** for fixture “no access” inputs when Supabase client is mocked | `apps/supersolt/entities/ai-agent-chat/lib/assert-user-can-navigate-to-venue.test.ts` (name TBD) | red |
| 7 | integration-style | Route Handler / tool path: tool `execute` with **mocked** `assertUserHasVenueAccess` denies when mock throws or returns false—**structured error** shape only | `apps/supersolt/app/api/agent/chat/route.test.ts` or colocated `*.navigation-tool.test.ts` | red |
| 8 | component (optional) | Nav cards widget renders **`output-available`** fixture with `Link` `href`s; **`output-error`** shows destructive text without raw stack | `apps/supersolt/entities/ai-agent-chat/components/agent-nav-destination-cards.test.tsx` | red |
| 9 | e2e | **Deferred** — manual smoke in [`flows.md`](flows.md) §1 | n/a | n/a |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Catalog + href resolution

- **Subject:** `app-navigation-catalog.ts`, `resolve-app-navigation-cards.ts` under `entities/ai-agent-chat/lib/`
- **Cases:**
  - `ingredients` → path matching live App Router (see [`plan.md`](plan.md) §2).
  - Duplicate keys in input → dedupe or stable reject (document one behavior).
  - Unicode / reserved characters in slugs—reject or encode per app URL policy.
- **Runner:** Vitest ([`apps/supersolt/package.json`](../../../../../../apps/supersolt/package.json) script used by other app tests).
- **No mocks** for pure string/path assembly.

### Zod

- **Subject:** tool input/output schemas (shared with Route Handler import).
- **Cases:** max **N** destination keys; required `organisationSlug` / `venueSlug`; output cards each have **https?-relative** internal paths only (e.g. must start with `/` and match an allowlist prefix pattern).

## 3. Integration tests (DB + RLS)

**MVP:** **n/a** for DB—navigation does not persist. Optional handler tests use **mocks** for Supabase / venue access ([`plan.md`](plan.md) §5).

## 4. End-to-end (happy path)

- **Playwright:** deferred (same as parent [`../tdd.md`](../tdd.md)).
- **Manual smoke:** [`flows.md`](flows.md) §1.

## 5. Fixtures and seed data

- **Unit fixtures:** static `{ organisationSlug, venueSlug, destinationKeys }` objects in `*.test.ts`.
- **Handler tests:** mock `createServerClient` / venue access module—**do not** call OpenAI in CI (follow patterns used when parent adds provider mocks).

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit rows §1 (#1–#5) | green before merge | Core safety for paths |
| Mocked membership / handler (#6–#7) | green before merge if implemented | Prevents leaking navigation to wrong tenant |
| Component (#8) | optional for MVP | Nice for regression on UI states |
| E2E | deferred | Manual smoke |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- LLM choosing prose or **whether** it calls the tool—assert **protocol** and **server/tool** behavior only.
- `@workspace/ui` internals.
- Full streaming snapshots.

## 8. Refactor checklist (after green)

- [ ] Catalog and Zod schemas are single source of truth; Route Handler imports them.
- [ ] No `any` on tool results consumed by the client mapper.
- [ ] No `apps/supersolt` → other `apps/*` imports ([ARCHITECTURE.md §3.1](../../../../../../ARCHITECTURE.md)).
- [ ] No `@workspace/ui` → Supabase ([ARCHITECTURE.md §3.2](../../../../../../ARCHITECTURE.md)).
- [ ] Widget + handler stay maintainable (split if >~250 lines).
