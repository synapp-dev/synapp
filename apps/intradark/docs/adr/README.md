# Architecture Decision Records (intradark)

Use this folder for **product-scoped, load-bearing** decisions that future contributors should not re-litigate without reopening the record (queue rules, bot contracts, data ownership inside intradark, integration boundaries).

## What belongs here

- **Do:** One decision per file; context, decision, consequences; link to roadmap or feature specs when useful.
- **Do not:** Ephemeral notes (“maybe later”), obvious facts, or **monorepo-wide** rules—those live in the repo root [`ARCHITECTURE.md`](../../../../ARCHITECTURE.md).

## Naming

- Files: `NNNN-short-kebab-title.md` with zero-padded sequence (e.g. `0001-match-state-owned-by-web.md`).
- Pick the next free number when adding an ADR.

## Suggested sections

Use the same shape as the workspace ADR template in `.cursor/skills/improve-codebase-architecture/ADR-FORMAT.md` (title line, status, context, decision, consequences).

## Status values

Typical values: **proposed** | **accepted** | **superseded by** `NNNN-other-title.md`.

## Index

| ID | Title | Status |
|----|--------|--------|
| — | *(none yet)* | — |

When you add an ADR, append a row to the table above.
