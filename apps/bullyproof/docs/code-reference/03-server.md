# Server layer (repos, services, validators)

This file is generated from `_inventory.json` by `pnpm docs:code-reference:generate`. Edit `scripts/generate-code-reference-inventory.ts` heuristics or add code comments to improve summaries, then regenerate.

## Entries (119)

### `server/auth/context.ts`

- **Path**: `server/auth/context.ts`
- **Kind**: Module
- **Summary**: Source module `server/auth/context.ts` (Module).

### `server/auth/intradark-dev-account-guard.ts`

- **Path**: `server/auth/intradark-dev-account-guard.ts`
- **Kind**: Module
- **Summary**: Source module `server/auth/intradark-dev-account-guard.ts` (Module). Code comment: When the target user holds INTRADARK_DEV, only actors with INTRADARK_DEV may change them.

### `server/auth/rbac.ts`

- **Path**: `server/auth/rbac.ts`
- **Kind**: Module
- **Summary**: Source module `server/auth/rbac.ts` (Module). Code comment: All platform-level role keys that grant admin panel access.

### `server/auth/session.ts`

- **Path**: `server/auth/session.ts`
- **Kind**: Module
- **Summary**: Source module `server/auth/session.ts` (Module).

### `server/certification-answers/certification-answers.repo.ts`

- **Path**: `server/certification-answers/certification-answers.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for certification-answers persistence (Drizzle queries and commands). Code comment: Create a new answer record

### `server/certification-courses/certification-courses.repo.ts`

- **Path**: `server/certification-courses/certification-courses.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for certification-courses persistence (Drizzle queries and commands).

### `server/certification-courses/certification-courses.service.ts`

- **Path**: `server/certification-courses/certification-courses.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for certification-courses.

### `server/certification-courses/certification-courses.validators.ts`

- **Path**: `server/certification-courses/certification-courses.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for certification-courses inputs and outputs.

### `server/certification-slides/certification-slides.repo.ts`

- **Path**: `server/certification-slides/certification-slides.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for certification-slides persistence (Drizzle queries and commands).

### `server/certification-slides/certification-slides.service.ts`

- **Path**: `server/certification-slides/certification-slides.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for certification-slides.

### `server/certification-slides/certification-slides.validators.ts`

- **Path**: `server/certification-slides/certification-slides.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for certification-slides inputs and outputs.

### `server/certification-topic-progress/certification-topic-progress.repo.ts`

- **Path**: `server/certification-topic-progress/certification-topic-progress.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for certification-topic-progress persistence (Drizzle queries and commands). Code comment: Get the latest attempt for a user/topic

### `server/certification-topics/certification-topics.repo.ts`

- **Path**: `server/certification-topics/certification-topics.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for certification-topics persistence (Drizzle queries and commands).

### `server/certification-topics/certification-topics.service.ts`

- **Path**: `server/certification-topics/certification-topics.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for certification-topics.

### `server/certification-topics/certification-topics.validators.ts`

- **Path**: `server/certification-topics/certification-topics.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for certification-topics inputs and outputs.

### `server/certification/certification.repo.ts`

- **Path**: `server/certification/certification.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for certification persistence (Drizzle queries and commands).

### `server/certification/certification.service.ts`

- **Path**: `server/certification/certification.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for certification.

### `server/certification/certification.validators.ts`

- **Path**: `server/certification/certification.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for certification inputs and outputs.

### `server/classes/classes.repo.ts`

- **Path**: `server/classes/classes.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for classes persistence (Drizzle queries and commands).

### `server/classes/classes.service.ts`

- **Path**: `server/classes/classes.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for classes.

### `server/classes/classes.validators.ts`

- **Path**: `server/classes/classes.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for classes inputs and outputs.

### `server/course-progress/course-progress.repo.ts`

- **Path**: `server/course-progress/course-progress.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for course-progress persistence (Drizzle queries and commands).

### `server/course-ratings/course-ratings.repo.ts`

- **Path**: `server/course-ratings/course-ratings.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for course-ratings persistence (Drizzle queries and commands).

### `server/course-ratings/course-ratings.utils.ts`

- **Path**: `server/course-ratings/course-ratings.utils.ts`
- **Kind**: Module
- **Summary**: Source module `server/course-ratings/course-ratings.utils.ts` (Module). Code comment: Check if a topic is the last topic in its course @param topicId The topic ID to check @param courseId The course ID (optional, will be fetched if not provided) @returns true if the topic is the last o…

### `server/course-topic-progress/course-topic-progress.repo.ts`

- **Path**: `server/course-topic-progress/course-topic-progress.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for course-topic-progress persistence (Drizzle queries and commands).

### `server/course-topic-quiz-completions/course-topic-quiz-completions.repo.ts`

- **Path**: `server/course-topic-quiz-completions/course-topic-quiz-completions.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for course-topic-quiz-completions persistence (Drizzle queries and commands).

### `server/course-topic-quizzes/course-topic-quizzes.repo.ts`

- **Path**: `server/course-topic-quizzes/course-topic-quizzes.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for course-topic-quizzes persistence (Drizzle queries and commands).

### `server/course-topic-slides/course-topic-slides.repo.ts`

- **Path**: `server/course-topic-slides/course-topic-slides.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for course-topic-slides persistence (Drizzle queries and commands).

### `server/course-topics/course-topics.repo.ts`

- **Path**: `server/course-topics/course-topics.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for course-topics persistence (Drizzle queries and commands).

### `server/course-topics/course-topics.service.ts`

- **Path**: `server/course-topics/course-topics.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for course-topics.

### `server/course-topics/course-topics.validators.ts`

- **Path**: `server/course-topics/course-topics.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for course-topics inputs and outputs.

### `server/culture-ratings/culture-rating-metrics.ts`

- **Path**: `server/culture-ratings/culture-rating-metrics.ts`
- **Kind**: Module
- **Summary**: Source module `server/culture-ratings/culture-rating-metrics.ts` (Module). Code comment: Raw inputs from the AP Culture Rating template (CultureTemplate sheet, rows 2–9). Derived rows (attendance rate, per-day rates, improvements) are computed in code.

### `server/culture-ratings/culture-rating-periods.ts`

- **Path**: `server/culture-ratings/culture-rating-periods.ts`
- **Kind**: Module
- **Summary**: Source module `server/culture-ratings/culture-rating-periods.ts` (Module). Code comment: Inclusive calendar-date ranges (YYYY-MM-DD). Two ranges overlap if they share any day.

### `server/culture-ratings/culture-ratings.repo.ts`

- **Path**: `server/culture-ratings/culture-ratings.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for culture-ratings persistence (Drizzle queries and commands).

### `server/culture-ratings/culture-ratings.service.ts`

- **Path**: `server/culture-ratings/culture-ratings.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for culture-ratings.

### `server/culture-ratings/culture-ratings.validators.ts`

- **Path**: `server/culture-ratings/culture-ratings.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for culture-ratings inputs and outputs.

### `server/curriculum/curriculum.repo.ts`

- **Path**: `server/curriculum/curriculum.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for curriculum persistence (Drizzle queries and commands).

### `server/curriculum/curriculum.service.ts`

- **Path**: `server/curriculum/curriculum.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for curriculum.

### `server/curriculum/curriculum.validators.ts`

- **Path**: `server/curriculum/curriculum.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for curriculum inputs and outputs.

### `server/dashboard/admin-activity.repo.ts`

- **Path**: `server/dashboard/admin-activity.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for admin-activity persistence (Drizzle queries and commands).

### `server/dashboard/admin-activity.service.ts`

- **Path**: `server/dashboard/admin-activity.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for admin-activity.

### `server/db/drizzle.ts`

- **Path**: `server/db/drizzle.ts`
- **Kind**: Module
- **Summary**: Source module `server/db/drizzle.ts` (Module).

### `server/db/relations.ts`

- **Path**: `server/db/relations.ts`
- **Kind**: Module
- **Summary**: Source module `server/db/relations.ts` (Module).

### `server/db/schema.ts`

- **Path**: `server/db/schema.ts`
- **Kind**: Module
- **Summary**: Source module `server/db/schema.ts` (Module). Code comment: Re-exports all schema from the Drizzle schema. This file is referenced by drizzle.config.ts and by @/server/db/schema imports.

### `server/db/schema/index.ts`

- **Path**: `server/db/schema/index.ts`
- **Kind**: Module
- **Summary**: Source module `server/db/schema/index.ts` (Module).

### `server/features/features.repo.ts`

- **Path**: `server/features/features.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for features persistence (Drizzle queries and commands). Code comment: Get all features

### `server/features/features.service.ts`

- **Path**: `server/features/features.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for features. Code comment: Check if a user has access to a feature using hierarchical resolution. Priority: User > School Role > School > Role > Global (most specific wins) Default behavior: Features are disabled by default (al…

### `server/feedback-tickets/feedback-tickets.repo.ts`

- **Path**: `server/feedback-tickets/feedback-tickets.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for feedback-tickets persistence (Drizzle queries and commands). Code comment: Shape of a single admin note stored in the admin_notes JSONB array.

### `server/feedback-tickets/feedback-tickets.service.ts`

- **Path**: `server/feedback-tickets/feedback-tickets.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for feedback-tickets. Code comment: Assert userId is present.

### `server/feedback-tickets/feedback-tickets.validators.ts`

- **Path**: `server/feedback-tickets/feedback-tickets.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for feedback-tickets inputs and outputs.

### `server/invites/invites.repo.ts`

- **Path**: `server/invites/invites.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for invites persistence (Drizzle queries and commands).

### `server/invites/invites.service.ts`

- **Path**: `server/invites/invites.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for invites.

### `server/invites/invites.validators.ts`

- **Path**: `server/invites/invites.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for invites inputs and outputs.

### `server/lesson-feedback/admin-ratings.repo.ts`

- **Path**: `server/lesson-feedback/admin-ratings.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for admin-ratings persistence (Drizzle queries and commands).

### `server/lesson-feedback/admin-ratings.service.ts`

- **Path**: `server/lesson-feedback/admin-ratings.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for admin-ratings.

### `server/lesson-feedback/lesson-feedback.repo.ts`

- **Path**: `server/lesson-feedback/lesson-feedback.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for lesson-feedback persistence (Drizzle queries and commands).

### `server/lesson-feedback/lesson-feedback.service.ts`

- **Path**: `server/lesson-feedback/lesson-feedback.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for lesson-feedback.

### `server/lesson-feedback/lesson-feedback.validators.ts`

- **Path**: `server/lesson-feedback/lesson-feedback.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for lesson-feedback inputs and outputs.

### `server/lessons/lesson-live-state.repo.ts`

- **Path**: `server/lessons/lesson-live-state.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for lesson-live-state persistence (Drizzle queries and commands). Code comment: Get the current live state for a lesson

### `server/lessons/lessons.repo.ts`

- **Path**: `server/lessons/lessons.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for lessons persistence (Drizzle queries and commands). Code comment: Returns lessons with status=feedback owned by teacher, with topic, school, teacher, and assigned classes

### `server/lessons/lessons.service.ts`

- **Path**: `server/lessons/lessons.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for lessons.

### `server/lessons/lessons.validators.ts`

- **Path**: `server/lessons/lessons.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for lessons inputs and outputs.

### `server/lib/can-manage-school-users.ts`

- **Path**: `server/lib/can-manage-school-users.ts`
- **Kind**: Module
- **Summary**: Source module `server/lib/can-manage-school-users.ts` (Module). Code comment: Returns true if user can manage users (roles, positions, classes) at the given school: platform admin OR school admin with school:manage-school-user-roles at that school.

### `server/lib/email.ts`

- **Path**: `server/lib/email.ts`
- **Kind**: Module
- **Summary**: Source module `server/lib/email.ts` (Module). Code comment: SMTP email helper for ticket notifications. Uses nodemailer with credentials from environment variables. All sends are fire-and-forget — failures are logged but never block the caller. Required env va…

### `server/lib/fractional-position.ts`

- **Path**: `server/lib/fractional-position.ts`
- **Kind**: Module
- **Summary**: Source module `server/lib/fractional-position.ts` (Module). Code comment: Generate a position string between two positions (or at start/end). Use for inserting a slide at a specific place without reordering all.

### `server/lib/resources-request-auth.ts`

- **Path**: `server/lib/resources-request-auth.ts`
- **Kind**: Module
- **Summary**: Source module `server/lib/resources-request-auth.ts` (Module). Code comment: Resolves effective user for resources APIs: JWT user as actor; optional view-as header when actor has system:impersonate.

### `server/lib/signed-url.ts`

- **Path**: `server/lib/signed-url.ts`
- **Kind**: Module
- **Summary**: Source module `server/lib/signed-url.ts` (Module). Code comment: Shared helper for DB-cached signed URL resolution. Signed URLs are stored directly on slide rows (signed_url + signed_url_updated_at). When a slide is fetched, we check whether the cached URL is still…

### `server/lib/slide-storage-path.ts`

- **Path**: `server/lib/slide-storage-path.ts`
- **Kind**: Module
- **Summary**: Source module `server/lib/slide-storage-path.ts` (Module). Code comment: Re-export from shared lib for server-side consumers. Implementation lives in @/lib/slide-storage-path.ts

### `server/licences/licences.repo.ts`

- **Path**: `server/licences/licences.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for licences persistence (Drizzle queries and commands).

### `server/licences/licences.service.ts`

- **Path**: `server/licences/licences.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for licences.

### `server/licences/licences.validators.ts`

- **Path**: `server/licences/licences.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for licences inputs and outputs.

### `server/me/me.repo.ts`

- **Path**: `server/me/me.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for me persistence (Drizzle queries and commands).

### `server/me/me.service.ts`

- **Path**: `server/me/me.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for me.

### `server/me/me.validators.ts`

- **Path**: `server/me/me.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for me inputs and outputs.

### `server/metrics/metrics.service.ts`

- **Path**: `server/metrics/metrics.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for metrics.

### `server/permission-templates/permission-templates.repo.ts`

- **Path**: `server/permission-templates/permission-templates.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for permission-templates persistence (Drizzle queries and commands).

### `server/permission-templates/permission-templates.service.ts`

- **Path**: `server/permission-templates/permission-templates.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for permission-templates.

### `server/quiz-answers/quiz-answers.repo.ts`

- **Path**: `server/quiz-answers/quiz-answers.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for quiz-answers persistence (Drizzle queries and commands).

### `server/quiz-attempt-answers/quiz-attempt-answers.repo.ts`

- **Path**: `server/quiz-attempt-answers/quiz-attempt-answers.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for quiz-attempt-answers persistence (Drizzle queries and commands).

### `server/quiz-attempts/quiz-attempts.repo.ts`

- **Path**: `server/quiz-attempts/quiz-attempts.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for quiz-attempts persistence (Drizzle queries and commands).

### `server/quiz-questions/quiz-questions.repo.ts`

- **Path**: `server/quiz-questions/quiz-questions.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for quiz-questions persistence (Drizzle queries and commands).

### `server/reports/admin-reports.repo.ts`

- **Path**: `server/reports/admin-reports.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for admin-reports persistence (Drizzle queries and commands). Code comment: Permission-template state: full unlock, certification unlock, or locked.

### `server/reports/admin-reports.service.ts`

- **Path**: `server/reports/admin-reports.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for admin-reports.

### `server/resources/resources.repo.ts`

- **Path**: `server/resources/resources.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for resources persistence (Drizzle queries and commands).

### `server/resources/resources.service.ts`

- **Path**: `server/resources/resources.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for resources. Code comment: Effective user for permissions; actorUserId for audit columns (real JWT user).

### `server/resources/resources.validators.ts`

- **Path**: `server/resources/resources.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for resources inputs and outputs.

### `server/roles/roles.repo.ts`

- **Path**: `server/roles/roles.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for roles persistence (Drizzle queries and commands). Code comment: Check if a user has any platform role

### `server/roles/roles.service.ts`

- **Path**: `server/roles/roles.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for roles. Code comment: For school-scoped role assign/remove: allow SCHOOL_ADMIN at the given school to manage only school roles (TEACHER, SCHOOL_ADMIN, SCHOOL_STAFF) at that school. Call after assertCanManageRoles fails - t…

### `server/roles/roles.validators.ts`

- **Path**: `server/roles/roles.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for roles inputs and outputs.

### `server/school-levels/school-levels.repo.ts`

- **Path**: `server/school-levels/school-levels.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for school-levels persistence (Drizzle queries and commands).

### `server/school-levels/school-levels.service.ts`

- **Path**: `server/school-levels/school-levels.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for school-levels.

### `server/school-levels/school-levels.validators.ts`

- **Path**: `server/school-levels/school-levels.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for school-levels inputs and outputs.

### `server/school-sectors/school-sectors.repo.ts`

- **Path**: `server/school-sectors/school-sectors.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for school-sectors persistence (Drizzle queries and commands).

### `server/school-sectors/school-sectors.service.ts`

- **Path**: `server/school-sectors/school-sectors.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for school-sectors.

### `server/school-sectors/school-sectors.validators.ts`

- **Path**: `server/school-sectors/school-sectors.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for school-sectors inputs and outputs.

### `server/school/school.repo.ts`

- **Path**: `server/school/school.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for school persistence (Drizzle queries and commands).

### `server/school/school.service.ts`

- **Path**: `server/school/school.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for school. Code comment: Get school IDs that the user has access to. - admin_schools feature: returns undefined (can access all schools) - Otherwise: returns school IDs from user's school roles (from user_roles)

### `server/school/school.validators.ts`

- **Path**: `server/school/school.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for school inputs and outputs.

### `server/shared/errors.ts`

- **Path**: `server/shared/errors.ts`
- **Kind**: Module
- **Summary**: Source module `server/shared/errors.ts` (Module).

### `server/shared/logger.ts`

- **Path**: `server/shared/logger.ts`
- **Kind**: Module
- **Summary**: Source module `server/shared/logger.ts` (Module).

### `server/shared/result.ts`

- **Path**: `server/shared/result.ts`
- **Kind**: Module
- **Summary**: Source module `server/shared/result.ts` (Module).

### `server/slide-viewing-sessions/slide-viewing-sessions.repo.ts`

- **Path**: `server/slide-viewing-sessions/slide-viewing-sessions.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for slide-viewing-sessions persistence (Drizzle queries and commands).

### `server/states/states.repo.ts`

- **Path**: `server/states/states.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for states persistence (Drizzle queries and commands).

### `server/states/states.service.ts`

- **Path**: `server/states/states.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for states.

### `server/states/states.validators.ts`

- **Path**: `server/states/states.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for states inputs and outputs.

### `server/topic-lesson-plans/topic-lesson-plans.repo.ts`

- **Path**: `server/topic-lesson-plans/topic-lesson-plans.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for topic-lesson-plans persistence (Drizzle queries and commands).

### `server/topic-lesson-plans/topic-lesson-plans.service.ts`

- **Path**: `server/topic-lesson-plans/topic-lesson-plans.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for topic-lesson-plans. Code comment: Look up the stage number and topic stageOrder for a given topicId. Returns { stageNumber, topicNumber } or throws if not found.

### `server/topic-progress/topic-progress.repo.ts`

- **Path**: `server/topic-progress/topic-progress.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for topic-progress persistence (Drizzle queries and commands).

### `server/topic-quiz-completions/topic-quiz-completions.repo.ts`

- **Path**: `server/topic-quiz-completions/topic-quiz-completions.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for topic-quiz-completions persistence (Drizzle queries and commands).

### `server/topic-quizzes/topic-quizzes.repo.ts`

- **Path**: `server/topic-quizzes/topic-quizzes.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for topic-quizzes persistence (Drizzle queries and commands).

### `server/topic-slides/topic-slides.repo.ts`

- **Path**: `server/topic-slides/topic-slides.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for topic-slides persistence (Drizzle queries and commands).

### `server/topic-slides/topic-slides.service.ts`

- **Path**: `server/topic-slides/topic-slides.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for topic-slides.

### `server/topics/topics.repo.ts`

- **Path**: `server/topics/topics.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for topics persistence (Drizzle queries and commands). Code comment: Create a slide at a specific position using fractional indexing. If afterSlideId is provided, inserts after that slide. Otherwise appends at end.

### `server/topics/topics.service.ts`

- **Path**: `server/topics/topics.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for topics.

### `server/topics/topics.validators.ts`

- **Path**: `server/topics/topics.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for topics inputs and outputs.

### `server/user-slide-views/user-slide-views.repo.ts`

- **Path**: `server/user-slide-views/user-slide-views.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for user-slide-views persistence (Drizzle queries and commands).

### `server/user/user.repo.ts`

- **Path**: `server/user/user.repo.ts`
- **Kind**: Repository
- **Summary**: Data access for user persistence (Drizzle queries and commands).

### `server/user/user.service.ts`

- **Path**: `server/user/user.service.ts`
- **Kind**: Service
- **Summary**: Domain orchestration and business rules for user. Code comment: Get the last activity timestamps for a list of user IDs. Uses user_profile.last_seen_at (updated on site usage via middleware) with fallback to user_sessions (token refresh) during transition. @param …

### `server/user/user.validators.ts`

- **Path**: `server/user/user.validators.ts`
- **Kind**: Validators
- **Summary**: Zod (or similar) validation schemas and helpers for user inputs and outputs.
