---
name: notion-api
description: Reads and writes Notion workspaces via Internal Connection API tokens (supersolt, bullyproof). Use instead of Notion MCP when querying specs, syncing Module Overview, PM tasks, or any Notion page/database — avoids OAuth and supports multiple workspaces in parallel.
---

# Notion API (internal connections)

Use the **Notion REST API** with one [internal connection](https://developers.notion.com/guides/get-started/internal-connections) token per workspace. No MCP OAuth, no port conflicts, both workspaces work at once.

## Setup (user, one-time per workspace)

1. Open [Developer portal → Internal connections](https://www.notion.so/developers/connections).
2. **Create a new connection** for each workspace (Supersolt-MVP, Bullyproof HQ).
3. Copy each **Installation access token** (`ntn_…`).
4. Grant **Content access** to the hub page (children inherit) — see [workspaces.md](workspaces.md).
5. Save tokens in **`~/.cursor/notion.env`** (gitignored, never commit):

```bash
NOTION_SUPERSOLT_TOKEN=ntn_...
NOTION_BULLYPROOF_TOKEN=ntn_...
```

6. Verify:

```bash
node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace supersolt me
node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace bullyproof me
```

Prefer this skill over Notion MCP. Notion MCP entries are not required in `~/.cursor/mcp.json`.

## Workspace selection

| Product | `--workspace` | Env var |
|---------|---------------|---------|
| Supersolt | `supersolt` | `NOTION_SUPERSOLT_TOKEN` |
| Bullyproof | `bullyproof` | `NOTION_BULLYPROOF_TOKEN` |

Canonical page/database IDs: [workspaces.md](workspaces.md).

## CLI (always run via Shell)

Script: [scripts/notion-api.mjs](scripts/notion-api.mjs)

```bash
# Search
node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace supersolt search "Module Overview"

# Page body (UUID or notion.so URL)
node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace supersolt page 34f64094-bde6-8086-bf03-c99d2c737068

# Database rows
node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace supersolt database 34f64094-bde6-8086-bf03-c99d2c737068

# Raw JSON
node .cursor/skills/notion-api/scripts/notion-api.mjs --workspace bullyproof search "roadmap" --json
```

## Agent workflow

1. Pick workspace from user context (`apps/supersolt` → `supersolt`, `apps/bullyproof` → `bullyproof`).
2. Run CLI commands; do not invent page content.
3. For writes (create/update pages, database rows), use direct `fetch` to `https://api.notion.com/v1/...` with the same token and `Notion-Version: 2022-06-28`. See [Notion API reference](https://developers.notion.com/reference/intro).
4. If `object_not_found` / `unauthorized` → connection lacks page access; tell user to share the page with the internal connection.

## Common tasks

| Task | Command / approach |
|------|-------------------|
| Sync Module Overview → plan.md | Use [sync-notion-module-overview](../sync-notion-module-overview/SKILL.md) (updated to use this CLI) |
| Bullyproof PM / roadmap | Use [bullyproof-pm-notion](../bullyproof-pm-notion/SKILL.md) + `database` on Product Roadmap / Engineering Tasks |
| List hub contents | `search ""` or `page` on hub UUID from workspaces.md |
| Compare workspaces | Run `me` or `search` on both `--workspace` values |

## API patterns (when CLI is not enough)

```javascript
// POST https://api.notion.com/v1/pages — create page under parent
// PATCH https://api.notion.com/v1/pages/{id} — update properties
// PATCH https://api.notion.com/v1/blocks/{id}/children — append blocks
// Headers: Authorization: Bearer $TOKEN, Notion-Version: 2022-06-28
```

Load token from env key in [workspaces.md](workspaces.md). Never log or commit tokens.

## Limitations vs Notion MCP

- Block → markdown conversion in the CLI is **basic** (headings, lists, paragraphs). Complex tables/databases inline may need raw JSON via `--json` or follow-up block fetches.
- File uploads not supported via simple REST flow.
- Writes require explicit API calls; no high-level "notion-create-pages" tool — use reference docs.

## Related skills

- [sync-notion-module-overview](../sync-notion-module-overview/SKILL.md) — Supersolt Module Overview → `plan.md`
- [bullyproof-pm-notion](../bullyproof-pm-notion/SKILL.md) — Bullyproof PM workflows
