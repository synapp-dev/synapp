# Lib, utils, types, config, app wiring

This file is generated from `_inventory.json` by `pnpm docs:code-reference:generate`. Edit `scripts/generate-code-reference-inventory.ts` heuristics or add code comments to improve summaries, then regenerate.

## Entries (38)

### `config/school-tutorials.ts`

- **Path**: `config/school-tutorials.ts`
- **Kind**: Config
- **Summary**: Source module `config/school-tutorials.ts` (Config). Code comment: Configuration for school page tutorials. Maps route patterns to tutorial keys and content.

### `drizzle.config.ts`

- **Path**: `drizzle.config.ts`
- **Kind**: Drizzle config
- **Summary**: Source module `drizzle.config.ts` (Drizzle config).

### `lib/admin-items.ts`

- **Path**: `lib/admin-items.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/admin-items.ts` (Lib). Code comment: Feature key for access control (e.g. admin_content). Used with useFeaturesAccess.

### `lib/api/client.ts`

- **Path**: `lib/api/client.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/api/client.ts` (Lib).

### `lib/api/fetcher.client.ts`

- **Path**: `lib/api/fetcher.client.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/api/fetcher.client.ts` (Lib).

### `lib/api/fetcher.ts`

- **Path**: `lib/api/fetcher.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/api/fetcher.ts` (Lib).

### `lib/feature-keys.ts`

- **Path**: `lib/feature-keys.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/feature-keys.ts` (Lib). Code comment: Feature key constants for access control. Organized by category to keep things discoverable and avoid typos. Key naming convention (delimiters encode the type): - Leading `/` = page/route e.g., `/dash…

### `lib/feature-sections.ts`

- **Path**: `lib/feature-sections.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/feature-sections.ts` (Lib). Code comment: URL-safe slug stored in the DB `section` column

### `lib/intradark-dev-protection.ts`

- **Path**: `lib/intradark-dev-protection.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/intradark-dev-protection.ts` (Lib). Code comment: Platform role key for Intradark developer accounts (matches `roles.key`).

### `lib/platform-role-order.ts`

- **Path**: `lib/platform-role-order.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/platform-role-order.ts` (Lib).

### `lib/role-keys.ts`

- **Path**: `lib/role-keys.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/role-keys.ts` (Lib). Code comment: Platform roles that cannot create lessons in their own name. Must select a school user to create on behalf of.

### `lib/slide-storage-path.ts`

- **Path**: `lib/slide-storage-path.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/slide-storage-path.ts` (Lib). Code comment: Central helper for topic slide storage paths. Uses stageId and topicId (UUIDs) for paths - stable and never changes when stages or topics are renamed. Old format s4/t4 used stage code and stage_order …

### `lib/view-as-http.ts`

- **Path**: `lib/view-as-http.ts`
- **Kind**: Lib
- **Summary**: Source module `lib/view-as-http.ts` (Lib). Code comment: Request header: when set, resources APIs evaluate permissions as this user (JWT user must have system:impersonate).

### `middleware.ts`

- **Path**: `middleware.ts`
- **Kind**: Middleware
- **Summary**: Source module `middleware.ts` (Middleware).

### `next.config.mjs`

- **Path**: `next.config.mjs`
- **Kind**: Next config
- **Summary**: Source module `next.config.mjs` (Next config). Code comment: @type {import('next').NextConfig}

### `types/course-ratings.ts`

- **Path**: `types/course-ratings.ts`
- **Kind**: Types
- **Summary**: Source module `types/course-ratings.ts` (Types). Code comment: Type definitions for course rating question metadata

### `types/lesson-wizard.ts`

- **Path**: `types/lesson-wizard.ts`
- **Kind**: Types
- **Summary**: Source module `types/lesson-wizard.ts` (Types).

### `types/supabase.ts`

- **Path**: `types/supabase.ts`
- **Kind**: Types
- **Summary**: Source module `types/supabase.ts` (Types).

### `utils/check-feature-access-cached.ts`

- **Path**: `utils/check-feature-access-cached.ts`
- **Kind**: Util
- **Summary**: Source module `utils/check-feature-access-cached.ts` (Util). Code comment: Resolved access and visibility for a feature. Hierarchical resolution: User > School Role > School > Platform Role > Global. visible: when DB visible is null, resolved visible = enabled (backward comp…

### `utils/clear-user-data.ts`

- **Path**: `utils/clear-user-data.ts`
- **Kind**: Util
- **Summary**: Source module `utils/clear-user-data.ts` (Util). Code comment: Utility function to clear all user data from stores and invalidate all queries This should be called when a user logs out to prevent data leakage

### `utils/db-error-handler.ts`

- **Path**: `utils/db-error-handler.ts`
- **Kind**: Util
- **Summary**: Source module `utils/db-error-handler.ts` (Util). Code comment: Database Error Handler Utility Centralizes PostgreSQL error code handling and maps them to appropriate HTTP status codes. Provides consistent error messages across API routes.

### `utils/getUserIdFromRequest.ts`

- **Path**: `utils/getUserIdFromRequest.ts`
- **Kind**: Util
- **Summary**: Source module `utils/getUserIdFromRequest.ts` (Util).

### `utils/lesson-status.ts`

- **Path**: `utils/lesson-status.ts`
- **Kind**: Util
- **Summary**: Source module `utils/lesson-status.ts` (Util). Code comment: Get the display status for a lesson. If the lesson status is 'ready' and has a scheduledFor time: - Future → display as 'scheduled' - Past → display as 'overdue' @param status - The actual lesson stat…

### `utils/metadata.ts`

- **Path**: `utils/metadata.ts`
- **Kind**: Util
- **Summary**: Source module `utils/metadata.ts` (Util). Code comment: Formats a path segment into a readable title Converts kebab-case to Title Case (e.g., "support-tools" → "Support Tools")

### `utils/mutation-invalidation.ts`

- **Path**: `utils/mutation-invalidation.ts`
- **Kind**: Util
- **Summary**: Source module `utils/mutation-invalidation.ts` (Util). Code comment: Maps API endpoints to React Query keys that should be invalidated when mutations succeed. Pattern matching: - Use {id} as placeholder for dynamic IDs - Use {topicId} for topic-specific endpoints - Use…

### `utils/parse-question-urls.tsx`

- **Path**: `utils/parse-question-urls.tsx`
- **Kind**: Util
- **Summary**: Source module `utils/parse-question-urls.tsx` (Util). Code comment: Extracts URL tags from question text. Tags are in the format [URL:name] where name is the tag identifier. @param questionText - The question text containing URL tags @returns Array of unique tag names…

### `utils/pdf-converter.ts`

- **Path**: `utils/pdf-converter.ts`
- **Kind**: Util
- **Summary**: Source module `utils/pdf-converter.ts` (Util). Code comment: Converts a PDF file to an array of image blobs (one per page) @param file - The PDF file to convert @returns Array of page images with blob URLs and blob data

### `utils/school-name.ts`

- **Path**: `utils/school-name.ts`
- **Kind**: Util
- **Summary**: Source module `utils/school-name.ts` (Util). Code comment: Capitalizes a school name to Title Case Capitalizes the first letter of each word while preserving spaces Examples: "st mary's school" -> "St Mary's School" "john smith high" -> "John Smith High" "MC …

### `utils/slug.ts`

- **Path**: `utils/slug.ts`
- **Kind**: Util
- **Summary**: Source module `utils/slug.ts` (Util). Code comment: Creates a URL-friendly slug from a title string. Converts to lowercase, removes special characters, and replaces spaces with hyphens.

### `utils/supabase/admin.ts`

- **Path**: `utils/supabase/admin.ts`
- **Kind**: Util
- **Summary**: Source module `utils/supabase/admin.ts` (Util).

### `utils/supabase/client.ts`

- **Path**: `utils/supabase/client.ts`
- **Kind**: Util
- **Summary**: Source module `utils/supabase/client.ts` (Util).

### `utils/supabase/middleware.ts`

- **Path**: `utils/supabase/middleware.ts`
- **Kind**: Middleware
- **Summary**: Source module `utils/supabase/middleware.ts` (Middleware). Code comment: Helper function to copy cookies from source response to target response. This is critical for maintaining Supabase session state during redirects.

### `utils/supabase/server.ts`

- **Path**: `utils/supabase/server.ts`
- **Kind**: Util
- **Summary**: Source module `utils/supabase/server.ts` (Util).

### `utils/supabase/storage-url.ts`

- **Path**: `utils/supabase/storage-url.ts`
- **Kind**: Util
- **Summary**: Source module `utils/supabase/storage-url.ts` (Util). Code comment: Rewrites Supabase storage URLs to use the configured NEXT_PUBLIC_SUPABASE_URL host. Ensures thumbnails/previews work when using a custom API domain (e.g. for school networks that block *.supabase.co).

### `utils/supabase/storage.ts`

- **Path**: `utils/supabase/storage.ts`
- **Kind**: Util
- **Summary**: Source module `utils/supabase/storage.ts` (Util). Code comment: Extracts the storage path from a Supabase public URL or returns the path if it's already a path. Supabase public URLs have the format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{…

### `utils/supabase/upload.ts`

- **Path**: `utils/supabase/upload.ts`
- **Kind**: Util
- **Summary**: Source module `utils/supabase/upload.ts` (Util). Code comment: Generates a public URL for a topic slide based on its storage path structure. Files are stored in: slides/topics/{stageId}/{topicId}/{slideId}.{extension} Uses IDs - stable, never breaks when stages o…

### `utils/verifySupabaseJWT.ts`

- **Path**: `utils/verifySupabaseJWT.ts`
- **Kind**: Util
- **Summary**: Source module `utils/verifySupabaseJWT.ts` (Util). Code comment: Verifies a Supabase JWT token using the remote JWKS. Throws an error if verification fails. @param token The JWT token string (without 'Bearer ' prefix) @returns The JWTVerifyResult if successful

### `utils/video.ts`

- **Path**: `utils/video.ts`
- **Kind**: Util
- **Summary**: Source module `utils/video.ts` (Util). Code comment: Unified utility functions for handling YouTube and Vimeo URLs
