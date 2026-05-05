# `roadmap.md` spine and patterns

Use this as the default structure for `apps/<product>/docs/roadmap.md`. Keep the main file **high level**; defer depth to `docs/features/<slug>/` via [build-feature](../build-feature/SKILL.md).

## Document spine (default order)

1. **Title** — `# <Product> roadmap`
2. **Summary** — 2–4 sentences: what the product is, who it serves, primary value.
3. **Execution MVP vs platform vision** — When grill-me establishes both: a short **implementation MVP** (what ships first) and a sentence that the doc also maps **full-platform** intent (modules and relationships) even for unbuilt areas.
4. **Phased delivery (post-MVP)** — Optional loose phases (effort vs impact); editable later. Use instead of a long “out of scope” list when the team prefers **no hard exclusions**.
5. **In scope** — What the product may encompass over time (still evidence-anchored where possible).
6. **Surface area by domain** — Prefer **two layers** when applicable: **`### Core … loop`** (lifecycle order; optional **MVP execution** per capability), then **`### Platform modules`**. Other domains (e.g. **Application shell**) as needed.
7. **Integrations & dependencies** — Auth, external APIs, bots, webhooks; cite `env.example` keys, not secret values.
8. **Runtime & deployables** — When the product is not a single process (e.g. Next.js + bot/worker); how they communicate.
9. **Monorepo & code placement** — Pointer to [ARCHITECTURE.md](../../../ARCHITECTURE.md): boundaries, `pnpm lint:architecture`, §7 shell vs domain (`components/` vs `entities/`).
10. **Security & documentation hygiene** — No secrets in the roadmap; identity/data flows defer to feature specs with RLS/migrations per architecture §8.
11. **Constraints** — Product-specific operational constraints not already covered.
12. **Feature index** — Table: `Capability` | `Status` | `MVP execution` | `Spec`.
13. **Open questions** — Only unresolved items after grill-me; remove stale ones.

**Last reviewed** — Optional footer (`*Last reviewed: YYYY-MM-DD.*`) after substantive edits.

## Capability entry pattern

Repeat under each domain:

```markdown
#### Short capability name

- **Status:** Shipped | Partial | Planned
- **MVP execution:** yes | (omit if not part of the agreed implementation MVP spine)
- **Evidence:** `path/from/repo` (and optional one-line behavior note)
- **How it should work:** 1–3 sentences (user-facing outcome; after grill-me, this reflects agreed intent)
- **Drill-down:** [plan.md](features/<slug>/plan.md) when that file exists — otherwise: *Run **build-feature** with slug `<slug>`; use `docs/features/<slug>/<sub-slug>/` for phase-level triads when justified.*
```

**Path note:** From `apps/<product>/docs/roadmap.md`, feature specs are linked as `features/<slug>/plan.md` (same `docs/` directory).

## Status definitions

| Status | Meaning |
|--------|---------|
| **Shipped** | Available in production-oriented paths; behavior matches intent enough to call complete. |
| **Partial** | Routed or wired but incomplete, mock-heavy, behind flags, or behavior diverges from intent. |
| **Planned** | Not implemented or only scaffolding; doc or UI placeholder only. |

## Feature index table example

```markdown
## Feature index

| Capability | Status | MVP execution | Spec |
|------------|--------|---------------|------|
| Match lobby | Partial | yes | [plan](features/match-lobby/plan.md) |
| Player profile | Shipped | | — |
| Forums | Partial | | *Suggested slug:* `community-content-surfaces` — run build-feature |
```

Use real slugs and paths from the repo; never invent links to files that do not exist—use *italic* suggested next step instead.
