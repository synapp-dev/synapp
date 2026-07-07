# Phase 1 completion - manual UAT checklist

> Run signed in, on the Vercel preview of `fixes/phase1-completion` or local dev.
> Accounts needed: platform admin; a teacher at a school with classes at
> different year levels; a second teacher at the same school; a
> GOVERNMENT_VIEWER test user.

## 1. Lesson defects (items 51/53)

- [ ] Back link, completed lesson: as the non-owner, open another teacher's completed/feedback lesson at /run-lesson, click "Back to lesson", land on Feedback (no Prepare loop)
- [ ] Back link, preparing lesson: same path lands on Prepare
- [ ] Back link, ready lesson: same path lands on the school lessons list
- [ ] Mixed-level selection: two classes at different levels show the amber guidance panel (per-class options + Back + compromise), never a blank screen
- [ ] Per-class pick continues the wizard with that class's recommendation
- [ ] Null-recommendation fallback: a class with no matching published content shows "No recommended lesson for this selection" with Back + choose manually
- [ ] No 3-item cap: levels with many topics list all of them

## 2. Apply Template confirmation (item 40)

- [ ] Template cards show green "Active on N schools" when fully applied
- [ ] Unlock dialog shows a green Active chip on schools that already have the template
- [ ] Applying to a school updates the badge and the dialog on reopen

## 3. Labels (items 28/44/45/57)

- [ ] /admin/users: Access Levels header, Access Level filter, Access Levels drawer tab, Add Access Level dialog, School & Access Level step
- [ ] School settings users drawer: Edit Access Levels
- [ ] /admin/features tabs: Platform Access Levels
- [ ] School portal headers + breadcrumbs: Preview Lessons, Teach Lessons (admin breadcrumbs unchanged)
- [ ] School settings classes: Student Numbers label (and table header)
- [ ] As a teacher or school admin: no Ctrl+K button in the header and the shortcut does nothing; theme toggle intact
- [ ] As a Bullyproof platform admin: the Ctrl+K command menu button and shortcut still work
- [ ] View-as a teacher (impersonate): the command menu disappears while viewing as the school user

## 4. Culture rating (item 15)

- [ ] Benchmark exclusions = 0, comparative > 0: headline still computes from remaining metrics
- [ ] Metric 0 in both periods: shows as no change, headline computes
- [ ] Full dataset: headline unchanged from before

## 5. AP certificate (item 32)

- [ ] Completed course page: Download button on the certificate card produces a branded PDF with correct name and completion date
- [ ] /profile shows real user data plus a Certificates card with working downloads
- [ ] Empty state for users with no completed courses
- [ ] Optional: course_progress.certificate_issued_at set after first download
- [ ] Incomplete course: certificate URL returns 403, not a PDF

## 6. Reports export (items 34/35)

- [ ] /admin/reports Export: CSV downloads with Summary, Idle active schools, Recent lessons
- [ ] PDF export: titled, dated, tabular
- [ ] Tab switch changes export contents and filename
- [ ] School scope filter is reflected in the export Scope row

## 6b. Export packs (SOW 15.1.5)

- [ ] /admin/reports all-schools Export: CSV now includes Schools register (every school with counts, licence, AP certified, culture benchmark) + Culture trends sections
- [ ] /admin/reports with a school selected: export includes that school's Classes, Staff, Lesson history, Culture rating periods
- [ ] School portal /reports as school admin: page shows Classes / Staff / Lesson history / Culture tables + Export works (CSV + PDF)
- [ ] School portal /reports as TEACHER: page shows only My progress / My certification / My lesson history (no other staff visible) + Export works
- [ ] Teacher cannot see school-wide data anywhere in their export file

## 7. Government dashboard (item 36)

- [ ] GOVERNMENT_VIEWER sees the five-stat Government Reporting dashboard (no placeholder)
- [ ] Aggregates only: no school names or drill-downs
- [ ] Export works (CSV + PDF)
- [ ] Teacher accounts cannot see it; /api/government/overview returns 403 for them

## 8. Regressions

- [ ] Single-class lesson flow end to end unchanged
- [ ] Item 39: school Address + Email Domain edit persists after reload
- [ ] Admin slide editing and reorder unchanged
- [ ] Admin report pages render as before beyond the new Export button
