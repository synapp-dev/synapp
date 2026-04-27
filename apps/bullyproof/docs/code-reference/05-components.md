# Shared components (atomic design)

This file is generated from `_inventory.json` by `pnpm docs:code-reference:generate`. Edit `scripts/generate-code-reference-inventory.ts` heuristics or add code comments to improve summaries, then regenerate.

## Entries (89)

### `components/atoms/auth-divider.tsx`

- **Path**: `components/atoms/auth-divider.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `auth-divider.tsx`.

### `components/atoms/overall-rating-stars.tsx`

- **Path**: `components/atoms/overall-rating-stars.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `overall-rating-stars.tsx`. Code comment: Five-star display for admin “Overall” rating; fills use Bullyproof brand primary from globals.

### `components/atoms/role-badges.tsx`

- **Path**: `components/atoms/role-badges.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `role-badges.tsx`. Code comment: Display order: school admin, then teacher/AP, then staff, then licence, then platform/other.

### `components/atoms/school-avatar-or-badge.tsx`

- **Path**: `components/atoms/school-avatar-or-badge.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `school-avatar-or-badge.tsx`. Code comment: Teal school glyph when there is no uploaded logo (matches sidebar school switcher).

### `components/atoms/school-store-provider-wrapper.tsx`

- **Path**: `components/atoms/school-store-provider-wrapper.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `school-store-provider-wrapper.tsx`. Code comment: Wrapper component that ensures SchoolStoreProvider only renders on the client side. This prevents Zustand hook errors during SSR.

### `components/atoms/school-store-provider.tsx`

- **Path**: `components/atoms/school-store-provider.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `school-store-provider.tsx`.

### `components/atoms/social-login-button.tsx`

- **Path**: `components/atoms/social-login-button.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `social-login-button.tsx`.

### `components/atoms/staggered-animation.tsx`

- **Path**: `components/atoms/staggered-animation.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `staggered-animation.tsx`.

### `components/atoms/star-rating.tsx`

- **Path**: `components/atoms/star-rating.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `star-rating.tsx`.

### `components/atoms/storage-image.tsx`

- **Path**: `components/atoms/storage-image.tsx`
- **Kind**: Atom
- **Summary**: Shared atom UI: `storage-image.tsx`. Code comment: URL (external) or storage path (schools/images/...)

### `components/molecules/activity-heartbeat.tsx`

- **Path**: `components/molecules/activity-heartbeat.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `activity-heartbeat.tsx`. Code comment: Client-side heartbeat that updates last_seen_at for the current user. Runs only when authenticated. Fires on sign-in, then every minute. RPC throttles writes to 5 min. Renders nothing.

### `components/molecules/add-classes-dialog.tsx`

- **Path**: `components/molecules/add-classes-dialog.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `add-classes-dialog.tsx`.

### `components/molecules/admin-tab-switcher-client.tsx`

- **Path**: `components/molecules/admin-tab-switcher-client.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `admin-tab-switcher-client.tsx`.

### `components/molecules/admin-tab-switcher.tsx`

- **Path**: `components/molecules/admin-tab-switcher.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `admin-tab-switcher.tsx`.

### `components/molecules/animated-background.tsx`

- **Path**: `components/molecules/animated-background.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `animated-background.tsx`.

### `components/molecules/auth-footer.tsx`

- **Path**: `components/molecules/auth-footer.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `auth-footer.tsx`.

### `components/molecules/breadcrumb.tsx`

- **Path**: `components/molecules/breadcrumb.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `breadcrumb.tsx`.

### `components/molecules/combobox.tsx`

- **Path**: `components/molecules/combobox.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `combobox.tsx`. Code comment: Optional logo shown in trigger and list (e.g. school avatar).

### `components/molecules/command-menu.tsx`

- **Path**: `components/molecules/command-menu.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `command-menu.tsx`.

### `components/molecules/course-rating-input.tsx`

- **Path**: `components/molecules/course-rating-input.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `course-rating-input.tsx`.

### `components/molecules/dashboard-tutorial-dialog.tsx`

- **Path**: `components/molecules/dashboard-tutorial-dialog.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `dashboard-tutorial-dialog.tsx`.

### `components/molecules/dashboard-tutorial-guard.tsx`

- **Path**: `components/molecules/dashboard-tutorial-guard.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `dashboard-tutorial-guard.tsx`. Code comment: DashboardTutorialGuard component Client-side guard that checks if the dashboard tutorial dialog should be shown. Shows the dialog if: - User is on /dashboard path - Welcome tutorial is completed - Das…

### `components/molecules/email-input.tsx`

- **Path**: `components/molecules/email-input.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `email-input.tsx`.

### `components/molecules/feature-guard.tsx`

- **Path**: `components/molecules/feature-guard.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `feature-guard.tsx`. Code comment: FeatureGuard component Client-side guard that checks if the user has access to a feature. When used **without children** (legacy mode), it simply performs the access check and returns null. Existing c…

### `components/molecules/header-tab-switcher-client.tsx`

- **Path**: `components/molecules/header-tab-switcher-client.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `header-tab-switcher-client.tsx`.

### `components/molecules/header-tab-switcher.tsx`

- **Path**: `components/molecules/header-tab-switcher.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `header-tab-switcher.tsx`.

### `components/molecules/impersonate-menu.tsx`

- **Path**: `components/molecules/impersonate-menu.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `impersonate-menu.tsx`.

### `components/molecules/invite-new-school-dialog.tsx`

- **Path**: `components/molecules/invite-new-school-dialog.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `invite-new-school-dialog.tsx`.

### `components/molecules/maintenance-redirect-guard.tsx`

- **Path**: `components/molecules/maintenance-redirect-guard.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `maintenance-redirect-guard.tsx`. Code comment: Redirects users based on maintenance feature: - If maintenance is enabled for the user (and they are not a bypass dev), redirect to /maintenance when not already there. - If maintenance is not in effe…

### `components/molecules/me-loader.tsx`

- **Path**: `components/molecules/me-loader.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `me-loader.tsx`.

### `components/molecules/mobile-input.tsx`

- **Path**: `components/molecules/mobile-input.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `mobile-input.tsx`.

### `components/molecules/name-input.tsx`

- **Path**: `components/molecules/name-input.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `name-input.tsx`.

### `components/molecules/nav-user.tsx`

- **Path**: `components/molecules/nav-user.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `nav-user.tsx`.

### `components/molecules/password-input.tsx`

- **Path**: `components/molecules/password-input.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `password-input.tsx`.

### `components/molecules/permissions-ready-gate.tsx`

- **Path**: `components/molecules/permissions-ready-gate.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `permissions-ready-gate.tsx`. Code comment: Waits for the current user and feature permissions to be loaded before rendering children. This prevents flashing wrong content or redirects before permissions are available (e.g. admin UI before Feat…

### `components/molecules/question-multiple-choice.tsx`

- **Path**: `components/molecules/question-multiple-choice.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `question-multiple-choice.tsx`.

### `components/molecules/question-rating-input.tsx`

- **Path**: `components/molecules/question-rating-input.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `question-rating-input.tsx`.

### `components/molecules/question-renderer.tsx`

- **Path**: `components/molecules/question-renderer.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `question-renderer.tsx`.

### `components/molecules/question-text-input.tsx`

- **Path**: `components/molecules/question-text-input.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `question-text-input.tsx`.

### `components/molecules/school-card.tsx`

- **Path**: `components/molecules/school-card.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `school-card.tsx`.

### `components/molecules/school-info-card.tsx`

- **Path**: `components/molecules/school-info-card.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `school-info-card.tsx`. Code comment: Delay in ms for staggered slide-in from top (left to right)

### `components/molecules/school-page-compact-header.tsx`

- **Path**: `components/molecules/school-page-compact-header.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `school-page-compact-header.tsx`.

### `components/molecules/school-page-tutorial-dialog.tsx`

- **Path**: `components/molecules/school-page-tutorial-dialog.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `school-page-tutorial-dialog.tsx`.

### `components/molecules/school-page-tutorial-guard.tsx`

- **Path**: `components/molecules/school-page-tutorial-guard.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `school-page-tutorial-guard.tsx`. Code comment: SchoolPageTutorialGuard component Client-side guard that checks if a tutorial should be shown for the current school page. Shows the tutorial dialog on first visit to tutorial-enabled routes.

### `components/molecules/select-school-for-live-lessons-dialog.tsx`

- **Path**: `components/molecules/select-school-for-live-lessons-dialog.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `select-school-for-live-lessons-dialog.tsx`.

### `components/molecules/social-login-group.tsx`

- **Path**: `components/molecules/social-login-group.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `social-login-group.tsx`.

### `components/molecules/support-tab-switcher-client.tsx`

- **Path**: `components/molecules/support-tab-switcher-client.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `support-tab-switcher-client.tsx`.

### `components/molecules/support-tab-switcher.tsx`

- **Path**: `components/molecules/support-tab-switcher.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `support-tab-switcher.tsx`.

### `components/molecules/take-over-lesson-dialog.tsx`

- **Path**: `components/molecules/take-over-lesson-dialog.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `take-over-lesson-dialog.tsx`.

### `components/molecules/teacher-classes-guard.tsx`

- **Path**: `components/molecules/teacher-classes-guard.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `teacher-classes-guard.tsx`. Code comment: TeacherClassesGuard component Client-side guard that checks if a teacher user should see the "Add Your Classes" dialog. Shows the dialog if: - User has teacher access (system:teacher-access) - Classes…

### `components/molecules/topic-certificate.tsx`

- **Path**: `components/molecules/topic-certificate.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `topic-certificate.tsx`.

### `components/molecules/tutorial-guard.tsx`

- **Path**: `components/molecules/tutorial-guard.tsx`
- **Kind**: Molecule
- **Summary**: Shared molecule UI: `tutorial-guard.tsx`. Code comment: TutorialGuard component Client-side guard that checks tutorial completion status from the Zustand store and redirects to /welcome if the welcome tutorial is not completed. This replaces the server-sid…

### `components/organisms/animated-thumbnail.tsx`

- **Path**: `components/organisms/animated-thumbnail.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `animated-thumbnail.tsx`.

### `components/organisms/app-header.tsx`

- **Path**: `components/organisms/app-header.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `app-header.tsx`.

### `components/organisms/app-sidebar.tsx`

- **Path**: `components/organisms/app-sidebar.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `app-sidebar.tsx`.

### `components/organisms/auth-form.tsx`

- **Path**: `components/organisms/auth-form.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `auth-form.tsx`.

### `components/organisms/confirm-changes-dialog.tsx`

- **Path**: `components/organisms/confirm-changes-dialog.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `confirm-changes-dialog.tsx`.

### `components/organisms/control-mode.tsx`

- **Path**: `components/organisms/control-mode.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `control-mode.tsx`.

### `components/organisms/course-rating-dashboard-guard.tsx`

- **Path**: `components/organisms/course-rating-dashboard-guard.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `course-rating-dashboard-guard.tsx`.

### `components/organisms/course-rating-modal.tsx`

- **Path**: `components/organisms/course-rating-modal.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `course-rating-modal.tsx`.

### `components/organisms/course-rating-questions-editor.tsx`

- **Path**: `components/organisms/course-rating-questions-editor.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `course-rating-questions-editor.tsx`.

### `components/organisms/feedback-dialog.tsx`

- **Path**: `components/organisms/feedback-dialog.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `feedback-dialog.tsx`. Code comment: Called when unread count may have changed (e.g. notes marked as read).

### `components/organisms/image-selector-dialog.tsx`

- **Path**: `components/organisms/image-selector-dialog.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `image-selector-dialog.tsx`.

### `components/organisms/lesson-feedback-form.tsx`

- **Path**: `components/organisms/lesson-feedback-form.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-feedback-form.tsx`.

### `components/organisms/lesson-header.tsx`

- **Path**: `components/organisms/lesson-header.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-header.tsx`.

### `components/organisms/lesson-sidebar-nav.tsx`

- **Path**: `components/organisms/lesson-sidebar-nav.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-sidebar-nav.tsx`.

### `components/organisms/lesson-status-redirect.tsx`

- **Path**: `components/organisms/lesson-status-redirect.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-status-redirect.tsx`. Code comment: Client component that listens for lesson status changes and redirects to the feedback page when the lesson becomes completed or enters feedback stage

### `components/organisms/lesson-wizard-classes.tsx`

- **Path**: `components/organisms/lesson-wizard-classes.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-wizard-classes.tsx`.

### `components/organisms/lesson-wizard-confirm.tsx`

- **Path**: `components/organisms/lesson-wizard-confirm.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-wizard-confirm.tsx`.

### `components/organisms/lesson-wizard-recommendation.tsx`

- **Path**: `components/organisms/lesson-wizard-recommendation.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-wizard-recommendation.tsx`.

### `components/organisms/lesson-wizard-schedule.tsx`

- **Path**: `components/organisms/lesson-wizard-schedule.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-wizard-schedule.tsx`.

### `components/organisms/lesson-wizard-topic.tsx`

- **Path**: `components/organisms/lesson-wizard-topic.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-wizard-topic.tsx`.

### `components/organisms/lesson-wizard.tsx`

- **Path**: `components/organisms/lesson-wizard.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `lesson-wizard.tsx`.

### `components/organisms/live-lesson-prompt.tsx`

- **Path**: `components/organisms/live-lesson-prompt.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `live-lesson-prompt.tsx`.

### `components/organisms/nav-main.tsx`

- **Path**: `components/organisms/nav-main.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `nav-main.tsx`.

### `components/organisms/nav-projects.tsx`

- **Path**: `components/organisms/nav-projects.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `nav-projects.tsx`.

### `components/organisms/notifications-sidebar.tsx`

- **Path**: `components/organisms/notifications-sidebar.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `notifications-sidebar.tsx`.

### `components/organisms/overdue-lesson-alert.tsx`

- **Path**: `components/organisms/overdue-lesson-alert.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `overdue-lesson-alert.tsx`.

### `components/organisms/pdf-page-gallery-dialog.tsx`

- **Path**: `components/organisms/pdf-page-gallery-dialog.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `pdf-page-gallery-dialog.tsx`.

### `components/organisms/presentation-mode.tsx`

- **Path**: `components/organisms/presentation-mode.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `presentation-mode.tsx`.

### `components/organisms/quiz-slide-editor.tsx`

- **Path**: `components/organisms/quiz-slide-editor.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `quiz-slide-editor.tsx`.

### `components/organisms/responsive-sidebar-provider.tsx`

- **Path**: `components/organisms/responsive-sidebar-provider.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `responsive-sidebar-provider.tsx`. Code comment: Wrapper around SidebarProvider that adds auto-collapse behavior when window width is less than 2xl (1536px). Users can still manually open the sidebar even when below 2xl.

### `components/organisms/school-switcher.tsx`

- **Path**: `components/organisms/school-switcher.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `school-switcher.tsx`.

### `components/organisms/slide-renderer.tsx`

- **Path**: `components/organisms/slide-renderer.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `slide-renderer.tsx`. Code comment: Fractional position for ordering

### `components/organisms/slide-view-tracker.tsx`

- **Path**: `components/organisms/slide-view-tracker.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `slide-view-tracker.tsx`. Code comment: SlideViewTracker component for tracking active viewing time on slides. Features: - Starts a viewing session when slide is viewed - Sends heartbeat every 30 seconds to track activity - Pauses on visibi…

### `components/organisms/video-dialog.tsx`

- **Path**: `components/organisms/video-dialog.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `video-dialog.tsx`.

### `components/organisms/vimeo-player.tsx`

- **Path**: `components/organisms/vimeo-player.tsx`
- **Kind**: Organism
- **Summary**: Shared organism UI: `vimeo-player.tsx`.

### `components/templates/page-placeholder-template.tsx`

- **Path**: `components/templates/page-placeholder-template.tsx`
- **Kind**: Template UI
- **Summary**: Shared template ui UI: `page-placeholder-template.tsx`.

### `components/templates/presentation-template.tsx`

- **Path**: `components/templates/presentation-template.tsx`
- **Kind**: Template UI
- **Summary**: Shared template ui UI: `presentation-template.tsx`.
