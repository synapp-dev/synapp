# Minimum Content-Change Audit Trail: Technical Scope

*The concise technical scope requested on 9 July 2026 for the minimum content-change audit capability, carved out of module M5 as an independent deliverable. Fixed price $15,950 + GST.*

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

Rate basis: the same $2,900 per day used throughout the module quotes ($21,750 / 7.5 days for the full M5 item).

| Work item | Effort |
|---|---|
| Append-only audit store, schema and writer | 1.0 day |
| Instrumentation of all content mutation services and routes across both content systems (about fourteen surfaces) | 2.5 days |
| Audit Logs workspace: register, filters, pagination, CSV export | 1.5 days |
| Tests, acceptance verification and live demonstration | 0.5 days |
| **Total: 5.5 days at $2,900** | **$15,950 + GST, fixed** |

Commissioning follows the M1 pattern: 40% deposit on commissioning ($6,380 + GST), balance on delivery and acceptance against the criteria in section 8. The remainder of M5 (version comparison, rollback, visual change histories, step-up MFA, sole-editor lock) stays optional and unaffected.
