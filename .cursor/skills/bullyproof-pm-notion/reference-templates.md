# Notion templates — Bullyproof PM

Use these as copy-paste starting points in Notion pages or database template bodies. Adjust property names to match the user’s actual database.

## Feature / initiative page

```markdown
# [Feature name]

## Problem
[User / school / admin pain in one paragraph]

## Success criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

## Scope
**In:** …  
**Out:** …

## Timeline
- Target: [date or week]
- Dependencies: …

## Bullyproof surface
[e.g. `schools/[id]/lessons`, admin reports, culture rating]

## Rollout
Link: [Rollout checklist page](#)

## Links
- Spec / design: …
- PR / branch: …
```

## Rollout checklist (page or toggle list)

```markdown
# Rollout: [Feature] — [Release name / date]

## Pre-release
- [ ] Code merged / tagged
- [ ] Migrations / env vars documented
- [ ] Feature flag default documented

## Release
- [ ] Deployed to [environment]
- [ ] Smoke: [list 3–5 critical paths]
- [ ] Monitoring / errors checked (window: …)

## Post-release
- [ ] Pilot group notified (if applicable)
- [ ] GA / wider enablement date set
- [ ] Support brief sent (if applicable)

## Rollback
- [ ] Rollback path confirmed: …
```

## Suggested database properties (if creating a new DB)

| Property     | Type        | Notes                                      |
|-------------|-------------|--------------------------------------------|
| Name        | Title       | Short stakeholder-facing title             |
| Status      | Select        | Idea, Scoped, In progress, Blocked, Done |
| Priority    | Select        | P0–P3 or High/Med/Low                      |
| Owner       | Person        |                                            |
| Target date | Date          | Ship or decision deadline                  |
| Release     | Select / Relation | Train name or version tag               |
| Area        | Select        | Maps to Bullyproof product surfaces        |
| Epic        | Relation      | Optional grouping                          |

## “At-risk” note (inline on a row or in weekly summary)

```text
At risk: [reason]. Mitigation: [action]. New target: [date].
```
