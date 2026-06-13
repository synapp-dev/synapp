# Notion workspace registry

One **internal connection** ([Notion docs](https://developers.notion.com/guides/get-started/internal-connections)) per product workspace. Tokens live in env only — never commit.

## Environment variables

| Workspace key | Env var | Notion connection name | Hub page |
|---------------|---------|------------------------|----------|
| `supersolt` | `NOTION_SUPERSOLT_TOKEN` | `notion-supersolt` | [Supersolt-MVP](https://www.notion.so/1ad64094bde682d89d0101d43d64bf75) |
| `bullyproof` | `NOTION_BULLYPROOF_TOKEN` | `notion-bullyproof` | [Bullyproof HQ](https://www.notion.so/df1f705080ed834a8e05813170fc1f8c) |

Store tokens in **`~/.cursor/notion.env`** (recommended) or Cursor user env:

```bash
NOTION_SUPERSOLT_TOKEN=ntn_...
NOTION_BULLYPROOF_TOKEN=ntn_...
```

## Supersolt canonical IDs

| Resource | UUID |
|----------|------|
| Module Overview (database) | `34f64094-bde6-8086-bf03-c99d2c737068` |
| Supersolt-MVP (hub) | `1ad64094-bde6-82d8-9d01-01d43d64bf75` |

## Bullyproof canonical IDs

| Resource | UUID |
|----------|------|
| Bullyproof HQ (hub) | `df1f7050-80ed-834a-8e05-813170fc1f8c` |
| Product Roadmap (database) | `8c9f7050-80ed-83a4-a47c-017d1d3ea31d` |
| Engineering Tasks (database) | `8aff7050-80ed-826e-b00d-013fb1792c6a` |
| Team Sprints (database) | `589f7050-80ed-82d9-964f-015f8cafa09a` |
| Bullyproof Platform Map | `30df7050-80ed-811f-9eb4-ebf2a11fd0c5` |

## Granting access

After creating each internal connection in the [Developer portal](https://www.notion.so/developers/connections):

1. **Content access** tab → add hub page (access inherits to children), or
2. Page **••• → Connections → Add connection** on specific pages/databases.

Without page access, API calls return `object_not_found` or `unauthorized`.
