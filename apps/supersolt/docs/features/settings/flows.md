# Settings (parent) — User flows

## Happy path

| # | User does | System does |
|---|-----------|-------------|
| 1 | Opens settings | Renders allowed tabs only |
| 2 | Navigates to integrations | Square/Xero status |
| 3 | Opens permissions | Delegates to permissions flows |

## Error states

| Trigger | UI |
|---------|-----|
| Staff role | Missing admin tabs |
| Integration disconnected | Reconnect CTA |

See child `permissions/flows.md` for member management.
