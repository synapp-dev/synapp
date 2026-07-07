# Deliverables Verification Register

> Every deliverable the Formal Variation Agreement and its Statement of Work
> (Schedule 1) oblige, with the concrete way to check each one and the result
> of the full re-test executed on 7 July 2026 against branch
> `fixes/phase1-completion` (commit `7c7bf90`). Companion documents:
> `phase1-completion-evidence.md` (item-by-commit register) and
> `phase1-uat-checklist.md` (step-by-step checks for UAT).

## How to read this

- **How to check** is written so Glenn (or anyone) can verify the deliverable
  in the running platform without help.
- **Re-test result** records what was actually done on 7 July 2026. "Verified
  live" means driven in the browser that day with the outcome stated.
- Three caveats are listed at the end; nothing else is outstanding.

## 1. Authentication and onboarding (SOW 5.1.1 / 8.1.1 / 7.1.3)

| Deliverable | How to check | Re-test result |
|---|---|---|
| Email OTP login | Sign out, enter your email on the portal login, receive a one-time code, sign in | Verified live: login form renders with email entry and code flow (session established through it); full round trip exercised at every session start |
| ~60-day OTP expiry (ST4S posture) | Codes are short-lived; session persistence documented | Configured; position documented in `auth-session-expiry.md`; production settings spot-check listed at deploy |
| Invite-only onboarding, no self-signup | Login page offers no signup path; schools exist only via Admin > Schools invite/create | Verified live: auth form has no self-signup; add-school wizard is the only school creation path |
| Templated onboarding / OTP email | Trigger any OTP; the branded template arrives | Verified in production use daily; template served via Supabase email |

## 2. Learning management system (SOW 5.1.2 / 8.1.2)

| Deliverable | How to check | Re-test result |
|---|---|---|
| Course system with sequential lessons | Open AP Certification: the Amayda Program lists Topics 1 to 8 in order with slide counts | Verified live: 8 topics, sequential, per-topic slide review |
| Quiz functionality and completion tracking | Complete a topic quiz; progress ticks green; My Progress reflects it | Verified live: all 8 topics show completed state with green ticks for a completed user |
| Certificate on completion, in profile | Complete the course; certificate card appears on the course page; /profile shows a Certificates card | Verified live: certificate card with AP Certified badge on course page; /profile Certificates card lists "Amayda Program, Completed January 23 2026" |
| Downloadable certificate artifact | Click Download on either card; a PDF on the official artwork downloads with name and date | Verified live 7 July: download produces the PDF on the client-supplied artwork (user-confirmed working) |

## 3. Classroom delivery (SOW 5.1.3 / 8.1.3 / 15.1.3)

| Deliverable | How to check | Re-test result |
|---|---|---|
| Slide-based lesson delivery with wizard | Teach Lessons > Start New Lesson; walk Select Class/Classes > Recommendation > Confirm | Verified live end to end: lesson created for 1/2 Dolphins (on behalf of the school admin, as platform-admin policy requires), landed on Prepare with full lifecycle navigation |
| Recommendation engine | Select a class; the wizard recommends the next lesson for its level, with class progress shown | Verified live: L1 Classroom Culture recommended for a fresh class; class progress strip L1 to L10; mixed-level selection shows the guidance panel with per-class picks; lesson list is year-ordered and uncapped |
| Default notes plus teacher notes; preview flow | Preview Lessons shows content and notes without recording delivery | Verified live: Preview Lessons page renders; screen tip states the no-recording behaviour |
| Mark complete with mandatory rating | Finish a lesson; feedback requires a star rating; note reads "You must rate this lesson to do another lesson." | Rating enforcement verified in UI and API (required validator); note verified live 7 July. Full teach-through to feedback needs a teacher login (caveat 2) |
| Lesson lifecycle integrity | Status flows preparing > ready > in progress > feedback > completed; cancel guarded | Verified live: created lesson (preparing), non-owner prepare correctly blocked by the access policy, admin cancel succeeded (PUT 200); the cancelled lesson then appeared in the school Lesson history and the admin export, proving the pipeline end to end |

## 4. Admin panels (SOW 5.1.4 / 8.1.4)

| Deliverable | How to check | Re-test result |
|---|---|---|
| Bullyproof Admin (content, users, reporting, culture) | /admin tools, /admin/schools, /admin/users, /admin/reports, /admin/culture-ratings all function | Verified live: all render and operate; users table 1,822 rows with server-side sort; culture ratings admin drove benchmark and comparatives |
| School Admin panel | School portal: Home, Teachers, Classes, Teach/Preview Lessons, Resources, Performance, Reports, Settings | Verified live across the re-test on the test school and a real school |
| Oversight into school panels | Admin > Schools > open any school: Onboarding, Activation, Details, Users, Classes, Culture, License, Feature Access panels | Verified live: all panels render and work; License shows the active licence with dates; Feature Access shows the permission hierarchy with per-feature toggles |
| School details persistence (reported defect 39) | Edit a school's Address and Email Domain in the drawer, save, reload: values persist and display | Defect found in this re-test and fixed same day: the save always persisted but the drawer display dropped the fields, which is exactly what was reported on 22 June. Root cause fixed in `7c7bf90`; verified live after fix on the exact flow |

## 5. Reporting (SOW 5.1.5 / 8.1.5 / 15.1.5 / Variation cl 10)

| Deliverable | How to check | Re-test result |
|---|---|---|
| Role dashboards (teacher, school admin, Bullyproof) | Each role lands on a working dashboard | Verified live: Bullyproof admin dashboard (platform stats, activity); teacher dashboard via impersonation (own progress, classes, no admin surfaces) |
| Government view-only dashboard | Sign in as the government viewer: five aggregate stats, no school-identifiable data, no command menu | Verified live 7 July (morning): five aggregates matching admin numbers, view-only, CSV export works; test account gov.viewer.test@bullyproofaustralia.org.au exists for re-checking |
| CSV / PDF export on reports | Admin > Reports > Export: CSV and PDF both download, per tab, scope-aware | Verified live: CSV downloaded and its contents inspected on disk: Summary, Idle active schools, Recent lessons, the full Schools register (57 schools with licence, staff, teachers, classes, lessons, AP certified, culture benchmark, last lesson), and Culture trends including the test school's live 5.7 headline |
| Role-scoped export packs (15.1.5, all reporting roles) | School portal > Reports as a school admin: Classes, Staff, Lesson history, Culture rating periods tables plus Export | Verified live on both the test school and a real school: all four tables render with live data (the day's test lesson appeared in Classes and Lesson history within minutes). Teacher personal pack is served by role scoping in the same service; live teacher-session check is caveat 2 |

## 6. Culture rating (Variation cl 9 / SOW 5.1.6)

| Deliverable | How to check | Re-test result |
|---|---|---|
| Data entry, all eight inputs | Admin > Culture ratings > pick school: benchmark and comparative forms carry all eight template inputs | Verified live: benchmark and two comparatives entered on the test school |
| Calculations including zero-input weighting | Enter a benchmark with a zero metric; comparatives still compute a headline | Verified live with exact math: exclusions 0 to 0 counts as no change (headline 11.1); exclusions 0 to 1 drops out and re-weights (headline 5.7256, matching the hand-computed weighted sum to four decimals); 23 unit tests cover the maths |
| Benchmark and comparative rules | Comparative must fall outside the benchmark and cover at least 20 school days | Verified live: forms enforce dates; rules stated on the cards |
| Comparison view and gauge | School portal > Performance shows benchmark vs comparative with the gauge | Verified live earlier in UAT; periods and headlines also appear on the school Reports page and in both exports |
| Woodford weighting constants | n/a: input owed by Amayda | Interim constants documented; applied on receipt (caveat 1) |

## 7. Handover deliverables (SOW 8.B / 8.1.7 / SDA 4.4 / cl 6)

| Deliverable | How to check | Re-test result |
|---|---|---|
| D1 Functional spec and wireframes | docs/ design set in the repository | Delivered with source |
| D2 Working portal | The platform itself | Re-tested throughout this register |
| D3 LMS with sample course | Amayda Program course | Verified live (section 2) |
| D4 Integration connectors | Supabase auth/storage/email, video embeds | Exercised implicitly by every check above |
| D5 Source code and build scripts | Repository with CI; delivered on payment per clause 6 | Ready; typecheck and 97 unit tests green on `7c7bf90` |
| D6 Documentation set | Administrator User Guide and System Administrator Guide, Word format | Delivered: docs/handover/*.docx |
| D7 Bill of Materials | OSS licence register | Delivered: bill-of-materials.md/.csv, 640 packages from the production lockfile |

## Known caveats (three, none blocking acceptance)

1. **Woodford weighting constants**: an input owed by Amayda (the 25 April
   workbook mapping). The engine is delivered, tested and verified; constants
   are applied the day they arrive.
2. **Live teacher session**: view-as proves the teacher UI but browser
   impersonation cannot carry a teacher's own auth token. The teacher slice of
   the Reports page and the mandatory-rating submit should be walked once with
   a real teacher login: any teacher account at any school during Glenn's UAT
   covers it in two minutes.
3. **Production deploy checks**: this re-test ran on the completion branch.
   On merge, spot-check production Supabase auth settings per
   `auth-session-expiry.md` and re-run the five-minute smoke set (login,
   dashboard, one export, certificate download).

## Test data left in place (all on St4s Test School, the seeded test tenant)

- Culture benchmark (Term 1 2025) and two comparative periods, marked as UAT
  data in the source notes: kept as a worked example.
- One cancelled lesson (Classroom Culture, 1/2 Dolphins, 7 July 2026): kept as
  lifecycle evidence; it demonstrates history and reporting flow.
- Address "1 Test Street, Melbourne VIC 3000" and email domain
  "st4s-test.vic.edu.au": kept as the visible proof of the item 39 fix.
- Government viewer test account: gov.viewer.test@bullyproofaustralia.org.au.
