# Minimum Content-Change Audit Trail: Technical Scope

*The concise technical scope requested on 9 July 2026 for the minimum content-change audit capability, carved out of module M5 as an independent deliverable. Fixed price $7,162.50 + GST, itemised in section 9 on the same rate card as every module quote.*

## 1. Entities and actions logged

Every create, edit, delete and reorder of lesson and course content, across both content systems:

- Curriculum: stages, topics, topic slides.
- Certification (online course): courses, course topics, course topic slides, quizzes, quiz questions and quiz answers.

Capture happens in the server service layer that all content mutations flow through.

## 2. Integrity: append-only records

The audit store is append-only at the application level. There is no interface, endpoint or administrative function that edits or deletes an audit record, at any access level, including Bullyproof Admin. Records are written by the server as a side effect of the mutation itself, not by the user. (As with any self-hosted system, privileged direct database access sits outside application control; after handover that access is governed by Amayda's own credential management, per the capability schedule.)

## 3. Information captured per event

- Acting user: identifier, display name and access level at the time of the change.
- Timestamp (UTC).
- Entity type, entity identifier and its human-readable title.
- Action performed (created, updated, deleted, reordered).
- A summary of the changed fields (field names and a short change description). Full before/after version comparison remains part of the broader M5 scope.

## 4. Retention

Records are retained indefinitely by default; there is no automatic purge. Periodic archiving is supported through export (section 6). A configurable retention policy can be added later as a small follow-on if a compliance schedule requires one.

## 5. Filtering and retrieval

The existing Audit Logs workspace becomes the delivery surface: a paginated, newest-first register with filters for date range, acting user, entity type and action, available to Bullyproof Admin.

## 6. Export

CSV export of the currently filtered result set, for compliance review and archiving, from the same workspace.

## 7. Capture level: application-wide, not interface-specific

Logging is implemented in the server service layer, so every change made through the application is captured regardless of how it arrives (the admin interface or any API client), because all content mutations pass through the same server services. Changes made directly in the database through privileged infrastructure access are not captured; that is standard for application-level audit trails, and database-level auditing is an infrastructure control outside this scope.

## 8. Acceptance criteria and tests

1. Each entity and action in section 1 produces exactly one audit record containing every field in section 3, verified per entity type.
2. No interface or endpoint exists that modifies or deletes an audit record; attempted mutation paths return an authorisation error, verified by test.
3. Filters and export return exactly the matching records, verified against seeded test data.
4. Unit tests cover the audit writer and each instrumented service; delivery is demonstrated live on the St4s Test School with a worked example (create, edit and delete a piece of test content, then retrieve and export the records).

## 9. Itemised effort and pricing basis

Rate basis: the same discipline rate card used in every module quote issued 29 June and reaffirmed 5 July (the deep card: UX/Design $100.00/hr, Frontend $106.25/hr, Backend $112.50/hr, DevOps/Infra $118.75/hr, Product Mgmt/BA $93.75/hr). This module is carved out of M5, which was quoted on that card, so the same card applies here.

The $15,950 figure in the letter of 8 July was a round estimate given ahead of itemisation. The itemised basis below comes in under it for two reasons: the task-by-task costing itself, at the same estimating grain as the M1 and M5 work breakdowns already issued, and an overlap with the M1 Content Type build currently underway, which generalises the same curriculum and certification services this module instruments. The instrumentation and schema estimates below therefore assume those services are already open under M1 rather than re-opened cold. The itemised figure is the price.

Delivery-window basis: the estimates assume commissioning while the M1 build is current. Commissioned well after M1 has closed, the instrumentation lines would carry a modest re-estimate once those services have settled.

| Discipline | Hours | Hourly rate | Subtotal |
|---|---:|---:|---:|
| UX / Design | 2 h | $100.00/hr | $200.00 |
| Frontend | 16 h | $106.25/hr | $1,700.00 |
| Backend | 38 h | $112.50/hr | $4,275.00 |
| DevOps / Infra | 2 h | $118.75/hr | $237.50 |
| Product Mgmt / BA | 8 h | $93.75/hr | $750.00 |
| **Module total** | **66 hours** | **$108.52/hr blended** | **$7,162.50 ex GST** |

**Total inc GST: $7,878.75. Fixed price.**

### Work breakdown - what each discipline does

Indicative basis of estimate, on the same terms as the module quotes: this is the engineering work behind the fixed price, itemised so the effort is visible. Tasks are not individually severable from the fixed price and do not change the acceptance basis; the deliverable is the working capability described in sections 1 to 8.

| UX / Design - $100.00/hr | Est. hours |
|---|---:|
| Wireframe the audit register table, filter bar and changed-fields detail, including empty and error states | 1.5 |
| Dark-mode and mobile QA pass on the register and filters | 0.5 |
| **Subtotal** | **2 h - $200.00** |

| Frontend - $106.25/hr | Est. hours |
|---|---:|
| Build entities/audit-logs TanStack Query hooks (endpoints, query keys) with filter parameters | 2 |
| Replace the stub admin Audit Logs page with the paginated, newest-first register | 4 |
| Loading skeleton, empty and error states plus cursor load-more on the register | 3 |
| Filter bar: date-range picker, user search, entity-type and action selects | 4 |
| Changed-fields summary detail on row expand | 2 |
| CSV export button wired to the export route | 1 |
| **Subtotal** | **16 h - $1,700.00** |

| Backend - $112.50/hr | Est. hours |
|---|---:|
| content_audit_log table (acting user, access level, action, entity type, entity id, title, changed-field summary, UTC timestamp) plus migration | 3 |
| Append-only enforcement: no update or delete path at any access level, including Bullyproof Admin; backup inclusion verified | 2 |
| Audit repo and service with a typed recordContentEvent() helper | 4 |
| Changed-field summary computation in the audit writer (per-entity field diffs) | 4 |
| Instrument curriculum services: stages, topics, topic slides (create, edit, delete, reorder) | 5 |
| Instrument certification services: courses, course topics, course topic slides (create, edit, delete, reorder) | 5 |
| Instrument quizzes, quiz questions and quiz answers | 3 |
| Audit-logs list route with date, user, entity-type and action filters plus cursor pagination | 4 |
| CSV export route over the filtered result set (including the changed-field summary column) | 3 |
| Tests: exactly one audit row per action per entity type, every section 3 field present | 3 |
| Tests: append-only enforcement; attempted mutation paths return authorisation errors | 2 |
| **Subtotal** | **38 h - $4,275.00** |

| DevOps / Infra - $118.75/hr | Est. hours |
|---|---:|
| Apply the migration to production Supabase; verify row-level security and backup inclusion | 1.25 |
| Monitor the new routes after deployment | 0.75 |
| **Subtotal** | **2 h - $237.50** |

| Product Mgmt / BA - $93.75/hr | Est. hours |
|---|---:|
| Confirm the event taxonomy and retention wording | 2 |
| Test plan covering all fourteen instrumented surfaces | 2 |
| Coordinate the UAT worked example on the St4s Test School (create, edit, delete, retrieve, export) | 3 |
| Acceptance sign-off and release notes | 1 |
| **Subtotal** | **8 h - $750.00** |

For reconciliation against the M5 quote you hold: the audit-log line items within the M5 work breakdown cover about seven content surfaces; this minimum module covers fourteen (adding the quiz entities, stage- and course-level actions, and reorder events), and adds the changed-field summary capture and the hardened append-only acceptance tests. That is the difference between this module and the audit portion of M5. If the remainder of M5 is commissioned later, the M5 price is reduced by the overlapping delivered items so nothing is paid twice.

Commissioning follows the M1 pattern: 40% deposit on commissioning ($2,865.00 + GST), balance on delivery and acceptance against the criteria in section 8. Indicative delivery: about a week of focused build. The remainder of M5 (version comparison, rollback, visual change histories, step-up MFA, sole-editor lock) stays optional and unaffected.
