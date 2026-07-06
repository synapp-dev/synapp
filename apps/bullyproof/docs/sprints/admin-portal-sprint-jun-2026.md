# Bullyproof Admin Portal — Team Sprints (Jun 2026)

> Source: Glenn feedback — *Bullyproof Admin - 01062026.pdf*  
> Product: `apps/bullyproof`  
> Window: **1 Jun – 30 Jun 2026** — all sprints complete within June; one at a time, highest priority first

---

## How to use in Notion

### Team Sprints database
Create one row per sprint below. Set **Sprint status** to `Current` for the active sprint only; others `Planned` until their dates.

### Engineering Tasks database
Create one row per task. Link each task to its **Sprint** (relation). Suggested **Status**: `Backlog` → `To Do` → `In Progress` → `Review` → `Done`.

| Property | How to use |
|----------|------------|
| **Task name** | Copy from task list below |
| **Sprint** | Link to matching Team Sprint row |
| **Priority** | P0 / P1 / P2 |
| **Due** | Use sprint end date, or stagger within sprint |
| **Status** | Backlog (default) |
| **Tags** | Surface tag from task (e.g. `admin-dashboard`, `teach-lessons`) |

---

## Sprint schedule (priority order)

| # | Sprint name | Dates | Days | Status | Engineering tasks |
|---|-------------|-------|------|--------|-------------------|
| 1 | Sidebar & Quick Fixes | 1 Jun – 2 Jun 2026 | 2 | Planned | 3 |
| 2 | Prepare / Teach Lessons (Bugs & UX) | 3 Jun – 6 Jun 2026 | 4 | Planned | 9 |
| 3 | Admin Dashboard Redesign | 7 Jun – 17 Jun 2026 | 11 | Planned | 22 |
| 4 | Culture Rating | 18 Jun – 21 Jun 2026 | 4 | Planned | 8 |
| 5 | Reports | 22 Jun – 23 Jun 2026 | 2 | Planned | 5 |
| 6 | Classes & Teachers UX | 24 Jun – 25 Jun 2026 | 2 | Planned | 4 |
| 7 | Content Types | 26 Jun – 27 Jun 2026 | 2 | Planned | 4 |
| 8 | Year Reset / Admin Operations | 28 Jun – 29 Jun 2026 | 2 | Planned | 4 |
| 9 | Lesson Feedback | 30 Jun 2026 | 1 | Planned | 2 |

**Rationale:** Quick P0 fixes and broken lesson flows first, then Glenn's main dashboard ask (largest block), then culture/reports/school-admin polish, content types and year-reset ops, lesson feedback on the final day.

**Note:** June is tight (~61 tasks in 30 days). Dashboard gets 11 days (~36% of the month). Defer **P2** tasks within a sprint if needed; do not slip sprints into July.

---

## Sprint 1: Sidebar & Quick Fixes

**Dates:** 1 Jun – 2 Jun 2026  
**Goal:** ASAP sidebar renames and working Support link (Glenn flagged these explicitly).

### Engineering Tasks

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| Rename sidebar **Content** → **Preview Lessons** | P0 | academy-sidebar | Released |
| Rename sidebar **Lessons** → **Teach Lessons** | P0 | academy-sidebar | Released |
| **Support** button opens email to `support@bullyproofaustralia.org.au` (CC Jeff + Glenn) | P0 | academy-sidebar | Released |

---

## Sprint 2: Prepare / Teach Lessons (Bugs & UX)

**Dates:** 3 Jun – 6 Jun 2026  
**Goal:** No blank screens; fix broken lesson flows; correct recommendation logic.

### Engineering Tasks

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| **Blank screen fix** — Grade ½ combinations (e.g. ½ Coral + ½ Gold) always show message explaining invalid selection + options | P0 | teach-lessons | Released |
| **Multi-class different levels** — guided options: Back / Select one class / Choose compromise lesson | P0 | teach-lessons | Released |
| **Take over lesson** — investigate regression; add teacher permission to allow takeover (or remove feature) | P0 | teach-lessons | Released |
| **Back to lesson** button not navigating — fix | P0 | teach-lessons | Released |
| **Recommended lesson bug** — mixed classes (e.g. 12 Beige + 5/6 Cyan) incorrectly show same L2 Senior Secondary | P0 | teach-lessons | Released |
| **Other lessons** list sorted by year level (½, ¾, … 10, 11, 12) | P1 | teach-lessons | Released |
| **Only 3 lessons showing** (L8, L9, L10) — investigate and fix display | P1 | teach-lessons | Released |
| **Lessons reset to L1** after completing all 10 — clarify audit log behaviour; confirm data retention | P1 | teach-lessons, audit | Released |
| Composite classes appear as **one class** when selecting multiple classes at different levels | P1 | teach-lessons | Released |

---

## Sprint 3: Admin Dashboard Redesign

**Dates:** 7 Jun – 17 Jun 2026  
**Goal:** Eagle's-eye view of school program health with drill-down to detail pages. Glenn's primary ask.

### Engineering Tasks — Core dashboard

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| Move admin sidebar: Invite School → **Manage Schools**, Edit Curriculum → **Manage Lessons**, Edit Certification → **Manage AP Cert** | P1 | admin-sidebar | Released |
| Dashboard summary stats: **Total Schools**, **Active Schools**, **Ahead**, **Slightly Behind**, **Behind** | P0 | admin-dashboard | Backlog |
| Define **Active School** logic (all onboarding complete + fully unlocked) | P0 | admin-dashboard, data | Backlog |
| **Schedule** status (Ahead / Slightly Behind / Behind) for Active Schools only | P0 | admin-dashboard | Backlog |
| **Progress to End of Term 2** widget (current week, % elapsed); default Qld | P1 | admin-dashboard | Backlog |
| Dashboard **filters**: Status, State, Sector, Type — all default "All" | P0 | admin-dashboard | Backlog |
| Sortable schools **table** with all columns (School Name, Culture, AP Cert %, Total Students, Total Classes, Lessons Completed Avg %, Schedule, Last Activity, Action) | P0 | admin-dashboard | Backlog |

### Engineering Tasks — School terms & schedule logic

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| **School terms by state** (Qld, NSW, Vic, SA, WA, Tas, NT, ACT); dashboard scoped to school's state | P0 | admin-dashboard, data | Backlog |
| **Annual reset of school terms** by state each year | P1 | admin-settings | Backlog |
| Schedule rule — Levels 1–4: by Week N of Term 2, completed N lessons | P0 | admin-dashboard, logic | Backlog |
| Schedule rule — Level 5 (Senior): 1 lesson per 2 weeks into Term 2 | P0 | admin-dashboard, logic | Backlog |
| Schedule rule — Year 2+ schools: Primary (Prep, G3, G5) or Secondary (G7, G11) only by end Term 2 | P0 | admin-dashboard, logic | Backlog |
| Schedule calculation: 1 lesson/week (L1–4) or 1 per 2 weeks (L5) by Friday; class average → school status | P0 | admin-dashboard, logic | Backlog |
| **Lessons Completed (Avg %)** — calculate required vs completed by school type/year (Primary Y1, Secondary mixed, Y2+ subset) | P0 | admin-dashboard, logic | Backlog |

### Engineering Tasks — Column drill-downs

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| **School Name** column → link to Schools/Onboarding page | P1 | admin-dashboard | Backlog |
| **Culture** column: ↑ / ↓ / BM / NA indicators; click → Culture Rating page | P0 | admin-dashboard | Backlog |
| **AP Cert %** → click → AP Certification detail per staff member | P1 | admin-dashboard | Backlog |
| **Total Classes** → click → Class Detail view | P1 | admin-dashboard | Backlog |
| **Lessons Completed (Avg %)** → click → Lesson History | P0 | admin-dashboard | Backlog |
| **Last Activity** — date of last lesson completed (any class) | P1 | admin-dashboard | Backlog |
| **Action** column: phone, email (Outlook), ⋮ menu (export defer unless Reports covers) | P2 | admin-dashboard | Backlog |

---

## Sprint 4: Culture Rating

**Dates:** 18 Jun – 21 Jun 2026  
**Goal:** Correct fields, formulas, rules, and UX per Glenn's 25 Apr template.

### Engineering Tasks

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| Culture Rating **data fields**: Period, School Days, Attendance, Absences, Minor/Major Incidents, Short/Long Suspensions, Exclusions | P0 | culture-rating | Backlog |
| Verify **formulas** match Glenn's 25 Apr email template | P0 | culture-rating | Backlog |
| Comparative Period rule: must start **after** Benchmark Period ends | P0 | culture-rating | Backlog |
| Comparative Period rule: must be done **after program completed** to all classes | P0 | culture-rating | Backlog |
| Comparative Period rule: minimum **20 school days** per period | P0 | culture-rating | Backlog |
| Allow **overlapping** Comparative Periods | P1 | culture-rating | Backlog |
| **Comparative Periods History** dropdown — default most recent | P1 | culture-rating | Backlog |
| **Dynamic speedometer**: ±100% default; expand to 150%/200% when improvement exceeds 100% | P1 | culture-rating | Backlog |

---

## Sprint 5: Reports

**Dates:** 22 Jun – 23 Jun 2026  
**Goal:** Fix broken Reports entry point; deliver school admin reports with year selection.

### Engineering Tasks

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| Fix **Reports** button on Bullyproof Academy sidebar | P0 | academy-reports | Backlog |
| **AP Certified Staff Report** — status + completion date; filter by calendar year | P1 | school-reports | Backlog |
| **AP Teacher Report** — classes/lessons per AP Teacher; year selector | P1 | school-reports | Backlog |
| **Class Report** — 1 to all classes, YTD or previous year; lessons, dates, teacher, rating | P1 | school-reports | Backlog |
| **Culture Rating Report** — select Comparative Period, download | P1 | school-reports | Backlog |

---

## Sprint 6: Classes & Teachers UX

**Dates:** 24 Jun – 25 Jun 2026  
**Goal:** Student numbers on classes; compact teacher list; lesson history views.

### Engineering Tasks

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| **Add/Edit Class**: **Student Numbers** field (create + edit) | P0 | school-classes | Backlog |
| **Classes** view: **View lessons completed** button (lessons, dates, teacher); keep My/Other star toggle | P1 | school-classes | Backlog |
| **Teachers** list: compact table (First name, Last name, Status, Email) with sortable columns | P1 | school-teachers | Backlog |
| Click teacher name → classes taught, lesson number, date, rating | P1 | school-teachers | Backlog |

---

## Sprint 7: Content Types

**Dates:** 26 Jun – 27 Jun 2026  
**Goal:** Support alternate curricula (e.g. Thursday Island, Indigenous Mainland) assignable per school.

### Engineering Tasks

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| Admin/Content: **Add New** button — Content Name, number of levels, level names | P1 | admin-content | Backlog |
| New Content Types under Admin/Content/Content Management — same add/edit as default curriculum | P1 | admin-content | Backlog |
| **Add New School**: Content Type dropdown (Default + custom types) | P1 | admin-schools | Backlog |
| Optional **Resources** sub-folders per Content Type | P2 | admin-resources | Backlog |

---

## Sprint 8: Year Reset / Admin Operations

**Dates:** 28 Jun – 29 Jun 2026  
**Goal:** Admin action to start a new calendar year without losing benchmark data or history.

### Engineering Tasks

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| **Start new calendar year** admin action: reset classes to Lesson 1, archive prior year audit logs | P1 | admin-portal | Backlog |
| Preserve **benchmark data** across year reset | P1 | admin-portal | Backlog |
| Support upload/update of class and staff lists at start of calendar year | P1 | admin-portal | Backlog |
| Document current year-transition behaviour (discovery spike) | P2 | docs | Backlog |

---

## Sprint 9: Lesson Feedback

**Dates:** 30 Jun 2026  
**Goal:** Clear rating requirement; product decision on 5-star default.

### Engineering Tasks

| Task name | Priority | Tags | Status |
|-----------|----------|------|--------|
| Add note under star rating: *"You must rate this lesson to do another lesson"* | P1 | teach-lessons | Backlog |
| **Spike / decision**: Default rating to 5 stars (Uber-style) vs explicit selection — Glenn sign-off | P2 | teach-lessons, product | Backlog |

---

## Timeline (visual)

```
Jun 2026 — all sprints complete by 30 Jun
|S1|S2--|---- Sprint 3: Dashboard ----|--S4--|S5|S6|S7|S8|S9|
 1  3    7                        17  18   22 24 26 28 30
```

| Sprint | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|--------|---|---|---|---|---|---|---|---|---|
| Jun 1–7 | █ | █ | █ |   |   |   |   |   |   |
| Jun 8–14 |   |   | █ |   |   |   |   |   |   |
| Jun 15–21 |   |   | █ | █ |   |   |   |   |   |
| Jun 22–28 |   |   |   |   | █ | █ | █ | █ |   |
| Jun 29–30 |   |   |   |   |   |   |   |   | █ |

---

## Out of scope

- **Mentor App** — Glenn scoping separately; price after Admin portal sprints complete.

---

## Open questions for Glenn

- [ ] Schedule formulas: thresholds for "slightly behind" vs "behind"
- [ ] Drill-down page specs for dashboard links (4 pages in dashboard image)
- [ ] 5-star default rating preference
- [x] Support email CC list (Jeff + Glenn) — Sprint 1 shipped
- [x] Audit log behaviour when class cycles back to Lesson 1 after completing all 10 — stage-complete message; audit retained in DB until year reset (Sprint 8)
