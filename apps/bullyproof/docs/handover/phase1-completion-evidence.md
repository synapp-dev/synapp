# Phase 1 completion evidence register

> Companion to the SOW Completion Register (29 June 2026). One row per
> register item: what was outstanding, the commit that closed it, and how it
> was verified. Branch: `fixes/phase1-completion`.

| Register item | Status before | Commit | Evidence / verification |
|---------------|--------------|--------|------------------------|
| 51 - Teach Lessons blank screen | Recommendation resolving to nothing rendered an empty step | `b20e204` | No-recommendation fallback panel (message + Back + choose manually) in `lesson-wizard-recommendation.tsx`; renders whenever no other panel applies |
| 51 - "Back to lesson" loop | Hardcoded `/prepare`; dead-end for completed lessons | `b20e204` | Back link now routes by lesson status via `getDefaultPagePath` (lesson-lifecycle); completed/feedback -> feedback page; ready/in_progress -> lessons list |
| 53 - Mixed-level recommendation | Wrong lesson for mixed-level selections | earlier refactor + `b20e204` | Engine resolves composite classes to lowest matching stage and returns `incompatible` payload with per-class options; covered by `recommendation-engine.test.ts` |
| 53 - List capped at 3 | Reported "only 3 lessons showing" | verified absent | Full topic lists render in `lesson-wizard-topic.tsx` (no slice cap); remaining `slice(0,3)` usages are class-chip overflow display only |
| 40 - Apply Template confirmation | Toast only; no persistent state | `44c14f0` | Green "Active on N schools" badge on template cards + per-school "Active" chips in the apply/revoke dialog, driven by `GET /permission-templates/[id]/status` |
| 39 - Address / email domain save | Reported not saving | verified fixed | Full chain intact: `school-details-form` state -> `school.validators.ts` (emailDomain/address) -> `school.repo.ts` update (lines 452-453); regression-check on UAT |
| 28 - Roles -> Access Levels | UI said "Roles" everywhere | `ba8fb12` | Display strings renamed across admin users, school settings users, features tabs; role keys unchanged. "Highest level only" display deliberately NOT included (open reconcile item per Scope Review section 6) |
| 44 - Ctrl+K menu hidden from schools | Command menu shown to everyone | `ba8fb12` + follow-up | Command menu now renders only for Bullyproof platform roles (INTRADARK_DEV, PLATFORM_ADMIN, PLATFORM_MODERATOR, PLATFORM_STAFF); school-scoped users and GOVERNMENT_VIEWER never see it and the shortcut is inert for them; follows the effective view-as user; light/dark toggle retained |
| 45 - Preview/Teach Lessons headers | Page headers still "Content"/"Lessons" | `ba8fb12` | Headers renamed on both school pages; breadcrumb now maps school-route segments content -> Preview Lessons, lessons -> Teach Lessons |
| 57 - Student Numbers label | "Class Size" label | `ba8fb12` | Renamed in settings classes card + classes table header |
| 58 - Support mailto | - | verified done | `lib/support.ts` mailto support@bullyproofaustralia.org.au with cc jeff@ and Glenn@ |
| 47 - Reports "available soon" message | Page said "available after Term 1" | UAT session fix | Changed to "Reports will be available soon" exactly as requested (Glenn 22 Jun: delete the Term 1 line) |
| 28 - User column sort arrows (defect, Glenn 22 Jun) | Arrows did nothing: broken "name" accessor + server pagination ignored sort | UAT session fix | Server-side sorting wired through validator -> repo orderBy (name/created/lastActive incl. NULLS handling) -> API -> useUsers -> controlled table sorting with manualSorting; verified live: full 1,821-user set re-orders |
| 15 - Culture zero-input weighting | Null-guard killed the headline when any metric was missing | `13caee5` | Weight re-distribution across available metrics + zero-to-zero treated as no change; 5 unit tests in `culture-rating-math.test.ts`. Woodford constants remain interim pending Glenn's confirmation of the 25 April mapping |
| 32 - Downloadable AP certificate | On-screen card only; `markCertificateIssued` never called | `eeff6f2` | PDF certificate route (`GET /api/certification/courses/[id]/certificate`, pdf-lib, completed-only, issue-on-first-download), issuance stamped on completion in `updateProgress`, Download button on the certificate card, and a real profile page with a Certificates section (`GET /api/me/certificates`). Certificate renders on the client-supplied Certificate of Completion artwork (24 Oct 2025 version, sample recipient text removed; Great Vibes OFL script for the name, shrink-to-fit; date on the DATE line) |
| 34/35 - CSV/PDF export (in-scope part) | No export anywhere | `a112808` | Export menu (CSV + PDF) on all four admin report tabs via shared `lib/report-export.ts`; scope-aware filenames and titles. The four renamed report types, percentage rebuilds, filter panels and Excel scope options remain quoted M4 work |
| 36 - Government view-only dashboard (in-scope part) | Placeholder stub | `a18f28e` | Real `GovernmentDashboard`: five platform-wide aggregate stats, view-only (no per-school detail), CSV/PDF export; `GET /api/government/overview` authorised for GOVERNMENT_VIEWER. Expanded government reporting remains quoted M4 work |
| ST4S OTP expiry | Register self-inconsistent (section 1 Delivered vs section 2 remaining) | this commit | Position documented: short-lived codes + indefinite session persistence (exceeds 60 days) via refresh rotation; see `docs/handover/auth-session-expiry.md`; production dashboard settings to be confirmed at deploy |

| SOW 15.1.5 - export for ALL reporting roles | School-admin and teacher reporting surfaces had no export (school Reports page was a stub) | `9ff24f7` | Role-scoped export packs: admin all-schools export adds the schools register (state/sector/levels/licence/staff/teachers/classes/lessons/AP certified/culture benchmark/last lesson per school) + culture trends; admin school-scoped export adds the school pack (class list w/ student numbers + completion, staff list w/ access levels + AP status + last active, full lesson history w/ ratings, culture periods); school portal Reports page rebuilt: SCHOOL_ADMIN/licence sees the school pack on-page + export, TEACHER sees personal slice (own progress, certification, lesson history) per 5.1.5; government unchanged (aggregates only). All plain-table CSV/PDF: filters/Excel/year-selectors remain M4 paid work |

| Platform-role user creation defect (found in UAT) | Creating a Bullyproof/Government user failed: rolesRepo.hasRole required a school uuid and the wizard passes "" for platform roles (invalid uuid, Postgres error) | UAT session fix | hasRole now matches school_id IS NULL for platform-scoped roles; verified live by creating the Gov Viewer Test account (gov.viewer.test@bullyproofaustralia.org.au) |
| 36 - Government dashboard (live verification) | - | verified live | View-as Gov Viewer Test on /dashboard renders Government Reporting: 5 aggregate cards matching admin numbers (57/56/1,461/1,199/549), view-only, no command menu, CSV export works |

## Still open (tracked)

- D6 Administrator User Guide + System Administrator Guide: markdown drafts complete at docs/handover/{admin-user-guide,system-administrator-guide}.md; convert to Word at packaging
- D7 Bill of Materials (scripted at handover)
- Woodford weighting constants (blocked on Glenn confirming the 25 April mapping)
- Production Supabase auth settings spot-check at deploy (sessions not timeboxed)
- Goodwill items (BP -> BA rebrand, certificate template) sequenced after the acceptance-critical path
