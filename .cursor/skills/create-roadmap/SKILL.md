---
name: create-roadmap
description: >-
  Builds a high-level product roadmap for one `apps/<product>` from repo
  evidence, then refines it with a bounded grill-me pass. Writes
  `apps/<product>/docs/roadmap.md` with Shipped/Partial/Planned labels and
  links to `docs/features/<slug>/` for drill-down via build-feature. Use when
  the user asks for a roadmap, product map, feature skeleton, or site-wide
  spec overview for a monorepo app.
disable-model-invocation: true
---

# create-roadmap

End-to-end skill to produce **one canonical overview** per product and a clear path to **implementation-grade docs** without duplicating them.

## Hard rules

- **Product** — If the user does not name `apps/<product>`, ask which product before any inventory.
- **Single overview file** — Default output is only `apps/<product>/docs/roadmap.md` (create `docs/` if missing).
- **Drill-down** — Per-feature depth lives in `apps/<product>/docs/features/<slug>/{plan.md,tdd.md,flows.md}` (and optional `.../<slug>/<sub-slug>/` per [build-feature](../build-feature/SKILL.md)). The roadmap **indexes and links**; it does not replace the triad.
- **Evidence before claims** — First pass is grounded in the repo; labels and links reflect what exists.
- **Monorepo alignment** — Call out constraints from [ARCHITECTURE.md](../../../ARCHITECTURE.md): no app-to-app imports; `@workspace/ui` vs `@workspace/supabase` boundaries; product-owned migrations; **second-consumer rule** before new `packages/*` (roadmap “modules” are product concepts until an edge is real).
- **Doc hygiene** — Never paste secrets or production URLs with credentials; cite `env.example` keys and file paths only. If the app has **multiple deployables** (e.g. Next.js + long-lived worker/bot), include a short **Runtime & deployables** section so ownership and env split are obvious.
- **Quality gate (optional but recommended)** — When the product is a Next app in this monorepo, note that merge gates may use root `pnpm lint:architecture` per `ARCHITECTURE.md` §4.2 (boundary rules).
- **Grill-me is mandatory after the draft** — Follow [grill-me](../grill-me/SKILL.md) (one question per turn, `Recommended:` line) for the roadmap-specific branches listed below. Do not skip to “final” until those branches are resolved or explicitly waived by the user.

## Workflow

### Step 1 — Anchor

Confirm **product** (`apps/<product>`). If missing, ask once. Optionally capture a **working title** or release nickname if the user offers it; otherwise infer from app `package.json` / README.

### Step 2 — Load context (codebase first)

Read in order (skip missing paths):

1. [ARCHITECTURE.md](../../../ARCHITECTURE.md) — monorepo rules and shared constraints.
2. `apps/<product>/README.md` (if present).
3. Routing and entrypoints: `apps/<product>/app/` (layouts, route groups, `page.tsx`, API `route.ts`).
4. Primary navigation / IA: sidebar, header, or route manifests (search `sidebar`, `nav`, `routes` under the app).
5. Data and integrations: `apps/<product>/drizzle/`, `supabase/`, `lib/`, env examples (`env.example`).
6. Existing feature specs: `apps/<product>/docs/features/*/` (and product ADRs under `apps/<product>/docs/adr/` or `docs/adr/` if present—index them in the roadmap, do not duplicate).
7. Optional: `turbo.json` / `package.json` **scripts** for extra processes (bots, workers) that affect how the product is operated.

Synthesize **domains** from evidence—do not invent domains with no anchor. If the product is a **multi-module platform** but ships one **execution MVP** first, after grill-me the finalized roadmap should use **two domain layers** (e.g. “Core loop” vs “Platform modules”) plus unchanged **Integrations**; see [reference.md](reference.md).

### Step 3 — First-pass `roadmap.md`

Write or overwrite `apps/<product>/docs/roadmap.md` using the spine and item pattern in [reference.md](reference.md).

For each listed capability:

- **Status**: `Shipped` | `Partial` | `Planned` (use `Partial` when UI or API exists but behavior is mock, stub, or incomplete).
- **MVP execution** (after grill-me, when applicable): `yes` or omit—only for the agreed **implementation MVP** spine; keeps `Partial` honest while showing priority.
- **Evidence**: concrete pointer (e.g. `app/(main)/foo/page.tsx`, `app/api/.../route.ts`, `docs/features/bar/`).
- **Spec link**: if `apps/<product>/docs/features/<slug>/` exists, link to `plan.md` (and note sibling `tdd.md` / `flows.md`). If missing, leave a short “Drill-down: run `build-feature` with slug …” note—do not author the triad inside this skill.

### Step 4 — Grill-me (roadmap scope)

Read [grill-me](../grill-me/SKILL.md) and run it **verbatim** on the **draft roadmap** as the anchored artifact. One question per turn. Cover every branch below before editing the roadmap to “final”; reorder questions if an answer would invalidate a later branch.

| # | Branch | Resolves |
|---|--------|----------|
| 1 | Positioning | Who the product is for and the one-line promise (fix draft if wrong). |
| 2 | Priority | What is MVP vs later; what order matters for the next few milestones. |
| 3 | Domain map | Wrong/missing groupings vs how the team thinks about the product. |
| 4 | Scope / phases | Explicit non-goals **and/or** phased delivery after MVP so the roadmap does not over-promise or hide backlog ordering. |
| 5 | Code vs intent | Where `Partial` or `Planned` should change after intent is clarified. |
| 6 | Feature slugs | Which `docs/features/<slug>/` folders should exist next; naming agreement. |

After branch 6, give a **numbered summary** of shared understanding and ask the user to confirm before applying edits.

### Step 5 — Finalize `roadmap.md`

Merge confirmed answers into `roadmap.md`. Keep statuses honest. Refresh links to feature folders. Apply [reference.md](reference.md) spine updates (e.g. **Execution MVP vs platform vision**, **Phased delivery**, **Runtime & deployables**, **Monorepo & code placement**, **Security & documentation hygiene**, **MVP execution** column in the feature index) when they apply to the product.

### Step 6 — Handoff

Tell the user:

- Path to `roadmap.md`.
- Which feature slugs lack a triad and should use [build-feature](../build-feature/SKILL.md) next (parent slug per doc set; sub-features under `.../<parent>/<sub>/` when justified).
- Any `ARCHITECTURE.md` tension you noticed—**do not** edit architecture here unless the user asks; [build-feature](../build-feature/SKILL.md) owns architecture updates when planning implementation.
- Whether **code placement** for new work should follow `ARCHITECTURE.md` §7 (`components/` shell vs `entities/` domain vs `packages/*`)—point to that section when the roadmap implies large new UI or shared contracts.

## Relationship to other skills

| Need | Skill |
|------|--------|
| Stress-test and refine the roadmap after the draft | [grill-me](../grill-me/SKILL.md) |
| Implementation planning for one feature (plan/tdd/flows) | [build-feature](../build-feature/SKILL.md) |

## Additional resources

- Roadmap file spine and item template: [reference.md](reference.md)
