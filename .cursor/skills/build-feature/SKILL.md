---
name: build-feature
description: Plans and scaffolds a new feature for any app in the synapp monorepo. Always runs the grill-me interview first, then writes apps/<product>/docs/features/<slug>/{plan.md, tdd.md, flows.md}, strictly enforcing ARCHITECTURE.md and updating it when a new package edge or migration default is introduced. Use when the user says "build feature", "implement feature", "/build-feature", or wants a comprehensive feature plan with TDD and error/alternate-flow coverage.
---

# build-feature

End-to-end planning skill for any new feature in the synapp monorepo. Produces a documentation triad (plan, TDD, flows) gated by `ARCHITECTURE.md` compliance. **Does not implement code** — implementation is a separate session that consumes these documents.

## Operating mode

1. **Always** run the [grill-me](../grill-me/SKILL.md) interview first. One question per turn. Each question carries a `Recommended:` line. Walk every branch in the order below before writing artifacts.
2. **Codebase over questions** — when an answer is in the repo (existing patterns, schema, env flags, similar features), search and read first; cite the file, then ask only if ambiguity remains.
3. **Architecture is law** — every decision must conform to [ARCHITECTURE.md](../../../ARCHITECTURE.md). Use [`checklists/architecture.md`](checklists/architecture.md) as the gate.
4. **Self-update the architecture doc** — if the feature requires a new allowed package edge, a new shared package, or a change to migration defaults, update `ARCHITECTURE.md` in the same change (per its §10).
5. **Three-file artifact** — write to `apps/<product>/docs/features/<slug>/{plan.md, tdd.md, flows.md}` using the templates in [`templates/`](templates).

## Intradark — Supabase MCP (`user-supabase-intradark`)

When **Product** is **`intradark`**, use the Cursor MCP server **`user-supabase-intradark`** (supabase-intradark) for **database truth** and **remote migration execution**. Read each tool’s schema under the workspace `mcps/user-supabase-intradark/tools/` before calling. For Supabase-specific DDL, RLS, and CLI semantics, follow the **Supabase** agent skill if enabled in the workspace, plus `apps/intradark` migration conventions.

### During this skill (planning + triad)

- **Before finalizing Branch 3 (data model)** in Step 3, and again before Step 5: call **`list_tables`** and **`list_migrations`** so `plan.md` matches the **live** intradark project (names, drift, ordering). Use **`execute_sql`** only for **read-only** introspection (`SELECT` / catalog queries) unless the user explicitly asks to mutate data in this session.
- In **`plan.md`** §Data model and §Rollout, state that **implementation** applies DDL through **`apply_migration`** (migration `name` + `query`) on the intradark Supabase project **in the same order** as app-owned SQL under **`apps/intradark/drizzle/`** (per [ARCHITECTURE.md](../../../ARCHITECTURE.md) §8.1), and that **`generate_typescript_types`** may be run after schema changes when regenerating client types is part of the workflow.

### Applying migrations (same or follow-up session)

- **`apply_migration`**: use for **DDL** that matches the committed / reviewed migration body. Do not invent one-off production edits without a named migration.
- **Optional same-session apply**: only after the user **`confirm`**s the triad **and** explicitly asks to run remote migrations in chat; otherwise document the steps in `plan.md` for a later implementation session.
- **Branches / advisors**: use **`list_branches`**, **`create_branch`**, etc., when the plan calls for preview DBs; use **`get_advisors`** after substantive DDL to catch security/performance issues.

### Scope

- This block applies **only** to **`apps/intradark`**. Other apps use their own Supabase MCP projects when present (e.g. bullyproof, youthjustice), not intradark’s.

## Workflow

### Step 1 — Anchor

Resolve, then state back to the user:

- **Product**: which `apps/<product>` (e.g. `intradark`, `bullyproof`, `youthjustice`).
- **Slug**: kebab-case, max 5 words (parent feature). Optional **sub-feature** slugs extend the path (see **Sub-features** below).
- **One-line summary**: what the feature does.

If any of these is ambiguous, ask one clarifying question. Do not proceed without all three.

#### Sub-features (phases, nested flows)

Use a **single parent folder** when phases are small enough to live as sections inside one triad:

- In `plan.md` / `flows.md` / `tdd.md`, use clear headings (e.g. `### Discord phase`) for steps that belong to the parent (e.g. full match lobby) but are unique to that phase.

Add a **child folder with its own triad** when a slice needs a separate grill pass, TDD scope, or ownership (e.g. Discord voice automation vs web veto UI):

```
apps/<product>/docs/features/<parent-slug>/<sub-slug>/{plan.md, tdd.md, flows.md}
```

Rules:

- **Parent** `plan.md` must link to each child folder (relative paths) and state how phases compose.
- **Sub-slug**: same kebab-case rules as the parent; keep it short (`discord-phase`, `veto-flow`).
- **Roadmaps** may link to `features/<parent-slug>/plan.md` as the primary spec and mention children in the parent plan or in the roadmap feature index—do not invent `plan.md` URLs for paths that do not exist.

### Step 2 — Load architecture context

Read in this order:

1. [ARCHITECTURE.md](../../../ARCHITECTURE.md) — full file.
2. [`checklists/architecture.md`](checklists/architecture.md) — the compliance gate you must satisfy before writing artifacts.
3. The target app's existing structure: `apps/<product>/app/`, `apps/<product>/components/`, `apps/<product>/entities/` (if present), `apps/<product>/drizzle/` or `apps/<product>/supabase/` for schema.
4. Any sibling feature in `apps/<product>/docs/features/` for tone and depth.

### Step 3 — Run grill-me across all branches

Follow [grill-me](../grill-me/SKILL.md) procedure verbatim: one question per turn, recommended answer included, codebase-over-questions. Cover **every** branch below before writing files. Mark each branch resolved before moving to the next.

| # | Branch | Resolves |
|---|--------|----------|
| 1 | Product + slug | Anchor (already done in Step 1) |
| 2 | Scope cut | What ships in MVP vs explicitly out |
| 3 | Data model | Tables, columns, RLS, migration ownership (ARCHITECTURE.md §8) |
| 4 | API surface | Server actions vs route handlers vs Supabase RPC |
| 5 | UI surface | Route-colocated vs `entities/` vs `@workspace/ui` (§7.1) |
| 6 | Package placement | Stay in app vs promote (second-consumer rule, §5.1) |
| 7 | Auth / session | Uses `@workspace/supabase`; UI must not import it (§3.2) |
| 8 | Error states | Every failure mode enumerated |
| 9 | Alternate flows | Cancel, retry, partial save, deep-link, empty, loading, permissions denied, offline, mobile |
| 10 | Telemetry | Events to emit, where, with what payload |
| 11 | TDD test list | Unit, integration (DB+RLS), E2E happy path; ordered red→green→refactor |
| 12 | Rollout | Feature flag, env vars, migration sequencing, backout plan |

After branch 12, summarize shared understanding as a numbered list and ask the user to confirm before writing files.

### Step 4 — Architecture compliance gate

Walk [`checklists/architecture.md`](checklists/architecture.md). Every item must be `yes` or `n/a`. If any item is `no`, return to Step 3 to re-resolve the offending branch.

If a checklist item flags a **new** package edge, **new** shared package, or **change** to migration defaults, queue an `ARCHITECTURE.md` edit for Step 6.

### Step 5 — Write the three-file artifact

Create `apps/<product>/docs/features/<slug>/` (and `.../<slug>/<sub-slug>/` for each sub-feature triad, if any) and write:

1. `plan.md` from [`templates/plan.md`](templates/plan.md)
2. `tdd.md` from [`templates/tdd.md`](templates/tdd.md)
3. `flows.md` from [`templates/flows.md`](templates/flows.md)

Replace every `{{placeholder}}` with the answers gathered in Step 3. Cite specific `ARCHITECTURE.md` sections by number where placement decisions are made.

### Step 6 — Update ARCHITECTURE.md if required

Only if Step 4 queued an update. Edit [ARCHITECTURE.md](../../../ARCHITECTURE.md) in the same change set. Add the new edge, package, or migration rule and reference the feature folder as the rationale. Do not weaken existing rules.

### Step 7 — Summarize

Output to the user:

- Links to the three written files.
- Bullet list of architecture sections cited.
- Whether `ARCHITECTURE.md` was updated and what changed.
- Suggested first commit using the [commit-organizer](../commit-organizer/SKILL.md) format (e.g. `docs(<product>): plan <slug> feature`).

## Hard rules

- Never skip grill-me. Every branch must be walked.
- Never write feature code in this skill. Documents only.
- Never propose an `apps/<A>` → `apps/<B>` import.
- Never let `@workspace/ui` depend on `@workspace/supabase` or `@supabase/*`.
- Never extract to a new package before a real second consumer exists, unless the user explicitly approves a §5.1 deviation.
- Never edit `ARCHITECTURE.md` to relax a rule. Only to add new allowed edges with rationale.

## Output location summary

```
apps/<product>/docs/features/<slug>/
  plan.md    # what + why + how (placement, data, API, UI, deps, commit order)
  tdd.md     # red->green->refactor test list, unit/integration/E2E, fixtures
  flows.md   # happy path, error states table, alternate flows, state diagram
apps/<product>/docs/features/<slug>/<sub-slug>/   # optional per sub-feature
  plan.md | tdd.md | flows.md
```
