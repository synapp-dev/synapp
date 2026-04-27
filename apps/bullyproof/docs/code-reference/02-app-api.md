# App Router API routes

This file is generated from `_inventory.json` by `pnpm docs:code-reference:generate`. Edit `scripts/generate-code-reference-inventory.ts` heuristics or add code comments to improve summaries, then regenerate.

## Entries (170)

### `app/api/admin/culture-ratings/schools/[schoolId]/benchmark/route.ts`

- **Path**: `app/api/admin/culture-ratings/schools/[schoolId]/benchmark/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/culture-ratings/schools/[schoolId]/benchmark`. Implements request handling for this API surface.

### `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/report-download/route.ts`

- **Path**: `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/report-download/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/report-download`. Implements request handling for this API surface.

### `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/report/route.ts`

- **Path**: `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/report/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/report`. Implements request handling for this API surface.

### `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/request-report/route.ts`

- **Path**: `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/request-report/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/request-report`. Implements request handling for this API surface.

### `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/route.ts`

- **Path**: `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/culture-ratings/schools/[schoolId]/comparatives/[comparativeId]`. Implements request handling for this API surface.

### `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/route.ts`

- **Path**: `app/api/admin/culture-ratings/schools/[schoolId]/comparatives/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/culture-ratings/schools/[schoolId]/comparatives`. Implements request handling for this API surface.

### `app/api/admin/culture-ratings/schools/[schoolId]/route.ts`

- **Path**: `app/api/admin/culture-ratings/schools/[schoolId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/culture-ratings/schools/[schoolId]`. Implements request handling for this API surface.

### `app/api/admin/culture-ratings/summary/route.ts`

- **Path**: `app/api/admin/culture-ratings/summary/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/culture-ratings/summary`. Implements request handling for this API surface.

### `app/api/admin/dashboard/activity/route.ts`

- **Path**: `app/api/admin/dashboard/activity/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/dashboard/activity`. Implements request handling for this API surface.

### `app/api/admin/migrations/backfill-slide-positions/route.ts`

- **Path**: `app/api/admin/migrations/backfill-slide-positions/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/migrations/backfill-slide-positions`. Implements request handling for this API surface. Code comment: Admin API: Normalize slide positions (recompute fractional positions). POST /api/admin/migrations/backfill-slide-positions - Requires /admin/content feature access

### `app/api/admin/ratings/route.ts`

- **Path**: `app/api/admin/ratings/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/ratings`. Implements request handling for this API surface.

### `app/api/admin/ratings/stages/route.ts`

- **Path**: `app/api/admin/ratings/stages/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/ratings/stages`. Implements request handling for this API surface.

### `app/api/admin/reports/overview/route.ts`

- **Path**: `app/api/admin/reports/overview/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/admin/reports/overview`. Implements request handling for this API surface.

### `app/api/certification-slides/[id]/url/route.ts`

- **Path**: `app/api/certification-slides/[id]/url/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification-slides/[id]/url`. Implements request handling for this API surface. Code comment: Certification Slide Image URL API route handler. Exposes HTTP endpoints for getting signed URLs for certification slide images. Authentication: - Requires a valid user derived from the request (401 if…

### `app/api/certification/answers/route.ts`

- **Path**: `app/api/certification/answers/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/answers`. Implements request handling for this API surface. Code comment: Certification Answers API route handler. Exposes HTTP endpoints for submitting certification quiz answers. Authentication: - Requires a valid user derived from the request (401 if missing). - All auth…

### `app/api/certification/courses/[id]/progress-details/route.ts`

- **Path**: `app/api/certification/courses/[id]/progress-details/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/[id]/progress-details`. Implements request handling for this API surface. Code comment: Certification Course Progress Details API route handler. Exposes HTTP endpoints for fetching detailed course progress with user and school information (admin only). Authentication: - Requires a valid …

### `app/api/certification/courses/[id]/ratings/check/route.ts`

- **Path**: `app/api/certification/courses/[id]/ratings/check/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/[id]/ratings/check`. Implements request handling for this API surface. Code comment: Course Rating Check API route handler. Exposes HTTP endpoints for checking if a user has rated a course. Authentication: - Requires a valid user derived from the request (401 if missing). Endpoints: -…

### `app/api/certification/courses/[id]/ratings/route.ts`

- **Path**: `app/api/certification/courses/[id]/ratings/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/[id]/ratings`. Implements request handling for this API surface. Code comment: Course Ratings API route handler. Exposes HTTP endpoints for submitting and updating course ratings. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can only…

### `app/api/certification/courses/[id]/results/route.ts`

- **Path**: `app/api/certification/courses/[id]/results/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/[id]/results`. Implements request handling for this API surface. Code comment: Certification Course Results API route handler. Exposes HTTP endpoints for fetching course completion statistics (admin only). Authentication: - Requires a valid user derived from the request (401 if …

### `app/api/certification/courses/[id]/route.ts`

- **Path**: `app/api/certification/courses/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/[id]`. Implements request handling for this API surface. Code comment: Certification Course by ID API route handler. Exposes HTTP endpoints for specific certification course management by ID. Authentication: - Requires a valid user derived from the request (401 if missin…

### `app/api/certification/courses/by-code/[code]/progress/route.ts`

- **Path**: `app/api/certification/courses/by-code/[code]/progress/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/by-code/[code]/progress`. Implements request handling for this API surface. Code comment: Certification Course Progress API route handler. Exposes HTTP endpoints for fetching all topic progress for a certification course. Authentication: - Requires a valid user derived from the request (40…

### `app/api/certification/courses/by-code/[code]/route.ts`

- **Path**: `app/api/certification/courses/by-code/[code]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/by-code/[code]`. Implements request handling for this API surface. Code comment: Certification Course by Code API route handler. Exposes HTTP endpoints for specific certification course management by code. Authentication: - Requires a valid user derived from the request (401 if mi…

### `app/api/certification/courses/by-slug/[slug]/route.ts`

- **Path**: `app/api/certification/courses/by-slug/[slug]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/by-slug/[slug]`. Implements request handling for this API surface. Code comment: Certification Course by Slug API route handler. Exposes HTTP endpoints for specific certification course management by slug. Authentication: - Requires a valid user derived from the request (401 if mi…

### `app/api/certification/courses/route.ts`

- **Path**: `app/api/certification/courses/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses`. Implements request handling for this API surface. Code comment: Certification Courses API route handler. Exposes HTTP endpoints for certification course management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authentica…

### `app/api/certification/courses/unrated/route.ts`

- **Path**: `app/api/certification/courses/unrated/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/courses/unrated`. Implements request handling for this API surface. Code comment: Unrated Courses API route handler. Returns courses that the user has completed but hasn't rated yet. Authentication: - Requires a valid user derived from the request (401 if missing). Endpoints: - GET…

### `app/api/certification/quizzes/[quizId]/attempts/[attemptId]/answers/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/attempts/[attemptId]/answers/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]/attempts/[attemptId]/answers`. Implements request handling for this API surface. Code comment: Quiz Attempt Answers API route handler. Exposes HTTP endpoints for submitting answers to a quiz attempt. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can …

### `app/api/certification/quizzes/[quizId]/attempts/[attemptId]/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/attempts/[attemptId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]/attempts/[attemptId]`. Implements request handling for this API surface. Code comment: Quiz Attempt by ID API route handler. Exposes HTTP endpoints for specific quiz attempt management. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can only a…

### `app/api/certification/quizzes/[quizId]/attempts/[attemptId]/submit/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/attempts/[attemptId]/submit/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]/attempts/[attemptId]/submit`. Implements request handling for this API surface. Code comment: Submit Quiz Attempt API route handler. Exposes HTTP endpoints for submitting and scoring a quiz attempt. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can …

### `app/api/certification/quizzes/[quizId]/questions/[questionId]/answers/[answerId]/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/questions/[questionId]/answers/[answerId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]/questions/[questionId]/answers/[answerId]`. Implements request handling for this API surface. Code comment: Quiz Answer by ID API route handler. Exposes HTTP endpoints for specific answer management. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can man…

### `app/api/certification/quizzes/[quizId]/questions/[questionId]/answers/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/questions/[questionId]/answers/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]/questions/[questionId]/answers`. Implements request handling for this API surface. Code comment: Quiz Answers API route handler. Exposes HTTP endpoints for quiz answer management. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can manage answe…

### `app/api/certification/quizzes/[quizId]/questions/[questionId]/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/questions/[questionId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]/questions/[questionId]`. Implements request handling for this API surface. Code comment: Quiz Question by ID API route handler. Exposes HTTP endpoints for specific question management. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can…

### `app/api/certification/quizzes/[quizId]/questions/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/questions/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]/questions`. Implements request handling for this API surface. Code comment: Quiz Questions API route handler. Exposes HTTP endpoints for quiz question management. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can manage q…

### `app/api/certification/quizzes/[quizId]/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]`. Implements request handling for this API surface. Code comment: Topic Quiz by ID API route handler. Exposes HTTP endpoints for specific quiz management. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can manage…

### `app/api/certification/quizzes/[quizId]/start/route.ts`

- **Path**: `app/api/certification/quizzes/[quizId]/start/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/[quizId]/start`. Implements request handling for this API surface. Code comment: Start Quiz Attempt API route handler. Exposes HTTP endpoints for starting a quiz attempt. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticated users c…

### `app/api/certification/quizzes/by-slugs/route.ts`

- **Path**: `app/api/certification/quizzes/by-slugs/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes/by-slugs`. Implements request handling for this API surface. Code comment: Quiz by Slugs API route handler. Exposes HTTP endpoints for fetching quiz data by course slug, topic slug, and quiz slug. Returns quiz, attempt, answers, and earliest unanswered question in a single r…

### `app/api/certification/quizzes/route.ts`

- **Path**: `app/api/certification/quizzes/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/quizzes`. Implements request handling for this API surface. Code comment: Topic Quizzes API route handler. Exposes HTTP endpoints for quiz management. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can manage quizzes. En…

### `app/api/certification/stages/[id]/route.ts`

- **Path**: `app/api/certification/stages/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/stages/[id]`. Implements request handling for this API surface. Code comment: Certification Stage by ID API route handler. Exposes HTTP endpoints for specific certification stage management by ID. Authentication: - Requires a valid user derived from the request (401 if missing)…

### `app/api/certification/stages/by-code/[code]/progress/route.ts`

- **Path**: `app/api/certification/stages/by-code/[code]/progress/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/stages/by-code/[code]/progress`. Implements request handling for this API surface. Code comment: Certification Course Progress API route handler. Exposes HTTP endpoints for fetching all topic progress for a certification course. Authentication: - Requires a valid user derived from the request (40…

### `app/api/certification/stages/by-code/[code]/route.ts`

- **Path**: `app/api/certification/stages/by-code/[code]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/stages/by-code/[code]`. Implements request handling for this API surface. Code comment: Certification Stage by Code API route handler. Exposes HTTP endpoints for specific certification stage management by code. Authentication: - Requires a valid user derived from the request (401 if miss…

### `app/api/certification/stages/route.ts`

- **Path**: `app/api/certification/stages/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/stages`. Implements request handling for this API surface. Code comment: Certification Stages API route handler. Exposes HTTP endpoints for certification stage management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticate…

### `app/api/certification/topics/[topicId]/progress/batch/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/progress/batch/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/progress/batch`. Implements request handling for this API surface. Code comment: Batch Topic Progress Update API route handler. Exposes HTTP endpoint for batch updating slide views and progress for a topic. Authentication: - Requires a valid user derived from the request (401 if m…

### `app/api/certification/topics/[topicId]/progress/complete/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/progress/complete/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/progress/complete`. Implements request handling for this API surface. Code comment: Complete Topic Progress API route handler. Exposes HTTP endpoint for completing all slides in a topic and updating progress status. Authentication: - Requires a valid user derived from the request (40…

### `app/api/certification/topics/[topicId]/progress/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/progress/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/progress`. Implements request handling for this API surface. Code comment: Topic Progress API route handler. Exposes HTTP endpoints for managing user progress through certification topics. Authentication: - Requires a valid user derived from the request (401 if missing). - A…

### `app/api/certification/topics/[topicId]/quiz-in-progress/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/quiz-in-progress/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/quiz-in-progress`. Implements request handling for this API surface. Code comment: Get In-Progress Quiz Attempt API route handler. Exposes HTTP endpoints for checking if a user has an in-progress quiz attempt for a topic. Authentication: - Requires a valid user derived from the requ…

### `app/api/certification/topics/[topicId]/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]`. Implements request handling for this API surface. Code comment: Certification Topic by ID API route handler. Exposes HTTP endpoints for fetching and managing a specific certification topic with slides. Authentication: - Requires a valid user derived from the reque…

### `app/api/certification/topics/[topicId]/slides-with-progress/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/slides-with-progress/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/slides-with-progress`. Implements request handling for this API surface. Code comment: Topic Slides with Progress API route handler. Exposes HTTP endpoint for fetching slides with signed URLs and user progress in a single request. Authentication: - Requires a valid user derived from the…

### `app/api/certification/topics/[topicId]/slides/[slideId]/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/slides/[slideId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/slides/[slideId]`. Implements request handling for this API surface. Code comment: Certification Slide by ID API route handler. Exposes HTTP endpoints for specific certification slide management. Authentication: - Requires a valid user derived from the request (401 if missing). - Pl…

### `app/api/certification/topics/[topicId]/slides/[slideId]/view/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/slides/[slideId]/view/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/slides/[slideId]/view`. Implements request handling for this API surface. Code comment: Mark Slide as Viewed API route handler. Exposes HTTP endpoint for marking a slide as viewed in a topic. Authentication: - Requires a valid user derived from the request (401 if missing). - All authent…

### `app/api/certification/topics/[topicId]/slides/bulk/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/slides/bulk/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/slides/bulk`. Implements request handling for this API surface. Code comment: Certification Topic Slides Bulk Save API route handler. Handles bulk operations: create, update, delete, reorder slides and upload files. Files are uploaded server-side after slides are created (to ge…

### `app/api/certification/topics/[topicId]/slides/route.ts`

- **Path**: `app/api/certification/topics/[topicId]/slides/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/[topicId]/slides`. Implements request handling for this API surface. Code comment: Certification Topic Slides API route handler. Exposes HTTP endpoints for certification slide management. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform a…

### `app/api/certification/topics/by-course-code/[code]/route.ts`

- **Path**: `app/api/certification/topics/by-course-code/[code]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/by-course-code/[code]`. Implements request handling for this API surface. Code comment: Certification Topics by Course Code API route handler. Exposes HTTP endpoints for fetching certification topics by course code. Authentication: - Requires a valid user derived from the request (401 if…

### `app/api/certification/topics/by-slug-with-course/[topicSlug]/route.ts`

- **Path**: `app/api/certification/topics/by-slug-with-course/[topicSlug]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/by-slug-with-course/[topicSlug]`. Implements request handling for this API surface. Code comment: Certification Topics by Slug with Course API route handler. Exposes HTTP endpoints for fetching a certification topic by slug with course slug filter. Returns topic, slides, progress, and unlock statu…

### `app/api/certification/topics/by-slug/[courseCode]/[slug]/route.ts`

- **Path**: `app/api/certification/topics/by-slug/[courseCode]/[slug]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/by-slug/[courseCode]/[slug]`. Implements request handling for this API surface. Code comment: Certification Topics by Slug API route handler. Exposes HTTP endpoints for fetching certification topics by course code and slug. Authentication: - Requires a valid user derived from the request (401 …

### `app/api/certification/topics/by-stage-code/[code]/route.ts`

- **Path**: `app/api/certification/topics/by-stage-code/[code]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/by-stage-code/[code]`. Implements request handling for this API surface. Code comment: Certification Topics by Stage Code API route handler. Exposes HTTP endpoints for fetching certification topics by stage code. Authentication: - Requires a valid user derived from the request (401 if m…

### `app/api/certification/topics/enriched/route.ts`

- **Path**: `app/api/certification/topics/enriched/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/enriched`. Implements request handling for this API surface. Code comment: Certification Topics Enriched API route handler. Exposes HTTP endpoints for fetching enriched certification topics data. Authentication: - Requires a valid user derived from the request (401 if missin…

### `app/api/certification/topics/reorder/route.ts`

- **Path**: `app/api/certification/topics/reorder/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics/reorder`. Implements request handling for this API surface. Code comment: Certification Topics Reorder API route handler. Exposes HTTP endpoints for reordering certification topics within a stage. Authentication: - Requires a valid user derived from the request (401 if miss…

### `app/api/certification/topics/route.ts`

- **Path**: `app/api/certification/topics/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/certification/topics`. Implements request handling for this API surface. Code comment: Certification Topics API route handler. Exposes HTTP endpoints for certification topic management. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platfor…

### `app/api/classes/[id]/route.ts`

- **Path**: `app/api/classes/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/classes/[id]`. Implements request handling for this API surface. Code comment: Class by ID API route handler. Exposes HTTP endpoints for managing specific classes by ID. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can access classes…

### `app/api/classes/bulk-year-levels/route.ts`

- **Path**: `app/api/classes/bulk-year-levels/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/classes/bulk-year-levels`. Implements request handling for this API surface. Code comment: Bulk Year Levels Update API route handler. Exposes HTTP endpoint for updating year level assignments for multiple classes in bulk. Authentication: - Requires a valid user derived from the request (401…

### `app/api/classes/bulk/route.ts`

- **Path**: `app/api/classes/bulk/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/classes/bulk`. Implements request handling for this API surface. Code comment: Bulk Classes Creation API route handler. Exposes HTTP endpoint for creating multiple classes in bulk with teacher assignments. Authentication: - Requires a valid user derived from the request (401 if …

### `app/api/classes/delete/route.ts`

- **Path**: `app/api/classes/delete/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/classes/delete`. Implements request handling for this API surface. Code comment: Bulk Classes Deletion API route handler. Exposes HTTP endpoint for deleting multiple classes in bulk. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires plat…

### `app/api/classes/route.ts`

- **Path**: `app/api/classes/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/classes`. Implements request handling for this API surface. Code comment: Classes API route handler. Exposes HTTP endpoints for class management. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires school admin/teacher role for mana…

### `app/api/curriculum/levels/route.ts`

- **Path**: `app/api/curriculum/levels/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/curriculum/levels`. Implements request handling for this API surface. Code comment: Curriculum Levels API route handler. Exposes HTTP endpoints for school level management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticated users ca…

### `app/api/curriculum/stages/[id]/route.ts`

- **Path**: `app/api/curriculum/stages/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/curriculum/stages/[id]`. Implements request handling for this API surface. Code comment: Curriculum Stage by ID API route handler. Exposes HTTP endpoints for specific curriculum stage management. Authentication: - Requires a valid user derived from the request (401 if missing). - All auth…

### `app/api/curriculum/stages/by-code/[code]/route.ts`

- **Path**: `app/api/curriculum/stages/by-code/[code]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/curriculum/stages/by-code/[code]`. Implements request handling for this API surface. Code comment: Curriculum Stage by Code API route handler. Exposes HTTP endpoints for specific curriculum stage management by code. Authentication: - Requires a valid user derived from the request (401 if missing). …

### `app/api/curriculum/stages/by-slug/[slug]/route.ts`

- **Path**: `app/api/curriculum/stages/by-slug/[slug]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/curriculum/stages/by-slug/[slug]`. Implements request handling for this API surface. Code comment: Curriculum Stage by Slug API route handler. Exposes HTTP endpoints for specific curriculum stage management by slug. Authentication: - Requires a valid user derived from the request (401 if missing). …

### `app/api/curriculum/stages/route.ts`

- **Path**: `app/api/curriculum/stages/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/curriculum/stages`. Implements request handling for this API surface. Code comment: Curriculum Stages API route handler. Exposes HTTP endpoints for curriculum stage management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticated user…

### `app/api/curriculum/years/[id]/route.ts`

- **Path**: `app/api/curriculum/years/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/curriculum/years/[id]`. Implements request handling for this API surface. Code comment: Curriculum Year by ID API route handler. Exposes HTTP endpoints for specific school year management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authentica…

### `app/api/curriculum/years/route.ts`

- **Path**: `app/api/curriculum/years/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/curriculum/years`. Implements request handling for this API surface. Code comment: Curriculum Years API route handler. Exposes HTTP endpoints for school year management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticated users can …

### `app/api/features/[featureId]/permissions/route.ts`

- **Path**: `app/api/features/[featureId]/permissions/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/features/[featureId]/permissions`. Implements request handling for this API surface. Code comment: Feature Permissions API route handler. Exposes HTTP endpoints for managing feature permissions. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform a…

### `app/api/features/check/route.ts`

- **Path**: `app/api/features/check/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/features/check`. Implements request handling for this API surface. Code comment: Feature Check API route handler. Exposes HTTP endpoint for checking feature access. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticated users can che…

### `app/api/features/permissions/route.ts`

- **Path**: `app/api/features/permissions/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/features/permissions`. Implements request handling for this API surface. Code comment: Bulk feature permissions API. GET /api/features/permissions?level=global GET /api/features/permissions?level=role&targetId=... GET /api/features/permissions?level=school&targetId=... GET /api/features…

### `app/api/features/route.ts`

- **Path**: `app/api/features/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/features`. Implements request handling for this API surface. Code comment: Features API route handler. Exposes HTTP endpoints for feature management. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform admin role for managem…

### `app/api/feedback-tickets/[id]/notes/read/route.ts`

- **Path**: `app/api/feedback-tickets/[id]/notes/read/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/feedback-tickets/[id]/notes/read`. Implements request handling for this API surface. Code comment: Mark Notes Read API route handler. Endpoints: - POST /api/feedback-tickets/[id]/notes/read - Mark all admin notes on a ticket as read (ticket owner only)

### `app/api/feedback-tickets/[id]/notes/route.ts`

- **Path**: `app/api/feedback-tickets/[id]/notes/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/feedback-tickets/[id]/notes`. Implements request handling for this API surface. Code comment: Admin Notes API route handler. Endpoints: - POST /api/feedback-tickets/[id]/notes - Add an admin note to a ticket

### `app/api/feedback-tickets/[id]/route.ts`

- **Path**: `app/api/feedback-tickets/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/feedback-tickets/[id]`. Implements request handling for this API surface. Code comment: Single Feedback Ticket API route handler. Endpoints: - GET /api/feedback-tickets/[id] - Get ticket detail (admin) - PATCH /api/feedback-tickets/[id] - Update ticket status (admin, close restricted to …

### `app/api/feedback-tickets/mine/route.ts`

- **Path**: `app/api/feedback-tickets/mine/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/feedback-tickets/mine`. Implements request handling for this API surface. Code comment: GET /api/feedback-tickets/mine Returns all feedback tickets submitted by the authenticated user, ordered by creation date (most recent first). Authentication: - Requires a valid Bearer token in the Au…

### `app/api/feedback-tickets/route.ts`

- **Path**: `app/api/feedback-tickets/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/feedback-tickets`. Implements request handling for this API surface. Code comment: Feedback Tickets API route handler. Endpoints: - GET /api/feedback-tickets - List all tickets (admin — requires platform role) - POST /api/feedback-tickets - Create a feedback ticket (any authenticate…

### `app/api/feedback-tickets/unread-count/route.ts`

- **Path**: `app/api/feedback-tickets/unread-count/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/feedback-tickets/unread-count`. Implements request handling for this API surface. Code comment: Unread Note Count API route handler. Endpoints: - GET /api/feedback-tickets/unread-count - Get count of tickets with unread admin notes for the authenticated user

### `app/api/invites/[id]/route.ts`

- **Path**: `app/api/invites/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/invites/[id]`. Implements request handling for this API surface. Code comment: Invite by ID API route handler. Exposes HTTP endpoints for managing specific invites by ID. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can man…

### `app/api/invites/accept/route.ts`

- **Path**: `app/api/invites/accept/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/invites/accept`. Implements request handling for this API surface. Code comment: Accept Invite API route handler. Exposes HTTP endpoints for accepting school invitations. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can only accept inv…

### `app/api/invites/route.ts`

- **Path**: `app/api/invites/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/invites`. Implements request handling for this API surface. Code comment: Invites API route handler. Exposes HTTP endpoints for school invitation management. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform admin or scho…

### `app/api/lessons/[id]/feedback/route.ts`

- **Path**: `app/api/lessons/[id]/feedback/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons/[id]/feedback`. Implements request handling for this API surface. Code comment: Lesson Feedback API route handler. Exposes HTTP endpoints for managing lesson feedback. Authentication: - Requires a valid user derived from the request (401 if missing). - Only the lesson creator can…

### `app/api/lessons/[id]/live-state/route.ts`

- **Path**: `app/api/lessons/[id]/live-state/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons/[id]/live-state`. Implements request handling for this API surface. Code comment: Lesson Live State API route handler. Exposes HTTP endpoints for managing lesson live state. Authentication: - Requires a valid user derived from the request (401 if missing). Endpoints: - POST /api/le…

### `app/api/lessons/[id]/route.ts`

- **Path**: `app/api/lessons/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons/[id]`. Implements request handling for this API surface. Code comment: Lesson by ID API route handler. Exposes HTTP endpoints for managing specific lessons by ID. Authentication: - Requires a valid user derived from the request (401 if missing). - Teachers can manage the…

### `app/api/lessons/[id]/take-over/route.ts`

- **Path**: `app/api/lessons/[id]/take-over/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons/[id]/take-over`. Implements request handling for this API surface. Code comment: Lesson Take Over API route handler. POST /api/lessons/[id]/take-over - Take over ownership of a lesson Only TEACHER at the lesson's school can take over. Blocked when status is feedback/completed/canc…

### `app/api/lessons/completed/route.ts`

- **Path**: `app/api/lessons/completed/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons/completed`. Implements request handling for this API surface. Code comment: Completed Lessons API route handler. Exposes HTTP GET endpoint for completed lessons metrics. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires admin_lesson…

### `app/api/lessons/engagement-rate/route.ts`

- **Path**: `app/api/lessons/engagement-rate/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons/engagement-rate`. Implements request handling for this API surface. Code comment: Engagement Rate API route handler. Exposes HTTP GET endpoint for engagement rate metrics. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires admin_lessons fe…

### `app/api/lessons/outstanding-feedback/route.ts`

- **Path**: `app/api/lessons/outstanding-feedback/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons/outstanding-feedback`. Implements request handling for this API surface. Code comment: Outstanding feedback lessons API. Returns lessons in "feedback" status owned by the current user. Used to gate starting new lessons until feedback is completed.

### `app/api/lessons/recommendations/route.ts`

- **Path**: `app/api/lessons/recommendations/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons/recommendations`. Implements request handling for this API surface. Code comment: Lesson Recommendations API route handler. Exposes HTTP POST endpoint for getting topic recommendations based on class progress. Authentication: - Requires a valid user derived from the request (401 if…

### `app/api/lessons/route.ts`

- **Path**: `app/api/lessons/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/lessons`. Implements request handling for this API surface. Code comment: Lessons API route handler. Exposes HTTP endpoints for lesson management. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires teacher role for management opera…

### `app/api/licences/[id]/route.ts`

- **Path**: `app/api/licences/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/licences/[id]`. Implements request handling for this API surface. Code comment: Licence by ID API route handler. Exposes HTTP endpoints for managing specific licences by ID. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can m…

### `app/api/licences/route.ts`

- **Path**: `app/api/licences/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/licences`. Implements request handling for this API surface. Code comment: Licences API route handler. Exposes HTTP endpoints for school licence management. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform admin or school…

### `app/api/me/dialogs/route.ts`

- **Path**: `app/api/me/dialogs/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/me/dialogs`. Implements request handling for this API surface. Code comment: Dialogs API route handler. Exposes HTTP endpoints for managing dialog dismissal status. Authentication: - Requires a valid user derived from the request (401 if missing). Endpoints: - PATCH /api/me/di…

### `app/api/me/route.ts`

- **Path**: `app/api/me/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/me`. Implements request handling for this API surface. Code comment: Me API route handler. Exposes HTTP endpoints for user profile management. Authentication: - Requires a valid user derived from the request (401 if missing). Endpoints: - GET /api/me - Get current user…

### `app/api/me/schools/route.ts`

- **Path**: `app/api/me/schools/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/me/schools`. Implements request handling for this API surface. Code comment: Me Schools API route handler. Exposes HTTP endpoints for getting user's schools. Authentication: - Requires a valid user derived from the request (401 if missing). Endpoints: - GET /api/me/schools - G…

### `app/api/me/teacher-classes/route.ts`

- **Path**: `app/api/me/teacher-classes/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/me/teacher-classes`. Implements request handling for this API surface. Code comment: Teacher Classes API route handler. Exposes HTTP endpoints for checking teacher classes status. Authentication: - Requires a valid user derived from the request (401 if missing). Endpoints: - GET /api/…

### `app/api/me/teacher-classes/schools/route.ts`

- **Path**: `app/api/me/teacher-classes/schools/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/me/teacher-classes/schools`. Implements request handling for this API surface. Code comment: Teacher Classes Schools API route handler. Exposes HTTP endpoints for getting school IDs where a user has classes. Authentication: - Requires a valid user derived from the request (401 if missing). En…

### `app/api/me/tutorials/route.ts`

- **Path**: `app/api/me/tutorials/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/me/tutorials`. Implements request handling for this API surface. Code comment: Tutorials API route handler. Exposes HTTP endpoints for managing tutorial progress. Authentication: - Requires a valid user derived from the request (401 if missing). Endpoints: - GET /api/me/tutorial…

### `app/api/permission-templates/[id]/apply/route.ts`

- **Path**: `app/api/permission-templates/[id]/apply/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/permission-templates/[id]/apply`. Implements request handling for this API surface.

### `app/api/permission-templates/[id]/revoke/route.ts`

- **Path**: `app/api/permission-templates/[id]/revoke/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/permission-templates/[id]/revoke`. Implements request handling for this API surface.

### `app/api/permission-templates/[id]/route.ts`

- **Path**: `app/api/permission-templates/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/permission-templates/[id]`. Implements request handling for this API surface.

### `app/api/permission-templates/activation/route.ts`

- **Path**: `app/api/permission-templates/activation/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/permission-templates/activation`. Implements request handling for this API surface.

### `app/api/permission-templates/route.ts`

- **Path**: `app/api/permission-templates/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/permission-templates`. Implements request handling for this API surface.

### `app/api/resources/files/[id]/download/route.ts`

- **Path**: `app/api/resources/files/[id]/download/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/resources/files/[id]/download`. Implements request handling for this API surface.

### `app/api/resources/files/[id]/route.ts`

- **Path**: `app/api/resources/files/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/resources/files/[id]`. Implements request handling for this API surface.

### `app/api/resources/files/[id]/topics/route.ts`

- **Path**: `app/api/resources/files/[id]/topics/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/resources/files/[id]/topics`. Implements request handling for this API surface.

### `app/api/resources/files/route.ts`

- **Path**: `app/api/resources/files/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/resources/files`. Implements request handling for this API surface.

### `app/api/resources/folders/[id]/route.ts`

- **Path**: `app/api/resources/folders/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/resources/folders/[id]`. Implements request handling for this API surface.

### `app/api/resources/folders/route.ts`

- **Path**: `app/api/resources/folders/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/resources/folders`. Implements request handling for this API surface.

### `app/api/resources/topic-files/route.ts`

- **Path**: `app/api/resources/topic-files/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/resources/topic-files`. Implements request handling for this API surface.

### `app/api/resources/tree/route.ts`

- **Path**: `app/api/resources/tree/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/resources/tree`. Implements request handling for this API surface.

### `app/api/roles/[id]/route.ts`

- **Path**: `app/api/roles/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/roles/[id]`. Implements request handling for this API surface. Code comment: Role by ID API route handler. Exposes HTTP endpoints for managing specific roles by ID. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can manage …

### `app/api/roles/route.ts`

- **Path**: `app/api/roles/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/roles`. Implements request handling for this API surface. Code comment: Roles API route handler. Exposes HTTP endpoints for role management. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform admin role for management op…

### `app/api/school-levels/[id]/route.ts`

- **Path**: `app/api/school-levels/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/school-levels/[id]`. Implements request handling for this API surface. Code comment: School Level by ID API route handler. Exposes HTTP endpoints for specific school level management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticate…

### `app/api/school-levels/route.ts`

- **Path**: `app/api/school-levels/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/school-levels`. Implements request handling for this API surface. Code comment: School Levels API route handler. Exposes HTTP endpoints for school level management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticated users can re…

### `app/api/school-sectors/[id]/route.ts`

- **Path**: `app/api/school-sectors/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/school-sectors/[id]`. Implements request handling for this API surface. Code comment: School Sector by ID API route handler. Exposes HTTP endpoints for specific school sector management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authentica…

### `app/api/school-sectors/route.ts`

- **Path**: `app/api/school-sectors/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/school-sectors`. Implements request handling for this API surface. Code comment: School Sectors API route handler. Exposes HTTP endpoints for school sector management. Authentication: - Requires a valid user derived from the request (401 if missing). - All authenticated users can …

### `app/api/schools/[id]/certification/route.ts`

- **Path**: `app/api/schools/[id]/certification/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/certification`. Implements request handling for this API surface.

### `app/api/schools/[id]/culture-rating/comparatives/[comparativeId]/report-download/route.ts`

- **Path**: `app/api/schools/[id]/culture-rating/comparatives/[comparativeId]/report-download/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/culture-rating/comparatives/[comparativeId]/report-download`. Implements request handling for this API surface.

### `app/api/schools/[id]/culture-rating/comparatives/[comparativeId]/request-report/route.ts`

- **Path**: `app/api/schools/[id]/culture-rating/comparatives/[comparativeId]/request-report/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/culture-rating/comparatives/[comparativeId]/request-report`. Implements request handling for this API surface.

### `app/api/schools/[id]/culture-rating/comparatives/[comparativeId]/route.ts`

- **Path**: `app/api/schools/[id]/culture-rating/comparatives/[comparativeId]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/culture-rating/comparatives/[comparativeId]`. Implements request handling for this API surface.

### `app/api/schools/[id]/culture-rating/comparatives/route.ts`

- **Path**: `app/api/schools/[id]/culture-rating/comparatives/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/culture-rating/comparatives`. Implements request handling for this API surface.

### `app/api/schools/[id]/culture-rating/route.ts`

- **Path**: `app/api/schools/[id]/culture-rating/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/culture-rating`. Implements request handling for this API surface.

### `app/api/schools/[id]/images/route.ts`

- **Path**: `app/api/schools/[id]/images/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/images`. Implements request handling for this API surface. Code comment: School avatar and banner image upload API. POST /api/schools/[id]/images - Requires /admin/schools feature access - FormData: type ("avatar" | "banner"), file (image file) - Uploads to content bucket …

### `app/api/schools/[id]/key-staff/route.ts`

- **Path**: `app/api/schools/[id]/key-staff/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/key-staff`. Implements request handling for this API surface.

### `app/api/schools/[id]/route.ts`

- **Path**: `app/api/schools/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]`. Implements request handling for this API surface.

### `app/api/schools/[id]/stats/route.ts`

- **Path**: `app/api/schools/[id]/stats/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/stats`. Implements request handling for this API surface.

### `app/api/schools/[id]/users/remove/route.ts`

- **Path**: `app/api/schools/[id]/users/remove/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/users/remove`. Implements request handling for this API surface. Code comment: Remove Users from School API route handler. Exposes HTTP endpoint for removing users from a school by removing all their roles, positions, and class associations for that school. Authentication: - Req…

### `app/api/schools/[id]/years/route.ts`

- **Path**: `app/api/schools/[id]/years/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/[id]/years`. Implements request handling for this API surface. Code comment: GET /api/schools/[id]/years Returns year levels assigned to this school (from school_year_assignments). Same shape as GET /api/curriculum/years: array of { year, level }.

### `app/api/schools/invite/route.ts`

- **Path**: `app/api/schools/invite/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools/invite`. Implements request handling for this API surface. Code comment: School Invite API route handler. Exposes HTTP endpoint for logging school invitation requests. Authentication: - No authentication required (logging endpoint). Endpoints: - POST /api/schools/invite - …

### `app/api/schools/route.ts`

- **Path**: `app/api/schools/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/schools`. Implements request handling for this API surface. Code comment: Schools API route handler. Exposes HTTP GET and POST endpoints for schools. Authentication: - Requires a valid user derived from the request (401 if missing). Query parameters (GET): - All query strin…

### `app/api/slides/sessions/end/route.ts`

- **Path**: `app/api/slides/sessions/end/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/slides/sessions/end`. Implements request handling for this API surface. Code comment: End Slide Viewing Session API route handler. Exposes HTTP endpoints for ending a viewing session and updating total time. Authentication: - Requires a valid user derived from the request (401 if missi…

### `app/api/slides/sessions/heartbeat/route.ts`

- **Path**: `app/api/slides/sessions/heartbeat/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/slides/sessions/heartbeat`. Implements request handling for this API surface. Code comment: Slide Viewing Session Heartbeat API route handler. Exposes HTTP endpoints for sending heartbeat updates to a viewing session. Authentication: - Requires a valid user derived from the request (401 if m…

### `app/api/slides/sessions/pause/route.ts`

- **Path**: `app/api/slides/sessions/pause/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/slides/sessions/pause`. Implements request handling for this API surface. Code comment: Pause Slide Viewing Session API route handler. Exposes HTTP endpoints for pausing a viewing session. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can only…

### `app/api/slides/sessions/resume/route.ts`

- **Path**: `app/api/slides/sessions/resume/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/slides/sessions/resume`. Implements request handling for this API surface. Code comment: Resume Slide Viewing Session API route handler. Exposes HTTP endpoints for resuming a viewing session. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can on…

### `app/api/slides/sessions/start/route.ts`

- **Path**: `app/api/slides/sessions/start/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/slides/sessions/start`. Implements request handling for this API surface. Code comment: Start Slide Viewing Session API route handler. Exposes HTTP endpoints for starting a slide viewing session. Authentication: - Requires a valid user derived from the request (401 if missing). - All aut…

### `app/api/states/[id]/route.ts`

- **Path**: `app/api/states/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/states/[id]`. Implements request handling for this API surface. Code comment: State by ID API route handler. Exposes HTTP endpoints for specific state management. Authentication: - No authentication required (public data). Endpoints: - GET /api/states/[id] - Get state by ID Res…

### `app/api/states/route.ts`

- **Path**: `app/api/states/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/states`. Implements request handling for this API surface. Code comment: States API route handler. Exposes HTTP endpoints for Australian states/territories. Authentication: - No authentication required (public data). Endpoints: - GET /api/states - List all states Responses…

### `app/api/storage/signed-url/route.ts`

- **Path**: `app/api/storage/signed-url/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/storage/signed-url`. Implements request handling for this API surface. Code comment: Storage Signed URL API route. GET /api/storage/signed-url?path=<storage-path> Generates a signed URL for storage paths in the content bucket. Currently supports school images: schools/... (both old an…

### `app/api/teachers/route.ts`

- **Path**: `app/api/teachers/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/teachers`. Implements request handling for this API surface. Code comment: Teachers API route handler. Exposes HTTP GET endpoint for teacher metrics. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires admin_schools feature for scope…

### `app/api/topic-lesson-plans/[id]/download/route.ts`

- **Path**: `app/api/topic-lesson-plans/[id]/download/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topic-lesson-plans/[id]/download`. Implements request handling for this API surface. Code comment: Topic Lesson Plan download API route. Streams the PDF with Content-Disposition: attachment to trigger a save dialog.

### `app/api/topic-lesson-plans/[id]/route.ts`

- **Path**: `app/api/topic-lesson-plans/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topic-lesson-plans/[id]`. Implements request handling for this API surface. Code comment: Topic Lesson Plan by ID API route handler. Endpoints: - GET /api/topic-lesson-plans/[id] - Get signed download URL - DELETE /api/topic-lesson-plans/[id] - Delete lesson plan

### `app/api/topic-lesson-plans/route.ts`

- **Path**: `app/api/topic-lesson-plans/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topic-lesson-plans`. Implements request handling for this API surface. Code comment: Topic Lesson Plans API route handler. Endpoints: - GET /api/topic-lesson-plans?topicId=... - List lesson plans for a topic - POST /api/topic-lesson-plans - Upload a lesson plan (multipart: file + topi…

### `app/api/topic-slides/[id]/route.ts`

- **Path**: `app/api/topic-slides/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topic-slides/[id]`. Implements request handling for this API surface. Code comment: Topic Slide by ID API route handler. Exposes HTTP endpoints for managing specific topic slides by ID. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admi…

### `app/api/topic-slides/[id]/url/route.ts`

- **Path**: `app/api/topic-slides/[id]/url/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topic-slides/[id]/url`. Implements request handling for this API surface. Code comment: Topic Slide Image URL API route handler. Exposes HTTP endpoints for getting signed URLs for topic slide images. Authentication: - Requires a valid user derived from the request (401 if missing). - All…

### `app/api/topic-slides/bulk-save/route.ts`

- **Path**: `app/api/topic-slides/bulk-save/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topic-slides/bulk-save`. Implements request handling for this API surface. Code comment: Topic Slides Bulk Save API route handler. Handles bulk operations: create, update, delete, reorder slides and upload files. Files are uploaded server-side after slides are created (to get UUIDs). Auth…

### `app/api/topic-slides/reorder/route.ts`

- **Path**: `app/api/topic-slides/reorder/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topic-slides/reorder`. Implements request handling for this API surface. Code comment: Topic Slides Reorder API route handler. Exposes HTTP endpoint for bulk reordering slides. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can manag…

### `app/api/topic-slides/route.ts`

- **Path**: `app/api/topic-slides/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topic-slides`. Implements request handling for this API surface. Code comment: Topic Slides API route handler. Exposes HTTP endpoints for managing topic slides. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can manage slides…

### `app/api/topics/[id]/route.ts`

- **Path**: `app/api/topics/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topics/[id]`. Implements request handling for this API surface. Code comment: Topic by ID API route handler. Exposes HTTP endpoints for managing specific topics by ID. Authentication: - Requires a valid user derived from the request (401 if missing). - Platform admins can manag…

### `app/api/topics/[id]/slides/order/route.ts`

- **Path**: `app/api/topics/[id]/slides/order/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topics/[id]/slides/order`. Implements request handling for this API surface. Code comment: PUT /api/topics/[id]/slides/order - Reorder slides by slideIds array. Body: { slideIds: string[] }

### `app/api/topics/[id]/slides/route.ts`

- **Path**: `app/api/topics/[id]/slides/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topics/[id]/slides`. Implements request handling for this API surface. Code comment: Topic slides API - create and bulk delete. POST /api/topics/[id]/slides - Create a slide (JSON or FormData with optional file) DELETE /api/topics/[id]/slides - Bulk delete slides (body: { ids: string[…

### `app/api/topics/reorder/route.ts`

- **Path**: `app/api/topics/reorder/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topics/reorder`. Implements request handling for this API surface. Code comment: Topics Reorder API route handler. Exposes HTTP endpoints for reordering topics within a stage. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform ad…

### `app/api/topics/route.ts`

- **Path**: `app/api/topics/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/topics`. Implements request handling for this API surface. Code comment: Topics API route handler. Exposes HTTP endpoints for topic management. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform admin role for management …

### `app/api/user-roles/bulk/route.ts`

- **Path**: `app/api/user-roles/bulk/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/user-roles/bulk`. Implements request handling for this API surface. Code comment: Bulk User Roles API route handler. Exposes HTTP endpoints for bulk managing user role assignments. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platfor…

### `app/api/user-roles/route.ts`

- **Path**: `app/api/user-roles/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/user-roles`. Implements request handling for this API surface. Code comment: User Roles API route handler. Exposes HTTP endpoints for managing user role assignments. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform admin ro…

### `app/api/user-slide-views/delete-by-topic/route.ts`

- **Path**: `app/api/user-slide-views/delete-by-topic/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/user-slide-views/delete-by-topic`. Implements request handling for this API surface. Code comment: Delete User Slide Views by Topic API route handler. Exposes HTTP endpoint for deleting all slide views for a user within a specific topic. Authentication: - Requires a valid user derived from the requ…

### `app/api/users/[id]/classes/route.ts`

- **Path**: `app/api/users/[id]/classes/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/[id]/classes`. Implements request handling for this API surface. Code comment: User Classes API route handler. Exposes HTTP endpoints for classes assigned to a user (teacher). Authentication: - GET: Platform admins, self, or school admins (with school:manage-school-user-roles) a…

### `app/api/users/[id]/features/route.ts`

- **Path**: `app/api/users/[id]/features/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/[id]/features`. Implements request handling for this API surface. Code comment: User Features API route handler. Exposes HTTP endpoint for getting all feature permissions for a user. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can ch…

### `app/api/users/[id]/positions/route.ts`

- **Path**: `app/api/users/[id]/positions/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/[id]/positions`. Implements request handling for this API surface. Code comment: User School Positions API route handler. Exposes HTTP endpoints for managing user school positions. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platfo…

### `app/api/users/[id]/route.ts`

- **Path**: `app/api/users/[id]/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/[id]`. Implements request handling for this API surface. Code comment: User by ID API route handler. Exposes HTTP endpoints for getting and updating specific users by ID. Authentication: - Requires a valid user derived from the request (401 if missing). - Users can acces…

### `app/api/users/bulk/route.ts`

- **Path**: `app/api/users/bulk/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/bulk`. Implements request handling for this API surface. Code comment: Bulk User Creation API route handler. Exposes HTTP endpoint for creating multiple users in bulk. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform …

### `app/api/users/delete/route.ts`

- **Path**: `app/api/users/delete/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/delete`. Implements request handling for this API surface. Code comment: Bulk User Deletion API route handler. Exposes HTTP endpoint for deleting multiple users in bulk. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform …

### `app/api/users/new/government-viewer/route.ts`

- **Path**: `app/api/users/new/government-viewer/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/new/government-viewer`. Implements request handling for this API surface. Code comment: Government Official User Creation API route handler. Exposes HTTP endpoint for creating new government official users. Authentication: - Requires a valid user derived from the request (401 if missing)…

### `app/api/users/new/platform-admin/route.ts`

- **Path**: `app/api/users/new/platform-admin/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/new/platform-admin`. Implements request handling for this API surface. Code comment: Platform Admin User Creation API route handler. Exposes HTTP endpoint for creating new platform admin users. Authentication: - Requires a valid user derived from the request (401 if missing). - Requir…

### `app/api/users/new/route.ts`

- **Path**: `app/api/users/new/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/new`. Implements request handling for this API surface. Code comment: Generic User Creation API route handler. Exposes HTTP endpoint for creating new users with any role. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platf…

### `app/api/users/new/school-admin/route.ts`

- **Path**: `app/api/users/new/school-admin/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/new/school-admin`. Implements request handling for this API surface. Code comment: School Admin User Creation API route handler. Exposes HTTP endpoint for creating new school admin users. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires p…

### `app/api/users/new/school-license/route.ts`

- **Path**: `app/api/users/new/school-license/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/new/school-license`. Implements request handling for this API surface. Code comment: School License User Creation API route handler. Exposes HTTP endpoint for creating new school licenses with associated users. Authentication: - Requires a valid user derived from the request (401 if m…

### `app/api/users/new/teacher/route.ts`

- **Path**: `app/api/users/new/teacher/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users/new/teacher`. Implements request handling for this API surface. Code comment: Teacher User Creation API route handler. Exposes HTTP endpoint for creating new teacher users. Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform ad…

### `app/api/users/route.ts`

- **Path**: `app/api/users/route.ts`
- **Kind**: API route
- **Summary**: App Router HTTP handler at `/api/users`. Implements request handling for this API surface. Code comment: Users API route handler. Exposes HTTP endpoints for user management (admin functions). Authentication: - Requires a valid user derived from the request (401 if missing). - Requires platform admin role…
