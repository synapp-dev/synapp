# Tenancy and access — TDD plan

| # | Layer | Behavior | Status |
|---|-------|----------|--------|
| 1 | unit | slug → id resolution errors on unknown slug | red |
| 2 | integration | access context returns venues for member only | red |
| 3 | integration | non-member GET venue API → 403 | red |
| 4 | integration | RLS denies cross-org read | red |

Fixtures: two users, two orgs, one shared venue membership.
