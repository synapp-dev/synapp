# Hooks, stores, providers

This file is generated from `_inventory.json` by `pnpm docs:code-reference:generate`. Edit `scripts/generate-code-reference-inventory.ts` heuristics or add code comments to improve summaries, then regenerate.

## Entries (22)

### `hooks/use-can-edit-school-roles.ts`

- **Path**: `hooks/use-can-edit-school-roles.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-can-edit-school-roles.ts`. Code comment: Returns true when the user can edit school roles at the given school. True if user has any of: - school:manage-school-user-roles (SCHOOL_ADMIN at their school) - system:manage-user-roles (PLATFORM_ADM…

### `hooks/use-debounced-value.ts`

- **Path**: `hooks/use-debounced-value.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-debounced-value.ts`. Code comment: Returns a debounced version of the given value. The debounced value updates only after the input value has been stable for `delayMs` ms.

### `hooks/use-effective-user.ts`

- **Path**: `hooks/use-effective-user.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-effective-user.ts`.

### `hooks/use-feature-access.ts`

- **Path**: `hooks/use-feature-access.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-feature-access.ts`. Code comment: Hook to check if the current user has access to a feature and whether it is visible in nav. @param featureKey - The feature key to check (e.g., "/school/lessons", "/admin/content", "/admin") @param sc…

### `hooks/use-features-access.ts`

- **Path**: `hooks/use-features-access.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-features-access.ts`. Code comment: Hook to check access and visibility for multiple features at once. Uses cached feature permissions from the me store (fetched once on load). @param featureKeys - Array of feature keys to check @param …

### `hooks/use-is-admin-restricted-for-lessons.ts`

- **Path**: `hooks/use-is-admin-restricted-for-lessons.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-is-admin-restricted-for-lessons.ts`. Code comment: Normalize platformRoles to string[] (handles PostgreSQL array string or array)

### `hooks/use-lesson-live-state.ts`

- **Path**: `hooks/use-lesson-live-state.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-lesson-live-state.ts`.

### `hooks/use-lesson-status-realtime.ts`

- **Path**: `hooks/use-lesson-status-realtime.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-lesson-status-realtime.ts`. Code comment: Hook to listen for real-time changes to lesson status This will invalidate relevant queries and update the live lesson store when a lesson's status changes (e.g., from 'in_progress' to 'pending_review…

### `hooks/use-mobile.ts`

- **Path**: `hooks/use-mobile.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-mobile.ts`.

### `hooks/use-mutation-invalidation.ts`

- **Path**: `hooks/use-mutation-invalidation.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-mutation-invalidation.ts`. Code comment: Hook that provides automatic mutation invalidation helpers. @example ```typescript const { invalidateAfterMutation } = useMutationInvalidation(); const result = await topicsApi.put.update(topicId, pay…

### `hooks/use-page-title.ts`

- **Path**: `hooks/use-page-title.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-page-title.ts`. Code comment: Hook to set page title for client components Usage: usePageTitle(["dashboard"]) or usePageTitle(["schools", "lessons"])

### `hooks/use-prefetch-certification-images.ts`

- **Path**: `hooks/use-prefetch-certification-images.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-prefetch-certification-images.ts`. Code comment: Pre-fetches all image URLs for certification slides in the background. Since slides now come with signedUrl from the API (DB-cached), this simply preloads the images into the browser cache. @param sli…

### `hooks/use-prefetch-topic-images.ts`

- **Path**: `hooks/use-prefetch-topic-images.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-prefetch-topic-images.ts`. Code comment: Pre-fetches all image URLs for topic slides in the background. Since slides now come with signedUrl from the API (DB-cached), this simply preloads the images into the browser cache. @param slides - Ar…

### `hooks/use-preload-all-slide-images.ts`

- **Path**: `hooks/use-preload-all-slide-images.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-preload-all-slide-images.ts`. Code comment: Preloads ALL slide images into browser cache. This ensures images are ready instantly when navigating between slides. Uses the signedUrl from the API response (DB-cached) directly. @param slides - Arr…

### `hooks/use-preload-slide-images.ts`

- **Path**: `hooks/use-preload-slide-images.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-preload-slide-images.ts`. Code comment: Preloads images for upcoming slides into browser cache. This ensures images are ready when the user navigates to the next slide. Uses the signedUrl from the API response (DB-cached) directly. @param s…

### `hooks/use-school-navigation-permissions.ts`

- **Path**: `hooks/use-school-navigation-permissions.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-school-navigation-permissions.ts`. Code comment: Hook to check if the current user is a teacher for the active school and provides filtering logic for navigation items

### `hooks/use-scroll-position.ts`

- **Path**: `hooks/use-scroll-position.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-scroll-position.ts`.

### `hooks/use-storage-image-url.ts`

- **Path**: `hooks/use-storage-image-url.ts`
- **Kind**: Hook
- **Summary**: React hook: `use-storage-image-url.ts`. Code comment: Matches both path formats: - Old: schools/images/avatar/{schoolId}.{ext}, schools/images/banner/{schoolId}.{ext} - New: schools/{schoolId}/images/avatar.{ext}, schools/{schoolId}/images/banner.{ext}

### `providers/providers.tsx`

- **Path**: `providers/providers.tsx`
- **Kind**: Provider
- **Summary**: React context/provider wiring: `providers.tsx`.

### `stores/live-lesson-store.ts`

- **Path**: `stores/live-lesson-store.ts`
- **Kind**: Store
- **Summary**: Zustand (or similar) client store: `live-lesson-store.ts`.

### `stores/school-store.ts`

- **Path**: `stores/school-store.ts`
- **Kind**: Store
- **Summary**: Zustand (or similar) client store: `school-store.ts`.

### `stores/session-library-store.ts`

- **Path**: `stores/session-library-store.ts`
- **Kind**: Store
- **Summary**: Zustand (or similar) client store: `session-library-store.ts`.
