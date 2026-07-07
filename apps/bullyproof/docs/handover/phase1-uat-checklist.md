# Phase 1 UAT Checklist

> Run signed in, on the Vercel preview of `fixes/phase1-completion` or local dev.
> Accounts needed: platform admin; a teacher at a school with classes at
> different year levels; a second teacher at the same school; a
> GOVERNMENT_VIEWER test user.

## 1. Lesson defects (items 51/53)

- [ ] Back link, completed lesson: as the non-owner, open another teacher's completed/feedback lesson at /run-lesson, click "Back to lesson", land on Feedback (no Prepare loop)
- [ ] Back link, preparing lesson: same path lands on Prepare
- [ ] Back link, ready lesson: same path lands on the school lessons list
- [x] Mixed-level selection: two classes at different levels show the amber guidance panel (per-class options + Back + compromise), never a blank screen (re-verified live 7 Jul)
- [x] Per-class pick continues the wizard with that class's recommendation (re-verified live 7 Jul)
- [ ] Null-recommendation fallback: a class with no matching published content shows "No recommended lesson for this selection" with Back + choose manually
- [x] No 3-item cap: levels with many topics list all of them (re-verified live 7 Jul: all 10 Early Primary lessons render)

## 2. Apply Template confirmation (item 40)

- [x] School's Activation tab: the applied template shows a green card with a "Template active" badge; other templates read "Not active" (re-verified live 7 Jul)
- [ ] Applying a template turns its card green and the button changes to "Re-apply template"; the state persists on reopen

## 3. Labels (items 28/44/45/57)

- [ ] /admin/users: Access Levels header, Access Level filter, Access Levels drawer tab, Add Access Level dialog, School & Access Level step
- [ ] School settings users drawer: Edit Access Levels
- [ ] School portal headers + breadcrumbs: Preview Lessons, Teach Lessons (admin breadcrumbs unchanged)
- [x] School settings classes: Student Numbers label (and table header) (verified live 7 Jul, incl. search placeholder)
- [ ] As a teacher or school admin: no Ctrl+K button in the header and the shortcut does nothing; theme toggle intact
- [ ] As a Bullyproof platform admin: the Ctrl+K command menu button and shortcut still work
- [ ] View-as a teacher (impersonate): the command menu disappears while viewing as the school user

## 3b. 22 June free-fix sweep (verified live 7 Jul 2026, re-checkable)

- [x] User lists show only the highest access level per user (admin users, school Teachers, Settings/Users, Settings/Certification); the user detail drawer still lists everything for management
- [x] Sidebar screen tips: hovering school portal items (Teachers, Classes, Teach Lessons, Preview Lessons, Resources, Performance, Reports, Settings, Support, AP Certification) shows the agreed descriptions
- [x] Teach Lessons page: no search bar, no Show completed buttons; My Lessons / Other Lessons only
- [x] Lesson wizard: no step numbers, step 1 titled "Select Class/Classes" with the different-levels caution, Recommendation copy reads "Review the recommended lesson for your selected class/classes." with click-Next / Choose-another-lesson lines, no Help button
- [x] Wizard Choose Lesson list orders levels by year (1/2 up to 12)
- [x] Lesson feedback: note under the stars reads "You must rate this lesson to do another lesson."
- [x] School portal filters read All Access Levels and list school levels only (no licence account)
- [x] School drawer: License and Feature Access panels both render and work (Activity remains the quoted-module stub)
- [x] School activation tab: applied templates show a green card with a "Template active" badge and the button flips to "Re-apply template"

## 4. Culture rating (item 15)

- [x] Benchmark exclusions = 0, comparative > 0: headline still computes from remaining metrics (verified live on St4s Test School: Term 3 comparative shows 5.7%, exclusion delta dropped and re-weighted)
- [x] Metric 0 in both periods: shows as no change, headline computes (verified live on St4s Test School: Term 2 comparative shows 11.1% with exclusion delta 0)
- [ ] Full dataset: headline unchanged from before (covered by `culture-rating-math.test.ts` sample-workbook case; re-check on-screen when Glenn's real Woodford data goes in)

## 5. AP certificate (item 32)

- [x] Completed course page: Download button on the certificate card produces a branded PDF with correct name and completion date (re-verified 7 Jul, user-confirmed download)
- [x] /profile shows real user data plus a Certificates card with working downloads (verified live 7 Jul)
- [ ] Empty state for users with no completed courses
- [ ] Optional: course_progress.certificate_issued_at set after first download
- [ ] Incomplete course: certificate URL returns 403, not a PDF

## 6. Reports export (items 34/35)

- [x] /admin/reports Export: CSV downloads with Summary, Idle active schools, Recent lessons (verified 7 Jul by inspecting the downloaded file)
- [ ] PDF export: titled, dated, tabular
- [ ] Tab switch changes export contents and filename
- [ ] School scope filter is reflected in the export Scope row

## 6b. Export packs (SOW 15.1.5)

- [x] /admin/reports all-schools Export: CSV now includes Schools register (every school with counts, licence, AP certified, culture benchmark) + Culture trends sections (verified 7 Jul from file contents, 57 schools, culture trends incl. St4s 5.7)
- [ ] /admin/reports with a school selected: export includes that school's Classes, Staff, Lesson history, Culture rating periods
- [x] School portal /reports as school admin: page shows Classes / Staff / Lesson history / Culture tables + Export works (verified 7 Jul on St4s and Collinsville; day's test lesson appeared live in Classes and Lesson history)
- [ ] School portal /reports as TEACHER: page shows only My progress / My certification / My lesson history (no other staff visible) + Export works
- [ ] Teacher cannot see school-wide data anywhere in their export file

## 7. Government dashboard (item 36)

- [ ] GOVERNMENT_VIEWER sees the five-stat Government Reporting dashboard (no placeholder)
- [ ] Aggregates only: no school names or drill-downs
- [ ] Export works (CSV + PDF)
- [ ] Teacher accounts cannot see it; /api/government/overview returns 403 for them

## 8. Regressions

- [x] Single-class lesson flow end to end unchanged (7 Jul: created on behalf of school admin, prepare access-policy correct, cancel transition PUT 200, appears in history/exports)
- [x] Item 39: school Address + Email Domain edit persists after reload (7 Jul: defect REPRODUCED, root-caused as display-side field drop, FIXED in 7c7bf90, re-verified on the exact flow)
- [ ] Admin slide editing and reorder unchanged
- [x] Admin report pages render as before beyond the new Export button (verified 7 Jul)
