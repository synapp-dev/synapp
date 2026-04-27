# App Router UI (pages, layouts, colocated TSX)

This file is generated from `_inventory.json` by `pnpm docs:code-reference:generate`. Edit `scripts/generate-code-reference-inventory.ts` heuristics or add code comments to improve summaries, then regenerate.

## Entries (154)

### `app/(auth)/auth/page.tsx`

- **Path**: `app/(auth)/auth/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(auth)/auth`).

### `app/(auth)/layout.tsx`

- **Path**: `app/(auth)/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `app/(auth)`.

### `app/(auth)/logout/page.tsx`

- **Path**: `app/(auth)/logout/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(auth)/logout`).

### `app/(main)/admin/admin-page-client.tsx`

- **Path**: `app/(main)/admin/admin-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/admin-page-client.tsx` (Module).

### `app/(main)/admin/audit-logs/page.tsx`

- **Path**: `app/(main)/admin/audit-logs/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/audit-logs`).

### `app/(main)/admin/classes/page.tsx`

- **Path**: `app/(main)/admin/classes/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/classes`).

### `app/(main)/admin/components/admin-card.tsx`

- **Path**: `app/(main)/admin/components/admin-card.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/components/admin-card.tsx` (Module).

### `app/(main)/admin/components/admin-route-guard.tsx`

- **Path**: `app/(main)/admin/components/admin-route-guard.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/components/admin-route-guard.tsx` (Module). Code comment: Guards admin sub-routes by section. For /admin/content, /admin/schools, etc., requires the corresponding admin_* feature. For /admin exactly, only children are rendered (landing page has its own Featu…

### `app/(main)/admin/components/feature-role-matrix-dialog.tsx`

- **Path**: `app/(main)/admin/components/feature-role-matrix-dialog.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/components/feature-role-matrix-dialog.tsx` (Module).

### `app/(main)/admin/content/certification/[stage]/[topic]/page.tsx`

- **Path**: `app/(main)/admin/content/certification/[stage]/[topic]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[stage]/[topic]`).

### `app/(main)/admin/content/certification/[stage]/[topic]/quiz/page.tsx`

- **Path**: `app/(main)/admin/content/certification/[stage]/[topic]/quiz/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[topic]/quiz`).

### `app/(main)/admin/content/certification/[stage]/[topic]/slides/page.tsx`

- **Path**: `app/(main)/admin/content/certification/[stage]/[topic]/slides/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[topic]/slides`).

### `app/(main)/admin/content/certification/[stage]/page.tsx`

- **Path**: `app/(main)/admin/content/certification/[stage]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`certification/[stage]`).

### `app/(main)/admin/content/certification/page.tsx`

- **Path**: `app/(main)/admin/content/certification/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`content/certification`).

### `app/(main)/admin/content/curriculum/[stage]/[slug]/page.tsx`

- **Path**: `app/(main)/admin/content/curriculum/[stage]/[slug]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[stage]/[slug]`).

### `app/(main)/admin/content/curriculum/[stage]/page.tsx`

- **Path**: `app/(main)/admin/content/curriculum/[stage]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`curriculum/[stage]`).

### `app/(main)/admin/content/curriculum/page.tsx`

- **Path**: `app/(main)/admin/content/curriculum/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`content/curriculum`).

### `app/(main)/admin/content/page.tsx`

- **Path**: `app/(main)/admin/content/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/content`).

### `app/(main)/admin/culture-ratings/page.tsx`

- **Path**: `app/(main)/admin/culture-ratings/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/culture-ratings`).

### `app/(main)/admin/features/[section]/page.tsx`

- **Path**: `app/(main)/admin/features/[section]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`features/[section]`).

### `app/(main)/admin/features/components/global-tab.tsx`

- **Path**: `app/(main)/admin/features/components/global-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/features/components/global-tab.tsx` (Module).

### `app/(main)/admin/features/components/role-tab.tsx`

- **Path**: `app/(main)/admin/features/components/role-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/features/components/role-tab.tsx` (Module).

### `app/(main)/admin/features/components/school-role-tab.tsx`

- **Path**: `app/(main)/admin/features/components/school-role-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/features/components/school-role-tab.tsx` (Module).

### `app/(main)/admin/features/components/school-tab.tsx`

- **Path**: `app/(main)/admin/features/components/school-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/features/components/school-tab.tsx` (Module). Code comment: Sentinel value for the "Global (School-wide)" option in the role filter

### `app/(main)/admin/features/components/user-tab.tsx`

- **Path**: `app/(main)/admin/features/components/user-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/features/components/user-tab.tsx` (Module).

### `app/(main)/admin/features/layout.tsx`

- **Path**: `app/(main)/admin/features/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `admin/features`.

### `app/(main)/admin/features/page.tsx`

- **Path**: `app/(main)/admin/features/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/features`).

### `app/(main)/admin/features/permission-templates/[id]/page.tsx`

- **Path**: `app/(main)/admin/features/permission-templates/[id]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`permission-templates/[id]`).

### `app/(main)/admin/features/permission-templates/page.tsx`

- **Path**: `app/(main)/admin/features/permission-templates/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`features/permission-templates`).

### `app/(main)/admin/layout.tsx`

- **Path**: `app/(main)/admin/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `(main)/admin`.

### `app/(main)/admin/lessons/page.tsx`

- **Path**: `app/(main)/admin/lessons/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/lessons`).

### `app/(main)/admin/migrations/page.tsx`

- **Path**: `app/(main)/admin/migrations/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/migrations`).

### `app/(main)/admin/page.tsx`

- **Path**: `app/(main)/admin/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/admin`).

### `app/(main)/admin/ratings/[stage]/page.tsx`

- **Path**: `app/(main)/admin/ratings/[stage]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`ratings/[stage]`).

### `app/(main)/admin/ratings/page.tsx`

- **Path**: `app/(main)/admin/ratings/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/ratings`).

### `app/(main)/admin/reports/certification/page.tsx`

- **Path**: `app/(main)/admin/reports/certification/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`reports/certification`).

### `app/(main)/admin/reports/layout.tsx`

- **Path**: `app/(main)/admin/reports/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `admin/reports`.

### `app/(main)/admin/reports/lessons/page.tsx`

- **Path**: `app/(main)/admin/reports/lessons/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`reports/lessons`).

### `app/(main)/admin/reports/onboarding/page.tsx`

- **Path**: `app/(main)/admin/reports/onboarding/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`reports/onboarding`).

### `app/(main)/admin/reports/page.tsx`

- **Path**: `app/(main)/admin/reports/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/reports`).

### `app/(main)/admin/resources/[...folder]/page.tsx`

- **Path**: `app/(main)/admin/resources/[...folder]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`resources/[...folder]`).

### `app/(main)/admin/resources/admin-resources-client.tsx`

- **Path**: `app/(main)/admin/resources/admin-resources-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/resources/admin-resources-client.tsx` (Module).

### `app/(main)/admin/resources/page.tsx`

- **Path**: `app/(main)/admin/resources/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/resources`).

### `app/(main)/admin/schools/page.tsx`

- **Path**: `app/(main)/admin/schools/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/schools`).

### `app/(main)/admin/support-tools/page.tsx`

- **Path**: `app/(main)/admin/support-tools/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/support-tools`).

### `app/(main)/admin/tickets/components/ticket-detail-dialog.tsx`

- **Path**: `app/(main)/admin/tickets/components/ticket-detail-dialog.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/tickets/components/ticket-detail-dialog.tsx` (Module).

### `app/(main)/admin/tickets/components/tickets-table.tsx`

- **Path**: `app/(main)/admin/tickets/components/tickets-table.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/tickets/components/tickets-table.tsx` (Module).

### `app/(main)/admin/tickets/page.tsx`

- **Path**: `app/(main)/admin/tickets/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/tickets`).

### `app/(main)/admin/users/components/add-user-sheet.tsx`

- **Path**: `app/(main)/admin/users/components/add-user-sheet.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/add-user-sheet.tsx` (Module).

### `app/(main)/admin/users/components/user-detail-drawer.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer.tsx` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/index.ts`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/index.ts`
- **Kind**: Barrel
- **Summary**: Re-exports symbols from sibling modules under `components/user-detail-drawer`.

### `app/(main)/admin/users/components/user-detail-drawer/role-badge.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/role-badge.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/role-badge.tsx` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/school-role-assignment-dialog.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/school-role-assignment-dialog.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/school-role-assignment-dialog.tsx` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/types.ts`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/types.ts`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/types.ts` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/use-role-management.ts`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/use-role-management.ts`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/use-role-management.ts` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/user-classes-tab.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/user-classes-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/user-classes-tab.tsx` (Module). Code comment: When set, only show classes for this school

### `app/(main)/admin/users/components/user-detail-drawer/user-detail-drawer.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/user-detail-drawer.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/user-detail-drawer.tsx` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/user-detail-header.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/user-detail-header.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/user-detail-header.tsx` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/user-detail-sidebar.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/user-detail-sidebar.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/user-detail-sidebar.tsx` (Module). Code comment: When provided, only show these tabs. Omits History, Features, and Delete.

### `app/(main)/admin/users/components/user-detail-drawer/user-details-card.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/user-details-card.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/user-details-card.tsx` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/user-features-tab.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/user-features-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/user-features-tab.tsx` (Module). Code comment: When false, switches are disabled (e.g. non–INTRADARK_DEV admin viewing a dev account).

### `app/(main)/admin/users/components/user-detail-drawer/user-history-tab.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/user-history-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/user-history-tab.tsx` (Module).

### `app/(main)/admin/users/components/user-detail-drawer/user-positions-tab.tsx`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/user-positions-tab.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/user-positions-tab.tsx` (Module). Code comment: When set, only show positions for this school

### `app/(main)/admin/users/components/user-detail-drawer/utils.ts`

- **Path**: `app/(main)/admin/users/components/user-detail-drawer/utils.ts`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/user-detail-drawer/utils.ts` (Module).

### `app/(main)/admin/users/components/users-data-table.tsx`

- **Path**: `app/(main)/admin/users/components/users-data-table.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/users-data-table.tsx` (Module).

### `app/(main)/admin/users/components/users-table-columns.tsx`

- **Path**: `app/(main)/admin/users/components/users-table-columns.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/admin/users/components/users-table-columns.tsx` (Module). Code comment: Get badge styling based on days since last activity @param lastLoginAt ISO timestamp string or null (from last_seen_at / activity tracking) @returns className string for badge styling

### `app/(main)/admin/users/page.tsx`

- **Path**: `app/(main)/admin/users/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`admin/users`).

### `app/(main)/courses/[course_name]/[topic]/page.tsx`

- **Path**: `app/(main)/courses/[course_name]/[topic]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[course_name]/[topic]`).

### `app/(main)/courses/[course_name]/[topic]/quiz/[quizSlug]/page.tsx`

- **Path**: `app/(main)/courses/[course_name]/[topic]/quiz/[quizSlug]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`quiz/[quizSlug]`).

### `app/(main)/courses/[course_name]/[topic]/quiz/page.tsx`

- **Path**: `app/(main)/courses/[course_name]/[topic]/quiz/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[topic]/quiz`).

### `app/(main)/courses/[course_name]/[topic]/slides/page.tsx`

- **Path**: `app/(main)/courses/[course_name]/[topic]/slides/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[topic]/slides`).

### `app/(main)/courses/[course_name]/page.tsx`

- **Path**: `app/(main)/courses/[course_name]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`courses/[course_name]`).

### `app/(main)/courses/page.tsx`

- **Path**: `app/(main)/courses/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/courses`).

### `app/(main)/dashboard/page.tsx`

- **Path**: `app/(main)/dashboard/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/dashboard`).

### `app/(main)/layout.tsx`

- **Path**: `app/(main)/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `app/(main)`.

### `app/(main)/maintenance/page.tsx`

- **Path**: `app/(main)/maintenance/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/maintenance`).

### `app/(main)/profile/page.tsx`

- **Path**: `app/(main)/profile/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/profile`).

### `app/(main)/schools/[school_id]/classes/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/classes/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/classes`).

### `app/(main)/schools/[school_id]/content/[stage]/[slug]/layout.tsx`

- **Path**: `app/(main)/schools/[school_id]/content/[stage]/[slug]/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `[stage]/[slug]`.

### `app/(main)/schools/[school_id]/content/[stage]/[slug]/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/content/[stage]/[slug]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[stage]/[slug]`).

### `app/(main)/schools/[school_id]/content/[stage]/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/content/[stage]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`content/[stage]`).

### `app/(main)/schools/[school_id]/content/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/content/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/content`).

### `app/(main)/schools/[school_id]/culture-rating/culture-rating-school-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/culture-rating/culture-rating-school-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/culture-rating/culture-rating-school-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/culture-rating/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/culture-rating/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/culture-rating`).

### `app/(main)/schools/[school_id]/faq/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/faq/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/faq`).

### `app/(main)/schools/[school_id]/help/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/help/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/help`).

### `app/(main)/schools/[school_id]/home/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/home/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/home`). Code comment: Group order: Teachers+Classes | Lessons+Content+Resources | Performance+Reports+Settings

### `app/(main)/schools/[school_id]/layout.tsx`

- **Path**: `app/(main)/schools/[school_id]/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `schools/[school_id]`.

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/classes/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/classes/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[lesson_id]/classes`).

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/deliver/controls/layout.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/deliver/controls/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `deliver/controls`.

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/deliver/controls/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/deliver/controls/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`deliver/controls`).

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/deliver/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/deliver/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[lesson_id]/deliver`).

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/deliver/present/layout.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/deliver/present/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `deliver/present`.

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/feedback/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/feedback/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[lesson_id]/feedback`).

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/history/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/history/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[lesson_id]/history`).

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/layout.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `lessons/[lesson_id]`.

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`lessons/[lesson_id]`).

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/prepare/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/prepare/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[lesson_id]/prepare`).

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/run-lesson/controls/layout.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/run-lesson/controls/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `run-lesson/controls`.

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/run-lesson/controls/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/run-lesson/controls/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`run-lesson/controls`).

### `app/(main)/schools/[school_id]/lessons/[lesson_id]/run-lesson/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/[lesson_id]/run-lesson/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[lesson_id]/run-lesson`).

### `app/(main)/schools/[school_id]/lessons/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/lessons/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/lessons`). Code comment: Merges list row + detail query per card so sibling rows do not rerender when another lesson's detail loads.

### `app/(main)/schools/[school_id]/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`schools/[school_id]`).

### `app/(main)/schools/[school_id]/performance/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/performance/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/performance`).

### `app/(main)/schools/[school_id]/performance/performance-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/performance/performance-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/performance/performance-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/reports/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/reports/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/reports`).

### `app/(main)/schools/[school_id]/reports/reports-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/reports/reports-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/reports/reports-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/resources/[...folder]/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/resources/[...folder]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`resources/[...folder]`).

### `app/(main)/schools/[school_id]/resources/info-packs/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/resources/info-packs/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`resources/info-packs`).

### `app/(main)/schools/[school_id]/resources/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/resources/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/resources`).

### `app/(main)/schools/[school_id]/resources/resource-browser-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/resources/resource-browser-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/resources/resource-browser-client.tsx` (Module). Code comment: Subsequence fuzzy match (query chars appear in order within haystack).

### `app/(main)/schools/[school_id]/resources/videos/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/resources/videos/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`resources/videos`).

### `app/(main)/schools/[school_id]/settings/certification/certification-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/certification/certification-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/settings/certification/certification-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/settings/certification/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/certification/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`settings/certification`).

### `app/(main)/schools/[school_id]/settings/classes/classes-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/classes/classes-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/settings/classes/classes-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/settings/classes/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/classes/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`settings/classes`).

### `app/(main)/schools/[school_id]/settings/components/school-settings-user-detail-drawer.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/components/school-settings-user-detail-drawer.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/settings/components/school-settings-user-detail-drawer.tsx` (Module).

### `app/(main)/schools/[school_id]/settings/components/settings-classes-card.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/components/settings-classes-card.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/settings/components/settings-classes-card.tsx` (Module). Code comment: School logo; storage path or URL. Optional — falls back to icon badge.

### `app/(main)/schools/[school_id]/settings/components/settings-users-card.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/components/settings-users-card.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/settings/components/settings-users-card.tsx` (Module).

### `app/(main)/schools/[school_id]/settings/details/details-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/details/details-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/settings/details/details-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/settings/details/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/details/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`settings/details`).

### `app/(main)/schools/[school_id]/settings/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/settings`).

### `app/(main)/schools/[school_id]/settings/settings-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/settings-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/settings/settings-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/settings/users/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/users/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`settings/users`).

### `app/(main)/schools/[school_id]/settings/users/users-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/settings/users/users-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/settings/users/users-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/setup/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/setup/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/setup`).

### `app/(main)/schools/[school_id]/teachers/[teacher-name]/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/teachers/[teacher-name]/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`teachers/[teacher-name]`).

### `app/(main)/schools/[school_id]/teachers/[teacher-name]/teacher-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/teachers/[teacher-name]/teacher-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/teachers/[teacher-name]/teacher-page-client.tsx` (Module).

### `app/(main)/schools/[school_id]/teachers/[teacher-name]/teacher-page-wrapper.tsx`

- **Path**: `app/(main)/schools/[school_id]/teachers/[teacher-name]/teacher-page-wrapper.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/teachers/[teacher-name]/teacher-page-wrapper.tsx` (Module).

### `app/(main)/schools/[school_id]/teachers/page.tsx`

- **Path**: `app/(main)/schools/[school_id]/teachers/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`[school_id]/teachers`).

### `app/(main)/schools/[school_id]/teachers/teachers-page-client.tsx`

- **Path**: `app/(main)/schools/[school_id]/teachers/teachers-page-client.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/teachers/teachers-page-client.tsx` (Module). Code comment: Single display bucket per person: admins, then teachers/AP, then staff, then other school roles.

### `app/(main)/schools/[school_id]/teachers/teachers-page-wrapper.tsx`

- **Path**: `app/(main)/schools/[school_id]/teachers/teachers-page-wrapper.tsx`
- **Kind**: Module
- **Summary**: Source module `app/(main)/schools/[school_id]/teachers/teachers-page-wrapper.tsx` (Module).

### `app/(main)/schools/page.tsx`

- **Path**: `app/(main)/schools/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/schools`).

### `app/(main)/settings/page.tsx`

- **Path**: `app/(main)/settings/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/settings`).

### `app/(main)/support/changelog/page.tsx`

- **Path**: `app/(main)/support/changelog/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`support/changelog`).

### `app/(main)/support/contact/page.tsx`

- **Path**: `app/(main)/support/contact/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`support/contact`).

### `app/(main)/support/faq/page.tsx`

- **Path**: `app/(main)/support/faq/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`support/faq`).

### `app/(main)/support/glossary/page.tsx`

- **Path**: `app/(main)/support/glossary/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`support/glossary`).

### `app/(main)/support/layout.tsx`

- **Path**: `app/(main)/support/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `(main)/support`.

### `app/(main)/support/page.tsx`

- **Path**: `app/(main)/support/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/support`).

### `app/(main)/support/resources/page.tsx`

- **Path**: `app/(main)/support/resources/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`support/resources`).

### `app/(main)/support/roles/bullyproof-staff/page.tsx`

- **Path**: `app/(main)/support/roles/bullyproof-staff/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`roles/bullyproof-staff`).

### `app/(main)/support/roles/government/page.tsx`

- **Path**: `app/(main)/support/roles/government/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`roles/government`).

### `app/(main)/support/roles/page.tsx`

- **Path**: `app/(main)/support/roles/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`support/roles`).

### `app/(main)/support/roles/school-admins/page.tsx`

- **Path**: `app/(main)/support/roles/school-admins/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`roles/school-admins`).

### `app/(main)/support/roles/teachers/page.tsx`

- **Path**: `app/(main)/support/roles/teachers/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`roles/teachers`).

### `app/(main)/support/status/page.tsx`

- **Path**: `app/(main)/support/status/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`support/status`).

### `app/(main)/support/tutorials/page.tsx`

- **Path**: `app/(main)/support/tutorials/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`support/tutorials`).

### `app/(main)/test/page.tsx`

- **Path**: `app/(main)/test/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/test`).

### `app/(main)/welcome/page.tsx`

- **Path**: `app/(main)/welcome/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`(main)/welcome`).

### `app/(present)/schools/[school_id]/lessons/[lesson_id]/deliver/present/page.tsx`

- **Path**: `app/(present)/schools/[school_id]/lessons/[lesson_id]/deliver/present/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`deliver/present`).

### `app/(present)/schools/[school_id]/lessons/[lesson_id]/run-lesson/present/page.tsx`

- **Path**: `app/(present)/schools/[school_id]/lessons/[lesson_id]/run-lesson/present/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`run-lesson/present`).

### `app/layout.tsx`

- **Path**: `app/layout.tsx`
- **Kind**: Layout
- **Summary**: Shared layout shell for nested routes under `app`.

### `app/page.tsx`

- **Path**: `app/page.tsx`
- **Kind**: Page
- **Summary**: Renders the UI for the route matching this `page` segment under the App Router (`app`).
