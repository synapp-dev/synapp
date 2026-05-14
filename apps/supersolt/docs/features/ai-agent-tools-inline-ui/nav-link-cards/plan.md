# AI agent: navigation link cards

> **Product:** `apps/supersolt`
> **Slug:** `ai-agent-tools-inline-ui/nav-link-cards` (child of [`../plan.md`](../plan.md))
> **Status:** Shipped
> **Owner:** TBD
> **Created:** 2026-05-12

## 1. Summary

When a signed-in user on **`/agent`** asks in natural language to **open a part of Supersolt** (for example ingredients), the assistant may call a **read-only server tool** that returns **structured navigation card payloads**: human-readable title, optional description, and an **internal `href`** scoped to **`organisationSlug` + `venueSlug`**. The client renders those as **inline cards** with **`next/link`**—destinations are exactly the **same in-app routes** the user could reach **without** the agent, after **existing** page-level auth and RLS. The model **never** supplies arbitrary URLs; only **catalog keys** the server maps to paths after **membership re-validation**.

## 2. Scope

### In scope (MVP)

- **Typed route catalog** in app code (stable keys → path templates under `/{organisationSlug}/{venueSlug}/…`).
- **New `tool()`** on the existing **`POST /api/agent/chat`** handler ([`app/api/agent/chat/route.ts`](../../../../../../apps/supersolt/app/api/agent/chat/route.ts)); Zod-validated args and results.
- **Membership check** in tool `execute` (same rules as the rest of the app—reuse or align with [`assertUserHasVenueAccess`](../../../../../../apps/supersolt/server/access/venue-access.ts) patterns used by org/venue APIs).
- **Inline widget** in `entities/ai-agent-chat/` for tool streaming states (`input-available`, `output-available`, `output-error`), composed from `@workspace/ui` + `Link`.
- **First catalog entry:** **Ingredients** → route aligned with [`menu/ingredients`](../../../../../../apps/supersolt/app/(main)/[organisation]/[venue]/menu/ingredients/page.tsx) (path pattern must match the live App Router tree under `[organisation]/[venue]`).
- **Server structured logs** for tool success/failure (no PII, no full prompts)—see [`../plan.md`](../plan.md) §9.

### Out of scope (deferred)

- **Arbitrary URLs**, external links, or model-provided path strings in the tool contract.
- **DB-backed catalog** or admin UI to edit destinations without deploy.
- **Feature-specific RBAC** beyond “user can access this org/venue” (e.g. hiding ingredients for a role) unless the **target route already** enforces it—in that case the card may still link and the **destination page** remains the source of truth.
- **Client product analytics** (card impressions/clicks).
- **New `packages/*`** until a second app consumes the contract ([ARCHITECTURE.md §5.1](../../../../../../ARCHITECTURE.md)).

### Non-goals

- Replacing **main navigation** or **deep-linking** with query-preset filters via the agent (unless added later with explicit validation).
- **Write** actions or side-effect tools.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/supersolt` only | §3.2, §5.1 |
| Domain code location | `entities/ai-agent-chat/` (widget + schemas/catalog modules) + `app/api/agent/chat/route.ts` (tool registration) | §7.1 |
| Shell vs domain | Chat/thread UI stays in **`entities/`**; no new shell primitives under `components/` for this slice | §7.1 |
| Auth dependency | `@/utils/supabase/server` in Route Handler / tool `execute` only—not `@workspace/supabase` in this app today; align with parent plan checklist note | §3.2 |
| New package edges | None | §3.2, §10 |

### Architecture compliance (pre-ship gate)

Walk [build-feature checklists/architecture.md](../../../../../../.cursor/skills/build-feature/checklists/architecture.md). This slice: **§8 migrations n/a**; run **`pnpm lint:architecture`** from the monorepo root after implementation ([ARCHITECTURE.md §4.2](../../../../../../ARCHITECTURE.md)).

## 4. Data model

### Tables / columns

**MVP:** none (catalog lives in TypeScript).

```sql
-- Intentionally empty — no DDL for navigation cards MVP.
```

### RLS

**MVP:** n/a (no new tables). Destination pages keep **existing** RLS and route guards.

### Migration ownership

- **Path:** n/a for MVP.
- **Pattern:** App-owned ([ARCHITECTURE.md §8.1](../../../../../../ARCHITECTURE.md)) when persistence is ever introduced.
- **Backfill:** n/a.

### Generated types

No change to **[`utils/supabase/types.ts`](../../../../../../apps/supersolt/utils/supabase/types.ts)** for this slice.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Stream chat + navigation tool | Route Handler | **`app/api/agent/chat/route.ts`** | Session required; tool receives **`organisationSlug`**, **`venueSlug`**, **`destinationKeys`** (or equivalent bounded list) | **`execute`**: validate keys against catalog → **assert user has venue access** → build **internal** `href`s → return `{ cards: [...] }` or structured error; never echo unknown slugs to unauthorized callers |

### Suggested tool shape (implementation detail)

- **Name (illustrative):** `suggestAppNavigation` (final name must match AI SDK `tool-*` part types on the client).
- **Input:** Zod object: non-empty slugs, **array of known enum keys** with a **max length** cap.
- **Output:** Zod object: `cards: Array<{ title, description?, href }>` or a single **`errorCode`** + safe **`message`** for the widget (see [`flows.md`](flows.md) §2).

### Validation

- **Tool args/results:** Zod modules colocated under `entities/ai-agent-chat/lib/` (or `lib/navigation-tool/`).
- **Error mapping:** every failure maps to a row in [`flows.md`](flows.md) §2.

## 6. UI composition

Extend the parent layout described in [`../plan.md`](../plan.md) §6.

```
apps/supersolt/
├── app/api/agent/chat/route.ts          # register tool + system prompt hints
└── entities/ai-agent-chat/
    ├── components/
    │   ├── agent-chat-panel.tsx          # add tool part branch (or delegate)
    │   └── agent-nav-destination-cards.tsx  # presentational (name TBD)
    └── lib/
        ├── app-navigation-catalog.ts   # keys → path templates
        ├── app-navigation-tool-schema.ts # Zod in/out
        └── resolve-app-navigation-cards.ts  # pure href assembly + filtering (unit-tested)
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Card, Button | `@workspace/ui` | [§5.2, §7.1](../../../../../../ARCHITECTURE.md) |
| Nav cards widget | `entities/ai-agent-chat/components/` | Maps tool output; uses **`next/link`** for navigation |

### Theming

Tokens from `@workspace/ui` ([ARCHITECTURE.md §6](../../../../../../ARCHITECTURE.md)).

## 7. Dependencies

### Existing packages used

- **`ai`**, **`@ai-sdk/openai`** (already parent deps)—tool streaming.
- `@workspace/ui` — card/button layout.
- `@/utils/supabase/server` — session + venue access checks inside tool `execute`.

### New external deps

- **None** beyond what the parent agent feature already added.

### New package edges

- None ([ARCHITECTURE.md §10](../../../../../../ARCHITECTURE.md)).

## 8. Implementation order (commits)

Per [commit-organizer](../../../../../../.cursor/skills/commit-organizer/SKILL.md); each commit leaves the tree green.

1. `test(supersolt): add app navigation catalog and href resolver tests` — from [`tdd.md`](tdd.md).
2. `feat(supersolt): add suggestAppNavigation tool schema + catalog` — server-only modules.
3. `feat(supersolt): wire navigation tool into agent chat route` — membership guard + logging.
4. `feat(supersolt): render navigation cards in agent chat panel` — tool part UI states.
5. `docs(supersolt): mark nav-link-cards ready` — flip **Status** in this file when shipped.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `agent.tool.navigation_started` | Tool `execute` begins | `{ request_id?, destination_keys[] }` — no email, no prompt | Server logs |
| `agent.tool.navigation_finished` | Tool returns cards | `{ request_id?, card_count }` | Server logs |
| `agent.tool.navigation_denied` | Membership or validation failure | `{ request_id?, reason_code }` — generic | Server logs |

**MVP:** no client analytics events.

## 10. Rollout

- **Feature flag:** none—ships with agent when merged; disable by **revert** (see [`../plan.md`](../plan.md) §10).
- **Env vars:** no new vars; same **`OPENAI_API_KEY`** (or gateway) as chat.
- **Migration sequencing:** n/a.
- **Backout:** revert PR; no DB rollback.

## 11. Open questions

- [x] **Exact tool identifier string** (must align with client `part.type` convention)—owner: engineering, due: implementation. **`suggestAppNavigation`** → UI part type **`tool-suggestAppNavigation`**.
- [ ] **Additional catalog keys** post-MVP (menu, recipes, suppliers, …)—owner: product.

## 12. Cross-references

- Parent feature: [`../plan.md`](../plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../../ARCHITECTURE.md)
