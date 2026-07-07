# INTRADARK

Intradark Pty Ltd  ·  ABN 38 696 182 457

## Statement of Work: Completion & Deliverables Register

*What the Agreement required, what is delivered, and the boundary on new work*

| | |
|---|---|
| To: | Glenn Rushton, Director, Amayda Pty Ltd |
| From: | Aaron J. Girton, Director, Intradark Pty Ltd |
| Date: | 7 July 2026 |
| Re: | FINAL ISSUE: completion of all deliverables under the Formal Variation Agreement and Statement of Work; acceptance requested under clause 7 |

Glenn,

This register sets out the deliverables defined by the *Formal Variation Agreement* and the *Software Development Agreement / Statement of Work* it attaches as Schedule 1, and the delivery status of each against the current build. It accompanies the Scope Review & Change Request, and exists to fix one thing clearly: the line between what the Agreement obliges, and what is new work.

**Two principles govern this register.** First, the deliverables are those written in the Variation and the SOW. Where the SOW describes a requirement in general terms, a working implementation of that requirement discharges it; later, more detailed specifications of the same feature are additional, not clarifications. Second, functionality present in the codebase but not named in the Agreement is **not** a contractual deliverable. Some of it was built only to manage a moving set of requests during delivery. Its existence confers no entitlement and cannot be used as a base for further requests at no charge.

## 1. Deliverables register

As at 7 July 2026 every deliverable is Delivered. Items previously marked Finishing in the 29 June issue are now complete; Section 2 records each one. Evidence cites the implementing code.

| Deliverable | Source | Status | Evidence in the build |
|---|---|---|---|
| **Authentication & Onboarding** | | | |
| Email OTP login | *SOW 5.1.1 / 8.1.1* | **Delivered** | signInWithOtp; auth-form.tsx; InputOTP |
| ~60-day OTP expiry (ST4S) | *SOW 5.1.1 / 7.1.3* | **Delivered** | supabase/config.toml (otp_expiry); session policy documented in docs/handover/auth-session-expiry.md |
| Invite-only school onboarding (no self-signup) | *SOW 5.1.1 / 8.1.1* | **Delivered** | invitesService.createInvite; school.service.createSchool; add-school-wizard |
| Templated onboarding / OTP email | *SOW 5.1.1 / D4* | **Delivered** | server/lib/email.ts (Supabase email; Twilio reserved for SMS) |
| **Learning Management System** | | | |
| Flexible course system, sequential lessons | *SOW 5.1.2 / 8.1.2* | **Delivered** | certification courses; course-topics |
| Quiz functionality + completion tracking | *SOW 5.1.2* | **Delivered** | quiz-* repos; topic-quiz-completions |
| Certificate on completion, in profile | *SOW 5.1.2 / 8.1.2* | **Delivered** | TopicCertificate; markCertificateIssued; downloadable PDF on the official certificate artwork via /api/certification/courses/[id]/certificate; Certificates section on /profile |
| **Classroom Delivery** | | | |
| Slide-based lesson delivery | *SOW 5.1.3 / 8.1.3* | **Delivered** | lesson-wizard; run-lesson |
| Default Bullyproof notes + teacher notes | *SOW 5.1.3* | **Delivered** | v_lesson_slides_effective |
| Preview / prepare flow | *SOW 5.1.3* | **Delivered** | lessons/[id]/prepare |
| Mark complete + mandatory rating | *SOW 5.1.3 / 15.1.3* | **Delivered** | LessonFeedbackForm; lesson_feedback (required) |
| **Admin Panels** | | | |
| Bullyproof Admin (content, users, reporting, culture) | *SOW 5.1.4.1 / 8.1.4* | **Delivered** | app/(main)/admin/* |
| School Admin panel | *SOW 5.1.4.2 / 8.1.4* | **Delivered** | app/(main)/schools/[school_id]/* |
| Oversight into school panels | *SOW 5.1.4.1* | **Delivered** | school detail drawer / panels |
| **Reporting** | | | |
| Role dashboards: teacher, school admin, Bullyproof | *SOW 5.1.5 / cl 10* | **Delivered** | dashboard/*; admin/reports |
| Government view-only dashboard | *SOW 5.1.5* | **Delivered** | GovernmentDashboard: five platform-wide aggregates, view-only, CSV/PDF export; /api/government/overview; verified live 7 Jul 2026 |
| CSV / PDF export | *SOW 5.1.5 / 8.1.5* | **Delivered** | Export menu (CSV + PDF) on all four admin report tabs plus role-scoped export packs for school admins and teachers on the school Reports page (lib/report-export.ts; server/reports) |
| **Culture Rating** | | | |
| Data entry: all inputs | *Variation cl 9 / SOW 5.1.6* | **Delivered** | culture-rating-metrics-fields |
| Calculations incl. zero-input weighting | *Variation cl 9* | **Delivered** | lib/culture-rating-math.ts; zero-input re-weighting unit-tested and verified live 7 Jul 2026 (official Woodford constants applied on receipt of your mapping) |
| Benchmark + comparative tracking & rules | *Variation cl 9* | **Delivered** | schoolCultureBenchmarks; comparativePeriods |
| Comparison view + gauge | *Variation cl 9* | **Delivered** | culture-rating-comparison-dashboard |
| **Deliverables & Handover** | | | |
| D1: Functional spec & UI wireframes | *SOW 8.B* | **Delivered** | docs/ design set |
| D2: Working portal (MVP to final) | *SOW 8.B* | **Delivered** | the platform |
| D3: LMS with sample course | *SOW 8.B* | **Delivered** | certification course content |
| D4: Integration connectors | *SOW 8.B* | **Delivered** | Supabase, email, YouTube |
| D5: Source code + build / deploy scripts | *SOW 8.B / cl 6* | **Delivered** | repository; CI |
| D6: Documentation set (admin / user / tech) | *SOW 8.1.7 / cl 6* | **Delivered** | docs/handover: Administrator User Guide and System Administrator Guide (Word copies supplied with this register) |
| D7: Bill of Materials (OSS licences) | *SDA 4.4* | **Delivered** | docs/handover/bill-of-materials.md and .csv: 640 packages, generated from the production lockfile at final delivery |

## 2. Previously remaining SOW deliverables, now complete

The items marked Finishing in the 29 June issue of this register are now delivered, at no additional charge, as promised:

- Government view-only reporting dashboard: delivered. A live aggregate dashboard (schools, licences, staff, lessons delivered, AP certified) with CSV/PDF export, view-only by design.
- CSV / PDF export across the reporting roles: delivered. Export on all four admin report tabs, plus role-scoped export packs: the schools register for Bullyproof admin, class / staff / lesson history / culture packs per school, and a personal pack for teachers on the school Reports page.
- Downloadable AP certificate artifact: delivered. The certificate renders on the official Certificate of Completion artwork and downloads from the course page and the user profile.
- Administrator / user / technical documentation and the Bill of Materials: delivered with this register (Administrator User Guide, System Administrator Guide, bill-of-materials.md/.csv).
- Final culture-rating weighting: the calculation engine is delivered, unit-tested and verified live, including weight re-distribution when a metric has no measurable change. The official Woodford constants are applied the day you supply the mapping; this is the one open input and it does not affect acceptance of the delivered system.
- OTP expiry (ST4S): configured, with the full session-expiry position documented in docs/handover/auth-session-expiry.md.

Naming these plainly was deliberate, and the promise has been kept: the Agreement is honoured in full, and the line below stands on that honesty.

## 3. Genuine defects, fixed at no charge

I fix genuine defects for free: a defect being a fault in functionality the Agreement required and I delivered (SDA Warranty cl 8.1(b), 90-day cover; Variation cl 7.3). The following were genuine and have been fixed at no cost:

- **School Address & Email Domain not saving on edit (39):** reproduced, root-caused and fixed. The save always persisted; the admin school drawer then failed to display the saved values, which reads as a failed save. The display fault is fixed and the exact flow verified: edit, save, reload, values shown.
- **Wrong recommended lesson for mixed-level classes, and the list capped at three (53):** fixed. Composite classes resolve to the lowest matching stage with a per-class guidance panel, and the topic list is uncapped.
- **Teach Lessons blank screen and the Back to lesson loop (51):** fixed. A clear fallback panel renders when no recommendation applies, and the return path routes by lesson status.
- **Apply Template gives no confirmation it applied (40):** fixed, and beyond the promised toast the template cards now show a persistent Active on N schools status.
- **Also found and fixed during completion UAT, at no cost:** user-table column sorting across pages (28), a fault that blocked creating platform-scoped users, and a welcome-tutorial redirect loop when impersonating a school user. Beyond the defects, the minor text and usability asks from your 22 June document have been applied at no charge as promised: only the highest access level shows per user, the sidebar screen tips use your wording, the Teach Lessons page and lesson-wizard copy follow your notes (including removal of the step numbers, search bar, Show completed and Help), the feedback form carries the mandatory-rating note, and the school portal filters read All Access Levels.

**What is not a defect.** A defect is a fault in a delivered feature, not a request to redesign a working one, or to build something that was never there. Several items in the 22 June review are framed as “defects” or “issues” but are new requirements: a persistent “Template Active” badge that remembers which schools already have it (40); the school Activity timeline (41; the Licence and Feature-Access buttons already work); rebuilding the lesson-history page from placeholder into a live history (51); and composite / multi-level class handling beyond a guidance message (51, 53). These are enhancements under cl 11(2) and appear in Section 4; they are not warranty fixes.

## 4. Additional work requested, mapped to the delivered areas

The Agreement treats minor refinements and cosmetic labelling [text/string] as included; anything beyond that, enhancements and new functionality outside the defined scope, is additional (*Variation cl 11(2)*). Set against the delivered areas in Section 1, your 22 June review layers the following new work on top of features that are already built. This is well beyond minor revision.

| Area | Delivered (Section 1) | Additional now requested, beyond minor revision |
|---|---|---|
| **Authentication, Onboarding & Access** | OTP login, invite-only onboarding, role-based access | Onboarding service-step checklist + completion dates (38); “Other” school level / arbitrary grade mixes (27); School-Licence user management (30); Class Size on Add Class (42); “Amayda” access tier above Bullyproof Admin (29); role-based Getting Started videos, autoplay & replace (26) |
| **LMS / AP Certification** | Courses, sequential lessons, quizzes, certificate on completion | Uploadable / replaceable certificate template with custom fields & certificate number (33); course-level Start / Continue / Completed control (48) |
| **Classroom Delivery** | Slide delivery, notes, preview, mandatory rating | Sortable teacher table + extended take-over (49); unify Start-now vs Schedule + scheduling (52); “Start new calendar year” reset / promote / archive (54); default-to-5-stars option (55) |
| **Admin Panel: Home page & Schedule** | Bullyproof & School Admin panels | New program-health Home page: Active vs Total, the column set, filters & drill-downs (1-9); per-state school-term calendars + entry form (10, 11); schedule calculation engine + Progress-to-Term-2 widget (12, 13); program-year / initial-vs-ongoing model + selector (4, 5); school Activity timeline (41) |
| **Reporting** | Role dashboards with CSV / PDF export | Four renamed report types + percentages (34); per-report filter panels, Excel export & export scope (35); expanded government reporting beyond a view-only dashboard (36); school reports build (47); school-admin report set + year selectors (59); exclude test school (37) |
| **Culture Rating** | Data entry, calculations, benchmark / comparative, comparison view | Signed ±100 / 150 / 200% expanding speedometer, replacing the working gauge (17); performance page broadened beyond culture rating (56) |
| **Content Management & Security** | Content authoring under Bullyproof Admin | Step-up MFA on content edits (22); sole-content-editor lock (23); content audit log (24); version numbering + updated-by + retention (25) |
| **Branding & Portal Navigation** | Working portal; static logo set | BP to BA rebrand, animated logo + icon variants (31); role-based school-portal Home pages replacing the dashboard (43). (Removing the Ctrl+K menu, item 44, is no charge; see Section 5.) |

*Item numbers refer to your 22 June document. The Content Type (items 18-21) is handled separately under its own agreement and is not listed here.*

## 5. Built beyond the Agreement, not contractual deliverables

The repository also contains functionality that goes beyond the Statement of Work, built to manage a shifting set of requests during delivery, or as my own implementation choices, not because the Agreement called for it. None of it is a paid deliverable, and changing or extending it is new work, because it was never paid for in the first place. Examples:

- **Granular feature-permission system.** A configurable engine that turns individual features on and off per global / role / school / individual user, with permission templates and an admin surface (app/(main)/admin/features, server/features, featurePermissions, permissionTemplates; on the order of 79 files). Built so features could be gated by context while requirements were still moving.
- **Branding, logo and the “BP-man” character set.** The current “BP” wordmark, the small mark, and the BP-man mascot with its cape / wand / wrench / thumbs-up poses (public/images/bp-man/) are my own creative choices, not an asset set the Agreement specified or that was paid for. Re-doing them as “BA” with an animated logo and new icon variants (31) is therefore new work, not an update to something contracted.
- **Command palette (Ctrl+K).** A power-user quick-navigation menu (command-menu.tsx) I added for convenience, never in the SOW. Since I added it, removing it, or hiding it from teachers, is no charge.
- **Light / dark theme and UI niceties.** The theme toggle, the My-Classes star / favourites toggle, sidebar screen-tips and similar polish are UX extras beyond the SOW.
- **Internal developer tooling.** The internal INTRADARK_DEV role and its account guard, the role / permission templates, the admin tools-launcher, the seeded “Bullyproof Academy” test school and dummy data, and migration / backfill scripts; scaffolding for building and operating the platform, not deliverables.

**The consequence.** Because these are outside the Agreement, they cannot be treated as scope, and a request that builds on them ("this already exists in the system, just add X") is **new work** under Variation cl 11(2) and SDA cl 10, not a continuation of the original brief. The presence of code is not evidence of an obligation to extend it.

## 6. The boundary, in the Agreement's own terms

- **Entire agreement (SDA cl 16.1).** The Agreement and its SOW are the entire agreement; nothing outside them has been relied on, and it may be amended only by a written document signed by both parties. Existence in the codebase, or prior discussion, does not create a deliverable.
- **General requirement, discharged by implementation (cl 11).** Where the SOW describes a feature in general terms, a working implementation satisfies it. Ambiguity in the SOW resolves in favour of the delivered implementation, not unlimited later specification.
- **New specificity is additional (cl 11(2)).** Refinements, enhancements and usability improvements outside the defined scope are additional work, by separate agreement.
- **Acceptance is measured against the agreed scope (Variation cl 7).** Final acceptance turns on whether the deliverables meet the agreed scope and any material defects in relation to it, not new requirements introduced afterwards.
- **Changes go through change control (SDA cl 10).** New or changed scope is estimated for scope, timeline and fees, and takes effect only when agreed in writing.

In short: every deliverable under the Agreement and the Variation is Delivered. This register, the documentation set, the Bill of Materials and the UAT checklist accompany the Final Acceptance letter. Acceptance is requested under Variation clause 7, and the clause 4(b) completion payment falls due on acceptance and handover.

Respect always,

**Aaron J. Girton**
*Director, Intradark Pty Ltd*
agirton@intradark.com
