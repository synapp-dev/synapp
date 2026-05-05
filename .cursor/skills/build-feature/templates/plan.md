# {{Feature Title}}

> **Product:** `apps/{{product}}`
> **Slug:** `{{slug}}`
> **Status:** Planned
> **Owner:** {{owner}}
> **Created:** {{YYYY-MM-DD}}

## 1. Summary

{{One-paragraph description: what the feature does, who it serves, and why now.}}

## 2. Scope

### In scope (MVP)

- {{Capability 1}}
- {{Capability 2}}
- {{Capability 3}}

### Out of scope (deferred)

- {{Explicitly excluded capability and why}}
- {{Explicitly excluded capability and why}}

### Non-goals

- {{Thing this feature is NOT trying to do, to prevent scope creep}}

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | {{`apps/<product>` only / `packages/<name>`}} | §3.2, §5.1 |
| Domain code location | {{`apps/<product>/entities/<feature>/` / route-colocated / `@workspace/ui`}} | §7.1 |
| Shell vs domain | {{`app/components/` shell only; domain in `entities/`}} | §7.1 |
| Auth dependency | {{`@workspace/supabase` direct / via server action / none}} | §3.2 |
| New package edges | {{None / list new edges and justify}} | §3.2, §10 |

> If "New package edges" is non-empty, [ARCHITECTURE.md](../../../../../ARCHITECTURE.md) **must** be updated in the same change.

## 4. Data model

### Tables / columns

```sql
-- {{schema name}}
{{CREATE TABLE statements or column additions}}
```

### RLS

| Policy | Role | Rule |
|--------|------|------|
| {{policy name}} | {{role}} | {{predicate}} |

### Migration ownership

- **Path:** `apps/{{product}}/{{drizzle|supabase/migrations}}/{{filename}}`
- **Pattern:** {{App-owned (default §8.1) / Module-package template (§8.2) — justify}}
- **Backfill:** {{None / one-shot script at `apps/{{product}}/scripts/{{name}}.ts`}}

### Generated types

Regenerate `apps/{{product}}/{{drizzle/schema.ts | supabase/types.ts}}` after migration applies.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| {{op}} | {{Server Action / Route Handler / RPC}} | {{e.g. `app/api/{{slug}}/route.ts`}} | {{required role}} | {{validation, side effects}} |

### Validation

- Input schema: {{Zod schema location}}
- Error mapping: every thrown error maps to a row in [`flows.md`](flows.md) error table.

## 6. UI composition

```
apps/{{product}}/
├── app/{{route segment}}/
│   ├── page.tsx                # Server component, data fetch
│   ├── {{feature}}-client.tsx  # Client island
│   └── loading.tsx
├── entities/{{feature}}/        # Domain composition (per §7.1)
│   ├── components/
│   ├── hooks/
│   └── types.ts
└── components/                  # Shell only — do NOT add atomic UI here
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| {{Button, Input, Card, etc.}} | `@workspace/ui` | Reuse, do not duplicate |
| {{ProductBranded variant}} | `apps/{{product}}/entities/{{feature}}/components/` | Wraps `@workspace/ui` primitives |

### Theming

- Tokens come from `@workspace/ui` (§6).
- Product overrides, if any, live in `apps/{{product}}/app/globals.css` (after the workspace import).

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — {{which primitives}}
- `@workspace/supabase` — {{which utilities; never imported by `@workspace/ui`}}
- {{others}}

### New external deps

- {{`pnpm add <pkg>` and justification, or "None"}}

### New package edges

- {{"None" or list. Each new edge requires an ARCHITECTURE.md update — see §10.}}

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../.cursor/skills/commit-organizer/SKILL.md). Each commit should leave the tree green.

1. `feat({{product}}): scaffold {{slug}} route shell` — empty page, layout, loading state.
2. `feat({{product}}): add {{slug}} migration + types` — DDL, RLS, regenerated types.
3. `test({{product}}): add red tests for {{slug}}` — failing tests from [`tdd.md`](tdd.md).
4. `feat({{product}}): implement {{slug}} server action` — green for action tests.
5. `feat({{product}}): wire {{slug}} client UI` — green for UI tests.
6. `feat({{product}}): handle {{slug}} error + alt flows` — coverage for [`flows.md`](flows.md).
7. `chore({{product}}): telemetry for {{slug}}` — analytics events.
8. `docs({{product}}): mark {{slug}} feature complete` — flip status in this file.

Adjust as needed; keep each commit small, reviewable, and reverting-safe.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `{{slug}}.viewed` | Mount | `{ user_id, route }` | {{provider}} |
| `{{slug}}.submitted` | Form submit | `{ user_id, ...inputs }` | {{provider}} |
| `{{slug}}.failed` | Error | `{ user_id, code, message }` | {{provider}} |

## 10. Rollout

- **Feature flag:** {{flag name + provider, or "none"}}
- **Env vars:** {{`NEW_VAR_NAME` in `apps/{{product}}/env.example`}}
- **Migration sequencing:** {{order vs deploy: "migrate before deploy" / "expand-contract"}}
- **Backout:** {{revert plan; data is reversible / forward-only}}

## 11. Open questions

Only items grill-me could not resolve. Each must have an owner and due date.

- [ ] {{Question}} — owner: {{name}}, due: {{date}}

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
