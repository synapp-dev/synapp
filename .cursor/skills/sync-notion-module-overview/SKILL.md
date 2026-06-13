---
name: sync-notion-module-overview
description: Syncs Supersolt Module Overview Notion database rows into apps/supersolt/docs/features/<slug>/plan.md (Notion → repo). Uses notion-api skill (internal connection token) to fetch specs and merge product sections without overwriting engineering sections. Use when syncing Notion specs to codebase, updating plan.md from Module Overview, or refreshing feature docs from Supersolt-MVP.
disable-model-invocation: true
---

# Sync Notion Module Overview → plan.md

Pull **product truth** from the Supersolt-MVP **`Module Overview`** database into repo **`plan.md`** files. **Notion wins** for product sections; **repo keeps** architecture, data model, APIs, and rollout detail already in `plan.md`.

**Default product:** `apps/supersolt` only.

## Prerequisites

1. [notion-api](../notion-api/SKILL.md) configured with `NOTION_SUPERSOLT_TOKEN` for Supersolt-MVP.
2. Verify: `node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace supersolt me`

## Canonical Notion targets

| Resource | ID / URL |
|----------|----------|
| Database | `34f64094-bde6-8086-bf03-c99d2c737068` — [Module Overview](https://www.notion.so/34f64094bde68086bf03c99d2c737068) |
| Data source | `collection://34f64094-bde6-804f-9375-000be5532497` |
| Table view (all rows) | `https://www.notion.so/34f64094bde68086bf03c99d2c737068?v=34f64094bde68076afd5000c59f167b8` |

Database properties: **Name**, **App URL**, **Parent item**, **Sub-item**, **Date**, **Place**, **Files & media**. There is **no** repo-path column — resolve paths via [mapping.md](mapping.md).

## Workflow

Copy this checklist and tick as you go:

```
Sync progress:
- [ ] Step 1 — Scope (which rows / slugs)
- [ ] Step 2 — Inventory (Notion rows + repo paths)
- [ ] Step 3 — Fetch page bodies
- [ ] Step 4 — Merge into plan.md
- [ ] Step 5 — Report (updated / skipped / unmappable)
```

### Step 1 — Scope

If the user did not specify:

- **Default:** sync every row in [mapping.md](mapping.md) that has a **Repo plan path** (including nested paths like `insights-platform/sales`).
- **Optional filters:** single module name, `--dry-run` (preview only, no writes), or “only rows changed since &lt;date&gt;” (compare `plan.md` **Updated** vs Notion `last_edited` when available from fetch).

Confirm **dry-run** vs **write** before editing files.

### Step 2 — Inventory

1. `notion-api` CLI `database` on Module Overview ID (paginate if needed); see [workspaces.md](../notion-api/workspaces.md).
2. For each row, resolve **repo plan path** using [mapping.md](mapping.md) (explicit table first, then heuristics).
3. Build a sync table for the user (dry-run output):

| Notion Name | Notion URL | App URL | Repo plan path | Action |
|-------------|------------|---------|----------------|--------|
| … | … | … | … | update / skip (no file) / unmappable |

**Skip** onboarding substeps and other rows marked *no standalone plan* in mapping unless the user explicitly asks to scaffold new files.

### Step 3 — Fetch page bodies

For each row to sync:

1. `notion-api` CLI `page <row-url-or-uuid>` for each row to sync.
2. Parse `<content>` sections (Notion page template headings):
   - `# Purpose`
   - `# Personas`
   - `# In scope / Out of scope`
   - `# User flows`
   - `# Intended functionality`
   - `# Data + integrations`
   - `# Other modules this touches`
   - `# Open questions`
   - `# Decision log`
3. Do **not** commit scratch exports. Optional local-only staging: `apps/supersolt/_notion_module_overview_body.md` (gitignored) — delete after merge.

### Step 4 — Merge into plan.md

**If `plan.md` exists:** surgical merge (see below). **If missing:** ask whether to scaffold from [build-feature](../build-feature/templates/plan.md) with Notion-filled §1–§2 only, or skip.

#### Preserve (never delete from existing plan.md)

Everything from the first engineering heading through the end, typically starting at:

- `## 3. Architecture placement` (or `## 3. Architecture` / `## 5.` variants)
- Later sections: Data model, API, Rollout, Risks, Links, child-folder pointers, implementation checklists

Also preserve frontmatter keys the file already has (**Parent**, **Route**, **Owner**, child links) unless the user asks to refresh **Route** from **App URL**.

#### Replace or refresh (from Notion)

| plan.md section | Notion sources |
|-----------------|----------------|
| `## 1. Summary` | **Purpose** (1–2 paragraphs) + one line from **Personas** + link: `[Name (Notion)](url)` |
| `## 2. Scope` → `### In scope` | **In scope** bullets (MVP) |
| `## 2. Scope` → `### Out of scope` | **Out of scope** bullets |
| `## 2. Scope` → `### Non-goals` | Derive only if clearly stated in Notion; otherwise leave existing or omit |
| `## Notion specification` (insert **before** §3 if absent) | **User flows**, **Intended functionality**, **Data + integrations**, **Other modules this touches** — paste under `###` subheadings matching Notion titles |
| `## Open questions` | **Open questions** (replace prior Notion-derived bullets; keep repo-only questions under `### Engineering` if present) |
| `## Decision log` | **Decision log** (append new dated bullets; dedupe identical lines) |

Update frontmatter block:

- **Updated:** today’s ISO date (`YYYY-MM-DD`)
- Ensure **Notion** link in Summary matches fetched page URL
- **Slug** in frontmatter must match folder path (e.g. `insights-platform/sales`)

**Tone:** keep Notion’s product language; do not invent requirements. If a Notion section is empty (e.g. P&L TBC), say so explicitly in Summary.

#### plan.md does not exist

Offer one of:

1. **Scaffold** minimal `plan.md` (frontmatter + §1–§2 + Notion specification + placeholder “§3+ via build-feature”).
2. **Skip** and list path in report for [build-feature](../build-feature/SKILL.md).

Do **not** auto-create `tdd.md` or `flows.md` in this skill.

### Step 5 — Report

Return a short summary:

- **Updated:** paths written
- **Unchanged:** Notion body matched existing product sections (optional)
- **Skipped:** no mapping / no file / user dry-run
- **Needs mapping:** rows in Module Overview without a repo path — prompt to add a row to [mapping.md](mapping.md)
- **Conflicts:** places where repo §3+ contradicts Notion — flag for human review, do not silently “fix” engineering sections

## API call patterns

```bash
node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace supersolt database 34f64094-bde6-8086-bf03-c99d2c737068
node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace supersolt page <page-uuid>
```

Search is only for discovering the database if IDs change; prefer the canonical IDs above.

## Relationship to other skills

| Task | Skill |
|------|--------|
| Full feature triad (plan + tdd + flows) from scratch | [build-feature](../build-feature/SKILL.md) |
| Repo-wide roadmap (not per-module plan) | [create-roadmap](../create-roadmap/SKILL.md) |
| PM tracking in Notion (tasks, releases) | [bullyproof-pm-notion](../bullyproof-pm-notion/SKILL.md) + [notion-api](../notion-api/SKILL.md) |

**Roadmap** (`apps/supersolt/docs/roadmap.md`) is **out of scope** for this skill unless the user explicitly includes it.

## Anti-patterns

- Overwriting §3+ architecture/data model with Notion prose.
- Syncing **repo → Notion** (wrong direction for this skill).
- Creating duplicate feature folders when an existing `plan.md` path already works (e.g. `dashboard/` vs `supersolt-dashboard/`).
- Replacing engineered Sales/Insights checklists with shorter Notion text without carrying forward repo-specific implementation notes — merge, don’t blind-replace.

## Additional resources

- Row → path map and heuristics: [mapping.md](mapping.md)
