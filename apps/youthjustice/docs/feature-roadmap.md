# Youth Justice Platform: Feature Ideas & Concept Expansion

Planning document, 2026-07-15. Nothing here is committed scope; it is an ideation map
that expands the concept from the infrastructure that already exists in `apps/youthjustice`.

## What exists today (the foundation to build on)

- Case switcher + case-scoped routes (`/cases/[caseSlug]/...`) with tabs: Correspondence,
  Calendar, Safety Plans, Support Contacts, Meetings (placeholder)
- Platform-level: Dashboard (hero + 3 stat cards), Messages (per-case chat threads),
  Notifications sidebar, Settings, Profile (feature-gated via `me` store roles/features)
- 30 dummy cases across Victorian locations (`lib/dummy-cases.ts`), dummy correspondence
  and calendar content, demo messages/notifications contexts
- Monorepo plumbing ready for a real backend: `@workspace/supabase`, entities pattern,
  Supabase auth scaffold, PWA service worker

## Personas

1. **Case worker** (primary today): manages a caseload of young people, logs contact,
   tracks obligations, prepares for court.
2. **Young person** (second role, agreed direction): sees their own case only, in
   simplified language: their calendar, their worker, their plan, their messages.
3. Future personas worth designing around now (not building yet): **team leader /
   unit manager** (caseload oversight, approvals, reallocation), **carer/guardian**
   (limited visibility, consent-gated), **external stakeholder** (legal aid, school,
   health provider: scoped sharing rather than accounts, at least initially).

---

## Feature map by module

Phasing: **P0** = flesh out in the demo with dummy data, **P1** = first real build,
**P2** = later / needs stakeholder input.

### 1. Case Overview page (agreed priority, currently missing entirely)

A `/cases/[caseSlug]` landing page; today the case root has no home and nav drops
straight into Correspondence.

- **P0** Youth summary header: name, age/DOB, photo placeholder, location/region,
  allocated worker, case status chip (active, pending closure, breach flagged)
- **P0** Order/supervision panel: order type (bail supervision, probation, youth
  supervision order, parole), start/end dates, conditions list, compliance state
- **P0** "Next 7 days" strip: pulls from the existing calendar data (court dates,
  appointments, check-ins), the single most useful thing on the page
- **P0** Recent activity feed: merges correspondence + meetings + notes into one
  reverse-chronological stream (infrastructure for this exists in dummy content)
- **P0** Quick actions: log contact, add note, schedule meeting, message the youth
- **P1** Compliance snapshot: reporting obligations met/missed, curfew checks,
  program attendance percentage
- **P1** Alerts banner: overdue case plan review, court date within 48h, missed
  appointment needing follow-up
- **P2** Risk/needs assessment summary with review cycle dates

### 2. Case notes & contact recording (biggest functional gap)

Correspondence today is a read-only log. Real youth justice work is contact recording.

- **P0** "Log contact" flow: channel (visit, phone, SMS, in-app), who was present,
  summary, outcome, follow-up required flag
- **P0** Case notes: freeform notes with categories (welfare, compliance, family,
  education), pinned notes, author + timestamp
- **P1** Follow-up tasks generated from notes ("call carer Friday"), surfacing on
  dashboard and overview
- **P1** Attempted-contact tracking (unsuccessful visits matter for compliance evidence)
- **P2** Note templates per contact type; supervisor countersigning for significant events

### 3. Calendar & obligations

Calendar exists with event types (Court, Meeting, Appointment). Expand it into an
obligations engine.

- **P0** Month/week/agenda views (panel exists, currently list-flavoured)
- **P0** Event detail drawer: location, attendees, transport arranged flag, notes
- **P1** Recurring obligations: weekly reporting, curfew windows, program sessions
- **P1** Attendance outcomes on events (attended / missed / rescheduled) feeding the
  compliance snapshot
- **P1** Youth-facing view: their appointments in plain language with reminders
  (PWA push is already proven tech in this monorepo)
- **P2** Court date sync / import from listings; transport booking requests

### 4. Meetings (placeholder today)

- **P0** Meeting list with type (case plan review, family meeting, professionals
  meeting, group conference), status, attendees
- **P0** Meeting detail: agenda, outcomes/actions recorded, linked documents
- **P1** Action items with owners and due dates that flow into the tasks system
- **P2** Restorative justice / group conferencing workflow (invitations, consent,
  outcome agreements)

### 5. Safety plans (currently a static document list)

- **P0** Structured plan instead of files: identified risks, warning signs, coping
  strategies, safe people/places, emergency contacts, review date
- **P0** Version history and "last reviewed" surfacing (overdue review = alert)
- **P1** Youth co-authoring mode: the young person edits their own strategies in
  their view, worker approves
- **P1** One-tap emergency contacts on the youth side (call/text straight from plan)
- **P2** Crisis mode: a distress button on the youth app that notifies the worker
  and shows the safety plan immediately

### 6. Support contacts

- **P0** Structured directory per case: role (carer, lawyer, teacher, psychologist,
  Aboriginal liaison), organisation, consent-to-contact status
- **P1** Contact interaction history (links into correspondence)
- **P2** Information-sharing register: what was shared with whom, under what
  authority (this is a compliance requirement in this sector, and a differentiator)

### 7. Messages

Demo threads exist per case. Expansion:

- **P0** Worker-side inbox improvements: unread states (exists), filters, quick
  replies, message-to-note promotion ("save to case record")
- **P1** Youth-side messaging with safeguards: hours-of-availability notice,
  escalation path when the worker is off duty, all messages retained on the record
- **P1** Broadcast/reminder messages (appointment tomorrow) generated from calendar
- **P2** Interpreter/plain-language support; reactions and read receipts

### 8. Dashboard & reporting (worker, then team leader)

- **P0** Make the 3 stat cards real against dummy data: caseload count, overdue
  follow-ups, events this week; add a "needs attention" case list (missed
  appointments, upcoming court, overdue reviews)
- **P1** My-day view: today's schedule across all cases, travel-friendly ordering
- **P1** Caseload health indicators per case (contact frequency vs required cadence)
- **P2** Team leader dashboard: allocation view, caseload weights, breach/incident
  queue, exportable reports (CSV/PDF patterns exist in bullyproof to reuse)

### 9. Documents

Not present at all today; Safety Plans hints at it.

- **P1** Per-case document library: court reports, assessments, consent forms,
  versioning, category tags
- **P1** Document visibility flags (worker-only vs shared-with-youth)
- **P2** Report builder: court report / case plan generated from recorded data,
  exported to PDF (pdf-lib pattern exists in supersolt)

### 10. Youth-facing app (role two)

Reuses the same case-scoped infrastructure with a single-case, simplified shell:

- **P1** "My plan" home: next appointment, my worker card (photo, contact, hours),
  my goals, quick access to safety plan
- **P1** My calendar + reminders (PWA push), my messages
- **P1** Goals & achievements: case plan goals reframed as youth-visible progress,
  streaks for kept appointments (careful, encouraging tone, not gamified surveillance)
- **P2** Check-in prompts (mood/wellbeing pulse the worker can see), service
  directory (local supports, helplines), education/employment resources

### 11. Cross-cutting platform work

- **P1** Real schema + roles: cases, youth profiles, workers, allocations, orders,
  events, notes, messages, plans, contacts; RLS so youths see only their case
  (the two-role decision makes RLS design the first real backend task)
- **P1** Audit trail on every read/write of a case record (sector requirement;
  bullyproof audit patterns are reusable)
- **P1** Notifications wired to real events (allocation, message, upcoming event,
  overdue review) replacing the demo context
- **P2** Offline-first for workers doing home visits (service worker exists; needs
  a queued-writes strategy)
- **P2** Incident reporting workflow with escalation; breach recommendation flow
- **P2** Cultural safety: Koori Court pathway flags, Aboriginal liaison role,
  interpreter needs on the youth profile

---

## Suggested build order (if this becomes scope)

1. **Case Overview page** on dummy data (P0 above): highest demo value, zero backend
2. Case notes + log-contact flow (dummy): makes the demo feel like a working tool
3. Meetings fleshed out + calendar event details (dummy)
4. Structured safety plan + youth view mockup of it (dummy): the emotional
   centrepiece for any stakeholder demo
5. Then the P1 backend cutover: schema, RLS for two roles, notifications

## Open questions for stakeholders

- Who is the actual customer: a government department, an NGO provider, or a pitch?
  (Determines compliance depth: audit, information sharing, records retention.)
- Is the young person legally able to be a direct account holder, or does access
  need guardian consent gating?
- Does "case" mean the young person overall or a specific order/episode? (Data
  model fork: one youth can have sequential or concurrent orders.)
- Any requirement to integrate with existing state systems (court listings, CRIS-like
  case systems), or is this standalone?
