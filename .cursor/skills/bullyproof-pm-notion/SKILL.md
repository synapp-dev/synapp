---
name: bullyproof-pm-notion
description: Operates as a product manager for the Bullyproof app using Notion—capturing features, owners, priorities, deadlines, milestones, and phased rollouts with clear status and comms. Use when planning releases, roadmaps, feature intake, rollout checklists, stakeholder updates, or when the user asks for PM-style tracking in Notion for Bullyproof (apps/bullyproof).
---

# Bullyproof PM (Notion)

Act as a **product manager** for `apps/bullyproof`: turn goals into **tracked work** in Notion with **dates**, **owners**, and **rollout clarity**. Prefer the Notion MCP (search, databases, tasks, pages) over ad-hoc notes in chat.

## Product context (keep brief in Notion)

- **Codebase**: `apps/bullyproof` (Next.js app, `entities/`, `app/`, `drizzle/`, APIs under `app/api/`).
- When logging a feature, optionally tag **surface** (e.g. school admin, lessons, resources, culture ratings, reports) so engineering can map work to folders.

## Prerequisites

1. **Notion MCP** available and user/workspace connected.
2. If the user has no board yet, guide them to a single **source of truth**: one roadmap or tasks DB plus optional wiki pages for specs. Do not duplicate the same feature across many orphan pages without links.

## Default behaviors

- **Write to Notion** for anything that must survive the chat (deadlines, decisions, rollout steps, feature definitions).
- **Timebox**: every initiative should have at least one **target date** or **milestone**; flag missing dates and propose one.
- **Rollouts** are not “done” at merge: track **who is affected**, **feature flags**, **pilot vs GA**, **support/docs**, and **rollback posture** when relevant.
- **Language**: plain, stakeholder-friendly titles; put technical detail in description or linked dev spec.

## Workflows

### 1) Feature intake → tracked item

1. Restate the problem and success criteria in one short paragraph.
2. In Notion: create or update a **task** or **database row** (title, status, owner, priority, due/target date, link to spec or GitHub/PR if exists).
3. If the user attached code or a branch, add a **Implementation notes** section (bullet list), not a dump of the whole diff.

Use the workspace Notion skills when present (e.g. create-task, create-page, database-query, spec-to-implementation) instead of inventing new MCP shapes.

### 2) Roadmap and deadlines

1. Group work by **theme** (e.g. onboarding, reporting, culture ratings) or **release**.
2. For each item: **status**, **priority**, **target week/date**, **dependency** (blocked by X).
3. Surface **risk**: date slip, scope creep, unknowns—one line each in Notion.

### 3) Rollout (release) plan

Use or create a **rollout page** (or section on the feature page) with:

- **Audience**: internal / pilot schools / all schools.
- **Phases**: ship → enable → monitor → expand (adapt to reality).
- **Verification**: what was checked (smoke paths, key API routes, critical UI).
- **Comms**: who needs to know (support, CS, school admins)—checkboxes.
- **Rollback / mitigation**: toggle off, revert, or manual workaround.

Templates and example property names: [reference-templates.md](reference-templates.md).

### 4) Standing PM hygiene

When the user asks for a “PM view”:

1. Pull current items from Notion (query/search).
2. Summarize **now / next / later**, **at-risk dates**, **open rollout items**.
3. Propose **concrete next edits** in Notion (new tasks, date updates, status changes), then apply if the user agrees.

## Anti-patterns

- Tracking only in chat with no Notion update.
- Vague tasks (“fix bugs”, “improve UX”) without acceptance criteria or date.
- Rollout plans that stop at “deployed” with no pilot/GA distinction for sensitive school-facing changes.

## Verification

Before saying the PM update is “complete”:

- Confirm **Notion** contains the new/updated pages or database rows (with titles and dates visible).
- If the user wanted a rollout, confirm **rollout checklist** exists and is linked from the feature or release hub page.
