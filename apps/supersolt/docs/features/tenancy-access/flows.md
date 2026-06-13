# Tenancy and access — User flows

## 1. Happy path

| # | User does | System does |
|---|-----------|-------------|
| 1 | Logs in | Session + org list |
| 2 | Selects org/venue | Navigate to `/{org}/{venue}/dashboard` |
| 3 | Switches venue | Same section path under new venue slug |
| 4 | Opens module API | `assertVenueMember` passes |

## 2. Error states

| Trigger | UI | Recovery |
|---------|-----|----------|
| Invalid slugs in URL | 404 or redirect | Pick valid venue |
| Not a member | Forbidden toast | Switch org |
| Expired session | Auth redirect | Re-login |

## 3. Cross-module

- All venue APIs must accept explicit org/venue slugs or IDs — never trust client-only store.
